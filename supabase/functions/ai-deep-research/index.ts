import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REQUIRED_OUTPUT_FILES = [
  "Architecture_Map.md",
  "Economic_Model.md",
  "Liquidity_Exposure.md",
  "Regulatory_Exposure.md",
  "Failure_Scenarios.md",
  "Attack_Surface.md",
  "Mathematical_Validation.md",
  "Sources_References.md",
];

const RESEARCH_DOMAINS = {
  payment_infrastructure: ["SWIFT", "SEPA", "ACH", "RTGS", "Visa/Mastercard settlement"],
  digital_wallets: ["PayPal ledger", "Binance Pay", "Custodial vs non-custodial"],
  liquidity_settlement: ["Net settlement", "RTGS", "Float exposure", "Capital buffer"],
  regulatory: ["EMI (EU)", "MSB (US)", "AML/KYC", "Travel Rule"],
  fraud_risk: ["Chargebacks", "Dispute logic", "Fraud scoring"],
};

const VALIDATION_CHECKS = [
  "conservation_of_value",
  "supply_vs_flow_separation",
  "liquidity_sufficiency",
  "legal_feasibility",
  "adversarial_attack",
];

async function verifyAdmin(req: Request, sb: any) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Auth required");
  const token = authHeader.replace("Bearer ", "");
  const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (token === svcKey) return "service";
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) throw new Error("Invalid token");
  const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", user.id);
  if (!roles?.some((r: any) => r.role === "admin")) throw new Error("Admin required");
  return user.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    await verifyAdmin(req, sb);
    const { action, ...params } = await req.json();

    switch (action) {
      case "create_project": return await createProject(sb, params);
      case "list_projects": return await listProjects(sb);
      case "run_research": return await runResearch(sb, params);
      case "run_simulation": return await runSimulation(sb, params);
      case "get_outputs": return await getOutputs(sb, params);
      case "get_integrity": return await getIntegrity(sb, params);
      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (err: any) {
    const status = err.message.includes("required") || err.message.includes("token") ? 401 : 500;
    return json({ error: err.message }, status);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function createProject(sb: any, p: any) {
  const { data, error } = await sb.from("research_projects").insert({
    name: p.name,
    description: p.description || "",
  }).select().single();
  if (error) throw error;
  return json({ success: true, project: data });
}

async function listProjects(sb: any) {
  const { data, error } = await sb.from("research_projects")
    .select("*, research_outputs(count), research_simulations(count), research_integrity_scores(count)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return json({ projects: data });
}

async function runResearch(sb: any, p: any) {
  const { project_id, topic } = p;
  if (!project_id || !topic) throw new Error("project_id and topic required");

  const groqKey = Deno.env.get("AI_GATEWAY_API_KEY");
  const groqUrl = Deno.env.get("AI_CORE_SERVER_URL") || "https://api.groq.com/openai/v1/chat/completions";

  const domainContext = Object.entries(RESEARCH_DOMAINS)
    .map(([k, v]) => `- ${k}: ${v.join(", ")}`)
    .join("\n");

  const systemPrompt = `You are the WeNova Deep Research Engine (WDRE). You are a financial research and simulation specialist.

RESEARCH DOMAINS:
${domainContext}

RULES:
- Every claim MUST reference official documentation or verifiable sources.
- Distinguish opinion from verified fact. Mark unverified claims as [UNVERIFIED].
- No hallucinated sources. If you don't have a real source, say "Source needed".
- Produce structured, technical analysis only. No marketing language.
- All monetary values must use consistent units.

You must generate content for ALL of these files:
${REQUIRED_OUTPUT_FILES.map((f, i) => `${i + 1}. ${f}`).join("\n")}

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "files": {
    "Architecture_Map.md": "content...",
    "Economic_Model.md": "content...",
    ...all 8 files
  },
  "sources": [
    { "title": "...", "url": "...", "type": "official_doc|whitepaper|regulation|industry_report", "verified": true/false }
  ],
  "integrity_assessment": {
    "mathematical_consistency": 0-100,
    "regulatory_feasibility": 0-100,
    "attack_resistance": 0-100,
    "liquidity_robustness": 0-100,
    "validation_results": {
      "conservation_of_value": { "pass": true/false, "notes": "..." },
      "supply_vs_flow_separation": { "pass": true/false, "notes": "..." },
      "liquidity_sufficiency": { "pass": true/false, "notes": "..." },
      "legal_feasibility": { "pass": true/false, "notes": "..." },
      "adversarial_attack": { "pass": true/false, "notes": "..." }
    },
    "failure_report": null or "string if any validation failed"
  }
}

Return ONLY valid JSON. No markdown fences.`;

  // Call AI
  const aiResp = await fetch(groqUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${groqKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Research Topic: ${topic}\n\nGenerate complete structured research output with all 8 mandatory files, sources, and integrity assessment.` },
      ],
      temperature: 0.3,
      max_tokens: 8000,
      response_format: { type: "json_object" },
    }),
  });

  if (!aiResp.ok) {
    const errText = await aiResp.text();
    throw new Error(`AI call failed: ${errText}`);
  }

  const aiData = await aiResp.json();
  const content = aiData.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI returned invalid JSON");
  }

  // Store outputs
  const files = parsed.files || {};
  const outputRows = REQUIRED_OUTPUT_FILES.map(fileName => ({
    project_id,
    file_name: fileName,
    file_type: "research_document",
    content: files[fileName] || `[NOT GENERATED] ${fileName}`,
  }));

  const { error: outErr } = await sb.from("research_outputs").insert(outputRows);
  if (outErr) console.warn("Output insert error:", outErr.message);

  // Store sources
  const sources = parsed.sources || [];
  if (sources.length > 0) {
    const sourceRows = sources.map((s: any) => ({
      project_id,
      source_type: s.type || "official_doc",
      title: s.title || "Unknown",
      url: s.url || null,
      citation: s.title,
      is_verified: s.verified || false,
    }));
    await sb.from("research_sources").insert(sourceRows);
  }

  // Store integrity score
  const integrity = parsed.integrity_assessment || {};
  const math = integrity.mathematical_consistency || 0;
  const reg = integrity.regulatory_feasibility || 0;
  const atk = integrity.attack_resistance || 0;
  const liq = integrity.liquidity_robustness || 0;
  const overall = Math.round((math + reg + atk + liq) / 4);

  const { data: scoreData } = await sb.from("research_integrity_scores").insert({
    project_id,
    mathematical_consistency: math,
    regulatory_feasibility: reg,
    attack_resistance: atk,
    liquidity_robustness: liq,
    overall_score: overall,
    failure_report: integrity.failure_report || null,
  }).select().single();

  return json({
    success: true,
    files_generated: Object.keys(files).length,
    sources_count: sources.length,
    integrity_score: scoreData,
    validation_results: integrity.validation_results || {},
  });
}

async function runSimulation(sb: any, p: any) {
  const { project_id, scenario, parameters } = p;
  if (!project_id || !scenario) throw new Error("project_id and scenario required");

  const groqKey = Deno.env.get("AI_GATEWAY_API_KEY");
  const groqUrl = Deno.env.get("AI_CORE_SERVER_URL") || "https://api.groq.com/openai/v1/chat/completions";

  const simPrompt = `You are the WeNova Simulation Engine. Run a financial simulation.

SCENARIO: ${scenario}
PARAMETERS: ${JSON.stringify(parameters || {})}

Generate simulation results as JSON:
{
  "settlement_time_model": { "avg_seconds": N, "p95_seconds": N, "breakdown_by_corridor": {...} },
  "liquidity_stress_test": { "min_buffer_required": N, "peak_demand": N, "deficit_probability": N },
  "fx_exposure_model": { "currencies": [...], "max_exposure_pct": N, "hedging_cost_estimate": N },
  "capital_requirements": { "regulatory_minimum": N, "recommended_buffer": N, "jurisdiction_breakdown": {...} },
  "risk_concentration": { "top_corridor_pct": N, "hhi_index": N, "diversification_score": N },
  "failure_probability": { "overall_pct": N, "by_component": {...}, "cascade_risk": "low|medium|high" },
  "validation": {
    "conservation_check": true/false,
    "liquidity_sufficient": true/false,
    "notes": "..."
  }
}

Return ONLY valid JSON.`;

  const t0 = Date.now();

  const aiResp = await fetch(groqUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${groqKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: simPrompt },
        { role: "user", content: `Execute simulation: ${scenario}` },
      ],
      temperature: 0.2,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    }),
  });

  if (!aiResp.ok) throw new Error("Simulation AI call failed");

  const aiData = await aiResp.json();
  const content = aiData.choices?.[0]?.message?.content;
  let results: any;
  try { results = JSON.parse(content); } catch { results = { raw: content }; }

  const duration = Date.now() - t0;

  const { data: simData } = await sb.from("research_simulations").insert({
    project_id,
    scenario,
    parameters: parameters || {},
    results,
    status: "completed",
    duration_ms: duration,
  }).select().single();

  // Auto-generate integrity score for simulation
  const validation = results.validation || {};
  const scores = {
    mathematical_consistency: validation.conservation_check ? 85 : 40,
    regulatory_feasibility: 70,
    attack_resistance: 65,
    liquidity_robustness: validation.liquidity_sufficient ? 80 : 35,
  };
  const overall = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 4);

  await sb.from("research_integrity_scores").insert({
    project_id,
    simulation_id: simData?.id,
    ...scores,
    overall_score: overall,
    failure_report: validation.conservation_check === false ? "Conservation of value check FAILED" : null,
  });

  return json({
    success: true,
    simulation: simData,
    integrity: { ...scores, overall_score: overall },
  });
}

async function getOutputs(sb: any, p: any) {
  const { project_id } = p;
  const { data } = await sb.from("research_outputs")
    .select("*")
    .eq("project_id", project_id)
    .order("created_at", { ascending: false });
  const { data: sources } = await sb.from("research_sources")
    .select("*")
    .eq("project_id", project_id);
  return json({ outputs: data || [], sources: sources || [] });
}

async function getIntegrity(sb: any, p: any) {
  const { project_id } = p;
  const { data } = await sb.from("research_integrity_scores")
    .select("*")
    .eq("project_id", project_id)
    .order("created_at", { ascending: false });
  return json({ scores: data || [] });
}
