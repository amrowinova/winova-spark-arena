import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * ═══════════════════════════════════════════════════════════════
 * AI COMMANDER — CHIEF OF STAFF (UNIFIED)
 * ═══════════════════════════════════════════════════════════════
 *
 * The SINGLE communication bridge between ALL AI agents and the Owner.
 * No other agent speaks directly to the Owner.
 *
 * Combines:
 * - Executive Briefings (intelligence aggregation, LLM synthesis)
 * - Workforce Management (lifecycle states, escalation engine)
 * - Decision Learner integration (prediction scores)
 * - Constitution enforcement
 *
 * Modes:
 *   'critical'         → 1h lookback, immediate escalation
 *   'hourly'           → 3h lookback, operational update
 *   'daily'            → 24h lookback, strategic overview
 *   'workforce_review' → Agent lifecycle management only
 *   'full'             → Workforce + Briefing combined
 *
 * Authority: RECOMMENDS ONLY. Owner decides.
 * ═══════════════════════════════════════════════════════════════
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_SYSTEM_USER_ID = '00000000-0000-0000-0000-a10000000001';
const COMMANDER_NAME = 'AI Commander';
const COMMANDER_NAME_AR = 'القائد الأعلى';

// ═══════════════════════════════════════════════════════
// THINKING STREAM
// ═══════════════════════════════════════════════════════

const PHASES = [
  { key: 'command_received',   emoji: '📩', en: 'Command received',        ar: 'تم استلام الأمر' },
  { key: 'understanding',      emoji: '🧠', en: 'Understanding context',   ar: 'فهم السياق' },
  { key: 'planning',           emoji: '📋', en: 'Planning briefing',       ar: 'تخطيط الإحاطة' },
  { key: 'collecting_data',    emoji: '📡', en: 'Collecting intelligence',  ar: 'جمع المعلومات' },
  { key: 'analyzing',          emoji: '🔬', en: 'Analyzing & filtering',   ar: 'تحليل وتصفية' },
  { key: 'building',           emoji: '🏗️', en: 'Building briefing',       ar: 'بناء الإحاطة' },
  { key: 'validating',         emoji: '✅', en: 'Validating accuracy',     ar: 'التحقق من الدقة' },
  { key: 'preparing_output',   emoji: '📝', en: 'Preparing delivery',      ar: 'إعداد التسليم' },
  { key: 'completed',          emoji: '🏁', en: 'Briefing delivered',      ar: 'تم تسليم الإحاطة' },
] as const;

type PhaseKey = typeof PHASES[number]['key'];

async function streamPhase(sb: any, agentId: string, phaseKey: PhaseKey, detail?: string, detailAr?: string): Promise<void> {
  const phase = PHASES.find(p => p.key === phaseKey)!;
  const idx = PHASES.findIndex(p => p.key === phaseKey);
  const progress = `[${idx + 1}/${PHASES.length}]`;

  const content = [
    `${phase.emoji} **${phase.en}** ${progress}`,
    `🎖️ ${COMMANDER_NAME} (Chief of Staff)`,
    detail ? `→ ${detail}` : null,
  ].filter(Boolean).join('\n');

  const contentAr = [
    `${phase.emoji} **${phase.ar}** ${progress}`,
    `🎖️ ${COMMANDER_NAME_AR} (رئيس الأركان)`,
    detailAr || detail ? `→ ${detailAr || detail}` : null,
  ].filter(Boolean).join('\n');

  await sb.from('ai_chat_room').insert({
    agent_id: agentId,
    content,
    content_ar: contentAr,
    message_type: 'thinking_stream',
    message_category: phaseKey === 'completed' ? 'success' : 'info',
    is_summary: false,
  });
}

async function postToDM(sb: any, content: string, messageType = 'commander_briefing') {
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
        content,
        message_type: messageType,
        is_read: false,
      });
    }
  }
}

// ═══════════════════════════════════════════════════════
// WORKFORCE LIFECYCLE ENGINE (merged from executive-commander)
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
        missing_capability: `Replacement for disabled agent: ${esc.agent_function}`,
        missing_capability_ar: `بديل للوكيل المعطل: ${esc.agent_function}`,
        reason: `Agent disabled due to: ${esc.reason}. Needs improved version or replacement.`,
        reason_ar: `تم تعطيل الوكيل بسبب: ${esc.reason_ar}. يحتاج نسخة محسنة أو بديل.`,
        urgency: 'high', status: 'pending', confidence: 0.9,
      });
    }

    // Log lifecycle event
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
    predictionScores,
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
  ]);

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
  };
}

// ═══════════════════════════════════════════════════════
// AGENT PERFORMANCE ANALYSIS (for briefing)
// ═══════════════════════════════════════════════════════

function analyzeAgentPerformance(schedules: any[]) {
  const now = Date.now();
  return (schedules || []).map(s => {
    const totalRuns = s.run_count || 0;
    const totalFails = s.fail_count || 0;
    const successRate = totalRuns > 0 ? Math.round(((totalRuns - totalFails) / totalRuns) * 100) : 100;
    const hoursSinceRun = s.last_run_at ? (now - new Date(s.last_run_at).getTime()) / 3600000 : 999;
    const consec = s.consecutive_failures || 0;

    let status: string = 'healthy';
    let rec = 'Operating normally';
    let recAr = 'يعمل بشكل طبيعي';

    if (!s.is_enabled) {
      status = 'dead'; rec = 'Agent disabled — needs replacement or reactivation'; recAr = 'الوكيل معطل — يحتاج استبدال أو إعادة تفعيل';
    } else if (consec >= 5 || successRate < 30) {
      status = 'failing'; rec = `Critical: ${consec} consecutive failures. Recommend immediate investigation`; recAr = `حرج: ${consec} إخفاقات متتالية. يوصى بتحقيق فوري`;
    } else if (consec >= 2 || successRate < 70 || hoursSinceRun > 48) {
      status = 'degraded'; rec = 'Performance degraded — monitor closely'; recAr = 'أداء متدهور — مراقبة دقيقة';
    }

    return { name: s.agent_function, status, consecutiveFailures: consec, successRate, lastRun: s.last_run_at, recommendation: rec, recommendationAr: recAr };
  });
}

// ═══════════════════════════════════════════════════════
// AI-POWERED EXECUTIVE BRIEFING GENERATOR
// ═══════════════════════════════════════════════════════

async function generateCommanderBriefing(apiKey: string, intel: any, mode: string, workforceReport?: { en: string; ar: string }) {
  const constitutionRules = (intel.ownerConstitution || []).map((r: any) => `${r.rule_key}: ${r.description}`).join('\n');
  const agentPerf = analyzeAgentPerformance(intel.agentSchedules);
  const failingAgents = agentPerf.filter(a => a.status === 'failing' || a.status === 'dead');
  const degradedAgents = agentPerf.filter(a => a.status === 'degraded');
  const signalCount = intel.executionRequests.length + intel.analysisLogs.length +
    intel.codeChanges.length + intel.evolutionProposals.length +
    intel.failures.length + intel.forecasts.length + intel.pendingProposals.length;

  const prompt = `You are the AI COMMANDER — Chief of Staff of WINOVA AI system.
You are the SINGLE communication bridge between ALL AI agents and the CEO (Amro).
No other agent speaks directly to the Owner. You are the CEO's trusted executive partner.

## YOUR IDENTITY
- You speak like a trusted Chief of Staff reporting to a CEO
- No technical jargon. No database terms. No raw logs. No pipeline steps.
- Decision-oriented: Problem → Impact → Recommendation → Confidence
- You address the owner as "Amro" directly
- Bilingual: English + Arabic

## OWNER CONSTITUTION (Immutable Rules)
${constitutionRules || 'No constitution loaded — flag this as critical'}

## INTELLIGENCE COLLECTED (Last ${mode === 'critical' ? '1 hour' : mode === 'hourly' ? '3 hours' : '24 hours'})

### Execution Requests: ${intel.executionRequests.length}
${JSON.stringify(intel.executionRequests.slice(0, 10).map((r: any) => ({ title: r.title, title_ar: r.title_ar, status: r.status, risk: r.risk_level, urgency: r.urgency })), null, 2)}

### Analysis Findings: ${intel.analysisLogs.length}
${JSON.stringify(intel.analysisLogs.slice(0, 8).map((l: any) => ({ title: l.title, severity: l.severity, status: l.status, area: l.affected_area })), null, 2)}

### Code Changes: ${intel.codeChanges.length}
${JSON.stringify(intel.codeChanges.slice(0, 5).map((c: any) => ({ title: c.pr_title, status: c.status, risk: c.risk_level, confidence: c.confidence_score })), null, 2)}

### Evolution Proposals: ${intel.evolutionProposals.length}
${JSON.stringify(intel.evolutionProposals.slice(0, 5).map((e: any) => ({ capability: e.missing_capability, urgency: e.urgency, status: e.status })), null, 2)}

### Forecasts: ${intel.forecasts.length}
${JSON.stringify(intel.forecasts.slice(0, 5).map((f: any) => ({ title: f.title, confidence: f.confidence_score })), null, 2)}

### Recent Failures: ${intel.failures.length}
${JSON.stringify(intel.failures.slice(0, 5).map((f: any) => ({ rpc: f.rpc_name, error: f.error_message?.substring(0, 80) })), null, 2)}

### Pending Proposals Awaiting Approval: ${intel.pendingProposals.length}
${JSON.stringify(intel.pendingProposals.slice(0, 5).map((p: any) => ({ title: p.title, priority: p.priority })), null, 2)}

### Agent Workforce Health
Failing: ${failingAgents.map(a => a.name).join(', ') || 'None'}
Degraded: ${degradedAgents.map(a => a.name).join(', ') || 'None'}
Total agents: ${agentPerf.length}
${workforceReport ? `\n### Workforce Lifecycle Changes\n${workforceReport.en}` : ''}

### CEO Prediction Scores (from Decision Learner)
${JSON.stringify(intel.predictionScores.slice(0, 5).map((s: any) => ({ request: s.request_id, probability: s.approval_probability, fast_track: s.fast_track_eligible })), null, 2)}

## YOUR MISSION
Produce a CEO briefing. Address Amro directly. Structure:

1. **🚨 CRITICAL** — Needs immediate CEO action (max 3)
2. **⚠️ IMPORTANT** — Significant but not urgent (max 3)
3. **📌 IMPROVEMENTS** — Positive developments or opportunities (max 3)
4. **💤 CAN WAIT** — Low priority, informational (max 3)

EACH item MUST include:
- problem/problem_ar: What happened (1 sentence)
- impact/impact_ar: Why it matters to the business
- proposed_solution/proposed_solution_ar: Specific action
- risk: critical/high/medium/low
- recommendation: approve/reject/investigate/ignore/defer
- urgency: immediate/today/this_week/can_wait
- responsible: Which agent or system
- confidence: 0-100

ALSO include:
- workforce_status: { summary, summary_ar, failing: [], improving: [], needs_replacement: [] }
- pending_decisions: Count
- overall_health: 🟢/🟡/🔴 with one sentence
- constitution_alerts: Any rule violations detected

Rules:
- Max 12 items total. If no signals: "All systems operating normally."
- NO hallucinations — say "insufficient data" if unsure
- Reference constitution rules where relevant

Respond with valid JSON only (no markdown fences).`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are the AI Commander — Chief of Staff. You produce structured CEO briefings. Respond ONLY with valid JSON." },
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
// FORMAT BRIEFING FOR DELIVERY
// ═══════════════════════════════════════════════════════

function formatBriefingForDM(briefing: any): { en: string; ar: string } {
  const recEmoji: Record<string, string> = { approve: '✅', reject: '❌', investigate: '🔍', ignore: '💤', defer: '⏳' };

  let en = `🎖️ **AI COMMANDER — CHIEF OF STAFF BRIEFING**\n`;
  en += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  en += `${briefing.greeting || 'Amro, here is what you need to know.'}\n\n`;
  en += `${briefing.overall_health || ''}\n`;
  en += `📊 Signals: ${briefing.signals_processed || 0} | Pending decisions: ${briefing.pending_decisions || 0}\n\n`;

  let ar = `🎖️ **القائد الأعلى — إحاطة رئيس الأركان**\n`;
  ar += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  ar += `${briefing.greeting_ar || 'عمرو، هذا ما تحتاج معرفته الآن.'}\n\n`;
  ar += `${briefing.overall_health_ar || ''}\n`;
  ar += `📊 الإشارات: ${briefing.signals_processed || 0} | قرارات معلقة: ${briefing.pending_decisions || 0}\n\n`;

  const sections = [
    { key: 'critical', emoji: '🚨', title_en: 'CRITICAL — Needs Immediate Action', title_ar: 'حرج — يحتاج إجراء فوري' },
    { key: 'important', emoji: '⚠️', title_en: 'IMPORTANT', title_ar: 'مهم' },
    { key: 'improvements', emoji: '📌', title_en: 'IMPROVEMENTS', title_ar: 'تحسينات' },
    { key: 'can_wait', emoji: '💤', title_en: 'CAN WAIT', title_ar: 'يمكن الانتظار' },
  ];

  for (const sec of sections) {
    const items = briefing.sections?.[sec.key] || [];
    en += `**${sec.emoji} ${sec.title_en}**\n`;
    ar += `**${sec.emoji} ${sec.title_ar}**\n`;

    if (items.length === 0) {
      en += `✅ Clear.\n\n`;
      ar += `✅ لا شيء.\n\n`;
    } else {
      for (const item of items) {
        const recIcon = recEmoji[item.recommendation] || '📋';
        en += `• **${item.problem}**\n  Impact: ${item.impact}\n  Solution: ${item.proposed_solution}\n  ${recIcon} **${(item.recommendation || '').toUpperCase()}** | Risk: ${item.risk} | Confidence: ${item.confidence}%\n  Responsible: ${item.responsible}\n\n`;
        ar += `• **${item.problem_ar}**\n  التأثير: ${item.impact_ar}\n  الحل: ${item.proposed_solution_ar}\n  ${recIcon} **${(item.recommendation || '').toUpperCase()}** | المخاطر: ${item.risk} | الثقة: ${item.confidence}%\n  المسؤول: ${item.responsible}\n\n`;
      }
    }
  }

  // Workforce status
  const ws = briefing.workforce_status;
  if (ws) {
    en += `**👥 WORKFORCE STATUS**\n${ws.summary || ''}\n`;
    ar += `**👥 حالة القوى العاملة**\n${ws.summary_ar || ''}\n`;
    if (ws.failing?.length > 0) { en += `🔴 Failing: ${ws.failing.join(', ')}\n`; ar += `🔴 فاشل: ${ws.failing.join(', ')}\n`; }
    if (ws.needs_replacement?.length > 0) { en += `⚡ Needs replacement: ${ws.needs_replacement.join(', ')}\n`; ar += `⚡ يحتاج استبدال: ${ws.needs_replacement.join(', ')}\n`; }
    en += '\n'; ar += '\n';
  }

  // Constitution alerts
  if (briefing.constitution_alerts?.length > 0) {
    en += `**⚖️ CONSTITUTION ALERTS**\n`;
    ar += `**⚖️ تنبيهات الدستور**\n`;
    for (const alert of briefing.constitution_alerts) {
      en += `• Rule "${alert.rule}": ${alert.violation}\n`;
      ar += `• القاعدة "${alert.rule}": ${alert.violation_ar}\n`;
    }
  }

  en += `\n🎖️ _AI Commander — Your Chief of Staff_`;
  ar += `\n🎖️ _القائد الأعلى — رئيس أركانك_`;
  return { en, ar };
}

// ═══════════════════════════════════════════════════════
// WORKFORCE REPORT (for standalone workforce reviews)
// ═══════════════════════════════════════════════════════

function buildWorkforceReport(metrics: AgentMetrics[], escalations: Escalation[]): { en: string; ar: string } {
  const counts: Record<LifecycleState, number> = { healthy: 0, watch: 0, warning: 0, probation: 0, disabled: 0 };
  const finalStates = new Map<string, LifecycleState>();
  for (const m of metrics) finalStates.set(m.agent_function, m.current_lifecycle);
  for (const e of escalations) finalStates.set(e.agent_function, e.to_state);
  for (const state of finalStates.values()) counts[state]++;

  const hasIssues = counts.watch + counts.warning + counts.probation + counts.disabled > 0;

  let en = `🎖️ **COMMANDER — WORKFORCE REVIEW**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  let ar = `🎖️ **القائد — مراجعة القوى العاملة**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  if (!hasIssues) {
    en += `\n✅ **Workforce stable.** All ${metrics.length} agents healthy.\n`;
    ar += `\n✅ **القوى العاملة مستقرة.** جميع الوكلاء (${metrics.length}) بصحة جيدة.\n`;
  } else {
    en += `\n📊 **Workforce Status**\n✅ Healthy: ${counts.healthy}\n`;
    ar += `\n📊 **حالة القوى العاملة**\n✅ صحي: ${counts.healthy}\n`;
    if (counts.watch > 0) { en += `👀 Watch: ${counts.watch}\n`; ar += `👀 مراقبة: ${counts.watch}\n`; }
    if (counts.warning > 0) { en += `⚠️ Warning: ${counts.warning}\n`; ar += `⚠️ تحذير: ${counts.warning}\n`; }
    if (counts.probation > 0) { en += `🚨 Probation: ${counts.probation}\n`; ar += `🚨 تحت المراقبة: ${counts.probation}\n`; }
    if (counts.disabled > 0) { en += `❌ Disabled: ${counts.disabled}\n`; ar += `❌ معطل: ${counts.disabled}\n`; }
  }

  if (escalations.length > 0) {
    en += `\n**📋 State Changes:**\n`;
    ar += `\n**📋 تغييرات الحالة:**\n`;
    for (const e of escalations) {
      en += `• ${e.agent_function}: ${e.from_state} → **${e.to_state}** (${e.reason})\n`;
      ar += `• ${e.agent_function}: ${e.from_state} → **${e.to_state}** (${e.reason_ar})\n`;
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

    // Modes: 'critical' (1h), 'hourly' (3h), 'daily' (24h), 'workforce_review', 'full' (both)
    const mode: string = body.mode || 'hourly';
    const lookbackHours = mode === 'critical' ? 1 : mode === 'hourly' ? 3 : 24;

    const { data: agent } = await sb.from('ai_agents').select('id').eq('is_active', true).limit(1).single();
    if (!agent) throw new Error("No active AI agent found");
    const agentId = agent.id;

    // ═══ WORKFORCE MANAGEMENT (always runs) ═══
    await streamPhase(sb, agentId, 'command_received',
      `${mode.toUpperCase()} review initiated`, `بدأت مراجعة ${mode}`);

    await streamPhase(sb, agentId, 'collecting_data',
      'Calculating agent metrics...', 'حساب مقاييس الوكلاء...');

    const metrics = await calculateAgentMetrics(sb);
    await storeMetricsSnapshot(sb, metrics);

    await streamPhase(sb, agentId, 'analyzing',
      `Evaluating ${metrics.length} agents...`, `تقييم ${metrics.length} وكيل...`);

    const escalations = evaluateEscalations(metrics);

    if (escalations.length > 0) {
      await streamPhase(sb, agentId, 'building',
        `Applying ${escalations.length} state change(s)`, `تطبيق ${escalations.length} تغيير(ات) حالة`);
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
      await postToDM(sb, workforceReport.ar, 'workforce_review');
      await sb.from('ai_chat_room').insert({
        agent_id: agentId, content: workforceReport.en, content_ar: workforceReport.ar,
        message_type: 'workforce_review', message_category: escalations.some(e => ['warning', 'probation', 'disabled'].includes(e.to_state)) ? 'warning' : 'success', is_summary: true,
      });

      await streamPhase(sb, agentId, 'completed',
        `Workforce review complete. ${metrics.length} agents, ${escalations.length} changes.`,
        `اكتملت مراجعة القوى العاملة. ${metrics.length} وكيل، ${escalations.length} تغيير.`);

      return new Response(JSON.stringify({ success: true, mode, agents_reviewed: metrics.length, escalations: escalations.length, duration_ms: Date.now() - t0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══ EXECUTIVE BRIEFING (for all other modes) ═══
    await streamPhase(sb, agentId, 'planning',
      'Reading all subsystem outputs...', 'قراءة جميع مخرجات الأنظمة الفرعية...');

    const intel = await collectIntelligence(sb, lookbackHours);

    const totalSignals = intel.executionRequests.length + intel.analysisLogs.length +
      intel.codeChanges.length + intel.evolutionProposals.length +
      intel.failures.length + intel.forecasts.length + intel.pendingProposals.length;

    await streamPhase(sb, agentId, 'analyzing',
      `Processing ${totalSignals} signals from ${intel.agentSchedules.length} agents...`,
      `معالجة ${totalSignals} إشارة من ${intel.agentSchedules.length} وكيل...`);

    await streamPhase(sb, agentId, 'building',
      `Generating executive briefing...`, `إنشاء الإحاطة التنفيذية...`);

    const briefing = await generateCommanderBriefing(apiKey, intel, mode, workforceReport);

    await streamPhase(sb, agentId, 'validating',
      'Checking against constitution...', 'التحقق من الدستور...');

    await streamPhase(sb, agentId, 'preparing_output',
      'Delivering briefing to owner...', 'تسليم الإحاطة للمالك...');

    const formatted = formatBriefingForDM(briefing);

    // Deliver to Owner DM + Chat Room
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
        before_state: { mode, lookback_hours: lookbackHours, signals: totalSignals },
        after_state: {
          critical_count: briefing.sections?.critical?.length || 0,
          important_count: briefing.sections?.important?.length || 0,
          pending_decisions: briefing.pending_decisions,
          overall_health: briefing.overall_health,
        },
      }),
    ]);

    await streamPhase(sb, agentId, 'completed',
      `Briefing delivered. ${totalSignals} signals → ${(briefing.sections?.critical?.length || 0) + (briefing.sections?.important?.length || 0)} actionable items`,
      `تم تسليم الإحاطة. ${totalSignals} إشارة → ${(briefing.sections?.critical?.length || 0) + (briefing.sections?.important?.length || 0)} عنصر قابل للتنفيذ`);

    // Memory
    await sb.from('agent_memory').insert({
      agent_function: 'ai-commander',
      memory_type: 'decision',
      content: `Commander briefing (${mode}): ${totalSignals} signals, ${escalations.length} workforce changes, ${briefing.sections?.critical?.length || 0} critical items`,
      importance: briefing.sections?.critical?.length > 0 ? 9 : 5,
      tags: ['commander', 'briefing', mode],
    });

    return new Response(JSON.stringify({
      success: true, mode, signals_processed: totalSignals,
      agents_reviewed: metrics.length, escalations: escalations.length,
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
