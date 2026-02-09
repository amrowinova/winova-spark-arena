import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ success: false, error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 1. Gather WINOVA internal state ──
    const [
      { data: failures },
      { data: priorities },
      { data: moneyFlows },
      { data: proposals },
      { data: externalKnowledge },
    ] = await Promise.all([
      supabase.from("ai_failures").select("rpc_name, error_message, created_at").order("created_at", { ascending: false }).limit(30),
      supabase.from("ai_priorities").select("title, severity, confidence_score, status").limit(10),
      supabase.from("ai_money_flow").select("operation, amount, currency, created_at").order("created_at", { ascending: false }).limit(30),
      supabase.from("ai_proposals").select("title, status, priority, affected_area").order("created_at", { ascending: false }).limit(20),
      supabase.from("external_knowledge").select("title, content, source_category, relevance_score, tags").eq("is_processed", true).order("created_at", { ascending: false }).limit(15),
    ]);

    // ── 2. Build analysis prompt ──
    const systemState = {
      top_failures: (failures || []).reduce((acc: any, f: any) => {
        acc[f.rpc_name] = (acc[f.rpc_name] || 0) + 1;
        return acc;
      }, {}),
      current_priorities: priorities || [],
      recent_money_volume: (moneyFlows || []).reduce((sum: number, m: any) => sum + Number(m.amount), 0),
      proposal_stats: {
        total: (proposals || []).length,
        pending: (proposals || []).filter((p: any) => p.status === "pending").length,
        approved: (proposals || []).filter((p: any) => p.status === "approved").length,
      },
      external_intelligence: (externalKnowledge || []).map((e: any) => ({
        title: e.title,
        category: e.source_category,
        relevance: e.relevance_score,
      })),
    };

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: `You are the Strategic Intelligence Engine for WINOVA, a fintech platform with P2P trading, contests, team hierarchy, and Nova/Aura dual currency.

CURRENT SYSTEM STATE:
${JSON.stringify(systemState, null, 2)}

EXTERNAL KNOWLEDGE COLLECTED:
${JSON.stringify(externalKnowledge || [], null, 2)}

Compare WINOVA's current behavior with global best practices and external intelligence.
Generate strategic insights.

Respond with a JSON array of insights (max 5):
[
  {
    "insight_type": "risk|opportunity|performance_gap|architecture|fraud_pattern",
    "category": "security|fintech|engineering|ux|compliance",
    "title": "concise title",
    "title_ar": "عنوان مختصر بالعربي",
    "description": "2-3 sentences explaining the insight",
    "description_ar": "وصف بالعربي",
    "severity": "critical|high|medium|low",
    "confidence_score": 0-100,
    "impact_estimation": "what could happen if ignored",
    "impact_estimation_ar": "تقدير التأثير بالعربي",
    "recommended_action": "specific actionable recommendation",
    "recommended_action_ar": "التوصية بالعربي"
  }
]

RULES:
- Only generate insights that are genuinely relevant to WINOVA
- Be specific, not generic
- Confidence must reflect actual data backing
- Never recommend automatic execution`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`Anthropic API error [${aiResponse.status}]: ${errText}`);
    }

    const aiData = await aiResponse.json();
    const rawText = aiData.content[0].text;
    const insights = JSON.parse(rawText.replace(/```json\n?|\n?```/g, ""));

    // ── 3. Store insights ──
    const insertResults = [];
    for (const insight of insights) {
      const { error } = await supabase.from("ai_strategic_insights").insert({
        insight_type: insight.insight_type,
        category: insight.category,
        title: insight.title,
        title_ar: insight.title_ar,
        description: insight.description,
        description_ar: insight.description_ar,
        severity: insight.severity,
        confidence_score: insight.confidence_score,
        impact_estimation: insight.impact_estimation,
        impact_estimation_ar: insight.impact_estimation_ar,
        recommended_action: insight.recommended_action,
        recommended_action_ar: insight.recommended_action_ar,
        source_knowledge_ids: (externalKnowledge || []).slice(0, 3).map((e: any) => e.id).filter(Boolean),
        status: "new",
      });

      if (!error) {
        insertResults.push(insight.title);
      } else {
        console.error("Insert insight error:", error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        insights_generated: insertResults.length,
        titles: insertResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Insight engine error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
