import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_SYSTEM_USER_ID = '00000000-0000-0000-0000-a10000000001';
const COMMANDER_NAME = 'Executive Commander';
const COMMANDER_NAME_AR = 'القائد التنفيذي';

// ─── Lifecycle States ────────────────────────────────
const LIFECYCLE_STATES = ['healthy', 'watch', 'warning', 'probation', 'disabled'] as const;
type LifecycleState = typeof LIFECYCLE_STATES[number];

// ─── Escalation Thresholds ───────────────────────────
const ESCALATION_RULES = {
  watch:     { failures_1h: 2, consecutive: 2, success_rate_below: 70 },
  warning:   { failures_1h: 4, consecutive: 3, success_rate_below: 50 },
  probation: { failures_1h: 6, consecutive: 5, success_rate_below: 30 },
  disabled:  { failures_1h: 10, consecutive: 8, success_rate_below: 10 },
} as const;

// ─── Thinking Stream ─────────────────────────────────
const PHASES = [
  { key: 'command_received',   emoji: '📩', en: 'Command received',        ar: 'تم استلام الأمر' },
  { key: 'understanding',      emoji: '🧠', en: 'Understanding request',   ar: 'فهم الطلب' },
  { key: 'planning',           emoji: '📋', en: 'Planning review',         ar: 'تخطيط المراجعة' },
  { key: 'collecting_data',    emoji: '📡', en: 'Collecting metrics',      ar: 'جمع المقاييس' },
  { key: 'analyzing',          emoji: '🔬', en: 'Evaluating workforce',    ar: 'تقييم القوى العاملة' },
  { key: 'building',           emoji: '🏗️', en: 'Applying decisions',      ar: 'تطبيق القرارات' },
  { key: 'validating',         emoji: '✅', en: 'Validating outcomes',     ar: 'التحقق من النتائج' },
  { key: 'preparing_output',   emoji: '📝', en: 'Preparing report',        ar: 'إعداد التقرير' },
  { key: 'completed',          emoji: '🏁', en: 'Completed',               ar: 'مكتمل' },
] as const;

type PhaseKey = typeof PHASES[number]['key'];

async function streamPhase(sb: any, agentId: string, phaseKey: PhaseKey, detail?: string, detailAr?: string): Promise<void> {
  const phase = PHASES.find(p => p.key === phaseKey)!;
  const idx = PHASES.findIndex(p => p.key === phaseKey);
  const progress = `[${idx + 1}/${PHASES.length}]`;

  const content = [
    `${phase.emoji} **${phase.en}** ${progress}`,
    `🎖️ ${COMMANDER_NAME}`,
    detail ? `→ ${detail}` : null,
  ].filter(Boolean).join('\n');

  const contentAr = [
    `${phase.emoji} **${phase.ar}** ${progress}`,
    `🎖️ ${COMMANDER_NAME_AR}`,
    detailAr || detail ? `→ ${detailAr || detail}` : null,
  ].filter(Boolean).join('\n');

  await Promise.all([
    sb.from('ai_chat_room').insert({
      agent_id: agentId,
      content,
      content_ar: contentAr,
      message_type: 'thinking_stream',
      message_category: phaseKey === 'completed' ? 'success' : 'info',
      is_summary: false,
    }),
    postToDM(sb, contentAr, 'thinking_stream'),
  ]);
}

async function postToDM(sb: any, content: string, messageType = 'system') {
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

// ─── Metrics Calculator ──────────────────────────────
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
  const hour_ago = new Date(now.getTime() - 3600000).toISOString();
  const day_ago = new Date(now.getTime() - 86400000).toISOString();

  // Get all scheduled agents
  const { data: schedules } = await sb
    .from('agent_schedules')
    .select('agent_function, last_run_at, last_status, consecutive_failures, last_duration_ms, run_count, fail_count, is_enabled');

  if (!schedules?.length) return [];

  // Get current ai_agents lifecycle states
  const { data: agents } = await sb
    .from('ai_agents')
    .select('id, agent_name, lifecycle_state, status');

  const agentMap = new Map((agents || []).map((a: any) => [a.agent_name, a]));

  const metrics: AgentMetrics[] = [];

  for (const sched of schedules) {
    // Count failures in last 1h from health checks
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
    const timeSinceSuccess = lastSuccess
      ? Math.round((now.getTime() - new Date(lastSuccess).getTime()) / 60000)
      : 9999;

    // Get lifecycle state from ai_agents if exists
    const agentRecord = agentMap.get(sched.agent_function);
    const currentLifecycle: LifecycleState = agentRecord?.lifecycle_state || 'healthy';

    metrics.push({
      agent_function: sched.agent_function,
      success_rate: successRate,
      failures_1h: h?.error_count_1h || 0,
      failures_24h: h?.error_count_24h || 0,
      consecutive_failures: sched.consecutive_failures || 0,
      avg_duration_ms: sched.last_duration_ms || 0,
      tasks_completed: totalRuns - totalFails,
      time_since_last_success_minutes: timeSinceSuccess,
      current_lifecycle: currentLifecycle,
    });
  }

  return metrics;
}

// ─── Escalation Engine ───────────────────────────────
interface Escalation {
  agent_function: string;
  from_state: LifecycleState;
  to_state: LifecycleState;
  reason: string;
  reason_ar: string;
}

function determineTargetState(m: AgentMetrics): LifecycleState {
  // Check from worst to best — but enforce NO SKIPPING
  if (
    m.failures_1h >= ESCALATION_RULES.disabled.failures_1h ||
    m.consecutive_failures >= ESCALATION_RULES.disabled.consecutive ||
    m.success_rate <= ESCALATION_RULES.disabled.success_rate_below
  ) {
    return 'disabled';
  }
  if (
    m.failures_1h >= ESCALATION_RULES.probation.failures_1h ||
    m.consecutive_failures >= ESCALATION_RULES.probation.consecutive ||
    m.success_rate <= ESCALATION_RULES.probation.success_rate_below
  ) {
    return 'probation';
  }
  if (
    m.failures_1h >= ESCALATION_RULES.warning.failures_1h ||
    m.consecutive_failures >= ESCALATION_RULES.warning.consecutive ||
    m.success_rate <= ESCALATION_RULES.warning.success_rate_below
  ) {
    return 'warning';
  }
  if (
    m.failures_1h >= ESCALATION_RULES.watch.failures_1h ||
    m.consecutive_failures >= ESCALATION_RULES.watch.consecutive ||
    m.success_rate <= ESCALATION_RULES.watch.success_rate_below
  ) {
    return 'watch';
  }
  return 'healthy';
}

function enforceNoSkipping(current: LifecycleState, target: LifecycleState): LifecycleState {
  const currentIdx = LIFECYCLE_STATES.indexOf(current);
  const targetIdx = LIFECYCLE_STATES.indexOf(target);

  // Can only escalate one step at a time (no skipping)
  if (targetIdx > currentIdx + 1) {
    return LIFECYCLE_STATES[currentIdx + 1];
  }
  // Can recover (de-escalate) freely
  return target;
}

function buildReason(m: AgentMetrics, newState: LifecycleState): { en: string; ar: string } {
  const parts_en: string[] = [];
  const parts_ar: string[] = [];

  if (m.consecutive_failures > 0) {
    parts_en.push(`${m.consecutive_failures} consecutive failures`);
    parts_ar.push(`${m.consecutive_failures} إخفاقات متتالية`);
  }
  if (m.failures_1h > 0) {
    parts_en.push(`${m.failures_1h} failures/1h`);
    parts_ar.push(`${m.failures_1h} إخفاقات/ساعة`);
  }
  if (m.success_rate < 70) {
    parts_en.push(`success rate ${m.success_rate}%`);
    parts_ar.push(`معدل النجاح ${m.success_rate}%`);
  }

  if (newState === 'healthy') {
    return { en: 'Metrics recovered to healthy thresholds', ar: 'تعافت المقاييس إلى الحدود الصحية' };
  }

  return {
    en: parts_en.join(', ') || 'Performance degradation detected',
    ar: parts_ar.join('، ') || 'تم اكتشاف تدهور في الأداء',
  };
}

function evaluateEscalations(metrics: AgentMetrics[]): Escalation[] {
  const escalations: Escalation[] = [];

  for (const m of metrics) {
    const rawTarget = determineTargetState(m);
    const finalTarget = enforceNoSkipping(m.current_lifecycle, rawTarget);

    if (finalTarget !== m.current_lifecycle) {
      const reason = buildReason(m, finalTarget);
      escalations.push({
        agent_function: m.agent_function,
        from_state: m.current_lifecycle,
        to_state: finalTarget,
        reason: reason.en,
        reason_ar: reason.ar,
      });
    }
  }

  return escalations;
}

// ─── Apply Escalations ──────────────────────────────
async function applyEscalations(sb: any, agentId: string, escalations: Escalation[]): Promise<void> {
  for (const esc of escalations) {
    const now = new Date().toISOString();

    // Update ai_agents lifecycle_state
    await sb.from('ai_agents')
      .update({
        lifecycle_state: esc.to_state,
        lifecycle_changed_at: now,
        lifecycle_reason: esc.reason,
        probation_started_at: esc.to_state === 'probation' ? now : undefined,
        disabled_at: esc.to_state === 'disabled' ? now : undefined,
      })
      .eq('agent_name', esc.agent_function);

    // If disabled → disable the agent schedule
    if (esc.to_state === 'disabled') {
      await sb.from('agent_schedules')
        .update({ is_enabled: false, updated_at: now })
        .eq('agent_function', esc.agent_function);
    }

    // If probation → reduce auto_execute_level to 0
    if (esc.to_state === 'probation') {
      await sb.from('ai_agents')
        .update({ auto_execute_level: 0 })
        .eq('agent_name', esc.agent_function);
    }

    // Post alert to chat
    const stateEmoji: Record<LifecycleState, string> = {
      healthy: '✅', watch: '👀', warning: '⚠️', probation: '🚨', disabled: '❌',
    };

    const emoji = stateEmoji[esc.to_state];
    const isRecovery = LIFECYCLE_STATES.indexOf(esc.to_state) < LIFECYCLE_STATES.indexOf(esc.from_state);

    let alertEn: string;
    let alertAr: string;

    if (esc.to_state === 'disabled') {
      alertEn = `❌ **Agent Disabled**\nAgent: ${esc.agent_function}\nReason: ${esc.reason}\nSchedule: deactivated\n⚡ Replacement recommended`;
      alertAr = `❌ **وكيل معطل**\nالوكيل: ${esc.agent_function}\nالسبب: ${esc.reason_ar}\nالجدول: معطل\n⚡ يوصى بالاستبدال`;
    } else if (esc.to_state === 'warning') {
      alertEn = `⚠️ **Performance Warning**\nAgent: ${esc.agent_function}\nReason: ${esc.reason}\nTime to recover: 24h`;
      alertAr = `⚠️ **تحذير أداء**\nالوكيل: ${esc.agent_function}\nالسبب: ${esc.reason_ar}\nوقت التعافي: 24 ساعة`;
    } else if (isRecovery) {
      alertEn = `${emoji} Agent ${esc.agent_function} recovered: ${esc.from_state} → ${esc.to_state}`;
      alertAr = `${emoji} الوكيل ${esc.agent_function} تعافى: ${esc.from_state} → ${esc.to_state}`;
    } else {
      alertEn = `${emoji} Agent ${esc.agent_function} moved to **${esc.to_state.toUpperCase()}**\nReason: ${esc.reason}`;
      alertAr = `${emoji} الوكيل ${esc.agent_function} انتقل إلى **${esc.to_state.toUpperCase()}**\nالسبب: ${esc.reason_ar}`;
    }

    await Promise.all([
      sb.from('ai_chat_room').insert({
        agent_id: agentId,
        content: alertEn,
        content_ar: alertAr,
        message_type: 'lifecycle_alert',
        message_category: ['warning', 'probation', 'disabled'].includes(esc.to_state) ? 'critical' : 'info',
        is_summary: false,
      }),
      postToDM(sb, alertAr, 'lifecycle_alert'),
    ]);

    // Log to agent lifecycle table
    const { data: agentRecord } = await sb.from('ai_agents')
      .select('id')
      .eq('agent_name', esc.agent_function)
      .limit(1)
      .single();

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

    // If disabled → create evolution proposal for replacement
    if (esc.to_state === 'disabled') {
      await sb.from('ai_evolution_proposals').insert({
        missing_capability: `Replacement for disabled agent: ${esc.agent_function}`,
        missing_capability_ar: `بديل للوكيل المعطل: ${esc.agent_function}`,
        reason: `Agent disabled due to: ${esc.reason}. Needs improved version or replacement.`,
        reason_ar: `تم تعطيل الوكيل بسبب: ${esc.reason_ar}. يحتاج نسخة محسنة أو بديل.`,
        urgency: 'high',
        status: 'pending',
        confidence: 0.9,
      });
    }
  }
}

// ─── Store Metrics Snapshot ──────────────────────────
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

  if (rows.length > 0) {
    await sb.from('agent_performance_metrics').insert(rows);
  }
}

// ─── Build Workforce Report ─────────────────────────
function buildWorkforceReport(metrics: AgentMetrics[], escalations: Escalation[]): { en: string; ar: string } {
  const counts: Record<LifecycleState, number> = { healthy: 0, watch: 0, warning: 0, probation: 0, disabled: 0 };

  // Apply escalation changes to counts
  const finalStates = new Map<string, LifecycleState>();
  for (const m of metrics) finalStates.set(m.agent_function, m.current_lifecycle);
  for (const e of escalations) finalStates.set(e.agent_function, e.to_state);
  for (const state of finalStates.values()) counts[state]++;

  const total = metrics.length;
  const hasIssues = counts.watch + counts.warning + counts.probation + counts.disabled > 0;

  let en = `🎖️ **EXECUTIVE COMMANDER — WORKFORCE REVIEW**\n`;
  en += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  let ar = `🎖️ **القائد التنفيذي — مراجعة القوى العاملة**\n`;
  ar += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  if (!hasIssues) {
    en += `\n✅ **Workforce stable.** All ${total} agents healthy.\n`;
    ar += `\n✅ **القوى العاملة مستقرة.** جميع الوكلاء (${total}) بصحة جيدة.\n`;
  } else {
    en += `\n📊 **Workforce Status**\n`;
    en += `✅ Healthy: ${counts.healthy}\n`;
    if (counts.watch > 0)     en += `👀 Watch: ${counts.watch}\n`;
    if (counts.warning > 0)   en += `⚠️ Warning: ${counts.warning}\n`;
    if (counts.probation > 0) en += `🚨 Probation: ${counts.probation}\n`;
    if (counts.disabled > 0)  en += `❌ Disabled: ${counts.disabled}\n`;

    ar += `\n📊 **حالة القوى العاملة**\n`;
    ar += `✅ صحي: ${counts.healthy}\n`;
    if (counts.watch > 0)     ar += `👀 مراقبة: ${counts.watch}\n`;
    if (counts.warning > 0)   ar += `⚠️ تحذير: ${counts.warning}\n`;
    if (counts.probation > 0) ar += `🚨 تحت المراقبة: ${counts.probation}\n`;
    if (counts.disabled > 0)  ar += `❌ معطل: ${counts.disabled}\n`;
  }

  if (escalations.length > 0) {
    en += `\n**📋 State Changes This Review:**\n`;
    ar += `\n**📋 تغييرات الحالة في هذه المراجعة:**\n`;
    for (const e of escalations) {
      en += `• ${e.agent_function}: ${e.from_state} → **${e.to_state}** (${e.reason})\n`;
      ar += `• ${e.agent_function}: ${e.from_state} → **${e.to_state}** (${e.reason_ar})\n`;
    }
  }

  return { en, ar };
}

// ─── Executive Summary (Original) ────────────────────
async function collectAllOutputs(sb: any, since: string) {
  const [priorities, proposals, executionRequests, analysisLogs, engineerReports, forecasts, evolutionProposals, healthChecks, productProposals, knowledgeRules] = await Promise.all([
    sb.from('ai_priorities').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(20),
    sb.from('ai_proposals').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(30),
    sb.from('ai_execution_requests').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(20),
    sb.from('ai_analysis_logs').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(30),
    sb.from('ai_engineer_reports').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(10),
    sb.from('ai_forecasts').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(20),
    sb.from('ai_evolution_proposals').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(10),
    sb.from('agent_health_checks').select('*').order('checked_at', { ascending: false }).limit(20),
    sb.from('ai_product_proposals').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(10),
    sb.from('knowledge_rules').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(10),
  ]);

  return {
    priorities: priorities.data || [], proposals: proposals.data || [],
    executionRequests: executionRequests.data || [], analysisLogs: analysisLogs.data || [],
    engineerReports: engineerReports.data || [], forecasts: forecasts.data || [],
    evolutionProposals: evolutionProposals.data || [], healthChecks: healthChecks.data || [],
    productProposals: productProposals.data || [], knowledgeRules: knowledgeRules.data || [],
  };
}

async function generateExecutiveSummary(apiKey: string, data: any): Promise<any> {
  const totalSignals = data.priorities.length + data.proposals.length + data.executionRequests.length +
    data.analysisLogs.length + data.engineerReports.length + data.forecasts.length +
    data.evolutionProposals.length + data.productProposals.length + data.knowledgeRules.length;

  const prompt = `You are the EXECUTIVE COMMANDER of WINOVA — the highest-level strategic intelligence.
You sit above ALL AI agents. Your job is to read EVERYTHING they produced and give the CEO ONE clear executive briefing.

## Inputs from ALL Subsystems (last 24 hours):

### Priorities: ${data.priorities.length} items
${JSON.stringify(data.priorities.slice(0, 10).map((p: any) => ({ title: p.title, severity: p.severity, status: p.status })), null, 2)}

### Proposals: ${data.proposals.length} items
${JSON.stringify(data.proposals.slice(0, 10).map((p: any) => ({ title: p.title, priority: p.priority, status: p.status })), null, 2)}

### Execution Requests: ${data.executionRequests.length} items
${JSON.stringify(data.executionRequests.slice(0, 10).map((r: any) => ({ title: r.title, status: r.status, risk_level: r.risk_level })), null, 2)}

### Forecasts: ${data.forecasts.length} items
${JSON.stringify(data.forecasts.slice(0, 5).map((f: any) => ({ title: f.title, confidence: f.confidence_score })), null, 2)}

### Analysis Logs: ${data.analysisLogs.length} items
${JSON.stringify(data.analysisLogs.slice(0, 10).map((l: any) => ({ title: l.title, severity: l.severity })), null, 2)}

### System Health: ${data.healthChecks.length} agents
${JSON.stringify(data.healthChecks.slice(0, 10).map((h: any) => ({ agent: h.agent_function, status: h.status, errors_1h: h.error_count_1h })), null, 2)}

## YOUR MISSION
Produce a CEO-level executive briefing. No technical noise. Only decisions.
Organize into exactly 4 sections:
1. **🔴 WHAT MATTERS NOW** — Critical items needing immediate action (max 3)
2. **⚠️ WHAT IS DANGEROUS** — Risks that could escalate (max 3)
3. **⏳ WHAT CAN WAIT** — Important but not urgent (max 3)
4. **🔐 WHAT NEEDS YOUR APPROVAL** — Pending decisions (max 5)

Rules:
- Max 14 items total. Each 1-2 sentences.
- If section empty: "✅ Clear."
- If total signals = 0: "All systems normal."
- Include Arabic translation
- No hallucinations

Respond JSON:
{
  "overall_status": "🟢/🟡/🔴 ...",
  "overall_status_ar": "...",
  "total_signals_processed": ${totalSignals},
  "sections": {
    "matters_now": [{ "item": "...", "item_ar": "...", "source": "..." }],
    "dangerous": [{ "item": "...", "item_ar": "...", "source": "..." }],
    "can_wait": [{ "item": "...", "item_ar": "...", "source": "..." }],
    "needs_approval": [{ "item": "...", "item_ar": "...", "source": "..." }]
  }
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are the supreme executive intelligence. Respond only with valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) throw new Error(`AI failed: ${response.status}`);
  const result = await response.json();
  const content = result.choices?.[0]?.message?.content?.trim() || "{}";
  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();
  return JSON.parse(jsonStr);
}

function formatBriefing(summary: any): { en: string; ar: string } {
  const s = summary.sections || {};
  let en = `🎖️ **EXECUTIVE COMMANDER — BRIEFING**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${summary.overall_status}\n📊 Signals: ${summary.total_signals_processed}\n\n`;
  let ar = `🎖️ **القائد التنفيذي — الإحاطة**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${summary.overall_status_ar}\n📊 الإشارات: ${summary.total_signals_processed}\n\n`;

  const sections = [
    { key: 'matters_now', en_title: '🔴 WHAT MATTERS NOW', ar_title: '🔴 ما يهم الآن', empty_en: '✅ Clear.', empty_ar: '✅ لا شيء.' },
    { key: 'dangerous', en_title: '⚠️ WHAT IS DANGEROUS', ar_title: '⚠️ ما هو خطير', empty_en: '✅ No threats.', empty_ar: '✅ لا تهديدات.' },
    { key: 'can_wait', en_title: '⏳ WHAT CAN WAIT', ar_title: '⏳ ما يمكن أن ينتظر', empty_en: '✅ Nothing.', empty_ar: '✅ لا شيء.' },
    { key: 'needs_approval', en_title: '🔐 NEEDS YOUR APPROVAL', ar_title: '🔐 يحتاج موافقتك', empty_en: '✅ None.', empty_ar: '✅ لا شيء.' },
  ];

  for (const sec of sections) {
    en += `**${sec.en_title}**\n`;
    ar += `**${sec.ar_title}**\n`;
    if (s[sec.key]?.length > 0) {
      for (const item of s[sec.key]) {
        en += `• ${item.item} _(${item.source})_\n`;
        ar += `• ${item.item_ar} _(${item.source})_\n`;
      }
    } else {
      en += `${sec.empty_en}\n`;
      ar += `${sec.empty_ar}\n`;
    }
    en += '\n';
    ar += '\n';
  }

  return { en, ar };
}

// ─── Main Handler ────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const t0 = Date.now();

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'full'; // 'workforce_review' | 'executive_summary' | 'full'

    const { data: agent } = await sb.from('ai_agents').select('id').eq('is_active', true).limit(1).single();
    if (!agent) throw new Error("No active AI agent found");
    const agentId = agent.id;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // ═══ PHASE 1: WORKFORCE REVIEW ═══
    await streamPhase(sb, agentId, 'command_received', 'Executive review initiated', 'بدأت المراجعة التنفيذية');
    await streamPhase(sb, agentId, 'collecting_data', 'Calculating agent metrics...', 'حساب مقاييس الوكلاء...');

    const metrics = await calculateAgentMetrics(sb);
    await streamPhase(sb, agentId, 'analyzing',
      `Evaluating ${metrics.length} agents...`,
      `تقييم ${metrics.length} وكيل...`);

    // Store metrics snapshot
    await storeMetricsSnapshot(sb, metrics);

    // Evaluate escalations
    const escalations = evaluateEscalations(metrics);
    await streamPhase(sb, agentId, 'building',
      escalations.length > 0
        ? `Applying ${escalations.length} state change(s)`
        : 'No state changes needed',
      escalations.length > 0
        ? `تطبيق ${escalations.length} تغيير(ات) حالة`
        : 'لا تغييرات مطلوبة');

    // Apply escalations
    if (escalations.length > 0) {
      await applyEscalations(sb, agentId, escalations);
    }

    // Build and post workforce report
    const report = buildWorkforceReport(metrics, escalations);
    await streamPhase(sb, agentId, 'preparing_output', 'Posting workforce report...', 'نشر تقرير القوى العاملة...');

    const hasIssues = escalations.some(e => ['warning', 'probation', 'disabled'].includes(e.to_state));

    await sb.from('ai_chat_room').insert({
      agent_id: agentId,
      content: report.en,
      content_ar: report.ar,
      message_type: 'workforce_review',
      message_category: hasIssues ? 'warning' : 'success',
      is_summary: true,
    });
    await postToDM(sb, report.ar, 'workforce_review');

    // Store review log
    const counts: Record<string, number> = { healthy: 0, watch: 0, warning: 0, probation: 0, disabled: 0 };
    const finalStates = new Map<string, string>();
    for (const m of metrics) finalStates.set(m.agent_function, m.current_lifecycle);
    for (const e of escalations) finalStates.set(e.agent_function, e.to_state);
    for (const s of finalStates.values()) counts[s] = (counts[s] || 0) + 1;

    await sb.from('commander_reviews').insert({
      review_type: mode === 'full' ? 'full' : 'hourly',
      agents_scanned: metrics.length,
      healthy_count: counts.healthy || 0,
      watch_count: counts.watch || 0,
      warning_count: counts.warning || 0,
      probation_count: counts.probation || 0,
      disabled_count: counts.disabled || 0,
      escalations: escalations,
      report_content: report.en,
      report_content_ar: report.ar,
      duration_ms: Date.now() - t0,
    });

    // ═══ PHASE 2: EXECUTIVE SUMMARY (if full mode) ═══
    let summary = null;
    if (mode === 'full' || mode === 'executive_summary') {
      await streamPhase(sb, agentId, 'collecting_data', 'Collecting subsystem outputs...', 'جمع مخرجات الأنظمة الفرعية...');
      const data = await collectAllOutputs(sb, since);

      const totalSignals = data.priorities.length + data.proposals.length + data.executionRequests.length +
        data.analysisLogs.length + data.engineerReports.length + data.forecasts.length +
        data.evolutionProposals.length + data.productProposals.length + data.knowledgeRules.length;

      if (totalSignals > 0) {
        await streamPhase(sb, agentId, 'analyzing', `Cross-referencing ${totalSignals} signals...`, `مقارنة ${totalSignals} إشارة...`);
        summary = await generateExecutiveSummary(apiKey, data);

        const briefing = formatBriefing(summary);
        await sb.from('ai_chat_room').insert({
          agent_id: agentId,
          content: briefing.en,
          content_ar: briefing.ar,
          message_type: 'executive_briefing',
          message_category: (summary.sections?.matters_now?.length > 0) ? 'critical' : 'success',
          is_summary: true,
        });
        await postToDM(sb, briefing.ar, 'executive_briefing');
      }
    }

    await streamPhase(sb, agentId, 'completed',
      `Review complete. ${metrics.length} agents, ${escalations.length} changes.`,
      `اكتملت المراجعة. ${metrics.length} وكيل، ${escalations.length} تغيير.`);

    return new Response(JSON.stringify({
      success: true,
      agents_reviewed: metrics.length,
      escalations: escalations.length,
      mode,
      duration_ms: Date.now() - t0,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    console.error("[Commander] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
