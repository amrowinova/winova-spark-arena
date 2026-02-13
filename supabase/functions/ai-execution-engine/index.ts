import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Risk Scoring ─────────────────────────────────

interface RiskFactors {
  affectsFinancial: boolean;
  affectsUserData: boolean;
  isReversible: boolean;
  hasRollbackPlan: boolean;
  historicalSuccessRate: number;
  confidence: number;
  scope: 'single' | 'batch' | 'global';
}

function calculateRiskScore(factors: RiskFactors): { score: number; level: string } {
  let score = 20; // base

  if (factors.affectsFinancial) score += 30;
  if (factors.affectsUserData) score += 20;
  if (!factors.isReversible) score += 25;
  if (!factors.hasRollbackPlan) score += 15;

  // Scope multiplier
  if (factors.scope === 'batch') score = Math.min(100, Math.round(score * 1.2));
  if (factors.scope === 'global') score = Math.min(100, Math.round(score * 1.5));

  // Reduce by confidence & success rate
  const confidenceReduction = Math.round((factors.confidence / 100) * 15);
  const successReduction = Math.round((factors.historicalSuccessRate / 100) * 10);
  score = Math.max(5, score - confidenceReduction - successReduction);

  const level = score <= 30 ? 'low' : score <= 55 ? 'medium' : score <= 75 ? 'high' : 'critical';
  return { score, level };
}

// ─── Permission Check ─────────────────────────────

async function checkPermission(supabase: any, permissionKey: string) {
  const { data, error } = await supabase
    .from('ai_execution_permissions')
    .select('*')
    .eq('permission_key', permissionKey)
    .eq('is_enabled', true)
    .single();

  if (error || !data) return null;

  // Check daily limit
  const now = new Date();
  const lastReset = new Date(data.last_reset_at);
  if (now.toDateString() !== lastReset.toDateString()) {
    await supabase.from('ai_execution_permissions').update({
      daily_executions_used: 0,
      last_reset_at: now.toISOString(),
    }).eq('id', data.id);
    data.daily_executions_used = 0;
  }

  if (data.daily_executions_used >= data.max_daily_executions) return null;
  return data;
}

// ─── Historical Success Rate ──────────────────────

async function getHistoricalSuccessRate(supabase: any, permissionKey: string): Promise<number> {
  const { data } = await supabase
    .from('ai_execution_requests')
    .select('id, status')
    .eq('request_type', permissionKey)
    .in('status', ['completed', 'failed', 'rolled_back'])
    .limit(20);

  if (!data || data.length === 0) return 50;
  const successes = data.filter((r: any) => r.status === 'completed').length;
  return Math.round((successes / data.length) * 100);
}

// ─── DM Alert ─────────────────────────────────────

async function sendExecutionAlert(supabase: any, request: any, action: 'pending_approval' | 'executed' | 'failed' | 'rolled_back') {
  const { data: agent } = await supabase
    .from('ai_agents')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (!agent) return;

  const icons: Record<string, string> = {
    pending_approval: '⏳',
    executed: '✅',
    failed: '❌',
    rolled_back: '🔄',
  };

  const labels: Record<string, string> = {
    pending_approval: 'يحتاج موافقة',
    executed: 'تم التنفيذ',
    failed: 'فشل التنفيذ',
    rolled_back: 'تم التراجع',
  };

  const content = `${icons[action]} **طلب تنفيذ AI — ${labels[action]}**

📋 **${request.title}**
${request.description}

🎯 المخاطر: ${request.risk_level} (${request.risk_score}%)
🧠 الثقة: ${request.confidence_score}%
${request.rollback_plan ? `🔄 خطة التراجع: ${request.rollback_plan}` : ''}
${action === 'pending_approval' ? '\n⚠️ **يتطلب موافقة الإدارة للمتابعة**' : ''}

request_id: ${request.id}`;

  await supabase.from('ai_chat_room').insert({
    agent_id: agent.id,
    content,
    content_ar: content,
    message_type: 'execution_request',
    message_category: request.risk_level === 'critical' || request.risk_level === 'high' ? 'critical' : 'warning',
    is_summary: true,
  });

  // Also send to the WINOVA Intelligence DM thread
  const AI_SYSTEM_USER_ID = '00000000-0000-0000-0000-a10000000001';

  // Find admin conversations with the AI system user
  const { data: convos } = await supabase
    .from('conversations')
    .select('id')
    .or(`participant1_id.eq.${AI_SYSTEM_USER_ID},participant2_id.eq.${AI_SYSTEM_USER_ID}`)
    .limit(10);

  if (convos && convos.length > 0) {
    for (const convo of convos) {
      await supabase.from('direct_messages').insert({
        conversation_id: convo.id,
        sender_id: AI_SYSTEM_USER_ID,
        content,
        message_type: 'execution_request',
        is_read: false,
      });
    }
  }
}

// ─── Confidence Learning ──────────────────────────

async function updateConfidenceLearning(supabase: any, request: any, success: boolean) {
  // Update the permission's auto_execute_threshold based on outcomes
  const { data: perm } = await supabase
    .from('ai_execution_permissions')
    .select('auto_execute_threshold')
    .eq('id', request.permission_id)
    .single();

  if (!perm) return;

  // Adjust threshold: success lowers it (more trust), failure raises it
  const delta = success ? -1 : 3;
  const newThreshold = Math.max(50, Math.min(99, perm.auto_execute_threshold + delta));

  await supabase.from('ai_execution_permissions').update({
    auto_execute_threshold: newThreshold,
  }).eq('id', request.permission_id);
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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'scan';

    // ─── EMERGENCY CHECK ─────────────────────────────
    if (action === 'request' || action === 'scan') {
      const { data: execFreeze } = await supabase.from('emergency_controls')
        .select('is_active').eq('control_key', 'FREEZE_EXECUTION').single();
      if (execFreeze?.is_active) {
        return new Response(JSON.stringify({ error: 'FREEZE_EXECUTION active — all AI execution halted by owner', frozen: true }), {
          status: 423, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ─── ACTION: Create execution request ─────────
    if (action === 'request') {
      const { permission_key, title, title_ar, description, description_ar,
              parameters, rollback_plan, rollback_plan_ar, estimated_impact,
              estimated_impact_ar, affected_entities, confidence_score,
              affects_financial, affects_user_data, is_reversible, scope,
              source_forecast_id, source_proposal_id } = body;

      const permission = await checkPermission(supabase, permission_key);
      if (!permission) {
        return new Response(JSON.stringify({ error: 'Permission denied or disabled', permission_key }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const successRate = await getHistoricalSuccessRate(supabase, permission_key);
      const risk = calculateRiskScore({
        affectsFinancial: affects_financial || false,
        affectsUserData: affects_user_data || false,
        isReversible: is_reversible !== false,
        hasRollbackPlan: !!rollback_plan,
        historicalSuccessRate: successRate,
        confidence: confidence_score || 50,
        scope: scope || 'single',
      });

      // Check if risk exceeds permission's max
      const riskOrder = ['low', 'medium', 'high', 'critical'];
      const requestRiskIdx = riskOrder.indexOf(risk.level);
      const maxRiskIdx = riskOrder.indexOf(permission.max_risk_level);

      if (requestRiskIdx > maxRiskIdx) {
        return new Response(JSON.stringify({
          error: 'Risk level exceeds permission maximum',
          risk_level: risk.level,
          max_allowed: permission.max_risk_level,
        }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // ─── AUTONOMY LADDER: Check if agent rank allows auto-execution ───
      const agentId = body.agent_id;
      let autonomousExecution = false;
      let agentInfo: any = null;

      if (agentId) {
        const { data: agent } = await supabase.from('ai_agents')
          .select('id, agent_name, agent_name_ar, rank, auto_execute_level, is_active')
          .eq('id', agentId)
          .eq('is_active', true)
          .single();
        agentInfo = agent;

        if (agent && agent.auto_execute_level >= (permission.required_auto_execute_level || 99)) {
          // ─── AUTONOMY CAP: Owner-defined ceiling ───
          const { data: globalCap } = await supabase.from('autonomy_caps')
            .select('max_auto_execute_level')
            .eq('cap_key', 'global_cap').eq('is_active', true).single();

          const ownerCap = globalCap?.max_auto_execute_level ?? 3;
          const effectiveLevel = Math.min(agent.auto_execute_level, ownerCap);

          // Check category-specific caps (infrastructure, financial, external, security, agent_lifecycle)
          const { data: categoryCaps } = await supabase.from('autonomy_caps')
            .select('cap_key, requires_human')
            .eq('is_active', true)
            .eq('max_auto_execute_level', 99);

          const blockedOps = (categoryCaps || []).flatMap((c: any) => c.requires_human || []);
          const operationBlocked = blockedOps.some((op: string) =>
            permission_key.includes(op) || (parameters && JSON.stringify(parameters).includes(op))
          );

          if (operationBlocked) {
            // Human authority is permanent for these categories
            autonomousExecution = false;
          } else if (effectiveLevel >= (permission.required_auto_execute_level || 99)) {
            const riskAllowsAuto = risk.level === 'low' || 
              (risk.level === 'medium' && effectiveLevel >= 3) ||
              (risk.level === 'high' && effectiveLevel >= 5);
            
            if (riskAllowsAuto) {
              autonomousExecution = true;
            }
          }
        }
      }

      // Traditional approval check (fallback when no autonomous authority)
      const needsApproval = !autonomousExecution && (
        permission.requires_approval ||
        risk.level === 'high' || risk.level === 'critical' ||
        (confidence_score || 50) < permission.auto_execute_threshold
      );

      const status = (autonomousExecution || !needsApproval) ? 'approved' : 'pending';

      const { data: request, error: insertErr } = await supabase.from('ai_execution_requests').insert({
        permission_id: permission.id,
        request_type: permission_key,
        title, title_ar,
        description, description_ar,
        risk_score: risk.score,
        risk_level: risk.level,
        confidence_score: confidence_score || 50,
        parameters: parameters || {},
        rollback_plan: rollback_plan || 'No rollback defined',
        rollback_plan_ar,
        estimated_impact, estimated_impact_ar,
        affected_entities: affected_entities || [],
        status,
        source_forecast_id, source_proposal_id,
      }).select('*').single();

      if (insertErr) throw insertErr;

      // Increment daily usage
      await supabase.from('ai_execution_permissions').update({
        daily_executions_used: permission.daily_executions_used + 1,
      }).eq('id', permission.id);

      // ─── AUTONOMOUS PATH: auto-approve + send to worker immediately ───
      if (autonomousExecution && agentInfo) {
        // Post autonomy activation DM
        const AI_SYS = '00000000-0000-0000-0000-a10000000001';
        const { data: convos } = await supabase.from('conversations')
          .select('id')
          .or(`participant1_id.eq.${AI_SYS},participant2_id.eq.${AI_SYS}`)
          .limit(10);

        const autoMsg = `🚀 **تنفيذ تلقائي — سلم الاستقلالية**\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🤖 الوكيل: ${agentInfo.agent_name_ar || agentInfo.agent_name}\n` +
          `🏅 الرتبة: ${agentInfo.rank}\n` +
          `🔓 مستوى الصلاحية: ${agentInfo.auto_execute_level}\n` +
          `⚙️ العملية: ${title_ar || title}\n` +
          `🎯 المخاطر: ${risk.level} (${risk.score}%)\n` +
          `🧠 الثقة: ${confidence_score || 50}%\n\n` +
          `⏳ جاري التنفيذ بصلاحية الرتبة...\n\n` +
          `request_id: ${request.id}`;

        if (convos) {
          for (const convo of convos) {
            await supabase.from('direct_messages').insert({
              conversation_id: convo.id,
              sender_id: AI_SYS,
              content: autoMsg,
              message_type: 'autonomous_execution',
              is_read: false,
            });
          }
        }

        // Trigger worker immediately
        try {
          const workerRes = await fetch(`${supabaseUrl}/functions/v1/ai-execution-worker`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({ request_id: request.id }),
          });

          const workerResult = await workerRes.json().catch(() => ({ success: false }));
          const workerSuccess = workerRes.ok && workerResult.success;

          // Post result DM
          const resultMsg = workerSuccess
            ? `🎉 **اكتمل التنفيذ التلقائي بنجاح**\n\n` +
              `✅ العملية: ${title_ar || title}\n` +
              `🤖 الوكيل: ${agentInfo.agent_name_ar || agentInfo.agent_name}\n` +
              `🏅 الرتبة: ${agentInfo.rank}\n` +
              `⚙️ العمليات: ${(workerResult.operations_run || []).join(', ')}\n` +
              `⏱️ المدة: ${workerResult.duration_ms}ms\n` +
              `🔄 التراجع: ${workerResult.rollback_available ? 'جاهز ✅' : 'غير متاح'}`
            : `❌ **فشل التنفيذ التلقائي**\n\n` +
              `العملية: ${title_ar || title}\n` +
              `🤖 الوكيل: ${agentInfo.agent_name_ar || agentInfo.agent_name}\n` +
              `${workerResult.error ? `السبب: ${workerResult.error}` : ''}`;

          if (convos) {
            for (const convo of convos) {
              await supabase.from('direct_messages').insert({
                conversation_id: convo.id,
                sender_id: AI_SYS,
                content: resultMsg,
                message_type: workerSuccess ? 'execution_result' : 'execution_failure',
                is_read: false,
              });
            }
          }

          // Trust economy: autonomous multiplier (1.5x reward, 2x penalty)
          try {
            const trustSource = workerSuccess ? 'execution_success' : 'high_risk_failure';
            const trustReason = workerSuccess 
              ? `تنفيذ تلقائي ناجح (مضاعف الثقة): ${title_ar || title}`
              : `فشل تنفيذ تلقائي (عقوبة مضاعفة): ${title_ar || title}`;

            await fetch(`${supabaseUrl}/functions/v1/ai-evolution-engine`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({
                action: 'update_trust_autonomous',
                agent_id: agentId,
                source_type: trustSource,
                source_id: request.id,
                reason_ar: trustReason,
                autonomous: true,
              }),
            });
          } catch { /* fire and forget */ }

        } catch (workerErr) {
          console.error('[Autonomy] Worker call failed:', workerErr);
        }

        return new Response(JSON.stringify({
          success: true,
          request_id: request.id,
          status: 'approved',
          autonomous: true,
          agent_rank: agentInfo.rank,
          agent_level: agentInfo.auto_execute_level,
          risk_score: risk.score,
          risk_level: risk.level,
          needs_approval: false,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // ─── NORMAL PATH: send DM alert for human approval ───
      await sendExecutionAlert(supabase, request, needsApproval ? 'pending_approval' : 'executed');

      return new Response(JSON.stringify({
        success: true,
        request_id: request.id,
        status,
        risk_score: risk.score,
        risk_level: risk.level,
        needs_approval: needsApproval,
        autonomous: false,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─── ACTION: Report result ────────────────────
    if (action === 'report_result') {
      const { request_id, execution_status, output, error_message,
              before_state, after_state, duration_ms } = body;

      const { data: request } = await supabase.from('ai_execution_requests')
        .select('*').eq('id', request_id).single();

      if (!request) {
        return new Response(JSON.stringify({ error: 'Request not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const success = execution_status === 'success';

      // Insert result
      const { data: result } = await supabase.from('ai_execution_results').insert({
        request_id,
        execution_status,
        output: output || {},
        error_message,
        before_state: before_state || {},
        after_state: after_state || {},
        duration_ms,
        completed_at: new Date().toISOString(),
        confidence_delta: success ? 2 : -5,
      }).select('*').single();

      // Update request status
      await supabase.from('ai_execution_requests').update({
        status: success ? 'completed' : 'failed',
        updated_at: new Date().toISOString(),
      }).eq('id', request_id);

      // Confidence learning
      await updateConfidenceLearning(supabase, request, success);

      // Alert
      await sendExecutionAlert(supabase, request, success ? 'executed' : 'failed');

      return new Response(JSON.stringify({
        success: true,
        result_id: result?.id,
        confidence_adjusted: true,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─── ACTION: Rollback ─────────────────────────
    if (action === 'rollback') {
      const { request_id, reason } = body;

      const { data: request } = await supabase.from('ai_execution_requests')
        .select('*').eq('id', request_id).single();

      if (!request) {
        return new Response(JSON.stringify({ error: 'Request not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Mark result as rolled back
      await supabase.from('ai_execution_results').update({
        was_rolled_back: true,
        rolled_back_at: new Date().toISOString(),
        rollback_reason: reason || 'Admin initiated rollback',
      }).eq('request_id', request_id);

      // Update request status
      await supabase.from('ai_execution_requests').update({
        status: 'rolled_back',
        updated_at: new Date().toISOString(),
      }).eq('id', request_id);

      // Confidence penalty
      await updateConfidenceLearning(supabase, request, false);

      // Alert
      await sendExecutionAlert(supabase, { ...request, rollback_plan: reason }, 'rolled_back');

      return new Response(JSON.stringify({ success: true, rolled_back: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── ACTION: Scan for expired requests ────────
    if (action === 'scan') {
      const now = new Date().toISOString();
      const { data: expired } = await supabase
        .from('ai_execution_requests')
        .select('id')
        .eq('status', 'pending')
        .lt('expires_at', now);

      if (expired && expired.length > 0) {
        for (const req of expired) {
          await supabase.from('ai_execution_requests').update({
            status: 'expired',
            updated_at: now,
          }).eq('id', req.id);
        }
      }

      // Get summary stats
      const { data: stats } = await supabase
        .from('ai_execution_requests')
        .select('status')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const summary = {
        total: stats?.length || 0,
        pending: stats?.filter((s: any) => s.status === 'pending').length || 0,
        completed: stats?.filter((s: any) => s.status === 'completed').length || 0,
        failed: stats?.filter((s: any) => s.status === 'failed').length || 0,
        expired_now: expired?.length || 0,
      };

      return new Response(JSON.stringify({ success: true, ...summary }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[AI Execution Engine] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
