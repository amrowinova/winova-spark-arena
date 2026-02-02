import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TeamStats {
  direct_count: number;
  indirect_count: number;
  total_count: number;
  active_direct: number;
  active_indirect: number;
  total_active: number;
  direct_activity_rate: number;
  total_activity_rate: number;
  team_points: number;
  current_week: number;
  total_weeks: number;
  user_active_weeks: number;
  user_activity_percentage: number;
  user_spotlight_points: number;
  user_rank: string;
}

export interface ReferralStats {
  referral_code: string;
  total_invited: number;
  active_invited: number;
  conversion_rate: number;
}

export interface TeamRanking {
  country_rank: number;
  global_rank: number;
  country: string;
  spotlight_points: number;
}

export interface LevelBreakdown {
  level: number;
  total_count: number;
  active_count: number;
}

export function useTeamStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [ranking, setRanking] = useState<TeamRanking | null>(null);
  const [levelBreakdown, setLevelBreakdown] = useState<LevelBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch all stats in parallel
      const [statsResult, referralResult, rankingResult, breakdownResult] = await Promise.all([
        supabase.rpc('get_team_stats', { p_user_id: user.id }),
        supabase.rpc('get_referral_stats', { p_user_id: user.id }),
        supabase.rpc('get_team_ranking', { p_user_id: user.id }),
        supabase.rpc('get_team_level_breakdown', { p_user_id: user.id, p_max_level: 5 })
      ]);

      if (statsResult.error) throw statsResult.error;
      if (referralResult.error) throw referralResult.error;
      if (rankingResult.error) throw rankingResult.error;
      if (breakdownResult.error) throw breakdownResult.error;

      setStats(statsResult.data as unknown as TeamStats);
      setReferralStats(referralResult.data as unknown as ReferralStats);
      setRanking(rankingResult.data as unknown as TeamRanking);
      setLevelBreakdown((breakdownResult.data as unknown as LevelBreakdown[]) || []);
    } catch (err) {
      console.error('Error fetching team stats:', err);
      setError('Failed to load team stats');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Computed values with safe defaults
  const directCount = stats?.direct_count ?? 0;
  const indirectCount = stats?.indirect_count ?? 0;
  const totalCount = stats?.total_count ?? 0;
  const activeDirectCount = stats?.active_direct ?? 0;
  const activeIndirectCount = stats?.active_indirect ?? 0;
  const directActivityRate = stats?.direct_activity_rate ?? 0;
  const totalActivityRate = stats?.total_activity_rate ?? 0;
  const teamPoints = stats?.team_points ?? 0;
  const currentWeek = stats?.current_week ?? 1;
  const totalWeeks = stats?.total_weeks ?? 14;
  const userActiveWeeks = stats?.user_active_weeks ?? 0;
  const userActivityPercentage = stats?.user_activity_percentage ?? 0;
  const userSpotlightPoints = stats?.user_spotlight_points ?? 0;
  const userRank = stats?.user_rank ?? 'subscriber';

  return {
    // Raw data
    stats,
    referralStats,
    ranking,
    levelBreakdown,
    
    // Computed values
    directCount,
    indirectCount,
    totalCount,
    activeDirectCount,
    activeIndirectCount,
    directActivityRate,
    totalActivityRate,
    teamPoints,
    currentWeek,
    totalWeeks,
    userActiveWeeks,
    userActivityPercentage,
    userSpotlightPoints,
    userRank,
    
    // State
    loading,
    error,
    refresh: fetchStats
  };
}
