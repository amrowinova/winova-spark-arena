import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_PATTERN_COUNT = 3; // minimum events to consider a pattern

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const t0 = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const sb = createClient(supabaseUrl, serviceKey);

  try {
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    // 1) Fetch recent knowledge_memory (last 7 days)
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: memories, error: memErr } = await sb
      .from("knowledge_memory")
      .select("id, source, event_type, area, reference_id, payload, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);

    if (memErr) throw memErr;
    if (!memories || memories.length < MIN_PATTERN_COUNT) {
      return new Response(JSON.stringify({ success: true, message: "Not enough data yet", memories_scanned: memories?.length ?? 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Fetch existing rules to avoid duplicates
    const { data: existingRules } = await sb
      .from("knowledge_rules")
      .select("rule_key, description")
      .eq("is_active", true);

    // 3) Ask AI to detect patterns
    const prompt = `You are WINOVA's Rule Discovery Engine. Analyze operational events and detect repeated patterns that should become operational rules.

EXISTING RULES (do NOT duplicate):
${JSON.stringify((existingRules || []).map(r => r.rule_key), null, 2)}

RECENT EVENTS (last 7 days):
${JSON.stringify(memories.map(m => ({
  id: m.id,
  source: m.source,
  event_type: m.event_type,
  area: m.area,
  payload: m.payload,
})), null, 2)}

DETECT:
1. Repeated decisions (same action taken 3+ times)
2. Frequently rejected proposal patterns
3. Common failure reasons (same RPC failing repeatedly)
4. Risk tendencies (same area generating issues)
5. Operational habits (time-based or user-based patterns)

RULES:
- Only suggest rules with HIGH confidence (pattern appears ${MIN_PATTERN_COUNT}+ times)
- Each rule must be actionable and specific
- Do NOT duplicate existing rules
- If no strong patterns exist, return empty array

Return ONLY a JSON array (no markdown):
[
  {
    "rule_key": "short_snake_case_key",
    "description": "English description of the rule",
    "description_ar": "Arabic description",
    "confidence_score": 70-100,
    "pattern_type": "repeated_decision|failure_pattern|risk_tendency|operational_habit|rejection_pattern",
    "sample_count": number_of_events_supporting_this,
    "event_ids": ["id1", "id2", "id3"]
  }
]

If no patterns found, return: []`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      throw new Error(`AI gateway returned ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    let rawContent = aiData.choices?.[0]?.message?.content || "[]";
    
    // Strip markdown fences if present
    rawContent = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let rules: any[];
    try {
      rules = JSON.parse(rawContent);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      rules = [];
    }

    if (!Array.isArray(rules) || rules.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No strong patterns detected", memories_scanned: memories.length, duration_ms: Date.now() - t0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4) Insert discovered rules
    let inserted = 0;
    for (const rule of rules) {
      if (!rule.rule_key || !rule.description) continue;

      // Skip if rule_key already exists
      const existing = (existingRules || []).find(r => r.rule_key === rule.rule_key);
      if (existing) continue;

      const { error: insErr } = await sb.from("knowledge_rules").insert({
        rule_key: rule.rule_key,
        description: rule.description,
        description_ar: rule.description_ar || null,
        confidence_score: Math.min(100, Math.max(0, rule.confidence_score || 50)),
        pattern_type: rule.pattern_type || "unknown",
        sample_count: rule.sample_count || 0,
        generated_from_events: rule.event_ids || [],
        status: "pending_review",
        is_active: false, // inactive until human approves
      });

      if (insErr) {
        console.warn("Failed to insert rule:", rule.rule_key, insErr.message);
      } else {
        inserted++;
      }
    }

    // 5) Log summary to ai_chat_room
    if (inserted > 0) {
      const { data: leadAgent } = await sb
        .from("ai_agents")
        .select("id")
        .eq("agent_role", "engineering_lead")
        .single();

      if (leadAgent) {
        await sb.from("ai_chat_room").insert({
          agent_id: leadAgent.id,
          content: `🧠 Rule Generator scanned ${memories.length} events → discovered ${inserted} new candidate rule(s). Awaiting admin review.`,
          content_ar: `🧠 مولّد القواعد فحص ${memories.length} حدث → اكتشف ${inserted} قاعدة مرشحة جديدة. بانتظار مراجعة المشرف.`,
          message_type: "discussion",
          message_category: "info",
        });
      }
    }

    const duration = Date.now() - t0;
    console.log(`Rule generator: scanned=${memories.length}, rules_inserted=${inserted}, duration=${duration}ms`);

    return new Response(JSON.stringify({
      success: true,
      memories_scanned: memories.length,
      rules_proposed: inserted,
      duration_ms: duration,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Rule generator error:", err);
    return new Response(JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error", duration_ms: Date.now() - t0 }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
