import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_SYSTEM_USER_ID = '00000000-0000-0000-0000-a10000000001';

async function postToDM(sb: any, content: string) {
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
        message_type: 'health_report',
        is_read: false,
      });
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
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
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000).toISOString();
    const oneDayAgo = new Date(now.getTime() - 86400000).toISOString();

    // 1. Check orchestrator heartbeat
    const { data: orchState } = await sb.from('orchestrator_state').select('*').eq('id', 'singleton').single();
    const orchLastBeat = orchState?.last_heartbeat ? new Date(orchState.last_heartbeat) : null;
    const orchMinutesSinceHeartbeat = orchLastBeat ? (now.getTime() - orchLastBeat.getTime()) / 60000 : 999;
    const orchStatus = orchMinutesSinceHeartbeat < 5 ? 'healthy' : orchMinutesSinceHeartbeat < 15 ? 'degraded' : 'critical';

    // 2. Check each scheduled agent
    const { data: schedules } = await sb.from('agent_schedules').select('*');
    const agentStatuses: any[] = [];

    for (const sched of schedules || []) {
      const lastRun = sched.last_run_at ? new Date(sched.last_run_at) : null;
      const hoursSinceRun = lastRun ? (now.getTime() - lastRun.getTime()) / 3600000 : 999;

      let status = 'healthy';
      if (!sched.is_enabled) status = 'disabled';
      else if (sched.consecutive_failures >= 3) status = 'critical';
      else if (sched.consecutive_failures >= 1) status = 'degraded';
      else if (hoursSinceRun > 48) status = 'dead';
      else if (hoursSinceRun > 24) status = 'degraded';

      agentStatuses.push({
        agent: sched.agent_function,
        status,
        lastRun: sched.last_run_at,
        consecutiveFailures: sched.consecutive_failures,
        totalRuns: sched.run_count,
        totalFails: sched.fail_count,
        lastDuration: sched.last_duration_ms,
        enabled: sched.is_enabled,
      });

      // Upsert health check record
      await sb.from('agent_health_checks').insert({
        agent_function: sched.agent_function,
        check_type: 'heartbeat',
        status,
        response_time_ms: sched.last_duration_ms || 0,
        error_count_1h: 0,
        last_success_at: sched.last_status === 'success' ? sched.last_run_at : null,
        last_failure_at: sched.last_status === 'failed' ? sched.last_run_at : null,
        last_error: sched.last_error,
        checked_at: now.toISOString(),
      });
    }

    // 3. Count global errors
    const { count: errors1h } = await sb
      .from('ai_activity_stream')
      .select('id', { count: 'exact' })
      .eq('success', false)
      .gte('created_at', oneHourAgo);

    const { count: errors24h } = await sb
      .from('ai_activity_stream')
      .select('id', { count: 'exact' })
      .eq('success', false)
      .gte('created_at', oneDayAgo);

    // 4. Check execution queue depth
    const { count: pendingExec } = await sb
      .from('ai_execution_requests')
      .select('id', { count: 'exact' })
      .in('status', ['pending', 'approved']);

    const { count: pendingCommands } = await sb
      .from('agent_command_queue')
      .select('id', { count: 'exact' })
      .eq('dispatch_status', 'pending');

    // 5. Build health report
    const criticalAgents = agentStatuses.filter(a => a.status === 'critical' || a.status === 'dead');
    const overallStatus = orchStatus === 'critical' || criticalAgents.length > 0
      ? 'critical'
      : orchStatus === 'degraded' || agentStatuses.some(a => a.status === 'degraded')
        ? 'degraded'
        : 'healthy';

    const report = {
      overall_status: overallStatus,
      orchestrator: {
        status: orchStatus,
        last_heartbeat: orchState?.last_heartbeat,
        tick_count: orchState?.tick_count,
        minutes_since_heartbeat: Math.round(orchMinutesSinceHeartbeat),
      },
      agents: agentStatuses,
      errors: { last_1h: errors1h || 0, last_24h: errors24h || 0 },
      queues: { pending_executions: pendingExec || 0, pending_commands: pendingCommands || 0 },
      checked_at: now.toISOString(),
      duration_ms: Date.now() - t0,
    };

    // 6. Post to DM if issues found
    if (overallStatus !== 'healthy') {
      const statusIcon = overallStatus === 'critical' ? '🚨' : '⚠️';
      const agentLines = criticalAgents.map(a => `  • ${a.agent}: ${a.status} (${a.consecutiveFailures} fails)`).join('\n');

      await postToDM(sb, `${statusIcon} **تقرير صحة النظام** | ${overallStatus.toUpperCase()}

🫀 المنسق: ${orchStatus} (${Math.round(orchMinutesSinceHeartbeat)}م منذ آخر نبضة)
❌ أخطاء: ${errors1h || 0} (ساعة) / ${errors24h || 0} (يوم)
📋 قائمة الانتظار: ${pendingExec || 0} تنفيذ، ${pendingCommands || 0} أوامر
${criticalAgents.length > 0 ? `\n🔴 وكلاء حرجون:\n${agentLines}` : ''}`);
    }

    // 7. Post to chat room
    const { data: agent } = await sb.from('ai_agents').select('id').eq('is_active', true).limit(1).single();
    if (agent) {
      await sb.from('ai_chat_room').insert({
        agent_id: agent.id,
        content: `🏥 Health Check: ${overallStatus} | Agents: ${agentStatuses.length} | Errors/1h: ${errors1h || 0} | Queue: ${pendingCommands || 0} commands`,
        content_ar: `🏥 فحص صحي: ${overallStatus} | الوكلاء: ${agentStatuses.length} | أخطاء/ساعة: ${errors1h || 0} | الانتظار: ${pendingCommands || 0}`,
        message_type: 'health_report',
        message_category: overallStatus === 'critical' ? 'critical' : 'info',
        is_summary: true,
      });
    }

    // 8. Log to activity stream
    await sb.from('ai_activity_stream').insert({
      action_type: 'health_check',
      entity_type: 'system',
      success: overallStatus !== 'critical',
      duration_ms: Date.now() - t0,
      role: 'system',
      before_state: {},
      after_state: report,
    });

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[HealthMonitor] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown',
      duration_ms: Date.now() - t0,
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
