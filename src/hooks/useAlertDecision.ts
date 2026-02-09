import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type DecisionType = 'approve' | 'defer' | 'reject';

interface DecisionResult {
  taskId?: string;
  success: boolean;
}

/**
 * Parse alert metadata from the structured message content
 */
function parseAlertMetadata(content: string) {
  // Extract title from the header line: "🟠 HIGH │ Some Title"
  const titleMatch = content.match(/(?:CRITICAL|HIGH|MEDIUM|LOW)\s*│\s*(.+)/);
  const title = titleMatch?.[1]?.trim() || 'AI Alert';

  // Extract severity
  let severity = 'medium';
  if (content.includes('🔴 CRITICAL')) severity = 'critical';
  else if (content.includes('🟠 HIGH')) severity = 'high';
  else if (content.includes('🔵 LOW')) severity = 'low';

  // Extract confidence
  const confMatch = content.match(/Confidence:\s*(\d+)%/);
  const confidence = confMatch ? parseInt(confMatch[1]) : 50;

  // Determine alert type from content patterns
  let alertType = 'general';
  if (content.includes('Failure Spike')) alertType = 'failure_spike';
  else if (content.includes('Strategic Direction')) alertType = 'human_question';
  else if (content.includes('Engineer Report')) alertType = 'engineer_report';
  else if (content.includes('Product Proposal') || content.includes('💡')) alertType = 'product_proposal';
  else if (content.includes('🌐')) alertType = 'external_knowledge';
  else if (content.includes('Category:') && content.includes('Source:')) alertType = 'priority';
  else if (content.includes('Impact estimation')) alertType = 'insight';

  // Determine category from alert type
  let category = 'general';
  if (alertType === 'failure_spike') category = 'fix';
  else if (alertType === 'insight') category = 'risk';
  else if (alertType === 'product_proposal') category = 'growth';
  else if (alertType === 'engineer_report') category = 'fix';
  else if (alertType === 'priority') {
    const catMatch = content.match(/Category:\s*(\w+)/);
    category = catMatch?.[1] || 'general';
  }

  // Extract the body section (What happened)
  const bodyMatch = content.match(/📋 What happened:\n([\s\S]*?)(?=\n\n⚠️)/);
  const description = bodyMatch?.[1]?.trim() || '';

  return { title, severity, confidence, alertType, category, description };
}

export function useAlertDecision() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingDecisions, setPendingDecisions] = useState<Set<string>>(new Set());

  const makeDecision = useCallback(async (
    messageId: string,
    conversationId: string,
    messageContent: string,
    decision: DecisionType,
    reason?: string
  ): Promise<DecisionResult> => {
    if (!user) return { success: false };

    setPendingDecisions(prev => new Set(prev).add(messageId));

    try {
      const meta = parseAlertMetadata(messageContent);
      let taskId: string | undefined;

      // On approve → create execution task
      if (decision === 'approve') {
        const { data: task, error: taskError } = await supabase
          .from('execution_tasks')
          .insert({
            title: meta.title,
            description: meta.description,
            category: meta.category,
            severity: meta.severity,
            source_message_id: messageId,
            source_alert_type: meta.alertType,
            conversation_id: conversationId,
            created_by: user.id,
            status: 'pending',
          })
          .select('id')
          .single();

        if (taskError) throw taskError;
        taskId = task?.id;
      }

      // Record decision
      const { error: decisionError } = await supabase
        .from('decision_history')
        .insert({
          message_id: messageId,
          conversation_id: conversationId,
          decision: decision,
          decided_by: user.id,
          reason: reason || null,
          alert_title: meta.title,
          alert_type: meta.alertType,
          alert_severity: meta.severity,
          task_id: taskId || null,
        });

      if (decisionError) throw decisionError;

      return { taskId, success: true };
    } catch (err) {
      console.error('Decision error:', err);
      toast({
        title: 'Error',
        description: 'Failed to record decision',
        variant: 'destructive',
      });
      return { success: false };
    } finally {
      setPendingDecisions(prev => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    }
  }, [user, toast]);

  const isDecisionPending = useCallback((messageId: string) => {
    return pendingDecisions.has(messageId);
  }, [pendingDecisions]);

  return { makeDecision, isDecisionPending };
}