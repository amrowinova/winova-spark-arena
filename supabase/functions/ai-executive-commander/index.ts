import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_SYSTEM_USER_ID = '00000000-0000-0000-0000-a10000000001';
const COMMANDER_NAME = 'Executive Commander';
const COMMANDER_NAME_AR = 'القائد التنفيذي';

// ─── Thinking Stream ─────────────────────────────────
const PHASES = [
  { key: 'command_received',   emoji: '📩', en: 'Command received',        ar: 'تم استلام الأمر' },
  { key: 'understanding',      emoji: '🧠', en: 'Understanding request',   ar: 'فهم الطلب' },
  { key: 'planning',           emoji: '📋', en: 'Planning aggregation',    ar: 'تخطيط التجميع' },
  { key: 'collecting_data',    emoji: '📡', en: 'Collecting all outputs',  ar: 'جمع كل المخرجات' },
  { key: 'analyzing',          emoji: '🔬', en: 'Cross-referencing',       ar: 'مقارنة وتحليل' },
  { key: 'building',           emoji: '🏗️', en: 'Building executive view', ar: 'بناء الرؤية التنفيذية' },
  { key: 'validating',         emoji: '✅', en: 'Validating priorities',   ar: 'التحقق من الأولويات' },
  { key: 'preparing_output',   emoji: '📝', en: 'Preparing summary',      ar: 'إعداد الملخص' },
  { key: 'completed',          emoji: '🏁', en: 'Completed',               ar: 'مكتمل' },
] as const;

type PhaseKey = typeof PHASES[number]['key'];

async function streamPhase(
  sb: any, agentId: string, phaseKey: PhaseKey, detail?: string, detailAr?: string
): Promise<void> {
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

// ─── Data Collection from All Subsystems ─────────────
async function collectAllOutputs(sb: any, since: string) {
  const [
    priorities,
    proposals,
    executionRequests,
    analysisLogs,
    engineerReports,
    forecasts,
    evolutionProposals,
    healthChecks,
    productProposals,
    knowledgeRules,
  ] = await Promise.all([
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
    priorities: priorities.data || [],
    proposals: proposals.data || [],
    executionRequests: executionRequests.data || [],
    analysisLogs: analysisLogs.data || [],
    engineerReports: engineerReports.data || [],
    forecasts: forecasts.data || [],
    evolutionProposals: evolutionProposals.data || [],
    healthChecks: healthChecks.data || [],
    productProposals: productProposals.data || [],
    knowledgeRules: knowledgeRules.data || [],
  };
}

// ─── AI Executive Summary ────────────────────────────
async function generateExecutiveSummary(apiKey: string, data: any): Promise<any> {
  const totalSignals =
    data.priorities.length + data.proposals.length + data.executionRequests.length +
    data.analysisLogs.length + data.engineerReports.length + data.forecasts.length +
    data.evolutionProposals.length + data.productProposals.length + data.knowledgeRules.length;

  const prompt = `You are the EXECUTIVE COMMANDER of WINOVA — the highest-level strategic intelligence.
You sit above ALL AI agents. Your job is to read EVERYTHING they produced and give the CEO ONE clear executive briefing.

## Inputs from ALL Subsystems (last 24 hours):

### Priorities (from Executive Brain): ${data.priorities.length} items
${JSON.stringify(data.priorities.slice(0, 10).map((p: any) => ({ title: p.title, severity: p.severity, category: p.category, status: p.status })), null, 2)}

### Proposals (AI suggestions): ${data.proposals.length} items
${JSON.stringify(data.proposals.slice(0, 10).map((p: any) => ({ title: p.title, priority: p.priority, status: p.status, risk: p.risk_label })), null, 2)}

### Execution Requests: ${data.executionRequests.length} items
${JSON.stringify(data.executionRequests.slice(0, 10).map((r: any) => ({ title: r.title, status: r.status, risk_level: r.risk_level, risk_score: r.risk_score })), null, 2)}

### Engineer Reports: ${data.engineerReports.length} items
${JSON.stringify(data.engineerReports.slice(0, 5).map((r: any) => ({ summary: r.summary, critical_issues: r.critical_issues, patches_proposed: r.patches_proposed })), null, 2)}

### Forecasts: ${data.forecasts.length} items
${JSON.stringify(data.forecasts.slice(0, 5).map((f: any) => ({ title: f.title || f.forecast_type, confidence: f.confidence_score, severity: f.severity })), null, 2)}

### Analysis Logs: ${data.analysisLogs.length} items
${JSON.stringify(data.analysisLogs.slice(0, 10).map((l: any) => ({ title: l.title, severity: l.severity, status: l.status })), null, 2)}

### Evolution Proposals: ${data.evolutionProposals.length} items
${JSON.stringify(data.evolutionProposals.slice(0, 5).map((e: any) => ({ capability: e.missing_capability, urgency: e.urgency, status: e.status })), null, 2)}

### System Health: ${data.healthChecks.length} agents
${JSON.stringify(data.healthChecks.slice(0, 10).map((h: any) => ({ agent: h.agent_function, status: h.status, errors_1h: h.error_count_1h })), null, 2)}

### Product Proposals: ${data.productProposals.length} items
${JSON.stringify(data.productProposals.slice(0, 5).map((p: any) => ({ title: p.title, impact: p.estimated_impact, status: p.status })), null, 2)}

## YOUR MISSION
Produce a CEO-level executive briefing. No technical noise. Only decisions.

Organize into exactly 4 sections:
1. **🔴 WHAT MATTERS NOW** — Critical items that need immediate action (max 3)
2. **⚠️ WHAT IS DANGEROUS** — Risks, threats, or failures that could escalate (max 3)
3. **⏳ WHAT CAN WAIT** — Important but not urgent items (max 3)
4. **🔐 WHAT NEEDS YOUR APPROVAL** — Pending decisions only you can make (max 5)

## Rules
- Maximum 14 items total across all sections
- Each item: 1-2 sentences max. Business impact only.
- If a section has nothing, say "✅ Clear — nothing here."
- If total signals = 0, say "All systems normal. No action required."
- Include Arabic translation for each item
- No hallucinations — only reference real data from above
- Add a 1-sentence overall status at the top

Respond with JSON:
{
  "overall_status": "🟢 All clear / 🟡 Needs attention / 🔴 Critical issues",
  "overall_status_ar": "...",
  "total_signals_processed": ${totalSignals},
  "sections": {
    "matters_now": [{ "item": "...", "item_ar": "...", "source": "agent name" }],
    "dangerous": [{ "item": "...", "item_ar": "...", "source": "agent name" }],
    "can_wait": [{ "item": "...", "item_ar": "...", "source": "agent name" }],
    "needs_approval": [{ "item": "...", "item_ar": "...", "source": "agent name", "request_id": "uuid or null" }]
  }
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are the supreme executive intelligence. Respond only with valid JSON. Be decisive and concise." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[Commander] AI failed:", response.status, text);
    throw new Error(`AI failed: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content?.trim() || "{}";

  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  return JSON.parse(jsonStr);
}

// ─── Format Executive Briefing ───────────────────────
function formatBriefing(summary: any): { en: string; ar: string } {
  const sections = summary.sections || {};

  let en = `🎖️ **EXECUTIVE COMMANDER — BRIEFING**\n`;
  en += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  en += `${summary.overall_status}\n`;
  en += `📊 Signals processed: ${summary.total_signals_processed}\n\n`;

  let ar = `🎖️ **القائد التنفيذي — الإحاطة**\n`;
  ar += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  ar += `${summary.overall_status_ar}\n`;
  ar += `📊 الإشارات المعالجة: ${summary.total_signals_processed}\n\n`;

  // Section 1: Matters Now
  en += `**🔴 WHAT MATTERS NOW**\n`;
  ar += `**🔴 ما يهم الآن**\n`;
  if (sections.matters_now?.length > 0) {
    for (const item of sections.matters_now) {
      en += `• ${item.item} _(${item.source})_\n`;
      ar += `• ${item.item_ar} _(${item.source})_\n`;
    }
  } else {
    en += `✅ Clear — nothing here.\n`;
    ar += `✅ لا شيء هنا.\n`;
  }

  // Section 2: Dangerous
  en += `\n**⚠️ WHAT IS DANGEROUS**\n`;
  ar += `\n**⚠️ ما هو خطير**\n`;
  if (sections.dangerous?.length > 0) {
    for (const item of sections.dangerous) {
      en += `• ${item.item} _(${item.source})_\n`;
      ar += `• ${item.item_ar} _(${item.source})_\n`;
    }
  } else {
    en += `✅ No active threats.\n`;
    ar += `✅ لا تهديدات نشطة.\n`;
  }

  // Section 3: Can Wait
  en += `\n**⏳ WHAT CAN WAIT**\n`;
  ar += `\n**⏳ ما يمكن أن ينتظر**\n`;
  if (sections.can_wait?.length > 0) {
    for (const item of sections.can_wait) {
      en += `• ${item.item} _(${item.source})_\n`;
      ar += `• ${item.item_ar} _(${item.source})_\n`;
    }
  } else {
    en += `✅ Nothing deferred.\n`;
    ar += `✅ لا شيء مؤجل.\n`;
  }

  // Section 4: Needs Approval
  en += `\n**🔐 NEEDS YOUR APPROVAL**\n`;
  ar += `\n**🔐 يحتاج موافقتك**\n`;
  if (sections.needs_approval?.length > 0) {
    for (const item of sections.needs_approval) {
      en += `• ${item.item} _(${item.source})_\n`;
      ar += `• ${item.item_ar} _(${item.source})_\n`;
    }
  } else {
    en += `✅ No pending approvals.\n`;
    ar += `✅ لا موافقات معلقة.\n`;
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

    // Get agent ID for posting messages
    const { data: agent } = await sb.from('ai_agents').select('id').eq('is_active', true).limit(1).single();
    if (!agent) throw new Error("No active AI agent found");
    const agentId = agent.id;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Phase 1: Command Received
    await streamPhase(sb, agentId, 'command_received', 'Executive briefing requested', 'تم طلب إحاطة تنفيذية');

    // Phase 2: Understanding
    await streamPhase(sb, agentId, 'understanding', 'Aggregating outputs from ALL AI agents', 'تجميع مخرجات جميع وكلاء الذكاء');

    // Phase 3: Planning
    await streamPhase(sb, agentId, 'planning', 'Will read: priorities, proposals, executions, forecasts, health, evolution', 'سيقرأ: الأولويات، المقترحات، التنفيذات، التوقعات، الصحة، التطور');

    // Phase 4: Collecting Data
    await streamPhase(sb, agentId, 'collecting_data', 'Querying 10 subsystem tables...', 'استعلام 10 جداول فرعية...');
    const data = await collectAllOutputs(sb, since);

    const totalSignals =
      data.priorities.length + data.proposals.length + data.executionRequests.length +
      data.analysisLogs.length + data.engineerReports.length + data.forecasts.length +
      data.evolutionProposals.length + data.productProposals.length + data.knowledgeRules.length;

    await streamPhase(sb, agentId, 'collecting_data',
      `Collected ${totalSignals} signals from ${Object.keys(data).length} subsystems`,
      `تم جمع ${totalSignals} إشارة من ${Object.keys(data).length} نظام فرعي`);

    // Phase 5: Analyzing
    await streamPhase(sb, agentId, 'analyzing', 'Cross-referencing all signals with AI...', 'مقارنة جميع الإشارات بالذكاء الاصطناعي...');

    if (totalSignals === 0) {
      await streamPhase(sb, agentId, 'completed', '✅ All systems normal. No action required.', '✅ جميع الأنظمة طبيعية. لا إجراء مطلوب.');

      return new Response(JSON.stringify({
        success: true,
        message: 'No signals to analyze',
        duration_ms: Date.now() - t0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const summary = await generateExecutiveSummary(apiKey, data);

    // Phase 6: Building
    await streamPhase(sb, agentId, 'building', `Status: ${summary.overall_status}`, `الحالة: ${summary.overall_status_ar}`);

    // Phase 7: Validating
    const approvalCount = summary.sections?.needs_approval?.length || 0;
    const criticalCount = summary.sections?.matters_now?.length || 0;
    await streamPhase(sb, agentId, 'validating',
      `${criticalCount} critical, ${approvalCount} need approval`,
      `${criticalCount} حرجة، ${approvalCount} تحتاج موافقة`);

    // Phase 8: Preparing output
    const briefing = formatBriefing(summary);
    await streamPhase(sb, agentId, 'preparing_output', 'Posting executive briefing...', 'نشر الإحاطة التنفيذية...');

    // Post the executive briefing to chat room
    await sb.from('ai_chat_room').insert({
      agent_id: agentId,
      content: briefing.en,
      content_ar: briefing.ar,
      message_type: 'executive_briefing',
      message_category: criticalCount > 0 ? 'critical' : approvalCount > 0 ? 'warning' : 'success',
      is_summary: true,
    });

    // Post to DM
    await postToDM(sb, briefing.ar, 'executive_briefing');

    // Phase 9: Completed
    await streamPhase(sb, agentId, 'completed',
      `Briefing delivered. ${totalSignals} signals → ${criticalCount + approvalCount + (summary.sections?.dangerous?.length || 0) + (summary.sections?.can_wait?.length || 0)} action items.`,
      `تم تسليم الإحاطة. ${totalSignals} إشارة → عناصر إجراء.`);

    return new Response(JSON.stringify({
      success: true,
      total_signals: totalSignals,
      critical: criticalCount,
      needs_approval: approvalCount,
      overall_status: summary.overall_status,
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
