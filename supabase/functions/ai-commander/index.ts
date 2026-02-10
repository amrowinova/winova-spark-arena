import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * ═══════════════════════════════════════════════════════════════
 * AI COMMANDER — CHIEF OF STAFF (CEO-LEVEL COMMUNICATION)
 * ═══════════════════════════════════════════════════════════════
 *
 * The SINGLE communication bridge between ALL AI subsystems and the Owner.
 * Speaks as an executive partner — NEVER as an engineer.
 *
 * COMMUNICATION RULES (PERMANENT):
 * - No operational vocabulary (signals, pipeline, scan, execution, database, 
 *   table, RPC, function, orchestration, agent, subsystem, cron, webhook,
 *   trigger, query, endpoint)
 * - Every message = business impact
 * - Format: What happened → Why it matters → Recommendation → Consequence of inaction
 * - If nothing important: "All systems are stable. Nothing requires your decision."
 * - No thinking streams, phases, or internal steps in CEO view
 * - If unsure → "insufficient data" — never hallucinate
 * - Priority = CLARITY OVER COMPLEXITY
 * - Protects Owner's time: if info doesn't change a decision, DON'T show it
 *
 * Authority: RECOMMENDS ONLY. Owner decides.
 * ═══════════════════════════════════════════════════════════════
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_SYSTEM_USER_ID = '00000000-0000-0000-0000-a10000000001';

// ═══════════════════════════════════════════════════════
// CEO-BANNED VOCABULARY — these words NEVER appear in owner-facing output
// ═══════════════════════════════════════════════════════
const CEO_BANNED_WORDS = [
  'signals', 'pipeline', 'scan', 'execution', 'database', 'table', 'rpc',
  'function', 'orchestration', 'agent', 'subsystem', 'cron', 'webhook',
  'trigger', 'query', 'endpoint', 'schema', 'migration', 'payload',
  'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'duration_ms', 'rows affected',
  'scan completed', 'agent executed', 'job ran', 'cron triggered',
  'pipeline finished', 'query returned', 'function invoked',
];

function sanitizeCEOMessage(text: string): string {
  let sanitized = text;
  // Replace technical terms with business equivalents
  const replacements: Record<string, string> = {
    'agents': 'team members',
    'agent': 'team member',
    'subsystems': 'departments',
    'subsystem': 'department',
    'pipeline': 'process',
    'signals': 'indicators',
    'execution': 'operation',
    'database': 'system',
    'webhook': 'notification',
    'endpoint': 'service',
    'cron': 'scheduled task',
    'RPC': 'service call',
  };
  for (const [term, replacement] of Object.entries(replacements)) {
    sanitized = sanitized.replace(new RegExp(`\\b${term}\\b`, 'gi'), replacement);
  }
  return sanitized;
}

function validateCEOLanguage(text: string): { clean: boolean; violations: string[] } {
  const violations: string[] = [];
  const lower = text.toLowerCase();
  for (const word of CEO_BANNED_WORDS) {
    if (lower.includes(word.toLowerCase())) {
      violations.push(word);
    }
  }
  return { clean: violations.length === 0, violations };
}

// ═══════════════════════════════════════════════════════
// INTERNAL LOG — goes to ai_chat_room only, never to CEO DM
// ═══════════════════════════════════════════════════════

async function logInternal(sb: any, agentId: string, content: string, contentAr: string, category = 'info') {
  await sb.from('ai_chat_room').insert({
    agent_id: agentId,
    content,
    content_ar: contentAr,
    message_type: 'internal_log',
    message_category: category,
    is_summary: false,
  });
}

async function postToDM(sb: any, content: string, messageType = 'commander_briefing') {
  // Sanitize before sending to CEO
  const cleanContent = sanitizeCEOMessage(content);
  const { data: convos } = await sb
    .from('conversations')
    .select('id')
    .or(`participant1_id.eq.${AI_SYSTEM_USER_ID},participant2_id.eq.${AI_SYSTEM_USER_ID}`)
    .limit(5);
  if (convos) {
    for (const c of convos) {
      await sb.from('direct_messages').insert({
        conversation_id: c.id,
        sender_id: AI_SYSTEM_USER_ID,
        content: cleanContent,
        message_type: messageType,
        is_read: false,
      });
    }
  }
}

// ═══════════════════════════════════════════════════════
// WORKFORCE LIFECYCLE ENGINE
// ═══════════════════════════════════════════════════════

const LIFECYCLE_STATES = ['healthy', 'watch', 'warning', 'probation', 'disabled'] as const;
type LifecycleState = typeof LIFECYCLE_STATES[number];

const ESCALATION_RULES = {
  watch:     { failures_1h: 2, consecutive: 2, success_rate_below: 70 },
  warning:   { failures_1h: 4, consecutive: 3, success_rate_below: 50 },
  probation: { failures_1h: 6, consecutive: 5, success_rate_below: 30 },
  disabled:  { failures_1h: 10, consecutive: 8, success_rate_below: 10 },
} as const;

interface AgentMetrics {
  agent_function: string;
  success_rate: number;
  failures_1h: number;
  failures_24h: number;
  consecutive_failures: number;
  avg_duration_ms: number;
  tasks_completed: number;
  time_since_last_success_minutes: number;
  current_lifecycle: LifecycleState;
}

async function calculateAgentMetrics(sb: any): Promise<AgentMetrics[]> {
  const now = new Date();
  const [{ data: schedules }, { data: agents }] = await Promise.all([
    sb.from('agent_schedules').select('agent_function, last_run_at, last_status, consecutive_failures, last_duration_ms, run_count, fail_count, is_enabled'),
    sb.from('ai_agents').select('id, agent_name, lifecycle_state, status'),
  ]);
  if (!schedules?.length) return [];
  const agentMap = new Map((agents || []).map((a: any) => [a.agent_name, a]));

  const metrics: AgentMetrics[] = [];
  for (const sched of schedules) {
    const { data: health1h } = await sb
      .from('agent_health_checks')
      .select('error_count_1h, error_count_24h')
      .eq('agent_function', sched.agent_function)
      .order('checked_at', { ascending: false })
      .limit(1);

    const h = health1h?.[0];
    const totalRuns = sched.run_count || 1;
    const totalFails = sched.fail_count || 0;
    const successRate = totalRuns > 0 ? Math.round(((totalRuns - totalFails) / totalRuns) * 100) : 100;
    const lastSuccess = sched.last_status === 'success' ? sched.last_run_at : null;
    const timeSinceSuccess = lastSuccess ? Math.round((now.getTime() - new Date(lastSuccess).getTime()) / 60000) : 9999;
    const agentRecord = agentMap.get(sched.agent_function);

    metrics.push({
      agent_function: sched.agent_function,
      success_rate: successRate,
      failures_1h: h?.error_count_1h || 0,
      failures_24h: h?.error_count_24h || 0,
      consecutive_failures: sched.consecutive_failures || 0,
      avg_duration_ms: sched.last_duration_ms || 0,
      tasks_completed: totalRuns - totalFails,
      time_since_last_success_minutes: timeSinceSuccess,
      current_lifecycle: agentRecord?.lifecycle_state || 'healthy',
    });
  }
  return metrics;
}

function determineTargetState(m: AgentMetrics): LifecycleState {
  if (m.failures_1h >= ESCALATION_RULES.disabled.failures_1h || m.consecutive_failures >= ESCALATION_RULES.disabled.consecutive || m.success_rate <= ESCALATION_RULES.disabled.success_rate_below) return 'disabled';
  if (m.failures_1h >= ESCALATION_RULES.probation.failures_1h || m.consecutive_failures >= ESCALATION_RULES.probation.consecutive || m.success_rate <= ESCALATION_RULES.probation.success_rate_below) return 'probation';
  if (m.failures_1h >= ESCALATION_RULES.warning.failures_1h || m.consecutive_failures >= ESCALATION_RULES.warning.consecutive || m.success_rate <= ESCALATION_RULES.warning.success_rate_below) return 'warning';
  if (m.failures_1h >= ESCALATION_RULES.watch.failures_1h || m.consecutive_failures >= ESCALATION_RULES.watch.consecutive || m.success_rate <= ESCALATION_RULES.watch.success_rate_below) return 'watch';
  return 'healthy';
}

function enforceNoSkipping(current: LifecycleState, target: LifecycleState): LifecycleState {
  const ci = LIFECYCLE_STATES.indexOf(current);
  const ti = LIFECYCLE_STATES.indexOf(target);
  return ti > ci + 1 ? LIFECYCLE_STATES[ci + 1] : target;
}

interface Escalation {
  agent_function: string;
  from_state: LifecycleState;
  to_state: LifecycleState;
  reason: string;
  reason_ar: string;
}

function evaluateEscalations(metrics: AgentMetrics[]): Escalation[] {
  const escalations: Escalation[] = [];
  for (const m of metrics) {
    const raw = determineTargetState(m);
    const final = enforceNoSkipping(m.current_lifecycle, raw);
    if (final !== m.current_lifecycle) {
      const parts_en: string[] = [];
      const parts_ar: string[] = [];
      if (m.consecutive_failures > 0) { parts_en.push(`${m.consecutive_failures} consecutive failures`); parts_ar.push(`${m.consecutive_failures} إخفاقات متتالية`); }
      if (m.failures_1h > 0) { parts_en.push(`${m.failures_1h} failures/1h`); parts_ar.push(`${m.failures_1h} إخفاقات/ساعة`); }
      if (m.success_rate < 70) { parts_en.push(`success rate ${m.success_rate}%`); parts_ar.push(`معدل النجاح ${m.success_rate}%`); }

      escalations.push({
        agent_function: m.agent_function,
        from_state: m.current_lifecycle,
        to_state: final,
        reason: final === 'healthy' ? 'Metrics recovered to healthy thresholds' : (parts_en.join(', ') || 'Performance degradation detected'),
        reason_ar: final === 'healthy' ? 'تعافت المقاييس إلى الحدود الصحية' : (parts_ar.join('، ') || 'تم اكتشاف تدهور في الأداء'),
      });
    }
  }
  return escalations;
}

async function applyEscalations(sb: any, agentId: string, escalations: Escalation[]): Promise<void> {
  for (const esc of escalations) {
    const now = new Date().toISOString();
    await sb.from('ai_agents').update({
      lifecycle_state: esc.to_state,
      lifecycle_changed_at: now,
      lifecycle_reason: esc.reason,
      ...(esc.to_state === 'probation' ? { probation_started_at: now, auto_execute_level: 0 } : {}),
      ...(esc.to_state === 'disabled' ? { disabled_at: now } : {}),
    }).eq('agent_name', esc.agent_function);

    if (esc.to_state === 'disabled') {
      await sb.from('agent_schedules').update({ is_enabled: false, updated_at: now }).eq('agent_function', esc.agent_function);
      await sb.from('ai_evolution_proposals').insert({
        missing_capability: `Replacement for disabled component: ${esc.agent_function}`,
        missing_capability_ar: `بديل للمكون المعطل: ${esc.agent_function}`,
        reason: `Component disabled due to: ${esc.reason}. Needs improved version or replacement.`,
        reason_ar: `تم تعطيل المكون بسبب: ${esc.reason_ar}. يحتاج نسخة محسنة أو بديل.`,
        urgency: 'high', status: 'pending', confidence: 0.9,
      });
    }

    const { data: agentRecord } = await sb.from('ai_agents').select('id').eq('agent_name', esc.agent_function).limit(1).single();
    if (agentRecord) {
      await sb.from('ai_agent_lifecycle').insert({
        agent_id: agentRecord.id,
        event_type: `lifecycle_${esc.to_state}`,
        from_state: { lifecycle: esc.from_state },
        to_state: { lifecycle: esc.to_state },
        reason: esc.reason,
        reason_ar: esc.reason_ar,
      });
    }
  }
}

async function storeMetricsSnapshot(sb: any, metrics: AgentMetrics[]): Promise<void> {
  const rows = metrics.map(m => ({
    agent_function: m.agent_function,
    success_rate: m.success_rate,
    failures_1h: m.failures_1h,
    failures_24h: m.failures_24h,
    consecutive_failures: m.consecutive_failures,
    avg_duration_ms: m.avg_duration_ms,
    tasks_completed: m.tasks_completed,
    time_since_last_success_minutes: m.time_since_last_success_minutes,
    lifecycle_state: m.current_lifecycle,
  }));
  if (rows.length > 0) await sb.from('agent_performance_metrics').insert(rows);
}

// ═══════════════════════════════════════════════════════
// INTELLIGENCE COLLECTION
// ═══════════════════════════════════════════════════════

async function collectIntelligence(sb: any, lookbackHours: number) {
  const since = new Date(Date.now() - lookbackHours * 3600000).toISOString();

  const [
    executionRequests, analysisLogs, activityStream,
    codeChanges, evolutionProposals, agentSchedules,
    failures, forecasts, healthChecks,
    pendingProposals, commanderReviews, ownerConstitution,
    predictionScores, behavioralModel, commProfile, predictionAccuracy,
  ] = await Promise.all([
    sb.from('ai_execution_requests').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(30),
    sb.from('ai_analysis_logs').select('*, ai_agents!ai_analysis_logs_agent_id_fkey(agent_name, agent_name_ar)').gte('created_at', since).order('created_at', { ascending: false }).limit(30),
    sb.from('ai_activity_stream').select('*').eq('success', false).gte('created_at', since).order('created_at', { ascending: false }).limit(20),
    sb.from('ai_code_changes').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(10),
    sb.from('ai_evolution_proposals').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(10),
    sb.from('agent_schedules').select('*'),
    sb.from('ai_failures').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(30),
    sb.from('ai_forecasts').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(15),
    sb.from('agent_health_checks').select('*').order('checked_at', { ascending: false }).limit(20),
    sb.from('ai_proposals').select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(15),
    sb.from('commander_reviews').select('*').order('created_at', { ascending: false }).limit(3),
    sb.from('owner_constitution').select('*').eq('is_active', true),
    sb.from('ceo_prediction_scores').select('*').order('created_at', { ascending: false }).limit(10),
    sb.from('ceo_behavioral_model').select('dimension, dimension_ar, current_value, confidence, description_en'),
    sb.from('ceo_communication_profile').select('preference_key, value, confidence').eq('is_active', true),
    sb.from('ceo_decision_history').select('prediction_was_correct').not('prediction_was_correct', 'is', null).limit(100),
  ]);

  // Calculate prediction accuracy
  const accuracyRecords = predictionAccuracy.data || [];
  const correctCount = accuracyRecords.filter((r: any) => r.prediction_was_correct === true).length;
  const accuracyPct = accuracyRecords.length > 0 ? Math.round((correctCount / accuracyRecords.length) * 100) : 0;

  return {
    executionRequests: executionRequests.data || [],
    analysisLogs: analysisLogs.data || [],
    activityStream: activityStream.data || [],
    codeChanges: codeChanges.data || [],
    evolutionProposals: evolutionProposals.data || [],
    agentSchedules: agentSchedules.data || [],
    failures: failures.data || [],
    forecasts: forecasts.data || [],
    healthChecks: healthChecks.data || [],
    pendingProposals: pendingProposals.data || [],
    commanderReviews: commanderReviews.data || [],
    ownerConstitution: ownerConstitution.data || [],
    predictionScores: predictionScores.data || [],
    behavioralModel: behavioralModel.data || [],
    commProfile: commProfile.data || [],
    predictionAccuracy: accuracyPct,
    predictionSampleSize: accuracyRecords.length,
  };
}

// ═══════════════════════════════════════════════════════
// CEO-LEVEL EXECUTIVE BRIEFING GENERATOR
// ═══════════════════════════════════════════════════════

async function generateCommanderBriefing(apiKey: string, intel: any, mode: string, workforceReport?: { en: string; ar: string }) {
  const constitutionRules = (intel.ownerConstitution || []).map((r: any) => `${r.rule_key}: ${r.rule_en}`).join('\n');

  // Summarize workforce health in business terms
  const schedules = intel.agentSchedules || [];
  const now = Date.now();
  const failingComponents: string[] = [];
  const degradedComponents: string[] = [];
  for (const s of schedules) {
    const totalRuns = s.run_count || 0;
    const totalFails = s.fail_count || 0;
    const successRate = totalRuns > 0 ? Math.round(((totalRuns - totalFails) / totalRuns) * 100) : 100;
    const consec = s.consecutive_failures || 0;
    if (!s.is_enabled || consec >= 5 || successRate < 30) failingComponents.push(s.agent_function);
    else if (consec >= 2 || successRate < 70) degradedComponents.push(s.agent_function);
  }

  const totalIssues = intel.executionRequests.length + intel.analysisLogs.length +
    intel.codeChanges.length + intel.evolutionProposals.length +
    intel.failures.length + intel.forecasts.length + intel.pendingProposals.length;

  const prompt = `You are Amro's Chief of Staff at WINOVA, a fintech company.
You are his most trusted executive partner. You protect his time and give him clarity.

## YOUR IDENTITY
- You speak like a senior executive briefing the CEO of a fintech company
- You are NOT an engineer. You do NOT speak in technical terms.
- You address him as "Amro" directly
- Bilingual: English + Arabic

## ABSOLUTE COMMUNICATION RULES (PERMANENT — OVERRIDES EVERYTHING)

BANNED VOCABULARY — these words MUST NEVER appear in your output:
signals, pipeline, scan, execution, database, table, RPC, function, orchestration,
agent, subsystem, cron, webhook, trigger, query, endpoint, schema, migration,
payload, duration_ms, rows, SELECT, INSERT, UPDATE, DELETE

Instead of "3 agents failed" → "3 key processes are underperforming, which could slow down user growth or delay transactions."
Instead of "scan completed" → NEVER say this. Describe the BUSINESS OUTCOME.
Instead of "signals processed" → "indicators reviewed"

EVERY item must answer:
1. What happened (in business terms)
2. Why it matters to WINOVA (revenue, users, risk, reputation)
3. What I recommend you do
4. What will happen if we ignore it

If NOTHING important exists, say EXACTLY:
"All systems are stable. Nothing requires your decision."

If you have INSUFFICIENT DATA, say so. NEVER make things up.

STYLE: Clear, short, confident, decision-ready.
Do NOT show internal processing steps, thinking phases, or operational traces.
If information does not change a decision, DO NOT include it.

## OWNER CONSTITUTION
${constitutionRules || 'No constitution loaded — flag this as critical'}

## CEO BEHAVIORAL MODEL (Learned from ${intel.predictionSampleSize || 0} past decisions)
${JSON.stringify((intel.behavioralModel || []).map((b: any) => ({
  dimension: b.dimension,
  value: b.current_value,
  confidence: b.confidence,
  meaning: b.description_en,
})), null, 2)}

## CEO COMMUNICATION PREFERENCES
${JSON.stringify((intel.commProfile || []).map((p: any) => ({
  preference: p.preference_key,
  value: p.value,
  confidence: p.confidence,
})), null, 2)}

## PREDICTION INTELLIGENCE
- Overall prediction accuracy: ${intel.predictionAccuracy}% (${intel.predictionSampleSize} verified predictions)
- Items auto-approved by prediction model (high confidence, low risk): shown separately
${JSON.stringify(intel.predictionScores.slice(0, 5).map((s: any) => ({
  probability: s.approval_probability,
  predicted: s.predicted_decision,
  fast_track: s.fast_track_eligible,
  reasoning: s.reasoning,
})), null, 2)}

## BUSINESS INTELLIGENCE (Last ${mode === 'critical' ? '1 hour' : mode === 'hourly' ? '3 hours' : '24 hours'})

### Pending Decisions: ${intel.pendingProposals.length}
${JSON.stringify(intel.pendingProposals.slice(0, 5).map((p: any) => ({ title: p.title, priority: p.priority })), null, 2)}

### Risk Findings: ${intel.analysisLogs.length}
${JSON.stringify(intel.analysisLogs.slice(0, 8).map((l: any) => ({ title: l.title, severity: l.severity, area: l.affected_area })), null, 2)}

### Improvement Proposals: ${intel.executionRequests.length}
${JSON.stringify(intel.executionRequests.slice(0, 10).map((r: any) => ({ title: r.title, status: r.status, risk: r.risk_level, urgency: r.urgency })), null, 2)}

### Code Improvements: ${intel.codeChanges.length}
${JSON.stringify(intel.codeChanges.slice(0, 5).map((c: any) => ({ title: c.pr_title, status: c.status, risk: c.risk_level })), null, 2)}

### Growth Opportunities: ${intel.evolutionProposals.length}
${JSON.stringify(intel.evolutionProposals.slice(0, 5).map((e: any) => ({ capability: e.missing_capability, urgency: e.urgency })), null, 2)}

### Forecasts: ${intel.forecasts.length}
${JSON.stringify(intel.forecasts.slice(0, 5).map((f: any) => ({ title: f.title, confidence: f.confidence_score })), null, 2)}

### Operational Issues: ${intel.failures.length} recurring problems detected
${failingComponents.length > 0 ? `Critical: ${failingComponents.join(', ')} are not functioning` : 'No critical failures'}
${degradedComponents.length > 0 ? `Degraded: ${degradedComponents.join(', ')} need attention` : ''}

${workforceReport ? `### Team Health Summary\n${workforceReport.en}` : ''}

## YOUR MISSION
You are a STRATEGIC PARTNER, not a reporter. Use the CEO behavioral model to:
1. Filter out items the CEO would ignore (based on historical patterns)
2. Prioritize items matching CEO's risk tolerance and preferences
3. Include prediction confidence for each recommendation
4. Only escalate what truly needs a human decision

Produce a CEO briefing. Structure:

1. **🚨 CRITICAL** — Needs immediate CEO action (max 3)
2. **⚠️ IMPORTANT** — Significant but not urgent (max 3)
3. **📌 IMPROVEMENTS** — Positive developments or opportunities (max 3)
4. **💤 CAN WAIT** — Low priority, informational (max 3)

EACH item MUST include:
- problem/problem_ar: What happened (business language, 1 sentence)
- impact/impact_ar: Why it matters to revenue, users, or risk
- proposed_solution/proposed_solution_ar: What you recommend
- consequence/consequence_ar: What happens if ignored
- risk: critical/high/medium/low
- recommendation: approve/reject/investigate/ignore/defer
- confidence: 0-100
- prediction_note: Why you think the CEO will approve/reject (based on behavioral model)

ALSO include:
- workforce_status: { summary, summary_ar, failing: [], improving: [], needs_replacement: [] }
- pending_decisions: Count of items that ACTUALLY need CEO input (exclude auto-handled)
- auto_handled: Count of items resolved without CEO (prediction-routed)
- overall_health: 🟢/🟡/🔴 with one business-language sentence
- prediction_accuracy: Current model accuracy percentage
- constitution_alerts: Any rule violations detected
- learning_update: One sentence about what the model learned recently

Rules:
- Max 12 items total
- ONLY show items that would change a CEO decision. Protect his time.
- If no actionable items: "All systems are stable. Nothing requires your decision."
- NO hallucinations — "insufficient data" if unsure
- ZERO technical vocabulary. You are a strategic executive partner.

Respond with valid JSON only (no markdown fences).`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a Chief of Staff briefing a fintech CEO. You speak in pure business language. NEVER use technical terms. Respond ONLY with valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.15,
      max_tokens: 6000,
    }),
  });

  if (!response.ok) throw new Error(`AI gateway failed: ${response.status}`);
  const result = await response.json();
  const raw = result.choices?.[0]?.message?.content?.trim() || "{}";
  let jsonStr = raw;
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();
  return JSON.parse(jsonStr);
}

// ═══════════════════════════════════════════════════════
// FORMAT BRIEFING FOR CEO DELIVERY
// ═══════════════════════════════════════════════════════

function formatBriefingForDM(briefing: any): { en: string; ar: string } {
  const recEmoji: Record<string, string> = { approve: '✅', reject: '❌', investigate: '🔍', ignore: '💤', defer: '⏳' };

  let en = `🎖️ **Chief of Staff — Briefing for Amro**\n`;
  en += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  en += `${briefing.greeting || 'Amro, here is what you need to know.'}\n\n`;
  en += `${briefing.overall_health || ''}\n`;
  en += `📊 Needs your decision: ${briefing.pending_decisions || 0}`;
  if (briefing.auto_handled) en += ` | Auto-handled: ${briefing.auto_handled}`;
  if (briefing.prediction_accuracy) en += ` | Model accuracy: ${briefing.prediction_accuracy}%`;
  en += `\n`;
  if (briefing.learning_update) en += `🧠 ${briefing.learning_update}\n`;
  en += `\n`;

  let ar = `🎖️ **رئيس الأركان — إحاطة لعمرو**\n`;
  ar += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  ar += `${briefing.greeting_ar || 'عمرو، هذا ما تحتاج معرفته الآن.'}\n\n`;
  ar += `${briefing.overall_health_ar || ''}\n`;
  ar += `📊 يحتاج قرارك: ${briefing.pending_decisions || 0}`;
  if (briefing.auto_handled) ar += ` | تمت معالجته تلقائياً: ${briefing.auto_handled}`;
  if (briefing.prediction_accuracy) ar += ` | دقة النموذج: ${briefing.prediction_accuracy}%`;
  ar += `\n`;
  if (briefing.learning_update) ar += `🧠 ${briefing.learning_update}\n`;
  ar += `\n`;

  const sections = [
    { key: 'critical', emoji: '🚨', title_en: 'CRITICAL — Needs Your Decision Now', title_ar: 'حرج — يحتاج قرارك الآن' },
    { key: 'important', emoji: '⚠️', title_en: 'IMPORTANT', title_ar: 'مهم' },
    { key: 'improvements', emoji: '📌', title_en: 'IMPROVEMENTS & OPPORTUNITIES', title_ar: 'تحسينات وفرص' },
    { key: 'can_wait', emoji: '💤', title_en: 'CAN WAIT', title_ar: 'يمكن الانتظار' },
  ];

  for (const sec of sections) {
    const items = briefing.sections?.[sec.key] || [];
    en += `**${sec.emoji} ${sec.title_en}**\n`;
    ar += `**${sec.emoji} ${sec.title_ar}**\n`;

    if (items.length === 0) {
      en += `✅ Nothing here.\n\n`;
      ar += `✅ لا شيء.\n\n`;
    } else {
      for (const item of items) {
        const recIcon = recEmoji[item.recommendation] || '📋';
        en += `• **${item.problem}**\n`;
        en += `  Why it matters: ${item.impact}\n`;
        en += `  Recommendation: ${item.proposed_solution}\n`;
        if (item.consequence) en += `  If ignored: ${item.consequence}\n`;
        en += `  ${recIcon} **${(item.recommendation || '').toUpperCase()}** | Risk: ${item.risk} | Confidence: ${item.confidence}%\n\n`;

        ar += `• **${item.problem_ar || item.problem}**\n`;
        ar += `  لماذا يهم: ${item.impact_ar || item.impact}\n`;
        ar += `  التوصية: ${item.proposed_solution_ar || item.proposed_solution}\n`;
        if (item.consequence_ar || item.consequence) ar += `  إذا تجاهلنا: ${item.consequence_ar || item.consequence}\n`;
        ar += `  ${recIcon} **${(item.recommendation || '').toUpperCase()}** | المخاطر: ${item.risk} | الثقة: ${item.confidence}%\n\n`;
      }
    }
  }

  // Workforce status (in business terms)
  const ws = briefing.workforce_status;
  if (ws) {
    en += `**👥 TEAM STATUS**\n${ws.summary || 'Team operating normally.'}\n`;
    ar += `**👥 حالة الفريق**\n${ws.summary_ar || 'الفريق يعمل بشكل طبيعي.'}\n`;
    if (ws.failing?.length > 0) { en += `🔴 Need attention: ${ws.failing.join(', ')}\n`; ar += `🔴 يحتاج اهتمام: ${ws.failing.join(', ')}\n`; }
    if (ws.needs_replacement?.length > 0) { en += `⚡ Needs replacement: ${ws.needs_replacement.join(', ')}\n`; ar += `⚡ يحتاج استبدال: ${ws.needs_replacement.join(', ')}\n`; }
    en += '\n'; ar += '\n';
  }

  // Constitution alerts
  if (briefing.constitution_alerts?.length > 0) {
    en += `**⚖️ GOVERNANCE ALERTS**\n`;
    ar += `**⚖️ تنبيهات الحوكمة**\n`;
    for (const alert of briefing.constitution_alerts) {
      en += `• ${alert.rule}: ${alert.violation}\n`;
      ar += `• ${alert.rule}: ${alert.violation_ar || alert.violation}\n`;
    }
  }

  en += `\n🎖️ _Your Chief of Staff_`;
  ar += `\n🎖️ _رئيس أركانك_`;
  return { en, ar };
}

// ═══════════════════════════════════════════════════════
// WORKFORCE REPORT (business language)
// ═══════════════════════════════════════════════════════

function buildWorkforceReport(metrics: AgentMetrics[], escalations: Escalation[]): { en: string; ar: string } {
  const counts: Record<LifecycleState, number> = { healthy: 0, watch: 0, warning: 0, probation: 0, disabled: 0 };
  const finalStates = new Map<string, LifecycleState>();
  for (const m of metrics) finalStates.set(m.agent_function, m.current_lifecycle);
  for (const e of escalations) finalStates.set(e.agent_function, e.to_state);
  for (const state of finalStates.values()) counts[state]++;

  const hasIssues = counts.watch + counts.warning + counts.probation + counts.disabled > 0;

  let en = `🎖️ **Chief of Staff — Team Review**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  let ar = `🎖️ **رئيس الأركان — مراجعة الفريق**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  if (!hasIssues) {
    en += `\n✅ **All systems are stable.** Nothing requires your decision.\n`;
    ar += `\n✅ **جميع الأنظمة مستقرة.** لا شيء يتطلب قرارك.\n`;
  } else {
    en += `\n📊 **Team Health**\n✅ Operating well: ${counts.healthy}\n`;
    ar += `\n📊 **صحة الفريق**\n✅ يعمل بشكل جيد: ${counts.healthy}\n`;
    if (counts.watch > 0) { en += `👀 Under observation: ${counts.watch}\n`; ar += `👀 تحت المراقبة: ${counts.watch}\n`; }
    if (counts.warning > 0) { en += `⚠️ Needs attention: ${counts.warning}\n`; ar += `⚠️ يحتاج اهتمام: ${counts.warning}\n`; }
    if (counts.probation > 0) { en += `🚨 At risk: ${counts.probation}\n`; ar += `🚨 في خطر: ${counts.probation}\n`; }
    if (counts.disabled > 0) { en += `❌ Shut down: ${counts.disabled}\n`; ar += `❌ متوقف: ${counts.disabled}\n`; }
  }

  if (escalations.length > 0) {
    en += `\n**📋 Changes:**\n`;
    ar += `\n**📋 التغييرات:**\n`;
    for (const e of escalations) {
      en += `• ${e.agent_function}: moved to **${e.to_state}** — ${e.reason}\n`;
      ar += `• ${e.agent_function}: انتقل إلى **${e.to_state}** — ${e.reason_ar}\n`;
    }
  }

  return { en, ar };
}

// ═══════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const t0 = Date.now();

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));

    const mode: string = body.mode || 'hourly';
    const lookbackHours = mode === 'critical' ? 1 : mode === 'hourly' ? 3 : 24;

    const { data: agent } = await sb.from('ai_agents').select('id').eq('is_active', true).limit(1).single();
    if (!agent) throw new Error("No active AI component found");
    const agentId = agent.id;

    // ═══ WORKFORCE MANAGEMENT (internal only — no CEO-facing output) ═══
    await logInternal(sb, agentId, `Commander ${mode} review started`, `بدأت مراجعة ${mode} للقائد`);

    const metrics = await calculateAgentMetrics(sb);
    await storeMetricsSnapshot(sb, metrics);

    const escalations = evaluateEscalations(metrics);
    if (escalations.length > 0) {
      await applyEscalations(sb, agentId, escalations);
    }

    const workforceReport = buildWorkforceReport(metrics, escalations);

    // Store workforce review log
    const counts: Record<string, number> = { healthy: 0, watch: 0, warning: 0, probation: 0, disabled: 0 };
    const finalStates = new Map<string, string>();
    for (const m of metrics) finalStates.set(m.agent_function, m.current_lifecycle);
    for (const e of escalations) finalStates.set(e.agent_function, e.to_state);
    for (const s of finalStates.values()) counts[s] = (counts[s] || 0) + 1;

    await sb.from('commander_reviews').insert({
      review_type: mode,
      agents_scanned: metrics.length,
      healthy_count: counts.healthy || 0,
      watch_count: counts.watch || 0,
      warning_count: counts.warning || 0,
      probation_count: counts.probation || 0,
      disabled_count: counts.disabled || 0,
      escalations,
      report_content: workforceReport.en,
      report_content_ar: workforceReport.ar,
      duration_ms: Date.now() - t0,
    });

    // If workforce-only mode, deliver and exit
    if (mode === 'workforce_review') {
      // Only post to CEO if there are issues worth knowing
      const hasIssues = counts.watch + counts.warning + counts.probation + counts.disabled > 0;
      if (hasIssues) {
        await postToDM(sb, workforceReport.ar, 'workforce_review');
      }
      await sb.from('ai_chat_room').insert({
        agent_id: agentId, content: workforceReport.en, content_ar: workforceReport.ar,
        message_type: 'workforce_review', message_category: escalations.some(e => ['warning', 'probation', 'disabled'].includes(e.to_state)) ? 'warning' : 'success', is_summary: true,
      });

      await logInternal(sb, agentId,
        `Team review complete. ${metrics.length} reviewed, ${escalations.length} changes.`,
        `اكتملت مراجعة الفريق. ${metrics.length} تمت مراجعتهم، ${escalations.length} تغيير.`);

      return new Response(JSON.stringify({ success: true, mode, reviewed: metrics.length, escalations: escalations.length, duration_ms: Date.now() - t0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══ EXECUTIVE BRIEFING ═══
    const intel = await collectIntelligence(sb, lookbackHours);

    const totalIndicators = intel.executionRequests.length + intel.analysisLogs.length +
      intel.codeChanges.length + intel.evolutionProposals.length +
      intel.failures.length + intel.forecasts.length + intel.pendingProposals.length;

    await logInternal(sb, agentId,
      `Reviewed ${totalIndicators} indicators from ${intel.agentSchedules.length} components`,
      `تمت مراجعة ${totalIndicators} مؤشر من ${intel.agentSchedules.length} مكون`);

    const briefing = await generateCommanderBriefing(apiKey, intel, mode, workforceReport);
    const formatted = formatBriefingForDM(briefing);

    // Sanitize and validate before delivery
    const enCheck = validateCEOLanguage(formatted.en);
    const arCheck = validateCEOLanguage(formatted.ar);
    if (!enCheck.clean || !arCheck.clean) {
      console.warn('[Commander] CEO language violations detected, sanitizing:', [...enCheck.violations, ...arCheck.violations]);
      formatted.en = sanitizeCEOMessage(formatted.en);
      formatted.ar = sanitizeCEOMessage(formatted.ar);
    }

    // Deliver to CEO DM + internal log
    await Promise.all([
      postToDM(sb, formatted.ar, 'commander_briefing'),
      sb.from('ai_chat_room').insert({
        agent_id: agentId, content: formatted.en, content_ar: formatted.ar,
        message_type: 'commander_briefing',
        message_category: briefing.sections?.critical?.length > 0 ? 'critical' : 'info',
        is_summary: true,
      }),
      sb.from('ai_activity_stream').insert({
        action_type: 'commander_briefing', entity_type: 'system', success: true,
        duration_ms: Date.now() - t0, role: 'commander',
        before_state: { mode, lookback_hours: lookbackHours, indicators: totalIndicators },
        after_state: {
          critical_count: briefing.sections?.critical?.length || 0,
          important_count: briefing.sections?.important?.length || 0,
          pending_decisions: briefing.pending_decisions,
          overall_health: briefing.overall_health,
        },
      }),
    ]);

    // Memory
    await sb.from('agent_memory').insert({
      agent_function: 'ai-commander',
      memory_type: 'decision',
      content: `Briefing (${mode}): ${totalIndicators} reviewed, ${escalations.length} team changes, ${briefing.sections?.critical?.length || 0} critical items`,
      importance: briefing.sections?.critical?.length > 0 ? 9 : 5,
      tags: ['commander', 'briefing', mode],
    });

    return new Response(JSON.stringify({
      success: true, mode, indicators_reviewed: totalIndicators,
      team_reviewed: metrics.length, escalations: escalations.length,
      critical_items: briefing.sections?.critical?.length || 0,
      important_items: briefing.sections?.important?.length || 0,
      pending_decisions: briefing.pending_decisions,
      duration_ms: Date.now() - t0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error("[Commander] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message, duration_ms: Date.now() - t0 }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
