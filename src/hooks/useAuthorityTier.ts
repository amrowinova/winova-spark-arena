import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIntelligenceMetrics } from '@/hooks/useIntelligenceMetrics';

const TIER_DEFINITIONS = [
  {
    level: 0,
    name: 'Observer',
    nameAr: 'مراقب',
    description: 'No autonomous actions. All decisions require CEO approval.',
    descriptionAr: 'لا إجراءات تلقائية. جميع القرارات تتطلب موافقة المدير.',
    minAccuracy: 0,
    maxReversalRate: 100,
    minPredictions: 0,
  },
  {
    level: 1,
    name: 'Assistant',
    nameAr: 'مساعد',
    description: 'Can auto-handle low-risk, reversible, non-financial tasks.',
    descriptionAr: 'يمكنه التعامل تلقائياً مع المهام منخفضة المخاطر والقابلة للعكس.',
    minAccuracy: 65,
    maxReversalRate: 15,
    minPredictions: 50,
  },
  {
    level: 2,
    name: 'Operator',
    nameAr: 'مشغّل',
    description: 'Can auto-handle medium-risk operational tasks with notification.',
    descriptionAr: 'يمكنه التعامل مع المهام التشغيلية متوسطة المخاطر مع الإشعار.',
    minAccuracy: 75,
    maxReversalRate: 8,
    minPredictions: 200,
  },
  {
    level: 3,
    name: 'Strategist',
    nameAr: 'استراتيجي',
    description: 'Can recommend and auto-execute most non-financial decisions.',
    descriptionAr: 'يمكنه التوصية والتنفيذ التلقائي لمعظم القرارات غير المالية.',
    minAccuracy: 85,
    maxReversalRate: 3,
    minPredictions: 500,
  },
  {
    level: 4,
    name: 'Executive Partner',
    nameAr: 'شريك تنفيذي',
    description: 'Full autonomy on non-financial, non-security decisions. CEO consulted only on strategic matters.',
    descriptionAr: 'صلاحية كاملة على القرارات غير المالية. يُستشار المدير فقط في الأمور الاستراتيجية.',
    minAccuracy: 92,
    maxReversalRate: 1,
    minPredictions: 1000,
  },
];

export function useAuthorityTier() {
  const { user } = useAuth();
  const { data: metricsData } = useIntelligenceMetrics();
  const queryClient = useQueryClient();

  const tierQuery = useQuery({
    queryKey: ['authority-tier'],
    queryFn: async () => {
      const [{ data: state }, { data: log }] = await Promise.all([
        supabase.from('authority_tier_state').select('*').limit(1).single(),
        supabase.from('authority_promotion_log').select('*').order('created_at', { ascending: false }).limit(10),
      ]);
      return { state: state as any, history: (log || []) as any[] };
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const currentLevel = tierQuery.data?.state?.current_level ?? 0;
  const currentDef = TIER_DEFINITIONS[currentLevel];
  const nextDef = currentLevel < 4 ? TIER_DEFINITIONS[currentLevel + 1] : null;

  // Compute readiness for next level
  const latest = metricsData?.latest;
  const accuracy = latest?.prediction_accuracy ?? 0;
  const reversalRate = latest?.reversal_rate ?? 0;
  const totalPredictions = latest?.total_predictions ?? 0;

  const nextRequirements = nextDef ? {
    accuracyMet: accuracy >= nextDef.minAccuracy,
    reversalMet: reversalRate <= nextDef.maxReversalRate,
    predictionsMet: totalPredictions >= nextDef.minPredictions,
    accuracyProgress: Math.min(100, Math.round((accuracy / nextDef.minAccuracy) * 100)),
    reversalProgress: Math.min(100, reversalRate <= nextDef.maxReversalRate ? 100 : Math.round(((100 - reversalRate) / (100 - nextDef.maxReversalRate)) * 100)),
    predictionsProgress: Math.min(100, Math.round((totalPredictions / nextDef.minPredictions) * 100)),
    isEligible: accuracy >= nextDef.minAccuracy && reversalRate <= nextDef.maxReversalRate && totalPredictions >= nextDef.minPredictions,
  } : null;

  // Risk assessment for elevation
  const elevationRisk = nextDef ? computeElevationRisk(currentLevel, accuracy, reversalRate) : 'N/A';

  const promoteMutation = useMutation({
    mutationFn: async ({ notes }: { notes?: string } = {}) => {
      if (!nextDef || !nextRequirements?.isEligible) throw new Error('Not eligible');
      const newLevel = currentLevel + 1;

      await supabase.from('authority_tier_state').update({
        current_level: newLevel,
        reason: `Promoted to L${newLevel} — ${nextDef.name}. Accuracy: ${accuracy}%, Reversals: ${reversalRate}%`,
        reason_ar: `ترقية إلى المستوى ${newLevel} — ${nextDef.nameAr}`,
        last_promoted_at: new Date().toISOString(),
        promoted_by: user?.id,
        accuracy_at_change: accuracy,
        reversal_rate_at_change: reversalRate,
        updated_at: new Date().toISOString(),
      }).eq('id', tierQuery.data?.state?.id);

      await supabase.from('authority_promotion_log').insert({
        from_level: currentLevel,
        to_level: newLevel,
        action: 'promotion',
        reason: notes || `CEO approved elevation to L${newLevel}`,
        triggered_by: 'ceo_approval',
        approved_by: user?.id,
        accuracy_trend: accuracy,
        reversal_rate: reversalRate,
        decision_similarity: latest?.confidence_vs_correctness ?? 0,
      });

      await supabase.from('learning_signals').insert({
        signal_type: 'authority_promotion',
        reference_id: tierQuery.data?.state?.id,
        context: { from: currentLevel, to: newLevel, accuracy, reversalRate },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authority-tier'] });
      queryClient.invalidateQueries({ queryKey: ['commander-briefing'] });
    },
  });

  const demoteMutation = useMutation({
    mutationFn: async ({ reason }: { reason: string }) => {
      if (currentLevel === 0) return;
      const newLevel = currentLevel - 1;

      await supabase.from('authority_tier_state').update({
        current_level: newLevel,
        reason: `Demoted to L${newLevel} — ${reason}`,
        reason_ar: `تخفيض إلى المستوى ${newLevel}`,
        last_demoted_at: new Date().toISOString(),
        accuracy_at_change: accuracy,
        reversal_rate_at_change: reversalRate,
        updated_at: new Date().toISOString(),
      }).eq('id', tierQuery.data?.state?.id);

      await supabase.from('authority_promotion_log').insert({
        from_level: currentLevel,
        to_level: newLevel,
        action: 'demotion',
        reason,
        triggered_by: 'automatic',
        accuracy_trend: accuracy,
        reversal_rate: reversalRate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authority-tier'] });
    },
  });

  return {
    currentLevel,
    currentDef,
    nextDef,
    nextRequirements,
    elevationRisk,
    history: tierQuery.data?.history || [],
    state: tierQuery.data?.state,
    isLoading: tierQuery.isLoading,
    tiers: TIER_DEFINITIONS,
    metrics: { accuracy, reversalRate, totalPredictions, confidence: latest?.confidence_vs_correctness ?? 0 },
    promote: promoteMutation,
    demote: demoteMutation,
  };
}

function computeElevationRisk(currentLevel: number, accuracy: number, reversalRate: number): string {
  if (currentLevel >= 3) return 'high';
  if (accuracy < 70 || reversalRate > 10) return 'high';
  if (accuracy < 80 || reversalRate > 5) return 'medium';
  return 'low';
}
