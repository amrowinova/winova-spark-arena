import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useIntelligenceMetrics() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['intelligence-metrics'],
    queryFn: async () => {
      const [{ data: metrics }, { data: trend }] = await Promise.all([
        supabase
          .from('intelligence_metrics')
          .select('*')
          .order('metric_date', { ascending: false })
          .limit(1),
        supabase
          .from('intelligence_metrics')
          .select('metric_date, prediction_accuracy, reversal_rate, auto_approval_success_rate, total_predictions, confidence_vs_correctness')
          .order('metric_date', { ascending: false })
          .limit(30),
      ]);

      const latest = metrics?.[0] || null;
      const trendData = (trend || []).reverse();

      // Calculate week-over-week improvement
      let weeklyImprovement = 0;
      if (trendData.length >= 7) {
        const recent = trendData.slice(-7);
        const older = trendData.slice(-14, -7);
        if (older.length > 0) {
          const recentAvg = recent.reduce((s: number, m: any) => s + (m.prediction_accuracy || 0), 0) / recent.length;
          const olderAvg = older.reduce((s: number, m: any) => s + (m.prediction_accuracy || 0), 0) / older.length;
          weeklyImprovement = Math.round(recentAvg - olderAvg);
        }
      }

      return {
        latest,
        trend: trendData,
        weeklyImprovement,
        isLearning: weeklyImprovement > 0,
        maturityLevel: getMatureLevel(latest?.total_predictions || 0),
      };
    },
    enabled: !!user,
    refetchInterval: 120000,
  });
}

function getMatureLevel(totalPredictions: number): { level: string; levelAr: string; progress: number } {
  if (totalPredictions >= 1000) return { level: 'Elite', levelAr: 'نخبة', progress: 100 };
  if (totalPredictions >= 200) return { level: 'Strong', levelAr: 'قوي', progress: Math.round((totalPredictions / 1000) * 100) };
  if (totalPredictions >= 50) return { level: 'Improving', levelAr: 'يتحسن', progress: Math.round((totalPredictions / 200) * 100) };
  return { level: 'Learning', levelAr: 'يتعلم', progress: Math.round((totalPredictions / 50) * 100) };
}
