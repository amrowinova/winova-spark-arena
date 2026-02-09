import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_SYSTEM_USER_ID = '00000000-0000-0000-0000-a10000000001';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

// ─── Thinking Stream ─────────────────────────────────
const PHASES = [
  { key: 'command_received',   emoji: '📩', en: 'Command received',        ar: 'تم استلام الأمر' },
  { key: 'understanding',      emoji: '🧠', en: 'Understanding request',   ar: 'فهم الطلب' },
  { key: 'planning',           emoji: '📋', en: 'Planning execution',      ar: 'تخطيط التنفيذ' },
  { key: 'collecting_data',    emoji: '📡', en: 'Collecting data',         ar: 'جمع البيانات' },
  { key: 'analyzing',          emoji: '🔬', en: 'Analyzing',               ar: 'تحليل' },
  { key: 'building',           emoji: '🏗️', en: 'Building solution',       ar: 'بناء الحل' },
  { key: 'validating',         emoji: '✅', en: 'Validating',              ar: 'التحقق' },
  { key: 'preparing_output',   emoji: '📝', en: 'Preparing result',        ar: 'إعداد النتيجة' },
  { key: 'completed',          emoji: '🏁', en: 'Completed',               ar: 'مكتمل' },
] as const;

type PhaseKey = typeof PHASES[number]['key'];

async function streamPhase(
  sb: any,
  agentId: string,
  agentName: string,
  agentNameAr: string,
  phaseKey: PhaseKey,
  detail?: string,
  detailAr?: string,
): Promise<void> {
  const phase = PHASES.find(p => p.key === phaseKey)!;
  const idx = PHASES.findIndex(p => p.key === phaseKey);
  const progress = `[${idx + 1}/${PHASES.length}]`;

  const content = [
    `${phase.emoji} **${phase.en}** ${progress}`,
    `🤖 Agent: ${agentName}`,
    detail ? `→ ${detail}` : null,
  ].filter(Boolean).join('\n');

  const contentAr = [
    `${phase.emoji} **${phase.ar}** ${progress}`,
    `🤖 الوكيل: ${agentNameAr}`,
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

// ─── Intent Map ──────────────────────────────────────
const INTENT_MAP: Record<string, { agent: string; intent: string }> = {
  'performance': { agent: 'ai-performance-analyst', intent: 'performance_scan' },
  'أداء': { agent: 'ai-performance-analyst', intent: 'performance_scan' },
  'slow': { agent: 'ai-performance-analyst', intent: 'performance_scan' },
  'بطيء': { agent: 'ai-performance-analyst', intent: 'performance_scan' },
  'optimize': { agent: 'ai-performance-analyst', intent: 'performance_scan' },
  'fraud': { agent: 'ai-execution-worker', intent: 'fraud_scan' },
  'احتيال': { agent: 'ai-execution-worker', intent: 'fraud_scan' },
  'suspicious': { agent: 'ai-execution-worker', intent: 'fraud_scan' },
  'مشبوه': { agent: 'ai-execution-worker', intent: 'fraud_scan' },
  'evolution': { agent: 'ai-evolution-engine', intent: 'evolution_scan' },
  'تطور': { agent: 'ai-evolution-engine', intent: 'evolution_scan' },
  'upgrade': { agent: 'ai-evolution-engine', intent: 'evolution_scan' },
  'ترقية': { agent: 'ai-evolution-engine', intent: 'evolution_scan' },
  'build': { agent: 'ai-build-engine', intent: 'build_project' },
  'بناء': { agent: 'ai-build-engine', intent: 'build_project' },
  'forecast': { agent: 'ai-forecast-engine', intent: 'forecast' },
  'توقع': { agent: 'ai-forecast-engine', intent: 'forecast' },
  'predict': { agent: 'ai-forecast-engine', intent: 'forecast' },
  'insight': { agent: 'ai-insight-engine', intent: 'insight_scan' },
  'strategy': { agent: 'ai-executive-brain', intent: 'strategic_analysis' },
  'simulate': { agent: 'ai-shadow-simulator', intent: 'simulation' },
  'محاكاة': { agent: 'ai-shadow-simulator', intent: 'simulation' },
  'scan': { agent: 'ai-performance-analyst', intent: 'performance_scan' },
  'فحص': { agent: 'ai-performance-analyst', intent: 'performance_scan' },
  'health': { agent: 'ai-health-monitor', intent: 'health_check' },
  'صحة': { agent: 'ai-health-monitor', intent: 'health_check' },
  'commander': { agent: 'ai-executive-commander', intent: 'executive_summary' },
  'قائد': { agent: 'ai-executive-commander', intent: 'executive_summary' },
  'summary': { agent: 'ai-executive-commander', intent: 'executive_summary' },
  'ملخص': { agent: 'ai-executive-commander', intent: 'executive_summary' },
  'priorities': { agent: 'ai-executive-commander', intent: 'executive_summary' },
  'أولويات': { agent: 'ai-executive-commander', intent: 'executive_summary' },
  'rule': { agent: 'ai-rule-generator', intent: 'rule_discovery' },
  'قاعدة': { agent: 'ai-rule-generator', intent: 'rule_discovery' },
  'p2p': { agent: 'ai-p2p-scanner', intent: 'p2p_security_scan' },
  'p2p scan': { agent: 'ai-p2p-scanner', intent: 'p2p_security_scan' },
  'فحص p2p': { agent: 'ai-p2p-scanner', intent: 'p2p_security_scan' },
  'أمان': { agent: 'ai-p2p-scanner', intent: 'p2p_security_scan' },
  'security': { agent: 'ai-p2p-scanner', intent: 'p2p_security_scan' },
  'fix': { agent: 'ai-code-engineer', intent: 'code_fix' },
  'إصلاح': { agent: 'ai-code-engineer', intent: 'code_fix' },
  'refactor': { agent: 'ai-code-engineer', intent: 'code_refactor' },
  'إعادة هيكلة': { agent: 'ai-code-engineer', intent: 'code_refactor' },
  'improve': { agent: 'ai-code-engineer', intent: 'code_improve' },
  'تحسين': { agent: 'ai-code-engineer', intent: 'code_improve' },
  'code': { agent: 'ai-code-engineer', intent: 'code_search' },
  'كود': { agent: 'ai-code-engineer', intent: 'code_search' },
};

// ─── DM Helper ────────────────────────────────────────
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

async function postToChatRoom(sb: any, content: string, contentAr: string, category = 'info', type = 'system') {
  const { data: agent } = await sb.from('ai_agents').select('id').eq('is_active', true).limit(1).single();
  if (agent) {
    await sb.from('ai_chat_room').insert({
      agent_id: agent.id,
      content,
      content_ar: contentAr,
      message_type: type,
      message_category: category,
      is_summary: false,
    });
  }
}

// ─── Classify Intent ──────────────────────────────────
function classifyIntent(text: string): { agent: string; intent: string } | null {
  const lower = text.toLowerCase();
  for (const [keyword, mapping] of Object.entries(INTENT_MAP)) {
    if (lower.includes(keyword)) return mapping;
  }
  return null;
}

// ─── Dispatch Agent ───────────────────────────────────
async function dispatchAgent(agentFunction: string, payload: Record<string, any>): Promise<{ success: boolean; status: number; body: any; durationMs: number }> {
  const url = `${SUPABASE_URL}/functions/v1/${agentFunction}`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    return { success: res.ok, status: res.status, body, durationMs: Date.now() - t0 };
  } catch (err) {
    return { success: false, status: 0, body: { error: err instanceof Error ? err.message : 'Unknown' }, durationMs: Date.now() - t0 };
  }
}

// ─── Get Active Agent ID ─────────────────────────────
async function getAgentId(sb: any): Promise<string | null> {
  const { data } = await sb.from('ai_agents').select('id').eq('is_active', true).limit(1).single();
  return data?.id || null;
}

// ─── PHASE 1: Process Command Queue with Thinking Stream ──
async function processCommandQueue(sb: any): Promise<number> {
  const { data: commands } = await sb
    .from('agent_command_queue')
    .select('*')
    .eq('dispatch_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(10);

  if (!commands?.length) return 0;

  const agentId = await getAgentId(sb);
  if (!agentId) return 0;

  let processed = 0;
  for (const cmd of commands) {
    // Phase 1: Command Received
    await streamPhase(sb, agentId, 'Orchestrator', 'المنسق', 'command_received',
      `"${cmd.raw_text.substring(0, 80)}"`,
      `"${cmd.raw_text.substring(0, 80)}"`);

    // Phase 2: Understanding
    const intent = classifyIntent(cmd.raw_text);
    await streamPhase(sb, agentId, 'Orchestrator', 'المنسق', 'understanding',
      intent ? `Detected: ${intent.intent} → ${intent.agent}` : 'No matching intent found',
      intent ? `تم الكشف: ${intent.intent} → ${intent.agent}` : 'لم يتم العثور على نية مطابقة');

    if (!intent) {
      await sb.from('agent_command_queue').update({
        dispatch_status: 'ignored',
        detected_intent: 'unknown',
        completed_at: new Date().toISOString(),
      }).eq('id', cmd.id);

      await streamPhase(sb, agentId, 'Orchestrator', 'المنسق', 'completed',
        'Command ignored — no matching agent',
        'تم تجاهل الأمر — لا يوجد وكيل مطابق');
      continue;
    }

    // Phase 3: Planning
    await streamPhase(sb, agentId, 'Orchestrator', 'المنسق', 'planning',
      `Routing to ${intent.agent} with intent "${intent.intent}"`,
      `توجيه إلى ${intent.agent} بنية "${intent.intent}"`);

    // Update command
    await sb.from('agent_command_queue').update({
      dispatch_status: 'dispatched',
      detected_intent: intent.intent,
      target_agent: intent.agent,
      dispatched_at: new Date().toISOString(),
    }).eq('id', cmd.id);

    // Phase 4: Collecting / Dispatching
    await streamPhase(sb, agentId, 'Orchestrator', 'المنسق', 'collecting_data',
      `Dispatching ${intent.agent}...`,
      `جاري تشغيل ${intent.agent}...`);

    // Dispatch the agent
    const result = await dispatchAgent(intent.agent, {
      triggered_by: 'orchestrator',
      command: cmd.raw_text,
      command_id: cmd.id,
    });

    // Phase 7: Validating result
    await streamPhase(sb, agentId, 'Orchestrator', 'المنسق', 'validating',
      result.success
        ? `Agent responded OK (${result.durationMs}ms)`
        : `Agent FAILED: ${JSON.stringify(result.body).substring(0, 100)}`,
      result.success
        ? `الوكيل استجاب بنجاح (${result.durationMs}ms)`
        : `فشل الوكيل`);

    // Update queue
    await sb.from('agent_command_queue').update({
      dispatch_status: result.success ? 'completed' : 'failed',
      dispatch_result: result.body,
      completed_at: new Date().toISOString(),
      error_message: result.success ? null : JSON.stringify(result.body),
    }).eq('id', cmd.id);

    // Memory
    await sb.from('agent_memory').insert({
      agent_function: intent.agent,
      memory_type: 'decision',
      content: `Command dispatched: "${cmd.raw_text}" → ${intent.agent} (${result.success ? 'success' : 'failed'}, ${result.durationMs}ms)`,
      importance: result.success ? 5 : 8,
      tags: ['command', intent.intent],
    });

    // Phase 9: Completed
    const icon = result.success ? '✅' : '❌';
    await streamPhase(sb, agentId, 'Orchestrator', 'المنسق', 'completed',
      `${icon} ${intent.agent} finished in ${result.durationMs}ms`,
      `${icon} ${intent.agent} انتهى في ${result.durationMs}ms`);

    processed++;
  }
  return processed;
}

// ─── PHASE 2: Process Scheduled Agents ───────────────
async function processSchedules(sb: any): Promise<number> {
  const now = new Date();
  const { data: schedules } = await sb
    .from('agent_schedules')
    .select('*')
    .eq('is_enabled', true)
    .order('last_run_at', { ascending: true, nullsFirst: true });

  if (!schedules?.length) return 0;

  let triggered = 0;
  for (const sched of schedules) {
    if (!shouldRunNow(sched, now)) continue;

    if (sched.consecutive_failures >= sched.max_consecutive_failures) {
      await sb.from('agent_schedules').update({ is_enabled: false, updated_at: now.toISOString() }).eq('id', sched.id);
      await postToDM(sb, `⚠️ **وكيل معطل تلقائياً** | ${sched.agent_function}\nسبب: ${sched.consecutive_failures} إخفاقات متتالية`, 'alert');
      continue;
    }

    await sb.from('agent_schedules').update({ last_status: 'running', updated_at: now.toISOString() }).eq('id', sched.id);

    const result = await dispatchAgent(sched.agent_function, {
      triggered_by: 'scheduler',
      schedule_id: sched.id,
      ...(sched.payload || {}),
    });

    await sb.from('agent_schedules').update({
      last_run_at: now.toISOString(),
      last_status: result.success ? 'success' : 'failed',
      last_duration_ms: result.durationMs,
      last_error: result.success ? null : JSON.stringify(result.body),
      run_count: sched.run_count + 1,
      fail_count: result.success ? sched.fail_count : sched.fail_count + 1,
      consecutive_failures: result.success ? 0 : sched.consecutive_failures + 1,
      updated_at: now.toISOString(),
    }).eq('id', sched.id);

    const icon = result.success ? '✅' : '❌';
    await postToDM(sb, `${icon} **تنفيذ مجدول** | ${sched.schedule_label}\nالوكيل: ${sched.agent_function}\nالمدة: ${result.durationMs}ms`, 'scheduler_result');

    triggered++;
  }
  return triggered;
}

// ─── Schedule Matching ───────────────────────────────
function shouldRunNow(sched: any, now: Date): boolean {
  if (!sched.last_run_at) return true;
  const lastRun = new Date(sched.last_run_at);
  const cron = sched.schedule_cron;
  const parts = cron.split(' ');
  if (parts.length !== 5) return false;

  const [min, hour] = parts;
  let intervalMs = 60000;
  if (hour.startsWith('*/')) {
    intervalMs = parseInt(hour.replace('*/', '')) * 3600000;
  } else if (min.startsWith('*/')) {
    intervalMs = parseInt(min.replace('*/', '')) * 60000;
  } else if (hour === '*' && min === '*') {
    intervalMs = 60000;
  } else if (hour === '*') {
    intervalMs = 3600000;
  } else {
    intervalMs = 86400000;
  }

  return (now.getTime() - lastRun.getTime()) >= intervalMs;
}

// ─── PHASE 3: Autonomy Gate ──────────────────────────
async function processAutonomyQueue(sb: any): Promise<number> {
  const { data: requests } = await sb
    .from('ai_execution_requests')
    .select('*, ai_execution_permissions!ai_execution_requests_permission_id_fkey(*)')
    .eq('status', 'approved')
    .order('created_at', { ascending: true })
    .limit(5);

  if (!requests?.length) return 0;

  let executed = 0;
  for (const req of requests) {
    const perm = req.ai_execution_permissions;
    if (!perm || !perm.is_enabled) continue;

    const result = await dispatchAgent('ai-execution-worker', { request_id: req.id });

    if (result.success) {
      await postToDM(sb, `🚀 **تنفيذ تلقائي** | ${req.title_ar || req.title}\nالمخاطر: ${req.risk_level}\nالنتيجة: نجح ✅\nالمدة: ${result.durationMs}ms`, 'auto_execution');
    }

    await sb.from('agent_memory').insert({
      agent_function: 'ai-execution-worker',
      memory_type: result.success ? 'decision' : 'failure',
      content: `Auto-executed: ${req.title} (${result.success ? 'success' : 'failed'})`,
      importance: result.success ? 5 : 9,
      tags: ['autonomy', req.risk_level],
      reference_id: req.id,
    });

    executed++;
  }
  return executed;
}

// ─── PHASE 4: Health Check ───────────────────────────
async function runHealthChecks(sb: any): Promise<void> {
  const { data: schedules } = await sb.from('agent_schedules')
    .select('agent_function, last_status, last_run_at, consecutive_failures, last_duration_ms')
    .eq('is_enabled', true);

  if (!schedules?.length) return;

  const now = new Date();
  for (const sched of schedules) {
    const lastRun = sched.last_run_at ? new Date(sched.last_run_at) : null;
    const hoursSinceRun = lastRun ? (now.getTime() - lastRun.getTime()) / 3600000 : 999;

    let status = 'healthy';
    if (sched.consecutive_failures >= 3) status = 'critical';
    else if (sched.consecutive_failures >= 1) status = 'degraded';
    else if (hoursSinceRun > 24) status = 'degraded';

    const { count: errorCount1h } = await sb
      .from('ai_activity_stream')
      .select('id', { count: 'exact' })
      .eq('success', false)
      .gte('created_at', new Date(now.getTime() - 3600000).toISOString())
      .limit(100);

    await sb.from('agent_health_checks').upsert({
      agent_function: sched.agent_function,
      check_type: 'heartbeat',
      status,
      response_time_ms: sched.last_duration_ms || 0,
      error_count_1h: errorCount1h || 0,
      last_success_at: sched.last_status === 'success' ? sched.last_run_at : undefined,
      last_failure_at: sched.last_status === 'failed' ? sched.last_run_at : undefined,
      last_error: sched.last_status === 'failed' ? 'Last scheduled run failed' : null,
      avg_duration_ms: sched.last_duration_ms || 0,
      checked_at: now.toISOString(),
    }, { onConflict: 'agent_function,check_type', ignoreDuplicates: false });

    if (status === 'critical') {
      await postToDM(sb, `🚨 **تنبيه صحي حرج** | ${sched.agent_function}\nإخفاقات: ${sched.consecutive_failures}`, 'health_alert');
    }
  }
}

// ─── PHASE 5: Executive Commander Review ─────────────
async function runCommanderReview(sb: any): Promise<void> {
  const url = `${SUPABASE_URL}/functions/v1/ai-executive-commander`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ mode: 'workforce_review', triggered_by: 'orchestrator' }),
    });
    const body = await res.json().catch(() => ({}));
    console.log(`[Orchestrator] Commander review: ${res.ok ? 'OK' : 'FAILED'}`, body);
  } catch (err) {
    console.error('[Orchestrator] Commander review failed:', err);
  }
}

// ─── Main Orchestrator Tick ──────────────────────────
async function orchestratorTick(sb: any): Promise<{ commands: number; schedules: number; executions: number }> {
  const { data: freezeRule } = await sb
    .from('governance_rules')
    .select('is_active')
    .eq('rule_key', 'FREEZE_EXECUTION')
    .single();

  if (freezeRule?.is_active) {
    console.log('[Orchestrator] FREEZE_EXECUTION active. Skipping.');
    return { commands: 0, schedules: 0, executions: 0 };
  }

  const [commands, schedules, executions] = await Promise.all([
    processCommandQueue(sb),
    processSchedules(sb),
    processAutonomyQueue(sb),
  ]);

  const { data: state } = await sb.from('orchestrator_state').select('tick_count').eq('id', 'singleton').single();
  const tick = state?.tick_count || 0;

  // Health checks every 5 ticks (~5 min)
  if (tick % 5 === 0) {
    await runHealthChecks(sb);
  }

  // Executive Commander workforce review every 60 ticks (~1 hour)
  if (tick % 60 === 0 && tick > 0) {
    await runCommanderReview(sb);
  }

  await sb.from('orchestrator_state').update({
    last_heartbeat: new Date().toISOString(),
    tick_count: (state?.tick_count || 0) + 1,
    commands_processed: (state?.commands_processed || 0) + commands,
    schedules_triggered: (state?.schedules_triggered || 0) + schedules,
    auto_executions: (state?.auto_executions || 0) + executions,
    status: 'active',
  }).eq('id', 'singleton');

  return { commands, schedules, executions };
}

// ─── HTTP Handler ────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const t0 = Date.now();

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    const result = await orchestratorTick(sb);
    const duration = Date.now() - t0;

    console.log(`[Orchestrator] Tick: cmd=${result.commands}, sched=${result.schedules}, exec=${result.executions}, ${duration}ms`);

    return new Response(JSON.stringify({
      success: true,
      ...result,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Orchestrator] Error:', error);
    try {
      const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
      await sb.from('orchestrator_state').update({
        status: 'error',
        metadata: { last_error: error instanceof Error ? error.message : 'Unknown', last_error_at: new Date().toISOString() },
      }).eq('id', 'singleton');
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - t0,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
