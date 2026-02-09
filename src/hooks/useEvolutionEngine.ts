import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useForecasts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['ai-forecasts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_forecasts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 60000,
  });
}

export function useEvolutionProposals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['ai-evolution-proposals'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_evolution_proposals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 120000,
  });
}

export function useCapabilityMetrics() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['ai-capability-metrics'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_capability_metrics')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(30);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 300000,
  });
}

export function useSkillHeatmap() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['ai-skill-heatmap'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_agent_skills')
        .select('skill_name, skill_category, proficiency_level, agent_id')
        .order('skill_category');
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 300000,
  });
}
