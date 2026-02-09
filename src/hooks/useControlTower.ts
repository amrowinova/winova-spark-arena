import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/* ── 1. Live Mind — top priorities / beliefs ── */
export function useLiveMind() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['control-tower-live-mind'],
    queryFn: async () => {
      // Pull latest ai_priorities + high-severity analysis logs
      const [{ data: priorities }, { data: findings }] = await Promise.all([
        supabase
          .from('ai_priorities')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('ai_analysis_logs')
          .select('*, ai_agents!ai_analysis_logs_agent_id_fkey(agent_name_ar)')
          .in('severity', ['critical', 'high'])
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);
      return {
        priorities: priorities || [],
        criticalFindings: findings || [],
      };
    },
    enabled: !!user,
    refetchInterval: 60000,
  });
}

/* ── 2. New Knowledge — patterns + rules + recent memory ── */
export function useNewKnowledge() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['control-tower-knowledge'],
    queryFn: async () => {
      const [{ data: memory }, { data: patterns }, { data: rules }] = await Promise.all([
        supabase
          .from('knowledge_memory')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('knowledge_patterns')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('knowledge_rules')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);
      return {
        recentMemory: memory || [],
        patterns: patterns || [],
        rules: rules || [],
      };
    },
    enabled: !!user,
    refetchInterval: 120000,
  });
}

/* ── 3. Top Failures — repeated RPC failures ── */
export function useTopFailures() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['control-tower-failures'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_failures')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      // Group by rpc_name
      const grouped: Record<string, { count: number; lastError: string | null; lastAt: string }> = {};
      (data || []).forEach((f: any) => {
        if (!grouped[f.rpc_name]) {
          grouped[f.rpc_name] = { count: 0, lastError: f.error_message, lastAt: f.created_at };
        }
        grouped[f.rpc_name].count++;
      });
      
      return Object.entries(grouped)
        .map(([rpc, info]) => ({ rpc, ...info }))
        .sort((a, b) => b.count - a.count);
    },
    enabled: !!user,
    refetchInterval: 120000,
  });
}

/* ── 4. Proposals needing approval ── */
export function usePendingProposals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['control-tower-pending-proposals'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_proposals')
        .select('*, ai_agents!ai_proposals_proposed_by_fkey(agent_name_ar)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

/* ── 5. AI Performance — approval rates ── */
export function useAIPerformance() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['control-tower-performance'],
    queryFn: async () => {
      const { data: proposals } = await supabase
        .from('ai_proposals')
        .select('status, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      
      const all = proposals || [];
      const total = all.length;
      const approved = all.filter((p: any) => p.status === 'approved').length;
      const rejected = all.filter((p: any) => p.status === 'rejected').length;
      const pending = all.filter((p: any) => p.status === 'pending').length;
      
      // Last 7 days vs previous 7 days
      const now = Date.now();
      const week = 7 * 24 * 60 * 60 * 1000;
      const thisWeek = all.filter((p: any) => now - new Date(p.created_at).getTime() < week);
      const lastWeek = all.filter((p: any) => {
        const age = now - new Date(p.created_at).getTime();
        return age >= week && age < week * 2;
      });
      
      return {
        total,
        approved,
        rejected,
        pending,
        approvalRate: total > 0 ? Math.round((approved / (approved + rejected || 1)) * 100) : 0,
        thisWeekCount: thisWeek.length,
        lastWeekCount: lastWeek.length,
      };
    },
    enabled: !!user,
    refetchInterval: 120000,
  });
}

/* ── 6. Questions for Leadership ── */
export function useLeadershipQuestions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['control-tower-questions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_human_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 60000,
  });
}

/* ── 7. Engineer Reports (Experiments) ── */
export function useExperiments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['control-tower-experiments'],
    queryFn: async () => {
      const [{ data: reports }, { data: productProposals }] = await Promise.all([
        supabase
          .from('ai_engineer_reports')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('ai_product_proposals')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);
      return {
        reports: reports || [],
        productProposals: productProposals || [],
      };
    },
    enabled: !!user,
    refetchInterval: 120000,
  });
}
