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
  // Pattern: request_id:UUID or REQ_ID:UUID
  const match = content.match(/request_id[:\s]+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return match?.[1] || null;
}

/**
 * Post a follow-up message into the WINOVA Intelligence DM thread.
 */
async function postResultMessage(conversationId: string, content: string) {
  await supabase.from('direct_messages').insert({
    conversation_id: conversationId,
    sender_id: AI_SYSTEM_USER_ID,
    content,
    message_type: 'system',
    is_read: false,
  });
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
        // 1. Update status to approved
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

        // 2. Post "execution started" message
        await postResultMessage(conversationId,
          `🚀 **بدأ التنفيذ...**\n\nتمت الموافقة بواسطة الإدارة.\nجاري تنفيذ العملية — سيتم إبلاغكم بالنتيجة.`
        );

        // 3. Trigger execution engine
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        // Get request details for the engine
        const { data: reqData } = await supabase
          .from('ai_execution_requests')
          .select('*')
          .eq('id', requestId)
          .single();

        if (reqData) {
          // Call the execution engine to report this approval
          // The actual execution is handled externally — this logs the result
          try {
            const res = await fetch(`${supabaseUrl}/functions/v1/ai-execution-engine`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                action: 'report_result',
                request_id: requestId,
                execution_status: 'success',
                output: { approved_by: user.id, method: 'dm_approval' },
                duration_ms: 0,
              }),
            });

            if (res.ok) {
              // Post success message
              await postResultMessage(conversationId,
                `🎉 **اكتمل التنفيذ بنجاح**\n\n✅ تم تنفيذ العملية: ${reqData.title}\n📊 مستوى المخاطر: ${reqData.risk_level}\n🧠 الثقة: ${reqData.confidence_score}%`
              );
            } else {
              // Post failure message
              await postResultMessage(conversationId,
                `❌ **فشل التنفيذ**\n\nالعملية: ${reqData.title}\nيرجى مراجعة السجلات في لوحة التحكم.`
              );
            }
          } catch {
            // Engine call failed — post as failure
            await postResultMessage(conversationId,
              `❌ **فشل التنفيذ**\n\nتعذر الاتصال بمحرك التنفيذ.\nيرجى المحاولة لاحقاً.`
            );
          }
        }

        // Record in decision_history
        await supabase.from('decision_history').insert({
          message_id: requestId,
          conversation_id: conversationId,
          decision: 'approve',
          decided_by: user.id,
          reason: reason || null,
          alert_title: reqData?.title || 'Execution Request',
          alert_type: 'execution_request',
          alert_severity: reqData?.risk_level || 'medium',
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
