import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_SYSTEM_USER_ID = '00000000-0000-0000-0000-a10000000001';

// ─── Operation Registry ───────────────────────────
// Every executable operation must be registered here.
// AI cannot invent operations — only these are valid.

interface OperationDef {
  key: string;
  category: string;
  execute: (sb: any, params: any) => Promise<OperationResult>;
  captureBeforeState: (sb: any, params: any) => Promise<any>;
  rollback?: (sb: any, beforeState: any, params: any) => Promise<void>;
}

interface OperationResult {
  success: boolean;
  output: Record<string, any>;
  error?: string;
  afterState?: any;
}

// ─── Operation: Clear stale sessions ──────────────
const clearStaleSessions: OperationDef = {
  key: 'delete_expired_sessions',
  category: 'infra',
  captureBeforeState: async (sb) => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, count } = await sb
      .from('ai_discussion_sessions')
      .select('id', { count: 'exact' })
      .eq('status', 'in_progress')
      .lt('started_at', cutoff);
    return { stale_count: count || 0, stale_ids: (data || []).map((d: any) => d.id) };
  },
  execute: async (sb, _params) => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await sb
      .from('ai_discussion_sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('status', 'in_progress')
      .lt('started_at', cutoff)
      .select('id');
    if (error) return { success: false, output: {}, error: error.message };
    return { success: true, output: { cleaned: (data || []).length }, afterState: { cleaned_ids: (data || []).map((d: any) => d.id) } };
  },
  rollback: async (sb, beforeState) => {
    if (beforeState.stale_ids?.length) {
      await sb.from('ai_discussion_sessions')
        .update({ status: 'in_progress', completed_at: null })
        .in('id', beforeState.stale_ids);
    }
  },
};

// ─── Operation: Reset daily counters ──────────────
const resetDailyCounters: OperationDef = {
  key: 'reset_counters',
  category: 'infra',
  captureBeforeState: async (sb) => {
    const { data } = await sb
      .from('ai_execution_permissions')
      .select('id, daily_executions_used');
    return { permissions: data || [] };
  },
  execute: async (sb) => {
    const { error } = await sb
      .from('ai_execution_permissions')
      .update({ daily_executions_used: 0, last_reset_at: new Date().toISOString() })
      .gt('daily_executions_used', 0);
    if (error) return { success: false, output: {}, error: error.message };
    return { success: true, output: { reset: true }, afterState: { all_counters_zero: true } };
  },
  rollback: async (sb, beforeState) => {
    for (const p of beforeState.permissions || []) {
      await sb.from('ai_execution_permissions')
        .update({ daily_executions_used: p.daily_executions_used })
        .eq('id', p.id);
    }
  },
};

// ─── Operation: Expire stale P2P orders ───────────
const expireStaleOrders: OperationDef = {
  key: 'expire_order',
  category: 'p2p',
  captureBeforeState: async (sb) => {
    const { data } = await sb
      .from('p2p_orders')
      .select('id, status, expires_at')
      .eq('status', 'open')
      .lt('expires_at', new Date().toISOString());
    return { expired_orders: data || [] };
  },
  execute: async (sb) => {
    const now = new Date().toISOString();
    const { data, error } = await sb
      .from('p2p_orders')
      .update({ status: 'expired', updated_at: now })
      .eq('status', 'open')
      .lt('expires_at', now)
      .select('id');
    if (error) return { success: false, output: {}, error: error.message };
    return { success: true, output: { expired: (data || []).length }, afterState: { expired_ids: (data || []).map((d: any) => d.id) } };
  },
  rollback: async (sb, beforeState) => {
    for (const o of beforeState.expired_orders || []) {
      await sb.from('p2p_orders')
        .update({ status: 'open' })
        .eq('id', o.id);
    }
  },
};

// ─── Operation: Flag suspicious P2P ───────────────
const flagSuspiciousOrder: OperationDef = {
  key: 'flag_order',
  category: 'fraud',
  captureBeforeState: async (sb, params) => {
    if (!params?.order_id) return { order: null };
    const { data } = await sb
      .from('p2p_orders')
      .select('id, status, metadata')
      .eq('id', params.order_id)
      .single();
    return { order: data };
  },
  execute: async (sb, params) => {
    if (!params?.order_id) return { success: false, output: {}, error: 'Missing order_id' };
    const { data, error } = await sb
      .from('p2p_orders')
      .update({
        metadata: { flagged: true, flagged_at: new Date().toISOString(), flagged_reason: params.reason || 'AI auto-flag' },
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.order_id)
      .select('id, status')
      .single();
    if (error) return { success: false, output: {}, error: error.message };
    return { success: true, output: { flagged: data?.id }, afterState: { flagged: true } };
  },
  rollback: async (sb, beforeState) => {
    if (beforeState.order) {
      await sb.from('p2p_orders')
        .update({ metadata: beforeState.order.metadata || {} })
        .eq('id', beforeState.order.id);
    }
  },
};

// ─── Operation: Add review note ───────────────────
const addReviewNote: OperationDef = {
  key: 'add_review_note',
  category: 'fraud',
  captureBeforeState: async () => ({}),
  execute: async (sb, params) => {
    if (!params?.order_id || !params?.note) {
      return { success: false, output: {}, error: 'Missing order_id or note' };
    }
    const { error } = await sb.from('knowledge_memory').insert({
      source: 'ai',
      event_type: 'fraud_review_note',
      area: 'p2p',
      reference_id: params.order_id,
      payload: { note: params.note, order_id: params.order_id },
    });
    if (error) return { success: false, output: {}, error: error.message };
    return { success: true, output: { noted: true } };
  },
};

// ─── Operation: Throttle abuse source ─────────────
const addRateLimit: OperationDef = {
  key: 'add_rate_limit',
  category: 'fraud',
  captureBeforeState: async () => ({}),
  execute: async (sb, params) => {
    // Log rate-limit event into knowledge memory for downstream enforcement
    const { error } = await sb.from('knowledge_memory').insert({
      source: 'ai',
      event_type: 'rate_limit_applied',
      area: 'fraud',
      reference_id: params?.user_id || null,
      payload: {
        user_id: params?.user_id,
        rpc_name: params?.rpc_name,
        limit_type: params?.limit_type || 'temporary',
        duration_minutes: params?.duration_minutes || 60,
        applied_at: new Date().toISOString(),
      },
    });
    if (error) return { success: false, output: {}, error: error.message };
    return { success: true, output: { rate_limited: true, user_id: params?.user_id } };
  },
};

// ─── Operation: Clear/Rebuild cache ───────────────
const clearCache: OperationDef = {
  key: 'clear_cache',
  category: 'performance',
  captureBeforeState: async () => ({ timestamp: new Date().toISOString() }),
  execute: async (sb) => {
    // Log cache clear event
    const { error } = await sb.from('knowledge_memory').insert({
      source: 'ai',
      event_type: 'cache_cleared',
      area: 'performance',
      payload: { cleared_at: new Date().toISOString() },
    });
    if (error) return { success: false, output: {}, error: error.message };
    return { success: true, output: { cache_cleared: true } };
  },
};

const rebuildCache: OperationDef = {
  key: 'rebuild_cache',
  category: 'performance',
  captureBeforeState: async () => ({ timestamp: new Date().toISOString() }),
  execute: async (sb) => {
    const { error } = await sb.from('knowledge_memory').insert({
      source: 'ai',
      event_type: 'cache_rebuilt',
      area: 'performance',
      payload: { rebuilt_at: new Date().toISOString() },
    });
    if (error) return { success: false, output: {}, error: error.message };
    return { success: true, output: { cache_rebuilt: true } };
  },
};

// ─── Operation Registry Map ──────────────────────
const OPERATION_REGISTRY: Record<string, OperationDef> = {
  delete_expired_sessions: clearStaleSessions,
  reset_counters: resetDailyCounters,
  expire_order: expireStaleOrders,
  flag_order: flagSuspiciousOrder,
  add_review_note: addReviewNote,
  add_rate_limit: addRateLimit,
  clear_cache: clearCache,
  rebuild_cache: rebuildCache,
};

// ─── Safety Checks ────────────────────────────────

async function verifyLimitsAndCooldown(sb: any, permission: any): Promise<{ allowed: boolean; reason?: string }> {
  // Daily limit
  if (permission.daily_executions_used >= permission.max_daily_executions) {
    return { allowed: false, reason: `Daily limit reached (${permission.max_daily_executions})` };
  }

  // Cooldown check
  if (permission.cooldown_minutes > 0) {
    const { data: lastExec } = await sb
      .from('ai_execution_results')
      .select('completed_at')
      .eq('execution_status', 'success')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (lastExec?.completed_at) {
      const elapsed = (Date.now() - new Date(lastExec.completed_at).getTime()) / 60000;
      if (elapsed < permission.cooldown_minutes) {
        return { allowed: false, reason: `Cooldown active (${Math.ceil(permission.cooldown_minutes - elapsed)}m remaining)` };
      }
    }
  }

  return { allowed: true };
}

// ─── DM Reporting ─────────────────────────────────

async function postExecutionResultDM(sb: any, request: any, result: OperationResult, durationMs: number) {
  const success = result.success;
  const icon = success ? '🎉' : '❌';
  const label = success ? 'اكتمل التنفيذ بنجاح' : 'فشل التنفيذ';

  const content = `${icon} **${label}**

📋 **${request.title_ar || request.title}**
${request.description_ar || request.description}

📊 النتيجة: ${success ? 'ناجح ✅' : 'فشل ❌'}
${result.error ? `⚠️ الخطأ: ${result.error}` : ''}
⏱️ المدة: ${durationMs}ms
🔄 التراجع: ${success ? 'جاهز ✅' : 'غير مطلوب'}

request_id: ${request.id}`;

  // Send to admin DMs
  const { data: convos } = await sb
    .from('conversations')
    .select('id')
    .or(`participant1_id.eq.${AI_SYSTEM_USER_ID},participant2_id.eq.${AI_SYSTEM_USER_ID}`)
    .limit(10);

  if (convos) {
    for (const convo of convos) {
      await sb.from('direct_messages').insert({
        conversation_id: convo.id,
        sender_id: AI_SYSTEM_USER_ID,
        content,
        message_type: 'execution_result',
        is_read: false,
      });
    }
  }

  // Also post to AI Chat Room
  const { data: agent } = await sb.from('ai_agents').select('id').eq('is_active', true).limit(1).single();
  if (agent) {
    await sb.from('ai_chat_room').insert({
      agent_id: agent.id,
      content,
      content_ar: content,
      message_type: 'execution_result',
      message_category: success ? 'info' : 'critical',
      is_summary: true,
    });
  }
}

// ─── Confidence Learning ──────────────────────────

async function updateConfidence(sb: any, permissionId: string, success: boolean) {
  const { data: perm } = await sb
    .from('ai_execution_permissions')
    .select('auto_execute_threshold, daily_executions_used')
    .eq('id', permissionId)
    .single();

  if (!perm) return;

  const delta = success ? -1 : 3;
  const newThreshold = Math.max(50, Math.min(99, perm.auto_execute_threshold + delta));

  await sb.from('ai_execution_permissions').update({
    auto_execute_threshold: newThreshold,
    daily_executions_used: perm.daily_executions_used + 1,
    updated_at: new Date().toISOString(),
  }).eq('id', permissionId);
}

// ─── Main Handler ─────────────────────────────────

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

    const body = await req.json().catch(() => ({}));
    const { request_id } = body;

    if (!request_id) {
      return new Response(JSON.stringify({ error: 'Missing request_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch execution request
    const { data: request, error: reqErr } = await sb
      .from('ai_execution_requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (reqErr || !request) {
      return new Response(JSON.stringify({ error: 'Request not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Gate checks
    if (request.status !== 'approved') {
      return new Response(JSON.stringify({ error: 'Request not approved', status: request.status }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Simulation gate for medium/high/critical
    const riskRequiresSim = ['medium', 'high', 'critical'].includes(request.risk_level);
    if (riskRequiresSim && request.simulation_verdict !== 'safe') {
      return new Response(JSON.stringify({
        error: 'Simulation verdict not safe',
        simulation_verdict: request.simulation_verdict,
        required: 'safe',
      }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Fetch permission
    const { data: permission } = await sb
      .from('ai_execution_permissions')
      .select('*')
      .eq('id', request.permission_id)
      .single();

    if (!permission || !permission.is_enabled) {
      return new Response(JSON.stringify({ error: 'Permission disabled or not found' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Verify limits & cooldown
    const limitsCheck = await verifyLimitsAndCooldown(sb, permission);
    if (!limitsCheck.allowed) {
      // Mark request as failed due to limits
      await sb.from('ai_execution_requests').update({
        status: 'failed', updated_at: new Date().toISOString(),
      }).eq('id', request_id);

      await postExecutionResultDM(sb, request, {
        success: false, output: {}, error: `Safety limit: ${limitsCheck.reason}`,
      }, Date.now() - t0);

      return new Response(JSON.stringify({ error: limitsCheck.reason }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Resolve operations — ONLY from allowed_operations
    const allowedOps = permission.allowed_operations || [];
    const opsToRun: OperationDef[] = [];

    for (const opKey of allowedOps) {
      const def = OPERATION_REGISTRY[opKey];
      if (def) opsToRun.push(def);
    }

    if (opsToRun.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid operations to execute' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Mark request as executing
    await sb.from('ai_execution_requests').update({
      status: 'executing', updated_at: new Date().toISOString(),
    }).eq('id', request_id);

    // 7. Execute each operation
    const params = request.parameters || {};
    const allBeforeStates: Record<string, any> = {};
    const allResults: Record<string, OperationResult> = {};
    let allSuccess = true;

    for (const op of opsToRun) {
      try {
        // Capture before state
        const beforeState = await op.captureBeforeState(sb, params);
        allBeforeStates[op.key] = beforeState;

        // Execute
        const result = await op.execute(sb, params);
        allResults[op.key] = result;

        if (!result.success) {
          allSuccess = false;
          console.warn(`[Worker] Operation ${op.key} failed:`, result.error);
        }
      } catch (err) {
        allSuccess = false;
        allResults[op.key] = {
          success: false,
          output: {},
          error: err instanceof Error ? err.message : 'Unknown error',
        };
        console.error(`[Worker] Operation ${op.key} error:`, err);
      }
    }

    const durationMs = Date.now() - t0;

    // 8. Write execution result
    const { data: execResult } = await sb.from('ai_execution_results').insert({
      request_id,
      execution_status: allSuccess ? 'success' : 'partial_failure',
      output: allResults,
      before_state: allBeforeStates,
      after_state: Object.fromEntries(
        Object.entries(allResults).map(([k, v]) => [k, v.afterState || {}])
      ),
      duration_ms: durationMs,
      completed_at: new Date().toISOString(),
      confidence_delta: allSuccess ? 2 : -5,
      error_message: allSuccess ? null : Object.values(allResults)
        .filter(r => !r.success)
        .map(r => r.error)
        .join('; '),
    }).select('id').single();

    // 9. Update request status
    await sb.from('ai_execution_requests').update({
      status: allSuccess ? 'completed' : 'failed',
      rollback_data: allBeforeStates,
      updated_at: new Date().toISOString(),
    }).eq('id', request_id);

    // 10. Confidence learning
    await updateConfidence(sb, permission.id, allSuccess);

    // 11. Post result to DM
    await postExecutionResultDM(sb, request, {
      success: allSuccess,
      output: allResults,
      error: allSuccess ? undefined : 'Some operations failed',
    }, durationMs);

    // 12. Log to knowledge_memory
    await sb.from('knowledge_memory').insert({
      source: 'ai',
      event_type: 'execution_completed',
      area: permission.category,
      reference_id: request_id,
      payload: {
        permission_key: permission.permission_key,
        operations: allowedOps,
        success: allSuccess,
        duration_ms: durationMs,
        result_id: execResult?.id,
      },
    });

    // 13. Log to activity stream
    await sb.from('ai_activity_stream').insert({
      action_type: `exec_${permission.permission_key}`,
      entity_type: 'execution_request',
      entity_id: request_id,
      success: allSuccess,
      duration_ms: durationMs,
      role: 'system',
      before_state: allBeforeStates,
      after_state: allResults,
    });

    console.log(`[Worker] Execution complete: request=${request_id}, success=${allSuccess}, ops=${opsToRun.length}, duration=${durationMs}ms`);

    return new Response(JSON.stringify({
      success: allSuccess,
      request_id,
      result_id: execResult?.id,
      operations_run: opsToRun.map(o => o.key),
      duration_ms: durationMs,
      rollback_available: opsToRun.some(o => !!o.rollback),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Worker] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - t0,
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
