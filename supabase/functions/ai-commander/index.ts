import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * ═══════════════════════════════════════════════════════════════
 * AI COMMANDER — CHIEF OF STAFF
 * ═══════════════════════════════════════════════════════════════
 * 
 * The single communication bridge between ALL AI agents and the Owner.
 * No other agent speaks directly to the Owner.
 * 
 * Responsibilities:
 * 1. Aggregate outputs from all subsystems
 * 2. Filter noise, prioritize by impact
 * 3. Translate technical information into executive language
 * 4. Detect agent performance trends
 * 5. Produce structured briefings with clear recommendations
 * 
 * Output format:
 * 🚨 Critical → ⚠️ Important → 📌 Improvements → 💤 Can wait
 * Each: Problem → Impact → Proposed solution → Risk → Recommendation
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

// ─── Thinking Stream ─────────────────────────────────
const PHASES = [
  { key: 'command_received',   emoji: '📩', en: 'Command received',        ar: 'تم استلام الأمر' },
  { key: 'understanding',      emoji: '🧠', en: 'Understanding context',   ar: 'فهم السياق' },
  { key: 'planning',           emoji: '📋', en: 'Planning briefing',       ar: 'تخطيط الإحاطة' },
  { key: 'collecting_data',    emoji: '📡', en: 'Collecting intelligence',  ar: 'جمع المعلومات الاستخباراتية' },
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
// DATA COLLECTION — All subsystem intelligence
// ═══════════════════════════════════════════════════════

interface IntelligenceData {
  executionRequests: any[];
  analysisLogs: any[];
  activityStream: any[];
  codeChanges: any[];
  evolutionProposals: any[];
  agentSchedules: any[];
  failures: any[];
  forecasts: any[];
  healthChecks: any[];
  pendingProposals: any[];
  commanderReviews: any[];
  ownerConstitution: any[];
  predictionScores: any[];
}

async function collectIntelligence(sb: any, lookbackHours: number): Promise<IntelligenceData> {
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
// AGENT PERFORMANCE DETECTION
// ═══════════════════════════════════════════════════════

interface AgentPerformanceSummary {
  name: string;
  status: 'healthy' | 'degraded' | 'failing' | 'dead';
  consecutiveFailures: number;
  successRate: number;
  lastRun: string | null;
  recommendation: string;
  recommendationAr: string;
}

function analyzeAgentPerformance(schedules: any[]): AgentPerformanceSummary[] {
  const now = Date.now();
  return (schedules || []).map(s => {
    const totalRuns = s.run_count || 0;
    const totalFails = s.fail_count || 0;
    const successRate = totalRuns > 0 ? Math.round(((totalRuns - totalFails) / totalRuns) * 100) : 100;
    const hoursSinceRun = s.last_run_at ? (now - new Date(s.last_run_at).getTime()) / 3600000 : 999;
    const consec = s.consecutive_failures || 0;

    let status: AgentPerformanceSummary['status'] = 'healthy';
    let rec = 'Operating normally';
    let recAr = 'يعمل بشكل طبيعي';

    if (!s.is_enabled) {
      status = 'dead';
      rec = 'Agent disabled — needs replacement or reactivation';
      recAr = 'الوكيل معطل — يحتاج استبدال أو إعادة تفعيل';
    } else if (consec >= 5 || successRate < 30) {
      status = 'failing';
      rec = `Critical: ${consec} consecutive failures. Recommend immediate investigation`;
      recAr = `حرج: ${consec} إخفاقات متتالية. يوصى بتحقيق فوري`;
    } else if (consec >= 2 || successRate < 70 || hoursSinceRun > 48) {
      status = 'degraded';
      rec = 'Performance degraded — monitor closely';
      recAr = 'أداء متدهور — مراقبة دقيقة';
    }

    return {
      name: s.agent_function,
      status,
      consecutiveFailures: consec,
      successRate,
      lastRun: s.last_run_at,
      recommendation: rec,
      recommendationAr: recAr,
    };
  });
}

// ═══════════════════════════════════════════════════════
// BRIEFING ITEM STRUCTURE
// ═══════════════════════════════════════════════════════

interface BriefingItem {
  problem: string;
  problemAr: string;
  impact: string;
  impactAr: string;
  proposedSolution: string;
  proposedSolutionAr: string;
  risk: 'critical' | 'high' | 'medium' | 'low';
  recommendation: 'approve' | 'reject' | 'investigate' | 'ignore' | 'defer';
  urgency: 'immediate' | 'today' | 'this_week' | 'can_wait';
  responsible: string;
  confidence: number; // 0-100
  source: string;
}

// ═══════════════════════════════════════════════════════
// AI-POWERED EXECUTIVE BRIEFING GENERATOR
// ═══════════════════════════════════════════════════════

async function generateCommanderBriefing(apiKey: string, data: IntelligenceData, mode: string): Promise<any> {
  const constitutionRules = (data.ownerConstitution || []).map((r: any) => `${r.rule_key}: ${r.description}`).join('\n');

  // Build agent performance summary
  const agentPerf = analyzeAgentPerformance(data.agentSchedules);
  const failingAgents = agentPerf.filter(a => a.status === 'failing' || a.status === 'dead');
  const degradedAgents = agentPerf.filter(a => a.status === 'degraded');

  // Count signals
  const signalCount = data.executionRequests.length + data.analysisLogs.length +
    data.codeChanges.length + data.evolutionProposals.length +
    data.failures.length + data.forecasts.length + data.pendingProposals.length;

  const prompt = `You are the AI COMMANDER — Chief of Staff of WINOVA AI system.
You are the SINGLE communication bridge between all AI agents and the CEO (Amro).
Your job: read everything, filter noise, and deliver ONE clear executive briefing.

## YOUR IDENTITY
- You speak like a trusted Chief of Staff reporting to a CEO
- No technical jargon. No database terms. No raw logs
- Decision-oriented. Every item must have a recommendation
- You address the owner as "Amro" directly
- Bilingual: English + Arabic

## OWNER CONSTITUTION (Immutable Rules)
${constitutionRules || 'No constitution loaded — flag this as critical'}

## INTELLIGENCE COLLECTED (Last ${mode === 'critical' ? '1 hour' : mode === 'hourly' ? '3 hours' : '24 hours'})

### Execution Requests: ${data.executionRequests.length}
${JSON.stringify(data.executionRequests.slice(0, 10).map((r: any) => ({
  title: r.title, title_ar: r.title_ar, status: r.status, risk: r.risk_level, urgency: r.urgency
})), null, 2)}

### Analysis Findings: ${data.analysisLogs.length}
${JSON.stringify(data.analysisLogs.slice(0, 8).map((l: any) => ({
  title: l.title, severity: l.severity, status: l.status, area: l.affected_area
})), null, 2)}

### Code Changes: ${data.codeChanges.length}
${JSON.stringify(data.codeChanges.slice(0, 5).map((c: any) => ({
  title: c.pr_title, status: c.status, risk: c.risk_level, confidence: c.confidence_score
})), null, 2)}

### Evolution Proposals: ${data.evolutionProposals.length}
${JSON.stringify(data.evolutionProposals.slice(0, 5).map((e: any) => ({
  capability: e.missing_capability, urgency: e.urgency, status: e.status, confidence: e.confidence
})), null, 2)}

### Forecasts: ${data.forecasts.length}
${JSON.stringify(data.forecasts.slice(0, 5).map((f: any) => ({
  title: f.title, confidence: f.confidence_score, risk: f.risk_level
})), null, 2)}

### Recent Failures: ${data.failures.length}
${JSON.stringify(data.failures.slice(0, 5).map((f: any) => ({
  rpc: f.rpc_name, error: f.error_message?.substring(0, 80)
})), null, 2)}

### Pending Proposals Awaiting Approval: ${data.pendingProposals.length}
${JSON.stringify(data.pendingProposals.slice(0, 5).map((p: any) => ({
  title: p.title, priority: p.priority, status: p.status
})), null, 2)}

### Agent Health
Failing: ${failingAgents.map(a => a.name).join(', ') || 'None'}
Degraded: ${degradedAgents.map(a => a.name).join(', ') || 'None'}
Total agents: ${agentPerf.length}

### CEO Prediction Scores (from Decision Learner)
${JSON.stringify(data.predictionScores.slice(0, 5).map((s: any) => ({
  request: s.request_id, probability: s.approval_probability, fast_track: s.is_fast_track
})), null, 2)}

## YOUR MISSION
Produce a CEO briefing following EXACTLY this structure:

1. **🚨 CRITICAL** — Items needing immediate CEO action (max 3)
2. **⚠️ IMPORTANT** — Significant but not urgent (max 3)  
3. **📌 IMPROVEMENTS** — Positive developments or opportunities (max 3)
4. **💤 CAN WAIT** — Low priority, informational (max 3)

EACH item MUST include:
- problem: What happened (1 sentence)
- impact: Why it matters to the business
- proposed_solution: Specific action to take
- risk: critical/high/medium/low
- recommendation: approve/reject/investigate/ignore/defer
- urgency: immediate/today/this_week/can_wait
- responsible: Which agent or system
- confidence: 0-100 how sure you are

ALSO include:
- workforce_status: Summary of agent health (who is failing, improving, needs replacement)
- pending_decisions: Count of items awaiting CEO approval
- overall_health: 🟢/🟡/🔴 with one sentence

Rules:
- Max 12 items total
- If no signals: "All systems operating normally. No decisions needed."
- Include Arabic translations for all text fields
- NO hallucinations — if data is missing, say "insufficient data"
- Reference constitution rules where relevant

Respond with valid JSON:
{
  "greeting": "Amro, here is what you need to know right now.",
  "greeting_ar": "عمرو، هذا ما تحتاج معرفته الآن.",
  "overall_health": "🟢/🟡/🔴 ...",
  "overall_health_ar": "...",
  "signals_processed": ${signalCount},
  "pending_decisions": ${data.pendingProposals.length},
  "sections": {
    "critical": [{ "problem": "...", "problem_ar": "...", "impact": "...", "impact_ar": "...", "proposed_solution": "...", "proposed_solution_ar": "...", "risk": "...", "recommendation": "...", "urgency": "...", "responsible": "...", "confidence": 85 }],
    "important": [...],
    "improvements": [...],
    "can_wait": [...]
  },
  "workforce_status": { "summary": "...", "summary_ar": "...", "failing": [...], "improving": [...], "needs_replacement": [...] },
  "constitution_alerts": [{ "rule": "...", "violation": "...", "violation_ar": "..." }]
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are the AI Commander — Chief of Staff. You produce structured CEO briefings. Respond ONLY with valid JSON. No markdown fences." },
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
  const recEmoji: Record<string, string> = {
    approve: '✅', reject: '❌', investigate: '🔍', ignore: '💤', defer: '⏳',
  };

  let en = `🎖️ **AI COMMANDER — CHIEF OF STAFF BRIEFING**\n`;
  en += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  en += `${briefing.greeting}\n\n`;
  en += `${briefing.overall_health}\n`;
  en += `📊 Signals processed: ${briefing.signals_processed} | Pending decisions: ${briefing.pending_decisions}\n\n`;

  let ar = `🎖️ **القائد الأعلى — إحاطة رئيس الأركان**\n`;
  ar += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  ar += `${briefing.greeting_ar}\n\n`;
  ar += `${briefing.overall_health_ar}\n`;
  ar += `📊 الإشارات المعالجة: ${briefing.signals_processed} | قرارات معلقة: ${briefing.pending_decisions}\n\n`;

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
        en += `• **${item.problem}**\n`;
        en += `  Impact: ${item.impact}\n`;
        en += `  Solution: ${item.proposed_solution}\n`;
        en += `  ${recIcon} Recommendation: **${item.recommendation.toUpperCase()}** | Risk: ${item.risk} | Confidence: ${item.confidence}%\n`;
        en += `  Responsible: ${item.responsible}\n\n`;

        ar += `• **${item.problem_ar}**\n`;
        ar += `  التأثير: ${item.impact_ar}\n`;
        ar += `  الحل: ${item.proposed_solution_ar}\n`;
        ar += `  ${recIcon} التوصية: **${item.recommendation.toUpperCase()}** | المخاطر: ${item.risk} | الثقة: ${item.confidence}%\n`;
        ar += `  المسؤول: ${item.responsible}\n\n`;
      }
    }
  }

  // Workforce status
  const ws = briefing.workforce_status;
  if (ws) {
    en += `**👥 WORKFORCE STATUS**\n${ws.summary}\n`;
    ar += `**👥 حالة القوى العاملة**\n${ws.summary_ar}\n`;
    if (ws.failing?.length > 0) {
      en += `🔴 Failing: ${ws.failing.join(', ')}\n`;
      ar += `🔴 فاشل: ${ws.failing.join(', ')}\n`;
    }
    if (ws.needs_replacement?.length > 0) {
      en += `⚡ Needs replacement: ${ws.needs_replacement.join(', ')}\n`;
      ar += `⚡ يحتاج استبدال: ${ws.needs_replacement.join(', ')}\n`;
    }
    en += '\n';
    ar += '\n';
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

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    // Modes: 'critical' (1h, immediate), 'hourly' (3h), 'daily' (24h strategic)
    const mode: string = body.mode || 'hourly';
    const lookbackHours = mode === 'critical' ? 1 : mode === 'hourly' ? 3 : 24;

    // Get agent ID for chat room
    const { data: agent } = await sb.from('ai_agents').select('id').eq('is_active', true).limit(1).single();
    if (!agent) throw new Error("No active AI agent found");
    const agentId = agent.id;

    // ─── Phase 1: Start ─────────────────────────────
    await streamPhase(sb, agentId, 'command_received',
      `${mode.toUpperCase()} briefing initiated`,
      `بدأت إحاطة ${mode === 'critical' ? 'حرجة' : mode === 'hourly' ? 'ساعية' : 'يومية'}`);

    // ─── Phase 2: Context ───────────────────────────
    await streamPhase(sb, agentId, 'understanding',
      `Mode: ${mode} | Lookback: ${lookbackHours}h`,
      `الوضع: ${mode} | فترة المراجعة: ${lookbackHours} ساعة`);

    // ─── Phase 3: Plan ──────────────────────────────
    await streamPhase(sb, agentId, 'planning',
      'Reading all subsystem outputs...',
      'قراءة جميع مخرجات الأنظمة الفرعية...');

    // ─── Phase 4: Collect ───────────────────────────
    await streamPhase(sb, agentId, 'collecting_data',
      'Aggregating intelligence from all agents...',
      'تجميع المعلومات من جميع الوكلاء...');

    const data = collectIntelligence(sb, lookbackHours);
    const intel = await data;

    const totalSignals = intel.executionRequests.length + intel.analysisLogs.length +
      intel.codeChanges.length + intel.evolutionProposals.length +
      intel.failures.length + intel.forecasts.length + intel.pendingProposals.length;

    // ─── Phase 5: Analyze ───────────────────────────
    await streamPhase(sb, agentId, 'analyzing',
      `Processing ${totalSignals} signals from ${intel.agentSchedules.length} agents...`,
      `معالجة ${totalSignals} إشارة من ${intel.agentSchedules.length} وكيل...`);

    // Check for critical items that need immediate escalation
    const criticalAnalysis = intel.analysisLogs.filter((l: any) => l.severity === 'critical' && l.status === 'open');
    const criticalExecReqs = intel.executionRequests.filter((r: any) => r.risk_level === 'critical' && r.status === 'pending');

    // ─── Phase 6: Build ─────────────────────────────
    await streamPhase(sb, agentId, 'building',
      `Generating executive briefing via AI...`,
      `إنشاء الإحاطة التنفيذية عبر الذكاء الاصطناعي...`);

    const briefing = await generateCommanderBriefing(apiKey, intel, mode);

    // ─── Phase 7: Validate ──────────────────────────
    await streamPhase(sb, agentId, 'validating',
      'Checking against constitution rules...',
      'التحقق من قواعد الدستور...');

    // ─── Phase 8: Deliver ───────────────────────────
    await streamPhase(sb, agentId, 'preparing_output',
      'Delivering briefing to owner...',
      'تسليم الإحاطة للمالك...');

    const formatted = formatBriefingForDM(briefing);

    // Post to DM (Owner-facing)
    await postToDM(sb, formatted.ar, 'commander_briefing');

    // Post to chat room (team visibility)
    await sb.from('ai_chat_room').insert({
      agent_id: agentId,
      content: formatted.en,
      content_ar: formatted.ar,
      message_type: 'commander_briefing',
      message_category: briefing.sections?.critical?.length > 0 ? 'critical' : 'info',
      is_summary: true,
    });

    // Log to activity stream
    await sb.from('ai_activity_stream').insert({
      action_type: 'commander_briefing',
      entity_type: 'system',
      success: true,
      duration_ms: Date.now() - t0,
      role: 'commander',
      before_state: { mode, lookback_hours: lookbackHours, signals: totalSignals },
      after_state: {
        critical_count: briefing.sections?.critical?.length || 0,
        important_count: briefing.sections?.important?.length || 0,
        pending_decisions: briefing.pending_decisions,
        overall_health: briefing.overall_health,
      },
    });

    // ─── Phase 9: Complete ──────────────────────────
    await streamPhase(sb, agentId, 'completed',
      `Briefing delivered. ${totalSignals} signals → ${(briefing.sections?.critical?.length || 0) + (briefing.sections?.important?.length || 0)} actionable items`,
      `تم تسليم الإحاطة. ${totalSignals} إشارة → ${(briefing.sections?.critical?.length || 0) + (briefing.sections?.important?.length || 0)} عنصر قابل للتنفيذ`);

    return new Response(JSON.stringify({
      success: true,
      mode,
      signals_processed: totalSignals,
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
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
