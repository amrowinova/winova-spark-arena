/**
 * Contest Reminder Edge Function
 * ────────────────────────────────
 * Sends in-app notifications to active users who haven't entered today's
 * contest yet, 30 minutes before voting begins (18:30 KSA = 15:30 UTC).
 *
 * Cron schedule: "30 15 * * *"  (15:30 UTC = 18:30 KSA/UTC+3)
 *
 * Logic:
 *  1. Get today's contest (must be in 'active' status)
 *  2. Get all weekly_active profiles
 *  3. Exclude users who already entered today
 *  4. Insert contest_reminder notification for each remaining user
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

  try {
    // 1. Get today's contest (must exist and be active/stage1)
    const { data: contest, error: contestErr } = await db
      .from("contests")
      .select("id, status, contest_date")
      .eq("contest_date", today)
      .in("status", ["active", "stage1"])
      .maybeSingle();

    if (contestErr) throw contestErr;
    if (!contest) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: "no active contest today" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get all active user IDs (weekly_active = true)
    const { data: activeProfiles, error: profilesErr } = await db
      .from("profiles")
      .select("user_id")
      .eq("weekly_active", true);

    if (profilesErr) throw profilesErr;
    if (!activeProfiles?.length) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: "no active users" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allActiveUserIds = activeProfiles.map((p) => p.user_id);

    // 3. Get users who already entered today's contest
    const { data: entries } = await db
      .from("contest_entries")
      .select("user_id")
      .eq("contest_id", contest.id);

    const alreadyEnteredSet = new Set((entries ?? []).map((e) => e.user_id));

    // 4. Get users who already received this reminder today (dedup)
    const { data: existingReminders } = await db
      .from("notifications")
      .select("user_id")
      .eq("type", "contest_reminder")
      .gte("created_at", `${today}T00:00:00+03:00`);

    const alreadyReminderSet = new Set((existingReminders ?? []).map((n) => n.user_id));

    // 5. Build notification rows for users who need a reminder
    const toNotify = allActiveUserIds.filter(
      (uid) => !alreadyEnteredSet.has(uid) && !alreadyReminderSet.has(uid)
    );

    if (!toNotify.length) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: "all users already entered or notified" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const notifications = toNotify.map((uid) => ({
      user_id: uid,
      type: "contest_reminder",
      title: "Contest Opening Soon",
      title_ar: "المسابقة تفتح قريباً",
      description: "Daily contest voting starts in 30 minutes — don't miss out!",
      description_ar: "التصويت في المسابقة اليومية يبدأ خلال 30 دقيقة — لا تفوّت الفرصة!",
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

    return new Response(
      JSON.stringify({ success: true, sent: totalInserted, contestId: contest.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[contest-reminder] error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
