import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const apiKey = Deno.env.get("LOVABLE_API_KEY");

  try {
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Parallel reads — all read-only
    const [memRes, failRes, actRes, moneyRes, existingRes] = await Promise.all([
      sb.from("knowledge_memory").select("event_type, area, payload").gte("created_at", since).limit(300),
      sb.from("ai_failures").select("rpc_name, error_message, parameters").gte("created_at", since).limit(200),
      sb.from("ai_activity_stream").select("action_type, entity_type, success, error_code, duration_ms").gte("created_at", since).limit(300),
      sb.from("ai_money_flow").select("operation, amount, currency, reference_type").gte("created_at", since).limit(200),
      sb.from("ai_product_proposals").select("title").eq("status", "pending"),
    ]);

    const memories = memRes.data || [];
    const failures = failRes.data || [];
    const activities = actRes.data || [];
    const moneyFlows = moneyRes.data || [];
    const existingTitles = (existingRes.data || []).map((p: any) => p.title);
    const totalEvents = memories.length + failures.length + activities.length + moneyFlows.length;

    if (totalEvents < 5) {
      return new Response(JSON.stringify({ success: true, message: "Not enough data", events_scanned: totalEvents }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are WINOVA Product Strategist. Analyze real system telemetry and discover product opportunities.

EXISTING PENDING PROPOSALS (do NOT duplicate):
${JSON.stringify(existingTitles)}

DATA WINDOW: Last 24 hours (${totalEvents} events)

KNOWLEDGE MEMORY (${memories.length}):
${JSON.stringify(memories.slice(0, 100))}

FAILURES (${failures.length}):
${JSON.stringify(failures.slice(0, 80))}

ACTIVITY STREAM (${activities.length}):
${JSON.stringify(activities.slice(0, 100))}

MONEY FLOWS (${moneyFlows.length}):
${JSON.stringify(moneyFlows.slice(0, 80))}

DETECT:
1. Repeated friction (same failure 3+ times)
2. High-usage behaviors worth amplifying
3. Growth signals (increasing activity in specific areas)
4. UX delays (high duration_ms patterns)
5. Abandonment patterns (started but not completed)
6. Revenue opportunities (undermonetized flows)

RULES:
- Only suggest if pattern appears multiple times in data
- No hallucinations — base everything on the data above
- Do NOT duplicate existing pending proposals
- Max 5 ideas per run
- Each must be actionable and specific to WINOVA
- If nothing strong → return []

Return ONLY a JSON array (no markdown):
[
  {
    "title": "Short English title",
    "title_ar": "Short Arabic title",
    "description": "Detailed English description of the opportunity and how to act on it",
    "description_ar": "Arabic description",
    "opportunity_type": "revenue|ux|risk|growth",
    "confidence_score": 50-100,
    "estimated_impact": "high|medium|low",
    "based_on_events": number_of_supporting_events,
    "data_window": "24h"
  }
]`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "user", content: prompt }], temperature: 0.3 }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      throw new Error(`AI gateway ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    let raw = aiData.choices?.[0]?.message?.content || "[]";
    raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let proposals: any[];
    try { proposals = JSON.parse(raw); } catch { proposals = []; }
    if (!Array.isArray(proposals)) proposals = [];

    // Insert proposals
    let inserted = 0;
    for (const p of proposals.slice(0, 5)) {
      if (!p.title || !p.description) continue;
      if (existingTitles.includes(p.title)) continue;

      const { error } = await sb.from("ai_product_proposals").insert({
        title: p.title,
        title_ar: p.title_ar || null,
        description: p.description,
        description_ar: p.description_ar || null,
        opportunity_type: p.opportunity_type || "ux",
        confidence_score: Math.min(100, Math.max(0, p.confidence_score || 50)),
        estimated_impact: p.estimated_impact || "medium",
        based_on_events: p.based_on_events || 0,
        data_window: "24h",
        status: "pending",
        generated_by: "product_brain",
      });
      if (!error) inserted++;
    }

    // Post summary to ai_chat_room
    if (inserted > 0) {
      const { data: lead } = await sb.from("ai_agents").select("id").eq("agent_role", "engineering_lead").single();
      if (lead) {
        await sb.from("ai_chat_room").insert({
          agent_id: lead.id,
          content: `💡 Product Brain scanned ${totalEvents} events (24h) → discovered ${inserted} product opportunity(ies). Awaiting review.`,
          content_ar: `💡 العقل المنتج فحص ${totalEvents} حدث (24 ساعة) → اكتشف ${inserted} فرصة منتج. بانتظار المراجعة.`,
          message_type: "discussion",
          message_category: "info",
        });
      }
    }

    return new Response(JSON.stringify({ success: true, events_scanned: totalEvents, proposals_created: inserted, duration_ms: Date.now() - t0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Product discovery error:", err);
    return new Response(JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown", duration_ms: Date.now() - t0 }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
