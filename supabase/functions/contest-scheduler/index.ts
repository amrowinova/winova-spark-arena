/**
 * Contest Scheduler Edge Function
 * ──────────────────────────────────
 * Automatically creates and manages daily contests aligned to KSA (UTC+3) schedule.
 *
 * Invocation options:
 *   - Cron trigger (pg_cron job) at ~10:00 AM KSA daily
 *   - Manual HTTP call for testing/emergency
 *
 * Actions:
 *   1. ensure_today_contest: Creates today's contest if not present
 *   2. transition_stages: Updates contest status based on current KSA time
 *   3. finalize: Marks contest as 'completed' after 10 PM KSA
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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

  try {
    // ─────────────────────────────────────────────────────────────────────
    // 1. Ensure today's contest exists
    // ─────────────────────────────────────────────────────────────────────
    const { data: existing, error: fetchErr } = await supabase
      .from("contests")
      .select("id, status")
      .eq("contest_date", todayStr)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    let contestId: string;
    let currentStatus: string;

    if (!existing) {
      // Create new contest for today
      const { data: newContest, error: insertErr } = await supabase
        .from("contests")
        .insert({
          title: `Daily Contest – ${todayStr}`,
          title_ar: `المسابقة اليومية – ${todayStr}`,
          description: "Daily Nova contest",
          description_ar: "مسابقة Nova اليومية",
          start_time: ksaTimestamp(10, 0), // 10 AM KSA
          end_time: ksaTimestamp(22, 0), // 10 PM KSA
          entry_fee: 10,
          prize_pool: 0,
          current_participants: 0,
          status: "active",
          contest_date: todayStr,
        })
        .select("id, status")
        .single();

      if (insertErr) throw insertErr;
      contestId = newContest!.id;
      currentStatus = newContest!.status;
    } else {
      contestId = existing.id;
      currentStatus = existing.status;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2. Transition status based on current KSA hour
    // ─────────────────────────────────────────────────────────────────────
    // Statuses: active (join open) → stage1 → final → completed
    let newStatus: string | null = null;

    if (hour >= 22) {
      // After 10 PM → completed (results display)
      if (currentStatus !== "completed") {
        newStatus = "completed";
      }
    } else if (hour >= 20) {
      // 8-10 PM → final
      if (currentStatus !== "final" && currentStatus !== "completed") {
        newStatus = "final";
      }
    } else if (hour >= 14) {
      // 2-8 PM → stage1
      if (currentStatus !== "stage1" && currentStatus !== "final" && currentStatus !== "completed") {
        newStatus = "stage1";
      }
    } else if (hour >= 10) {
      // 10 AM - 2 PM → active (join open)
      if (currentStatus !== "active" && currentStatus !== "stage1" && currentStatus !== "final" && currentStatus !== "completed") {
        newStatus = "active";
      }
    }

    if (newStatus) {
      const { error: updateErr } = await supabase
        .from("contests")
        .update({ status: newStatus })
        .eq("id", contestId);
      if (updateErr) throw updateErr;
    }

    return new Response(
      JSON.stringify({
        success: true,
        contestId,
        previousStatus: currentStatus,
        newStatus: newStatus || currentStatus,
        ksaTime: now.toISOString(),
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
