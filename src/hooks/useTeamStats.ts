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

      // Single merged RPC — falls back to 4 parallel RPCs if not available
      const mergedResult = await supabase.rpc('get_all_team_data', { p_user_id: user.id });

      if (!mergedResult.error && mergedResult.data) {
        const d = mergedResult.data as {
          stats: TeamStats;
          referral: ReferralStats;
          ranking: TeamRanking;
          breakdown: LevelBreakdown[];
        };
        setStats(d.stats);
        setReferralStats(d.referral);
        setRanking(d.ranking);
        setLevelBreakdown(d.breakdown || []);
      } else {
        // Fallback: 4 parallel RPCs
        const [statsResult, referralResult, rankingResult, breakdownResult] = await Promise.all([
          supabase.rpc('get_team_stats', { p_user_id: user.id }),
          supabase.rpc('get_referral_stats', { p_user_id: user.id }),
          supabase.rpc('get_team_ranking', { p_user_id: user.id }),
          supabase.rpc('get_team_level_breakdown', { p_user_id: user.id, p_max_level: 5 })
        ]);

        if (!statsResult.error)    setStats(statsResult.data as unknown as TeamStats);
        if (!referralResult.error) setReferralStats(referralResult.data as unknown as ReferralStats);
        if (!rankingResult.error)  setRanking(rankingResult.data as unknown as TeamRanking);
        if (!breakdownResult.error) setLevelBreakdown((breakdownResult.data as unknown as LevelBreakdown[]) || []);
      }
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

  // Realtime: refresh when own profile or team member profile changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`team_stats_realtime_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` },
        () => { fetchStats(); }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `referred_by=eq.${user.id}` },
        () => { fetchStats(); }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        () => { fetchStats(); }
      )
      .subscribe((status, err) => {
        if (err) console.error('[TeamStats] realtime error:', err);
      });

    return () => { channel.unsubscribe(); };
  }, [user?.id, fetchStats]);

  // Computed values with safe defaults - ALL FROM DATABASE
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
    // Raw data from DB
    stats,
    referralStats,
    ranking,
    levelBreakdown,
    
    // Computed values from DB
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
