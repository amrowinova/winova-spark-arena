import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Types ────────────────────────────────────────

interface Priority {
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  category: "fix" | "risk" | "growth" | "revenue" | "performance";
  severity: "critical" | "high" | "medium" | "low";
  confidence_score: number;
  estimated_impact: "high" | "medium" | "low";
  source: "engineer" | "product" | "rule" | "anomaly";
  reference_id?: string;
  reasoning: string;
}

// ─── Data Collection ──────────────────────────────

async function collectEngineerReports(sb: any, since: string) {
  const { data } = await sb
    .from("ai_engineer_reports")
    .select("id, summary, summary_ar, findings_count, critical_issues, patches_proposed, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);
  return data || [];
}

async function collectProposals(sb: any, since: string) {
  const { data } = await sb
    .from("ai_proposals")
    .select("id, title, title_ar, description, priority, status, affected_area, confidence_score, risk_label, source, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(100);
  return data || [];
}

async function collectKnowledgeRules(sb: any, since: string) {
  const { data } = await sb
    .from("knowledge_rules")
    .select("id, rule_key, description, description_ar, pattern_type, confidence_score, sample_count, status, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);
  return data || [];
}

async function collectProductProposals(sb: any, since: string) {
  const { data } = await sb
    .from("ai_product_proposals")
    .select("id, title, title_ar, description, opportunity_type, confidence_score, estimated_impact, status, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);
  return data || [];
}

async function collectAnalysisLogs(sb: any, since: string) {
  const { data } = await sb
    .from("ai_analysis_logs")
    .select("id, title, title_ar, description, severity, affected_area, technical_reason, suggested_fix, status, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(100);
  return data || [];
}

// ─── AI Analysis ──────────────────────────────────

async function analyzeWithAI(
  apiKey: string,
  engineerReports: any[],
  proposals: any[],
  rules: any[],
  productProposals: any[],
  analysisLogs: any[]
): Promise<Priority[]> {
  const prompt = `You are WINOVA's Executive Brain — the CEO-level strategic intelligence.

You have access to the last 24 hours of outputs from ALL AI subsystems:

## Engineer Reports (technical issues detected)
${JSON.stringify(engineerReports, null, 2)}

## AI Proposals (suggested fixes & improvements)
${JSON.stringify(proposals, null, 2)}

## Knowledge Rules (behavioral patterns discovered)
${JSON.stringify(rules, null, 2)}

## Product Proposals (product opportunities)
${JSON.stringify(productProposals, null, 2)}

## Analysis Logs (anomalies & findings)
${JSON.stringify(analysisLogs, null, 2)}

## Your Mission
If you were the CEO of WINOVA, what should be fixed or prioritized NOW?

1. Cross-reference all inputs to find the highest-impact items
2. Rank by urgency and business impact
3. Assign severity (critical/high/medium/low)
4. Estimate impact (high/medium/low)
5. Give confidence score (0-100)
6. Explain your reasoning clearly

## Rules
- Maximum 5 priorities per run
- Only propose items backed by real data from the inputs above
- No hallucinations — if no strong signal exists, return []
- No duplicates — merge related items into one priority
- Each priority must have a clear source (engineer/product/rule/anomaly)
- Never propose executing changes — only propose decisions
- Include reference_id when linking to a specific source record

## Categories
- fix: Something broken that needs repair
- risk: Security or financial risk requiring attention
- growth: Opportunity to grow users or engagement
- revenue: Opportunity to increase revenue
- performance: System performance improvement

Respond with a JSON array:
[{
  "title": "Short priority title",
  "title_ar": "العنوان بالعربي",
  "description": "What needs attention and why",
  "description_ar": "الوصف بالعربي",
  "category": "fix|risk|growth|revenue|performance",
  "severity": "critical|high|medium|low",
  "confidence_score": 85,
  "estimated_impact": "high|medium|low",
  "source": "engineer|product|rule|anomaly",
  "reference_id": "optional uuid or identifier",
  "reasoning": "Why this matters NOW"
}]

If no strong priorities exist, respond with: []`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a senior executive strategist analyzing multi-system intelligence. Respond only with valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[Executive Brain] AI failed:", response.status, text);
    throw new Error(`AI analysis failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim() || "[]";

  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  try {
    const priorities = JSON.parse(jsonStr);
    return Array.isArray(priorities) ? priorities.slice(0, 5) : [];
  } catch (e) {
    console.error("[Executive Brain] JSON parse failed:", e, content);
    return [];
  }
}

// ─── Main Handler ─────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    console.log(`[Executive Brain] Collecting data since ${since}`);

    // ─── Collect from all AI subsystems ────────────
    const [engineerReports, proposals, rules, productProposals, analysisLogs] = await Promise.all([
      collectEngineerReports(sb, since),
      collectProposals(sb, since),
      collectKnowledgeRules(sb, since),
      collectProductProposals(sb, since),
      collectAnalysisLogs(sb, since),
    ]);

    const totalInputs =
      engineerReports.length + proposals.length + rules.length +
      productProposals.length + analysisLogs.length;

    console.log(`[Executive Brain] Inputs: ${engineerReports.length} eng, ${proposals.length} prop, ${rules.length} rules, ${productProposals.length} prod, ${analysisLogs.length} logs = ${totalInputs} total`);

    // If no data at all, skip AI call
    if (totalInputs === 0) {
      console.log("[Executive Brain] No data — skipping.");
      return new Response(JSON.stringify({
        success: true,
        priorities: 0,
        message: "No data to analyze",
        duration_ms: Date.now() - t0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── AI Analysis ───────────────────────────────
    const priorities = await analyzeWithAI(
      apiKey, engineerReports, proposals, rules, productProposals, analysisLogs
    );
    console.log(`[Executive Brain] AI ranked ${priorities.length} priorities`);

    // ─── Insert into ai_priorities ─────────────────
    let criticalCount = 0;
    let highCount = 0;

    for (const p of priorities) {
      if (p.severity === "critical") criticalCount++;
      if (p.severity === "high") highCount++;

      const { error } = await sb.from("ai_priorities").insert({
        title: p.title,
        title_ar: p.title_ar,
        description: p.description,
        description_ar: p.description_ar,
        category: p.category,
        severity: p.severity,
        confidence_score: p.confidence_score,
        estimated_impact: p.estimated_impact,
        requires_approval: true,
        source: p.source,
        reference_id: p.reference_id || null,
        status: "pending",
      });

      if (error) console.error("[Executive Brain] Insert error:", error.message);
    }

    // ─── Post summary to ai_chat_room ──────────────
    if (priorities.length > 0) {
      const { data: agent } = await sb
        .from("ai_agents")
        .select("id")
        .eq("is_active", true)
        .limit(1)
        .single();

      if (agent) {
        const summary = `🧠 **Executive Brain ranked ${priorities.length} priorities.** ${criticalCount} critical, ${highCount} high.

${priorities.map((p, i) => `${i + 1}. **${p.title}** [${p.severity}/${p.category}] — ثقة ${p.confidence_score}%`).join("\n")}`;

        const summaryAr = `🧠 **الدماغ التنفيذي رتّب ${priorities.length} أولويات.** ${criticalCount} حرجة، ${highCount} عالية.

${priorities.map((p, i) => `${i + 1}. **${p.title_ar}** [${p.severity}/${p.category}] — ثقة ${p.confidence_score}%`).join("\n")}`;

        await sb.from("ai_chat_room").insert({
          agent_id: agent.id,
          content: summary,
          content_ar: summaryAr,
          message_type: "executive_priority",
          message_category: criticalCount > 0 ? "critical" : highCount > 0 ? "warning" : "info",
          is_summary: true,
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      priorities: priorities.length,
      critical: criticalCount,
      high: highCount,
      duration_ms: Date.now() - t0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: unknown) {
    console.error("[Executive Brain] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
