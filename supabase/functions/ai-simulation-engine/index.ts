import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simulation config
const MIN_EVENTS = 50;
const MAX_EVENTS = 300;
const AREAS = ["wallet", "p2p", "contest", "chat"] as const;
const SOURCES = ["system", "ai", "admin", "support"] as const;

const RPC_NAMES = [
  "p2p_create_sell_order", "p2p_create_buy_order", "p2p_execute_order",
  "p2p_confirm_payment", "p2p_release_escrow", "p2p_resolve_dispute",
  "transfer_nova", "convert_nova_to_aura", "join_contest", "cast_vote",
  "update_profile", "send_direct_message",
];

const FAILURE_MESSAGES = [
  "insufficient_balance", "order_already_matched", "wallet_frozen",
  "rate_limit_exceeded", "invalid_amount", "user_not_found",
  "contest_full", "duplicate_entry", "escrow_lock_failed",
  "timeout_exceeded", "permission_denied", "invalid_state_transition",
];

const ACTION_TYPES = [
  "p2p_create_sell", "p2p_create_buy", "p2p_execute", "p2p_confirm_payment",
  "p2p_release_escrow", "p2p_dispute_resolve", "nova_transfer", "aura_convert",
  "contest_join", "contest_vote", "profile_update", "dm_send",
  "login", "signup", "wallet_view", "settings_change",
];

const EVENT_TYPES = [
  "rpc_failure", "proposal_approved", "proposal_rejected",
  "dispute_resolved", "transfer_completed", "transfer_failed",
  "suspicious_activity", "usage_spike", "normal_operation",
  "risk_detected", "anomaly_detected",
];

const MONEY_OPS = [
  "p2p_sell_escrow_lock", "p2p_escrow_release", "p2p_escrow_return",
  "nova_transfer", "aura_conversion", "contest_entry_fee",
  "contest_prize", "team_commission", "spotlight_reward",
];

// Helpers
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function fakeUuid(): string {
  return crypto.randomUUID();
}
function recentTimestamp(): string {
  const offset = rand(0, 6 * 60 * 60 * 1000); // within last 6 hours
  return new Date(Date.now() - offset).toISOString();
}
function weightedBool(successRate: number): boolean {
  return Math.random() < successRate;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // ── Auth Gate: Service Role or Admin ──
  {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (token !== svcKey) {
      const authClient = createClient(Deno.env.get('SUPABASE_URL')!, svcKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: { user } } = await authClient.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: roles } = await authClient.from('user_roles').select('role').eq('user_id', user.id);
      if (!roles?.some((r: any) => r.role === 'admin')) {
        return new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
  }

  const t0 = Date.now();
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const totalEvents = rand(MIN_EVENTS, MAX_EVENTS);
    
    // Distribute: ~40% knowledge_memory, ~20% ai_failures, ~25% ai_activity_stream, ~15% ai_money_flow
    const memoryCount = Math.floor(totalEvents * 0.4);
    const failureCount = Math.floor(totalEvents * 0.2);
    const activityCount = Math.floor(totalEvents * 0.25);
    const moneyCount = totalEvents - memoryCount - failureCount - activityCount;

    let inserted = 0;

    // 1) knowledge_memory events
    const memoryRows = Array.from({ length: memoryCount }, () => {
      const success = weightedBool(0.7);
      const area = pick(AREAS);
      return {
        source: pick(SOURCES),
        event_type: pick(EVENT_TYPES),
        area,
        reference_id: fakeUuid(),
        payload: {
          _synthetic: true,
          success,
          rpc: pick(RPC_NAMES),
          area,
          detail: success ? "operation_completed" : pick(FAILURE_MESSAGES),
          user_id: fakeUuid(),
          amount: rand(1, 5000),
          timestamp: recentTimestamp(),
        },
        created_at: recentTimestamp(),
      };
    });

    const { error: e1 } = await sb.from("knowledge_memory").insert(memoryRows);
    if (e1) console.warn("knowledge_memory insert error:", e1.message);
    else inserted += memoryCount;

    // 2) ai_failures events
    const failureRows = Array.from({ length: failureCount }, () => ({
      rpc_name: pick(RPC_NAMES),
      user_id: null as string | null,
      error_message: `[SIM] ${pick(FAILURE_MESSAGES)}`,
      parameters: {
        _synthetic: true,
        order_id: fakeUuid(),
        amount: rand(1, 2000),
        area: pick(AREAS),
      },
      created_at: recentTimestamp(),
    }));

    const { error: e2 } = await sb.from("ai_failures").insert(failureRows);
    if (e2) console.warn("ai_failures insert error:", e2.message);
    else inserted += failureCount;

    // 3) ai_activity_stream events
    const activityRows = Array.from({ length: activityCount }, () => {
      const success = weightedBool(0.75);
      return {
        action_type: pick(ACTION_TYPES),
        entity_type: pick(["p2p_order", "wallet", "contest", "profile", "message"]),
        entity_id: fakeUuid(),
        success,
        error_code: success ? null : pick(FAILURE_MESSAGES),
        duration_ms: rand(50, 8000),
        role: pick(["user", "admin", "support", "system"]),
        before_state: { _synthetic: true, balance: rand(0, 10000) },
        after_state: { _synthetic: true, balance: rand(0, 10000) },
        created_at: recentTimestamp(),
      };
    });

    const { error: e3 } = await sb.from("ai_activity_stream").insert(activityRows);
    if (e3) console.warn("ai_activity_stream insert error:", e3.message);
    else inserted += activityCount;

    // 4) ai_money_flow events
    const moneyRows = Array.from({ length: moneyCount }, () => ({
      operation: pick(MONEY_OPS),
      amount: rand(1, 5000),
      currency: weightedBool(0.8) ? "nova" : "aura",
      reference_type: pick(["p2p_order", "contest", "transfer", "commission"]),
      reference_id: fakeUuid(),
      created_at: recentTimestamp(),
    }));

    const { error: e4 } = await sb.from("ai_money_flow").insert(moneyRows);
    if (e4) console.warn("ai_money_flow insert error:", e4.message);
    else inserted += moneyCount;

    const duration = Date.now() - t0;
    console.log(`Simulation engine: generated=${inserted}/${totalEvents}, duration=${duration}ms`);

    return new Response(JSON.stringify({
      success: true,
      events_generated: inserted,
      breakdown: { knowledge_memory: memoryCount, ai_failures: failureCount, ai_activity_stream: activityCount, ai_money_flow: moneyCount },
      duration_ms: duration,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Simulation engine error:", err);
    return new Response(JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error", duration_ms: Date.now() - t0 }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
