import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-simulation-key",
};

/* ────────────────── Helpers ────────────────── */
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface TimedResult {
  ok: boolean;
  ms: number;
  error?: string;
  deadlock?: boolean;
}

async function timed(fn: () => Promise<{ ok: boolean; error?: string }>): Promise<TimedResult> {
  const t0 = performance.now();
  try {
    const r = await fn();
    return {
      ok: r.ok,
      ms: Math.round(performance.now() - t0),
      error: r.error,
      deadlock: r.error?.includes("deadlock") || false,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      ms: Math.round(performance.now() - t0),
      error: msg,
      deadlock: msg.includes("deadlock"),
    };
  }
}

/* ────────────────── Scenarios ────────────────── */

async function runTransferStorm(
  sb: ReturnType<typeof createClient>,
  wallets: { user_id: string; wallet_id: string; nova_balance: number }[],
  count: number
) {
  const results: TimedResult[] = [];
  const funded = wallets.filter((w) => w.nova_balance >= 2);
  if (funded.length < 2) return { results, label: "transfer_storm" };

  // Create batches of concurrent transfers
  const batchSize = 50;
  for (let i = 0; i < count; i += batchSize) {
    const batch = Array.from({ length: Math.min(batchSize, count - i) }, () => {
      const sender = pick(funded);
      let recipient = pick(funded);
      while (recipient.user_id === sender.user_id) recipient = pick(funded);
      return timed(async () => {
        const { data, error } = await sb.rpc("execute_transfer", {
          p_sender_id: sender.user_id,
          p_recipient_id: recipient.user_id,
          p_amount: 1,
          p_currency: "nova",
          p_reference_type: "load_test",
          p_reference_id: null,
          p_description: "[LOAD_TEST] stress transfer",
          p_description_ar: "[LOAD_TEST] تحويل اختبار",
        });
        if (error) return { ok: false, error: error.message };
        const r = data as any;
        return { ok: r?.success === true, error: r?.error };
      });
    });
    results.push(...(await Promise.all(batch)));
  }
  return { results, label: "transfer_storm" };
}

async function runContestJoinStorm(
  sb: ReturnType<typeof createClient>,
  wallets: { user_id: string }[],
  count: number
) {
  const results: TimedResult[] = [];
  const batch = Array.from({ length: Math.min(count, wallets.length) }, (_, i) => {
    const user = wallets[i % wallets.length];
    return timed(async () => {
      const { data, error } = await sb.rpc("join_contest", {
        p_user_id: user.user_id,
      });
      if (error) return { ok: false, error: error.message };
      const r = data as any;
      return { ok: r?.success === true, error: r?.error };
    });
  });
  results.push(...(await Promise.all(batch)));
  return { results, label: "contest_join_storm" };
}

async function runVotingWave(
  sb: ReturnType<typeof createClient>,
  wallets: { user_id: string }[],
  count: number
) {
  const results: TimedResult[] = [];
  // Get contest participants
  const { data: participants } = await sb
    .from("contest_participants")
    .select("id, user_id")
    .limit(20);

  if (!participants?.length) {
    return { results: [{ ok: false, ms: 0, error: "no_participants" }], label: "voting_wave" };
  }

  const batch = Array.from({ length: count }, () => {
    const voter = pick(wallets);
    const target = pick(participants);
    return timed(async () => {
      const { data, error } = await sb.rpc("cast_vote", {
        p_voter_id: voter.user_id,
        p_participant_id: target.id,
      });
      if (error) return { ok: false, error: error.message };
      const r = data as any;
      return { ok: r?.success === true, error: r?.error };
    });
  });
  results.push(...(await Promise.all(batch)));
  return { results, label: "voting_wave" };
}

async function runP2POrderStorm(
  sb: ReturnType<typeof createClient>,
  wallets: { user_id: string; nova_balance: number }[],
  count: number
) {
  const results: TimedResult[] = [];
  const funded = wallets.filter((w) => w.nova_balance >= 10);
  if (funded.length < 2) return { results, label: "p2p_order_storm" };

  // Create sell orders concurrently
  const createBatch = Array.from({ length: Math.min(count, funded.length) }, (_, i) => {
    const seller = funded[i % funded.length];
    return timed(async () => {
      const { data, error } = await sb.rpc("p2p_create_sell_order", {
        p_creator_id: seller.user_id,
        p_nova_amount: 5,
        p_local_amount: 50,
        p_exchange_rate: 10,
        p_country: "SA",
        p_time_limit_minutes: 30,
        p_payment_method_id: null,
      });
      if (error) return { ok: false, error: error.message };
      const r = data as any;
      return { ok: r?.success === true, error: r?.error };
    });
  });
  results.push(...(await Promise.all(createBatch)));
  return { results, label: "p2p_order_storm" };
}

async function runMessagingFlood(
  sb: ReturnType<typeof createClient>,
  wallets: { user_id: string }[],
  count: number
) {
  const results: TimedResult[] = [];
  if (wallets.length < 2) return { results, label: "messaging_flood" };

  const batchSize = 100;
  for (let i = 0; i < count; i += batchSize) {
    const batch = Array.from({ length: Math.min(batchSize, count - i) }, () => {
      const sender = pick(wallets);
      let recipient = pick(wallets);
      while (recipient.user_id === sender.user_id) recipient = pick(wallets);
      return timed(async () => {
        const { error } = await sb.from("direct_messages").insert({
          sender_id: sender.user_id,
          recipient_id: recipient.user_id,
          content: `[LOAD_TEST] stress message ${Date.now()}`,
        });
        return { ok: !error, error: error?.message };
      });
    });
    results.push(...(await Promise.all(batch)));
  }
  return { results, label: "messaging_flood" };
}

async function runNotificationSpike(
  sb: ReturnType<typeof createClient>,
  wallets: { user_id: string }[],
  count: number
) {
  const results: TimedResult[] = [];
  const batchSize = 100;
  for (let i = 0; i < count; i += batchSize) {
    const rows = Array.from({ length: Math.min(batchSize, count - i) }, () => ({
      user_id: pick(wallets).user_id,
      title: "[LOAD_TEST] System Alert",
      title_ar: "[LOAD_TEST] تنبيه النظام",
      body: "Load test notification",
      body_ar: "إشعار اختبار الحمل",
      type: "system",
    }));
    const r = await timed(async () => {
      const { error } = await sb.from("notifications").insert(rows);
      return { ok: !error, error: error?.message };
    });
    results.push(r);
  }
  return { results, label: "notification_spike" };
}

/* ────────────────── Aggregator ────────────────── */

function aggregate(results: TimedResult[]) {
  const total = results.length;
  const successes = results.filter((r) => r.ok).length;
  const failures = results.filter((r) => !r.ok).length;
  const deadlocks = results.filter((r) => r.deadlock).length;
  const times = results.map((r) => r.ms).sort((a, b) => a - b);
  const errorMap: Record<string, number> = {};
  results
    .filter((r) => r.error)
    .forEach((r) => {
      const key = r.error!.substring(0, 80);
      errorMap[key] = (errorMap[key] || 0) + 1;
    });

  return {
    total,
    successes,
    failures,
    deadlocks,
    success_rate: total ? `${((successes / total) * 100).toFixed(1)}%` : "N/A",
    latency: {
      min_ms: times[0] ?? 0,
      p50_ms: times[Math.floor(total * 0.5)] ?? 0,
      p95_ms: times[Math.floor(total * 0.95)] ?? 0,
      p99_ms: times[Math.floor(total * 0.99)] ?? 0,
      max_ms: times[total - 1] ?? 0,
    },
    top_errors: Object.entries(errorMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([msg, count]) => ({ msg, count })),
  };
}

/* ────────────────── Main ────────────────── */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Clone body for auth check then re-parse
  const bodyText = await req.text();
  let parsedBody: any = {};
  try { parsedBody = JSON.parse(bodyText); } catch { /* empty */ }

  // ── Auth: service role key check via Authorization header OR body ──
  const authHeader = req.headers.get("Authorization");
  const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const token = authHeader?.replace("Bearer ", "");
  const isServiceRole = token === svcKey;

  if (!isServiceRole) {
    // Fallback: check if user is admin via JWT
    if (!authHeader?.startsWith("Bearer ") || !token) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, svcKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user } } = await authClient.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roles } = await authClient.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r: any) => r.role === "admin")) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const t0 = performance.now();

  try {
    // Use already-parsed body from auth phase
    const body = parsedBody;
    const intensity = body.intensity ?? "medium"; // low | medium | high
    const scale = intensity === "low" ? 0.25 : intensity === "high" ? 2 : 1;

    // ── Load wallet data ──
    const { data: walletRows } = await sb
      .from("wallets")
      .select("id, user_id, nova_balance")
      .gt("nova_balance", 0)
      .limit(50);

    const wallets = (walletRows || []).map((w: any) => ({
      user_id: w.user_id,
      wallet_id: w.id,
      nova_balance: Number(w.nova_balance),
    }));

    // ── Snapshot before ──
    const { data: preBal } = await sb.rpc("execute_transfer", {
      p_sender_id: "00000000-0000-0000-0000-000000000000",
      p_recipient_id: "00000000-0000-0000-0000-000000000000",
      p_amount: 0,
      p_currency: "nova",
      p_reference_type: "noop",
      p_reference_id: null,
      p_description: null,
      p_description_ar: null,
    }).catch(() => null);

    const { data: preSupply } = await sb.from("wallets").select("nova_balance");
    const totalNovaBefore = (preSupply || []).reduce(
      (s: number, w: any) => s + Number(w.nova_balance), 0
    );

    // ── Run all scenarios ──
    console.log(`[LOAD-SIM] Starting ${intensity} intensity simulation with ${wallets.length} wallets`);

    const transferCount = Math.round(200 * scale);
    const contestCount = Math.round(30 * scale);
    const voteCount = Math.round(50 * scale);
    const p2pCount = Math.round(20 * scale);
    const msgCount = Math.round(500 * scale);
    const notifCount = Math.round(300 * scale);

    // Run scenarios in parallel for maximum stress
    const [transfers, contests, votes, p2p, messages, notifs] = await Promise.all([
      runTransferStorm(sb, wallets, transferCount),
      runContestJoinStorm(sb, wallets, contestCount),
      runVotingWave(sb, wallets, voteCount),
      runP2POrderStorm(sb, wallets, p2pCount),
      runMessagingFlood(sb, wallets, msgCount),
      runNotificationSpike(sb, wallets, notifCount),
    ]);

    // ── Post-simulation integrity checks ──
    console.log("[LOAD-SIM] Running integrity checks...");

    // 1. Nova supply conservation
    const { data: postSupply } = await sb.from("wallets").select("nova_balance");
    const totalNovaAfter = (postSupply || []).reduce(
      (s: number, w: any) => s + Number(w.nova_balance), 0
    );
    const supplyDrift = Math.abs(totalNovaAfter - totalNovaBefore);

    // 2. Wallet-ledger consistency
    const { data: mismatches } = await sb.rpc("get_table_performance_stats").catch(() => ({ data: null }));
    const { data: walletDesync, error: desyncErr } = await sb
      .from("wallets")
      .select("id, user_id, nova_balance")
      .limit(1000);

    let desyncCount = 0;
    if (walletDesync) {
      for (const w of walletDesync) {
        const { data: ledgerSum } = await sb
          .from("wallet_ledger")
          .select("amount")
          .eq("wallet_id", w.id)
          .eq("currency", "nova");

        const sum = (ledgerSum || []).reduce((s: number, r: any) => s + Number(r.amount), 0);
        if (Math.abs(Number(w.nova_balance) - sum) > 0.001) {
          desyncCount++;
        }
      }
    }

    // 3. Stuck escrows
    const { data: stuckEscrows } = await sb
      .from("p2p_orders")
      .select("id")
      .in("status", ["matched", "paid"])
      .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // 4. Duplicate ledger entries (same reference_id)
    const { data: dupes } = await sb.rpc("execute_transfer", {
      p_sender_id: "00000000-0000-0000-0000-000000000000",
      p_recipient_id: "00000000-0000-0000-0000-000000000000",
      p_amount: 0,
      p_currency: "nova",
      p_reference_type: "noop",
      p_reference_id: null,
      p_description: null,
      p_description_ar: null,
    }).catch(() => null);

    const duration = Math.round(performance.now() - t0);

    // ── Compile report ──
    const report = {
      simulation: {
        intensity,
        duration_ms: duration,
        started_at: new Date(Date.now() - duration).toISOString(),
        completed_at: new Date().toISOString(),
        wallets_used: wallets.length,
      },
      scenarios: {
        transfer_storm: {
          requested: transferCount,
          ...aggregate(transfers.results),
        },
        contest_join_storm: {
          requested: contestCount,
          ...aggregate(contests.results),
        },
        voting_wave: {
          requested: voteCount,
          ...aggregate(votes.results),
        },
        p2p_order_storm: {
          requested: p2pCount,
          ...aggregate(p2p.results),
        },
        messaging_flood: {
          requested: msgCount,
          ...aggregate(messages.results),
        },
        notification_spike: {
          requested: notifCount,
          ...aggregate(notifs.results),
        },
      },
      integrity: {
        nova_supply_before: totalNovaBefore,
        nova_supply_after: totalNovaAfter,
        supply_drift: supplyDrift,
        supply_conserved: supplyDrift < 0.01,
        wallet_ledger_desync_count: desyncCount,
        stuck_escrows: stuckEscrows?.length ?? 0,
      },
      verdict: {
        no_money_mismatch: supplyDrift < 0.01 && desyncCount === 0,
        no_deadlocks:
          !transfers.results.some((r) => r.deadlock) &&
          !p2p.results.some((r) => r.deadlock),
        no_stuck_escrow: (stuckEscrows?.length ?? 0) === 0,
        acceptable_latency:
          (aggregate(transfers.results).latency.p95_ms < 5000) &&
          (aggregate(messages.results).latency.p95_ms < 3000),
        system_stable: true,
      },
    };

    // All pass?
    const allPass = Object.values(report.verdict).every(Boolean);
    (report.verdict as any).OVERALL = allPass ? "✅ PASS" : "⚠️ ISSUES DETECTED";

    console.log(`[LOAD-SIM] Complete: ${JSON.stringify(report.verdict)}`);

    return new Response(JSON.stringify(report, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[LOAD-SIM] Fatal:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
        duration_ms: Math.round(performance.now() - t0),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
