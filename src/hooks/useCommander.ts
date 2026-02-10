import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/* ── Decision Feed: proposals with governance metadata ── */
export function useDecisionFeed() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['commander-decision-feed'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_proposals')
        .select('*, ai_agents!ai_proposals_proposed_by_fkey(agent_name_ar)')
        .order('created_at', { ascending: false })
        .limit(50);

      return (data || []).map((p: any) => {
        const riskTier = computeRiskTier(p);
        const confidence = p.confidence_score ?? estimateConfidence(p);
        return {
          id: p.id,
          title: p.title,
          titleAr: p.title_ar,
          description: p.description,
          descriptionAr: p.description_ar,
          status: p.status,
          priority: p.priority,
          riskLevel: p.risk_level,
          riskTier,
          confidence,
          affectedArea: p.affected_area,
          proposalType: p.proposal_type,
          rollbackPlan: p.rollback_plan,
          codeSnippet: p.code_snippet,
          estimatedEffort: p.estimated_effort,
          impactScope: p.impact_scope,
          agentName: p.ai_agents?.agent_name_ar || 'System',
          createdAt: p.created_at,
          adminNotes: p.admin_notes,
          isReversible: !!p.rollback_plan,
          isFinancial: isFinancialOperation(p),
          recommendation: deriveRecommendation(riskTier, confidence, p),
        };
      });
    },
    enabled: !!user,
    refetchInterval: 15000,
  });
}

/* ── Commander Briefing: summary stats ── */
export function useCommanderBriefing() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['commander-briefing'],
    queryFn: async () => {
      const [{ data: proposals }, { data: metrics }, { data: autoActions }] = await Promise.all([
        supabase.from('ai_proposals').select('status, priority, risk_level, created_at').limit(200),
        supabase.from('intelligence_metrics').select('*').order('metric_date', { ascending: false }).limit(1),
        supabase.from('learning_signals').select('signal_type, created_at')
          .eq('signal_type', 'auto_approved')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(100),
      ]);

      const all = proposals || [];
      const pending = all.filter((p: any) => p.status === 'pending');
      const critical = pending.filter((p: any) => p.priority === 'critical' || p.risk_level === 'critical');
      const recent24h = all.filter((p: any) => Date.now() - new Date(p.created_at).getTime() < 86400000);
      const approved24h = recent24h.filter((p: any) => p.status === 'approved').length;
      const rejected24h = recent24h.filter((p: any) => p.status === 'rejected').length;

      const latest = metrics?.[0];
      return {
        pendingDecisions: pending.length,
        criticalItems: critical.length,
        autoHandled24h: autoActions?.length || 0,
        approved24h,
        rejected24h,
        predictionAccuracy: latest?.prediction_accuracy || 0,
        reversalRate: latest?.reversal_rate || 0,
        autoApprovalSuccess: latest?.auto_approval_success_rate || 0,
        confidence: latest?.confidence_vs_correctness || 0,
        totalPredictions: latest?.total_predictions || 0,
        isStable: pending.length === 0 && critical.length === 0,
      };
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

/* ── Emergency Controls ── */
export function useEmergencyControls() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    queryKey: ['commander-emergency-status'],
    queryFn: async () => {
      const { data } = await supabase
        .from('owner_constitution')
        .select('rule_key, rule_value')
        .in('rule_key', ['FREEZE_EVOLUTION', 'FREEZE_EXECUTION', 'KILL_ALL_AGENTS']);
      
      const flags: Record<string, boolean> = {};
      (data || []).forEach((r: any) => {
        flags[r.rule_key] = r.rule_value?.enabled === true;
      });
      return flags;
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('owner_constitution')
        .update({ rule_value: { enabled }, updated_at: new Date().toISOString() })
        .eq('rule_key', key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commander-emergency-status'] });
    },
  });

  return { status: statusQuery.data || {}, isLoading: statusQuery.isLoading, toggle: toggleMutation };
}

/* ── Governance action: approve/reject from Commander ── */
export function useGovernanceAction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ proposalId, action, notes }: { proposalId: string; action: 'approved' | 'rejected' | 'deferred'; notes?: string }) => {
      const updatePayload: any = {
        status: action === 'deferred' ? 'pending' : action,
        admin_notes: notes || null,
        updated_at: new Date().toISOString(),
      };
      if (action === 'approved') {
        updatePayload.approved_by = user?.id;
        updatePayload.approved_at = new Date().toISOString();
      } else if (action === 'rejected') {
        updatePayload.approved_by = user?.id;
        updatePayload.rejected_at = new Date().toISOString();
      }

      const { error } = await supabase.from('ai_proposals').update(updatePayload).eq('id', proposalId);
      if (error) throw error;

      // Log learning signal
      await supabase.from('learning_signals').insert({
        signal_type: action === 'approved' ? 'approval' : action === 'rejected' ? 'rejection' : 'delay',
        reference_id: proposalId,
        context: { source: 'commander_ui', notes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commander-decision-feed'] });
      queryClient.invalidateQueries({ queryKey: ['commander-briefing'] });
    },
  });
}

/* ── Helpers ── */
function computeRiskTier(p: any): 0 | 1 | 2 | 3 {
  if (isFinancialOperation(p)) return 3;
  if (p.risk_level === 'critical' || p.priority === 'critical') return 3;
  if (p.risk_level === 'high' || p.priority === 'high') return 2;
  if (p.risk_level === 'medium' || p.priority === 'medium') return 1;
  return 0;
}

function isFinancialOperation(p: any): boolean {
  const financialKeywords = ['wallet', 'balance', 'nova', 'aura', 'payment', 'transfer', 'financial', 'money', 'fund'];
  const text = `${p.title} ${p.description} ${p.affected_area || ''} ${p.proposal_type || ''}`.toLowerCase();
  return financialKeywords.some(k => text.includes(k));
}

function estimateConfidence(p: any): number {
  let base = 50;
  if (p.rollback_plan) base += 15;
  if (p.code_snippet) base += 10;
  if (p.risk_level === 'low') base += 15;
  if (p.risk_level === 'high' || p.risk_level === 'critical') base -= 20;
  if (p.estimated_effort === 'small') base += 10;
  return Math.max(10, Math.min(95, base));
}

function deriveRecommendation(tier: number, confidence: number, p: any): 'approve' | 'reject' | 'investigate' | 'defer' {
  if (tier === 0 && confidence >= 80) return 'approve';
  if (tier >= 3) return 'investigate';
  if (confidence < 40) return 'investigate';
  if (confidence >= 70 && tier <= 1) return 'approve';
  if (p.status === 'rejected') return 'reject';
  return 'defer';
}
