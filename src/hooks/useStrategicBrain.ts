import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useExternalKnowledge() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['strategic-external-knowledge'],
    queryFn: async () => {
      const { data } = await supabase
        .from('external_knowledge')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 120000,
  });
}

export function useStrategicInsights() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['strategic-insights'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_strategic_insights')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 60000,
  });
}

export function useStrategicSummary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['strategic-summary'],
    queryFn: async () => {
      const { data: insights } = await supabase
        .from('ai_strategic_insights')
        .select('insight_type, severity, confidence_score, status, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      const all = insights || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayItems = all.filter(i => new Date(i.created_at) >= today);
      
      const byType: Record<string, number> = {};
      const bySeverity: Record<string, number> = {};
      
      all.forEach((i: any) => {
        byType[i.insight_type] = (byType[i.insight_type] || 0) + 1;
        bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
      });

      const avgConfidence = all.length > 0
        ? Math.round(all.reduce((s: number, i: any) => s + (i.confidence_score || 0), 0) / all.length)
        : 0;

      return {
        total: all.length,
        todayCount: todayItems.length,
        newCount: all.filter((i: any) => i.status === 'new').length,
        reviewedCount: all.filter((i: any) => i.status === 'reviewed').length,
        byType,
        bySeverity,
        avgConfidence,
      };
    },
    enabled: !!user,
    refetchInterval: 120000,
  });
}
