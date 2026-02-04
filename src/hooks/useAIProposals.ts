import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface AIProposal {
  id: string;
  sessionId: string | null;
  title: string;
  titleAr: string | null;
  description: string;
  descriptionAr: string | null;
  proposalType: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  affectedArea: string | null;
  proposedBy: string | null;
  proposedByName?: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  // Level 3 Governance fields
  riskLevel: 'high' | 'medium' | 'low' | null;
  impactScope: string | null;
  rollbackPlan: string | null;
  codeSnippet: string | null;
  estimatedEffort: 'small' | 'medium' | 'large' | null;
}

export function useAIProposals(status?: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['ai-proposals', status],
    queryFn: async () => {
      let query = supabase
        .from('ai_proposals')
        .select(`
          *,
          ai_agents!ai_proposals_proposed_by_fkey (
            agent_name_ar
          )
        `)
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return (data || []).map((p: any) => ({
        id: p.id,
        sessionId: p.session_id,
        title: p.title,
        titleAr: p.title_ar,
        description: p.description,
        descriptionAr: p.description_ar,
        proposalType: p.proposal_type,
        priority: p.priority as AIProposal['priority'],
        affectedArea: p.affected_area,
        proposedBy: p.proposed_by,
        proposedByName: p.ai_agents?.agent_name_ar,
        status: p.status as AIProposal['status'],
        adminNotes: p.admin_notes,
        approvedBy: p.approved_by,
        approvedAt: p.approved_at,
        rejectedAt: p.rejected_at,
        createdAt: p.created_at,
        // Level 3 Governance fields
        riskLevel: p.risk_level as AIProposal['riskLevel'],
        impactScope: p.impact_scope,
        rollbackPlan: p.rollback_plan,
        codeSnippet: p.code_snippet,
        estimatedEffort: p.estimated_effort as AIProposal['estimatedEffort'],
      })) as AIProposal[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

export function useApproveProposal() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ proposalId, notes }: { proposalId: string; notes?: string }) => {
      const { error } = await supabase
        .from('ai_proposals')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          admin_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposalId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'تمت الموافقة',
        description: 'تم اعتماد الاقتراح للتنفيذ',
      });
      queryClient.invalidateQueries({ queryKey: ['ai-proposals'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useRejectProposal() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ proposalId, notes }: { proposalId: string; notes?: string }) => {
      const { error } = await supabase
        .from('ai_proposals')
        .update({
          status: 'rejected',
          approved_by: user?.id,
          rejected_at: new Date().toISOString(),
          admin_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposalId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'تم الرفض',
        description: 'تم رفض الاقتراح',
      });
      queryClient.invalidateQueries({ queryKey: ['ai-proposals'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical':
      return 'bg-destructive/10 text-destructive border-destructive/30';
    case 'high':
      return 'bg-warning/10 text-warning border-warning/30';
    case 'medium':
      return 'bg-info/10 text-info border-info/30';
    case 'low':
      return 'bg-muted text-muted-foreground border-border';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export function getPriorityBadge(priority: string, language: 'ar' | 'en'): { emoji: string; label: string } {
  switch (priority) {
    case 'critical':
      return { emoji: '🔴', label: language === 'ar' ? 'حرج' : 'Critical' };
    case 'high':
      return { emoji: '🟡', label: language === 'ar' ? 'عالي' : 'High' };
    case 'medium':
      return { emoji: '🔵', label: language === 'ar' ? 'متوسط' : 'Medium' };
    case 'low':
      return { emoji: '⚪', label: language === 'ar' ? 'منخفض' : 'Low' };
    default:
      return { emoji: '⚪', label: language === 'ar' ? 'عام' : 'General' };
  }
}

export function getStatusBadge(status: string, language: 'ar' | 'en'): { emoji: string; label: string; color: string } {
  switch (status) {
    case 'pending':
      return { 
        emoji: '⏳', 
        label: language === 'ar' ? 'بانتظار الموافقة' : 'Pending',
        color: 'bg-warning/10 text-warning border-warning/30'
      };
    case 'approved':
      return { 
        emoji: '✅', 
        label: language === 'ar' ? 'معتمد' : 'Approved',
        color: 'bg-success/10 text-success border-success/30'
      };
    case 'rejected':
      return { 
        emoji: '❌', 
        label: language === 'ar' ? 'مرفوض' : 'Rejected',
        color: 'bg-destructive/10 text-destructive border-destructive/30'
      };
    default:
      return { 
        emoji: '❓', 
        label: status,
        color: 'bg-muted text-muted-foreground border-border'
      };
  }
}
