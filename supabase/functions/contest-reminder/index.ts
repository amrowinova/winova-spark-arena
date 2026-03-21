/**
 * Contest Reminder Edge Function
 * ────────────────────────────────
 * Sends in-app notifications to active users who haven't entered today's
 * contest yet, 30 minutes before voting begins (18:30 KSA = 15:30 UTC).
 *
 * On Thursdays: also sends a "Tomorrow is Friday Free Contest!" preview
 * notification to all active users.
 *
 * Cron schedule: "30 15 * * *"  (15:30 UTC = 18:30 KSA/UTC+3)
 *
 * Logic:
 *  1. [Thursday only] Send Friday free contest preview to all active users
 *  2. Get today's contest (must be in 'active' or 'stage1' status)
 *  3. Get all weekly_active profiles
 *  4. Exclude users who already entered today
 *  5. Insert contest_reminder notification for each remaining user
 *     (skips if already sent today to prevent duplicates)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function ksaNow(): Date {
  const utc = new Date();
  return new Date(utc.getTime() + 3 * 60 * 60 * 1000);
}

function ksaDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
function dayOfWeekKSA(): number {
  return ksaNow().getDay();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization");
  const bearerToken = authHeader?.replace("Bearer ", "") ?? "";

  // Allow service role or anon cron token
  const decodeJwt = (token: string) => {
    try {
      const p = token.split(".")[1];
      if (!p) return null;
      const norm = p.replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(atob(norm + "=".repeat((4 - (norm.length % 4)) % 4)));
    } catch { return null; }
  };

  const payload = decodeJwt(bearerToken);
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1] ?? null;
  const isServiceRole = bearerToken === serviceRoleKey;
  const isCronToken = payload?.role === "anon" && (!projectRef || payload?.ref === projectRef);

  if (!isServiceRole && !isCronToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const db = createClient(supabaseUrl, serviceRoleKey);
  const now = ksaNow();
  const today = ksaDateStr(now);
  const dow = dayOfWeekKSA(); // 4=Thu, 5=Fri

  const result: Record<string, unknown> = { success: true };

  try {
    // ─────────────────────────────────────────────────────────────────────
    // Step 1 — Thursday preview: "Tomorrow is Friday Free Contest!"
    // Runs every Thursday at 18:30 KSA when the cron triggers
    // ─────────────────────────────────────────────────────────────────────
    if (dow === 4) {
      // Read friday_prize from app_settings
      const { data: configRow } = await db
        .from("app_settings")
        .select("value")
        .eq("key", "contest_config")
        .maybeSingle();

      const fridayPrize: number =
        (configRow?.value as { friday_prize?: number } | null)?.friday_prize ?? 100;

      // Get all active users
      const { data: allProfiles } = await db
        .from("profiles")
        .select("user_id")
        .eq("weekly_active", true);

      if (allProfiles?.length) {
        // Dedup: skip if already sent a thursday_preview today
        const { data: existingPreviews } = await db
          .from("notifications")
          .select("user_id")
          .eq("type", "thursday_preview")
          .gte("created_at", `${today}T00:00:00+03:00`);

        const alreadySentSet = new Set((existingPreviews ?? []).map((n) => n.user_id));
        const toPreview = allProfiles
          .map((p) => p.user_id)
          .filter((uid) => !alreadySentSet.has(uid));

        if (toPreview.length > 0) {
          const previewRows = toPreview.map((uid) => ({
            user_id: uid,
            type: "thursday_preview",
            title: "🎉 Free Contest Tomorrow!",
            title_ar: "🎉 مسابقة مجانية غداً!",
            description: `Friday Free Contest tomorrow — no entry fee! Prize: ${fridayPrize} Nova. Make sure your account is KYC verified.`,
            description_ar: `مسابقة الجمعة المجانية غداً — بدون رسوم! الجائزة: ${fridayPrize} Nova. تأكد من التحقق من هويتك.`,
            is_read: false,
            action_path: "/contests",
          }));

          const BATCH = 500;
          let thuSent = 0;
          for (let i = 0; i < previewRows.length; i += BATCH) {
            const { error } = await db.from("notifications").insert(previewRows.slice(i, i + BATCH));
            if (!error) thuSent += Math.min(BATCH, previewRows.length - i);
          }
          result.thursday_preview_sent = thuSent;
          console.log(`Thursday preview notifications sent: ${thuSent}`);
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Step 2 — Daily reminder: 30 min before voting (18:30 KSA)
    // ─────────────────────────────────────────────────────────────────────

    // Get today's contest (must exist and be active/stage1)
    const { data: contest, error: contestErr } = await db
      .from("contests")
      .select("id, status, contest_date, is_free, admin_prize")
      .eq("contest_date", today)
      .in("status", ["active", "stage1"])
      .maybeSingle();

    if (contestErr) throw contestErr;

    if (!contest) {
      result.sent = 0;
      result.reason = "no active contest today";
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all active user IDs (weekly_active = true)
    const { data: activeProfiles, error: profilesErr } = await db
      .from("profiles")
      .select("user_id")
      .eq("weekly_active", true);

    if (profilesErr) throw profilesErr;
    if (!activeProfiles?.length) {
      result.sent = 0;
      result.reason = "no active users";
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allActiveUserIds = activeProfiles.map((p) => p.user_id);

    // Exclude users who already entered today's contest
    const { data: entries } = await db
      .from("contest_entries")
      .select("user_id")
      .eq("contest_id", contest.id);

    const alreadyEnteredSet = new Set((entries ?? []).map((e) => e.user_id));

    // Exclude users who already received this reminder today (dedup)
    const { data: existingReminders } = await db
      .from("notifications")
      .select("user_id")
      .eq("type", "contest_reminder")
      .gte("created_at", `${today}T00:00:00+03:00`);

    const alreadyReminderSet = new Set((existingReminders ?? []).map((n) => n.user_id));

    // Build notification rows — message differs for free vs paid contests
    const toNotify = allActiveUserIds.filter(
      (uid) => !alreadyEnteredSet.has(uid) && !alreadyReminderSet.has(uid)
    );

    if (!toNotify.length) {
      result.sent = 0;
      result.reason = "all users already entered or notified";
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Notification text differs for Friday free contest
    const isFree = contest.is_free === true;
    const notifications = toNotify.map((uid) => ({
      user_id: uid,
      type: "contest_reminder",
      title: isFree ? "🎉 Free Contest Opening Soon!" : "Contest Opening Soon",
      title_ar: isFree ? "🎉 المسابقة المجانية تفتح قريباً!" : "المسابقة تفتح قريباً",
      description: isFree
        ? `Friday Free Contest voting starts in 30 minutes — FREE entry, prize: ${contest.admin_prize ?? 100} Nova!`
        : "Daily contest voting starts in 30 minutes — don't miss out!",
      description_ar: isFree
        ? `تصويت مسابقة الجمعة المجانية يبدأ خلال 30 دقيقة — دخول مجاني، الجائزة: ${contest.admin_prize ?? 100} Nova!`
        : "التصويت في المسابقة اليومية يبدأ خلال 30 دقيقة — لا تفوّت الفرصة!",
      is_read: false,
      action_path: "/contests",
    }));

    // Insert in batches of 500 to avoid payload limits
    const BATCH = 500;
    let totalInserted = 0;
    for (let i = 0; i < notifications.length; i += BATCH) {
      const batch = notifications.slice(i, i + BATCH);
      const { error: insertErr } = await db.from("notifications").insert(batch);
      if (insertErr) throw insertErr;
      totalInserted += batch.length;
    }

    result.sent = totalInserted;
    result.contestId = contest.id;
    result.isFriday = isFree;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[contest-reminder] error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
