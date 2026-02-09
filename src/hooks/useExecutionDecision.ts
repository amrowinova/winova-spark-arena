import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AI_SYSTEM_USER_ID } from '@/lib/aiSystemUser';

type ExecDecision = 'approve' | 'defer' | 'reject';

interface ExecDecisionResult {
  success: boolean;
  error?: string;
}

/**
 * Extract execution request ID from a DM message that contains
 * an AI execution request alert posted by the execution engine.
 */
function extractRequestId(content: string): string | null {
  const match = content.match(/request_id[:\s]+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return match?.[1] || null;
}

/**
 * Post a follow-up message into the WINOVA Intelligence DM thread.
 */
async function postResultMessage(conversationId: string, content: string, messageType = 'system') {
  await supabase.from('direct_messages').insert({
    conversation_id: conversationId,
    sender_id: AI_SYSTEM_USER_ID,
    content,
    message_type: messageType,
    is_read: false,
  });
}

/**
 * Trigger the Shadow Simulator for an execution request.
 * Returns the simulation verdict.
 */
async function runShadowSimulation(requestId: string, conversationId: string): Promise<{ verdict: string; simulationId: string | null }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  // Notify that simulation is starting
  await postResultMessage(conversationId,
    `🏗️ **عالم الظل — بدأ المحاكاة...**\n\nجاري تشغيل سيناريوهات الاختبار:\n• سلامة الأرصدة\n• تناسق الضمان\n• كشف الاحتيال\n• ضغط النظام\n• سلامة الرتب\n• التصويت والمسابقات\n• حدود الصلاحيات\n\n⏳ يرجى الانتظار...`
  );

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/ai-shadow-simulator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ request_id: requestId }),
    });

    if (!res.ok) {
      return { verdict: 'failed', simulationId: null };
    }

    const result = await res.json();
    return {
      verdict: result.verdict || 'failed',
      simulationId: result.simulation_id || null,
    };
  } catch {
    return { verdict: 'failed', simulationId: null };
  }
}

export function useExecutionDecision() {
  const { user } = useAuth();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const makeExecDecision = useCallback(async (
    requestId: string,
    conversationId: string,
    decision: ExecDecision,
    reason?: string
  ): Promise<ExecDecisionResult> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    setPendingIds(prev => new Set(prev).add(requestId));

    try {
      if (decision === 'approve') {
        // 1. Check request risk level — medium/high/critical requires simulation
        const { data: reqData } = await supabase
          .from('ai_execution_requests')
          .select('*')
          .eq('id', requestId)
          .single();

        if (!reqData) throw new Error('Request not found');

        const requiresSimulation = ['medium', 'high', 'critical'].includes(reqData.risk_level);
        const alreadySimulated = !!reqData.simulation_id;

        // 2. Run Shadow Simulation if needed and not already done
        if (requiresSimulation && !alreadySimulated) {
          const simResult = await runShadowSimulation(requestId, conversationId);

          if (simResult.verdict === 'dangerous' || simResult.verdict === 'blocked') {
            // Block approval — simulation verdict is dangerous
            await supabase.from('ai_execution_requests').update({
              simulation_verdict: simResult.verdict,
              simulation_id: simResult.simulationId,
              simulation_required: true,
              updated_at: new Date().toISOString(),
            }).eq('id', requestId);

            await postResultMessage(conversationId,
              `🚫 **تم حظر التنفيذ بواسطة عالم الظل**\n\n❌ نتيجة المحاكاة: ${simResult.verdict === 'dangerous' ? 'خطر' : 'محظور'}\nلا يمكن المتابعة — المحاكاة كشفت مخاطر حرجة.\n\nيرجى مراجعة تقرير CTO أعلاه.`
            );

            return { success: true };
          }

          // Update request with simulation results
          await supabase.from('ai_execution_requests').update({
            simulation_verdict: simResult.verdict,
            simulation_id: simResult.simulationId,
            simulation_required: true,
            updated_at: new Date().toISOString(),
          }).eq('id', requestId);
        }

        // 3. Proceed with approval
        const { error } = await supabase
          .from('ai_execution_requests')
          .update({
            status: 'approved',
            approved_by: user.id,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', requestId);
        if (error) throw error;

        // 4. Post "execution started" message
        await postResultMessage(conversationId,
          `🚀 **بدأ التنفيذ...**\n\nتمت الموافقة بواسطة الإدارة.${requiresSimulation ? `\n✅ محاكاة عالم الظل: ناجحة` : ''}\nجاري تنفيذ العملية عبر محرك التنفيذ الآمن — سيتم إبلاغكم بالنتيجة.`
        );

        // 5. Trigger execution WORKER (real execution engine)
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/ai-execution-worker`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ request_id: requestId }),
          });

          const workerResult = await res.json().catch(() => ({ success: false }));

          if (res.ok && workerResult.success) {
            await postResultMessage(conversationId,
              `🎉 **اكتمل التنفيذ بنجاح**\n\n✅ العملية: ${reqData.title}\n📊 المخاطر: ${reqData.risk_level}\n🧠 الثقة: ${reqData.confidence_score}%\n⚙️ العمليات: ${(workerResult.operations_run || []).join(', ')}\n⏱️ المدة: ${workerResult.duration_ms}ms\n🔄 التراجع: ${workerResult.rollback_available ? 'جاهز ✅' : 'غير متاح'}`
            );

            // Trust economy: reward successful execution
            try {
              await fetch(`${supabaseUrl}/functions/v1/ai-evolution-engine`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` },
                body: JSON.stringify({
                  action: 'update_trust',
                  agent_id: reqData.source_proposal_id || reqData.source_forecast_id || requestId,
                  source_type: 'execution_success',
                  source_id: requestId,
                  reason_ar: `تنفيذ ناجح: ${reqData.title}`,
                  conversation_id: conversationId,
                }),
              });
            } catch { /* fire and forget */ }
          } else {
            await postResultMessage(conversationId,
              `❌ **فشل التنفيذ**\n\nالعملية: ${reqData.title}\n${workerResult.error ? `السبب: ${workerResult.error}` : 'يرجى مراجعة السجلات.'}`
            );

            // Trust economy: penalize failure
            try {
              await fetch(`${supabaseUrl}/functions/v1/ai-evolution-engine`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` },
                body: JSON.stringify({
                  action: 'update_trust',
                  agent_id: reqData.source_proposal_id || reqData.source_forecast_id || requestId,
                  source_type: 'high_risk_failure',
                  source_id: requestId,
                  reason_ar: `فشل التنفيذ: ${reqData.title}`,
                  conversation_id: conversationId,
                }),
              });
            } catch { /* fire and forget */ }
          }
        } catch {
          await postResultMessage(conversationId,
            `❌ **فشل التنفيذ**\n\nتعذر الاتصال بمحرك التنفيذ.\nيرجى المحاولة لاحقاً.`
          );
        }

        // Record in decision_history
        await supabase.from('decision_history').insert({
          message_id: requestId,
          conversation_id: conversationId,
          decision: 'approve',
          decided_by: user.id,
          reason: reason || null,
          alert_title: reqData.title || 'Execution Request',
          alert_type: 'execution_request',
          alert_severity: reqData.risk_level || 'medium',
        });

      } else if (decision === 'defer') {
        const { error } = await supabase
          .from('ai_execution_requests')
          .update({
            status: 'deferred',
            updated_at: new Date().toISOString(),
          })
          .eq('id', requestId);
        if (error) throw error;

        await postResultMessage(conversationId,
          `⏳ **تم التأجيل بواسطة الإدارة**\n\n${reason ? `السبب: ${reason}` : 'سيتم مراجعة الطلب لاحقاً.'}`
        );

        await supabase.from('decision_history').insert({
          message_id: requestId,
          conversation_id: conversationId,
          decision: 'defer',
          decided_by: user.id,
          reason: reason || null,
          alert_title: 'Execution Request',
          alert_type: 'execution_request',
          alert_severity: 'medium',
        });

      } else if (decision === 'reject') {
        const { error } = await supabase
          .from('ai_execution_requests')
          .update({
            status: 'rejected',
            rejected_by: user.id,
            rejected_at: new Date().toISOString(),
            rejection_reason: reason || 'Admin rejected via DM',
            updated_at: new Date().toISOString(),
          })
          .eq('id', requestId);
        if (error) throw error;

        await postResultMessage(conversationId,
          `❌ **تم الرفض بواسطة الإدارة**\n\n${reason ? `السبب: ${reason}` : 'تم رفض طلب التنفيذ.'}`
        );

        await supabase.from('decision_history').insert({
          message_id: requestId,
          conversation_id: conversationId,
          decision: 'reject',
          decided_by: user.id,
          reason: reason || null,
          alert_title: 'Execution Request',
          alert_type: 'execution_request',
          alert_severity: 'medium',
        });
      }

      return { success: true };
    } catch (err) {
      console.error('[ExecutionDecision] Error:', err);
      return { success: false, error: String(err) };
    } finally {
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  }, [user]);

  const isPending = useCallback((id: string) => pendingIds.has(id), [pendingIds]);

  return { makeExecDecision, isPending, extractRequestId };
}
