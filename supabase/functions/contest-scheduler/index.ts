/**
 * Contest Scheduler Edge Function
 * ──────────────────────────────────
 * Automatically creates and manages daily contests aligned to KSA (UTC+3) schedule.
 * On Fridays, creates a FREE contest (is_free = true) with prize from app_settings.
 *
 * Invocation options:
 *   - Cron trigger (pg_cron job) at ~10:00 AM KSA daily
 *   - Manual HTTP call for testing/emergency
 *
 * Actions:
 *   1. ensure_today_contest: Creates today's contest if not present
 *   2. transition_stages: Updates contest status based on current KSA time
 *   3. finalize: Marks contest as 'completed' after 10 PM KSA + distributes prizes
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://winova-spark-arena-claude.vercel.app",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// KSA helper – all times are Asia/Riyadh (UTC+3)
function ksaNow(): Date {
  const utc = new Date();
  return new Date(utc.getTime() + 3 * 60 * 60 * 1000);
}

function ksaDateStr(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD in KSA context
}

// Build KSA timestamp for given hour on today's KSA date
function ksaTimestamp(hour: number, minute = 0): string {
  const now = ksaNow();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+03:00`;
}

// Build KSA timestamp for given hour on a specific KSA date object
function ksaTimestampForDate(date: Date, hour: number, minute = 0): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+03:00`;
}

// Prize distribution percentages for top 5
const PRIZE_PERCENTAGES = [50, 20, 15, 10, 5];

/**
 * Distribute prizes to top contestants.
 * If ≤5 contestants, ALL win (split proportionally among available positions).
 * If >5, only top 5 by votes win.
 */
async function distributePrizes(supabase: any, contestId: string) {
  // Get contest prize pool
  const { data: contest, error: contestErr } = await supabase
    .from("contests")
    .select("prize_pool")
    .eq("id", contestId)
    .single();

  if (contestErr || !contest) {
    console.error("Failed to fetch contest for prize distribution:", contestErr);
    return { distributed: false, error: contestErr?.message || "Contest not found" };
  }

  const prizePool = contest.prize_pool || 0;
  if (prizePool <= 0) {
    return { distributed: false, error: "No prize pool" };
  }

  // Check if prizes already distributed
  const { data: existingPrizes } = await supabase
    .from("contest_entries")
    .select("id")
    .eq("contest_id", contestId)
    .gt("prize_won", 0)
    .limit(1);

  if (existingPrizes && existingPrizes.length > 0) {
    return { distributed: false, error: "Prizes already distributed" };
  }

  // Get all entries sorted by votes
  const { data: entries, error: entriesErr } = await supabase
    .from("contest_entries")
    .select("id, user_id, votes_received")
    .eq("contest_id", contestId)
    .order("votes_received", { ascending: false });

  if (entriesErr || !entries || entries.length === 0) {
    console.error("Failed to fetch entries:", entriesErr);
    return { distributed: false, error: "No entries found" };
  }

  const totalContestants = entries.length;
  // Winners = all if ≤5, otherwise top 5
  const winnerCount = Math.min(totalContestants, 5);
  const winners = entries.slice(0, winnerCount);

  // Calculate prize percentages for available positions
  // If <5 contestants, redistribute unused percentages proportionally
  let activePercentages = PRIZE_PERCENTAGES.slice(0, winnerCount);
  const totalActivePercent = activePercentages.reduce((a, b) => a + b, 0);
  // Normalize to 100%
  const normalizedPercentages = activePercentages.map(p => (p / totalActivePercent) * 100);

  const results = [];

  for (let i = 0; i < winners.length; i++) {
    const entry = winners[i];
    const prizeAmount = Math.round((prizePool * normalizedPercentages[i]) / 100 * 100) / 100;
    const rank = i + 1;

    // Update contest_entry with prize and rank
    const { error: updateErr } = await supabase
      .from("contest_entries")
      .update({ prize_won: prizeAmount, rank: rank })
      .eq("id", entry.id);

    if (updateErr) {
      console.error(`Failed to update entry ${entry.id}:`, updateErr);
      continue;
    }

    // Credit winner's wallet
    const { data: wallet } = await supabase
      .from("wallets")
      .select("id, nova_balance")
      .eq("user_id", entry.user_id)
      .single();

    if (wallet) {
      const newBalance = (wallet.nova_balance || 0) + prizeAmount;

      await supabase
        .from("wallets")
        .update({ nova_balance: newBalance, updated_at: new Date().toISOString() })
        .eq("id", wallet.id);

      // Record in wallet_ledger
      await supabase
        .from("wallet_ledger")
        .insert({
          user_id: entry.user_id,
          wallet_id: wallet.id,
          entry_type: "contest_win",
          currency: "nova",
          amount: prizeAmount,
          balance_before: wallet.nova_balance || 0,
          balance_after: newBalance,
          reference_type: "contest",
          reference_id: contestId,
          description: `Contest prize - Rank #${rank}`,
        });

      // Record transaction
      await supabase
        .from("transactions")
        .insert({
          user_id: entry.user_id,
          type: "deposit",
          currency: "nova",
          amount: prizeAmount,
          description: `Contest prize - Rank #${rank}`,
        });
    }

    results.push({ user_id: entry.user_id, rank, prize: prizeAmount });
  }

  // Update remaining entries with rank but no prize
  for (let i = winnerCount; i < entries.length; i++) {
    await supabase
      .from("contest_entries")
      .update({ rank: i + 1, prize_won: 0 })
      .eq("id", entries[i].id);
  }

  return { distributed: true, winners: results };
}

// Returns true if today is Friday in KSA timezone
// getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
function isFridayKSA(): boolean {
  return ksaNow().getDay() === 5;
}

// Send bulk notifications to all active users (batched to avoid payload limits)
async function sendBulkNotification(
  db: ReturnType<typeof createClient>,
  opts: {
    type: string;
    title: string;
    title_ar: string;
    description: string;
    description_ar: string;
    action_path: string;
  }
): Promise<number> {
  const { data: activeProfiles } = await db
    .from("profiles")
    .select("user_id")
    .eq("weekly_active", true);

  if (!activeProfiles?.length) return 0;

  // Check for duplicates sent today
  const today = ksaDateStr(ksaNow());
  const { data: existingNotifs } = await db
    .from("notifications")
    .select("user_id")
    .eq("type", opts.type)
    .gte("created_at", `${today}T00:00:00+03:00`);

  const alreadySentSet = new Set((existingNotifs ?? []).map((n) => n.user_id));
  const toNotify = activeProfiles
    .map((p) => p.user_id)
    .filter((uid) => !alreadySentSet.has(uid));

  if (!toNotify.length) return 0;

  const rows = toNotify.map((uid) => ({
    user_id: uid,
    type: opts.type,
    title: opts.title,
    title_ar: opts.title_ar,
    description: opts.description,
    description_ar: opts.description_ar,
    is_read: false,
    action_path: opts.action_path,
  }));

  const BATCH = 500;
  let total = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await db.from("notifications").insert(rows.slice(i, i + BATCH));
    if (!error) total += Math.min(BATCH, rows.length - i);
  }
  return total;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // SECURITY: allow service-role, scheduled anon cron token, or authenticated admin users
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const bearerToken = authHeader?.replace('Bearer ', '') || '';
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1] ?? null;

  const decodeJwtPayload = (token: string) => {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  };

  const tokenPayload = decodeJwtPayload(bearerToken);
  const isServiceRole = bearerToken === serviceRoleKey;
  const isCronAnonToken = tokenPayload?.role === 'anon' && (!projectRef || tokenPayload?.ref === projectRef);

  if (!isServiceRole && !isCronAnonToken) {
    const tempClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user } } = await tempClient.auth.getUser(bearerToken);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roles } = await tempClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (!roles?.some((r: { role: string }) => r.role === 'admin')) {
      return new Response(JSON.stringify({ error: 'Admin or service role only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const now = ksaNow();
  const todayStr = ksaDateStr(now);
  const hour = now.getHours();
  const todayIsFriday = isFridayKSA();

  try {
    // ─────────────────────────────────────────────────────────────────────
    // 0. Weekly streak update — runs once per cycle week at first invocation
    // ─────────────────────────────────────────────────────────────────────
    const { data: cycleRows } = await supabase.rpc("get_active_cycle_info");
    const cycleRow = (cycleRows as Array<{ cycle_id: string; week_number: number }> | null)?.[0];

    if (cycleRow && cycleRow.week_number > 1) {
      const weekToUpdate = cycleRow.week_number - 1;

      const { data: streakSetting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "last_streak_updated_week")
        .maybeSingle();

      const lastUpdated = streakSetting?.value as { cycle_id: string | null; week: number } | null;
      const alreadyDone =
        lastUpdated?.cycle_id === cycleRow.cycle_id &&
        (lastUpdated?.week ?? 0) >= weekToUpdate;

      if (!alreadyDone) {
        const { error: streakErr } = await supabase.rpc("update_weekly_streaks", {
          p_cycle_id: cycleRow.cycle_id,
          p_week_just_completed: weekToUpdate,
        });
        if (streakErr) {
          console.error("update_weekly_streaks error:", streakErr);
        } else {
          await supabase.from("app_settings").upsert(
            { key: "last_streak_updated_week", value: { cycle_id: cycleRow.cycle_id, week: weekToUpdate } },
            { onConflict: "key" }
          );
          console.log(`weekly streaks updated: cycle=${cycleRow.cycle_id} week=${weekToUpdate}`);
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // 1. Ensure today's contest exists
    // ─────────────────────────────────────────────────────────────────────
    const { data: existing, error: fetchErr } = await supabase
      .from("contests")
      .select("id, status, is_free")
      .eq("contest_date", todayStr)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    let contestId: string;
    let currentStatus: string;

    if (!existing) {
      // ── Friday Free Contest ───────────────────────────────────────────
      if (todayIsFriday) {
        // Read friday_prize from app_settings.contest_config
        const { data: configRow } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "contest_config")
          .maybeSingle();

        const fridayPrize: number =
          (configRow?.value as { friday_prize?: number } | null)?.friday_prize ?? 100;

        const { data: newContest, error: insertErr } = await supabase
          .from("contests")
          .insert({
            title:       `Friday Free Contest – ${todayStr}`,
            title_ar:    `مسابقة الجمعة المجانية – ${todayStr}`,
            description: "Free Friday contest — no entry fee required!",
            description_ar: "مسابقة الجمعة المجانية — الدخول بدون رسوم!",
            start_time:  ksaTimestamp(10, 0),
            end_time:    ksaTimestamp(22, 0),
            entry_fee:   0,
            prize_pool:  fridayPrize,
            admin_prize: fridayPrize,
            is_free:     true,
            current_participants: 0,
            status:      "active",
            contest_date: todayStr,
          })
          .select("id, status")
          .single();

        if (insertErr) throw insertErr;
        contestId = newContest!.id;
        currentStatus = newContest!.status;

        // Send Friday morning notification to all active users
        const sent = await sendBulkNotification(supabase, {
          type:        "friday_contest",
          title:       "🎉 Free Contest Today!",
          title_ar:    "🎉 مسابقة الجمعة المجانية اليوم!",
          description: `Today's contest is FREE — no Nova required! Prize pool: ${fridayPrize} Nova. Join now!`,
          description_ar: `مسابقة اليوم مجانية — بدون رسوم Nova! الجائزة: ${fridayPrize} Nova. انضم الآن!`,
          action_path: "/contests",
        });
        console.log(`Friday free contest created. Notifications sent: ${sent}`);

      } else {
        // ── Regular Daily Contest ─────────────────────────────────────────
        const { data: newContest, error: insertErr } = await supabase
          .from("contests")
          .insert({
            title:       `Daily Contest – ${todayStr}`,
            title_ar:    `المسابقة اليومية – ${todayStr}`,
            description: "Daily Nova contest",
            description_ar: "مسابقة Nova اليومية",
            start_time:  ksaTimestamp(10, 0),
            end_time:    ksaTimestamp(22, 0),
            entry_fee:   10,
            prize_pool:  0,
            is_free:     false,
            current_participants: 0,
            status:      "active",
            contest_date: todayStr,
          })
          .select("id, status")
          .single();

        if (insertErr) throw insertErr;
        contestId = newContest!.id;
        currentStatus = newContest!.status;
      }
    } else {
      contestId = existing.id;
      currentStatus = existing.status;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2. Transition status based on current KSA hour
    // ─────────────────────────────────────────────────────────────────────
    // Statuses: active (join open) → stage1 → final → completed
    let newStatus: string | null = null;
    let prizeDistribution: any = null;

    if (hour >= 22) {
      if (currentStatus !== "completed") newStatus = "completed";
    } else if (hour >= 20) {
      if (currentStatus !== "final" && currentStatus !== "completed") newStatus = "final";
    } else if (hour >= 14) {
      if (currentStatus !== "stage1" && currentStatus !== "final" && currentStatus !== "completed") {
        newStatus = "stage1";
      }
    } else if (hour >= 10) {
      if (!["active", "stage1", "final", "completed"].includes(currentStatus)) {
        newStatus = "active";
      }
    }

    if (newStatus) {
      const { error: updateErr } = await supabase
        .from("contests")
        .update({ status: newStatus })
        .eq("id", contestId);
      if (updateErr) throw updateErr;

      // ── Grant vote earnings when a stage ends ──────────────────────────
      if (currentStatus === "stage1" && newStatus === "final") {
        const { data: earningsData, error: earningsErr } = await supabase
          .rpc("grant_vote_earnings", { p_contest_id: contestId, p_stage: "stage1" });
        if (earningsErr) console.error("grant_vote_earnings stage1 error:", earningsErr);
        else console.log("stage1 vote earnings granted:", earningsData);
      }

      // ─────────────────────────────────────────────────────────────────
      // 3. Distribute prizes + spotlight draw when transitioning to "completed"
      // ─────────────────────────────────────────────────────────────────
      if (currentStatus === "final" && newStatus === "completed") {
        const { data: earningsData, error: earningsErr } = await supabase
          .rpc("grant_vote_earnings", { p_contest_id: contestId, p_stage: "final" });
        if (earningsErr) console.error("grant_vote_earnings final error:", earningsErr);
        else console.log("final vote earnings granted:", earningsData);

        prizeDistribution = await distributePrizes(supabase, contestId);
        console.log("Prize distribution result:", JSON.stringify(prizeDistribution));

        // ── Run daily spotlight draw ──────────────────────────────────────
        const { data: drawData, error: drawErr } = await supabase
          .rpc("run_daily_spotlight_draw", { p_draw_date: todayStr });
        if (drawErr) console.error("run_daily_spotlight_draw error:", drawErr);
        else console.log("spotlight draw result:", drawData);

        // ── Pre-create tomorrow's contest for midnight pre-registration ───
        // This lets users join from midnight (pre_open phase) instead of waiting for 10AM.
        const tomorrowKsa = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const tomorrowStr = ksaDateStr(tomorrowKsa);
        const tomorrowIsFriday = tomorrowKsa.getDay() === 5;

        const { data: tomorrowExisting } = await supabase
          .from("contests")
          .select("id")
          .eq("contest_date", tomorrowStr)
          .maybeSingle();

        if (!tomorrowExisting) {
          if (tomorrowIsFriday) {
            const { data: configRow } = await supabase
              .from("app_settings")
              .select("value")
              .eq("key", "contest_config")
              .maybeSingle();
            const fridayPrize: number =
              (configRow?.value as { friday_prize?: number } | null)?.friday_prize ?? 100;

            await supabase.from("contests").insert({
              title:       `Friday Free Contest – ${tomorrowStr}`,
              title_ar:    `مسابقة الجمعة المجانية – ${tomorrowStr}`,
              description: "Free Friday contest — no entry fee required!",
              description_ar: "مسابقة الجمعة المجانية — الدخول بدون رسوم!",
              start_time:  ksaTimestampForDate(tomorrowKsa, 10, 0),
              end_time:    ksaTimestampForDate(tomorrowKsa, 22, 0),
              entry_fee:   0,
              prize_pool:  fridayPrize,
              admin_prize: fridayPrize,
              is_free:     true,
              current_participants: 0,
              status:      "active",
              contest_date: tomorrowStr,
            });
          } else {
            await supabase.from("contests").insert({
              title:       `Daily Contest – ${tomorrowStr}`,
              title_ar:    `المسابقة اليومية – ${tomorrowStr}`,
              description: "Daily Nova contest",
              description_ar: "مسابقة Nova اليومية",
              start_time:  ksaTimestampForDate(tomorrowKsa, 10, 0),
              end_time:    ksaTimestampForDate(tomorrowKsa, 22, 0),
              entry_fee:   10,
              prize_pool:  0,
              is_free:     false,
              current_participants: 0,
              status:      "active",
              contest_date: tomorrowStr,
            });
          }
          console.log(`Pre-created tomorrow's contest: ${tomorrowStr} (Friday: ${tomorrowIsFriday})`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        contestId,
        isFriday: todayIsFriday,
        previousStatus: currentStatus,
        newStatus: newStatus || currentStatus,
        ksaTime: now.toISOString(),
        prizeDistribution,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("contest-scheduler error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
