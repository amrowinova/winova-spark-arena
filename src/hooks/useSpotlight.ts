/**
 * useSpotlight — Unified spotlight data hook
 * Uses get_spotlight_data RPC to fetch all data in a single round-trip
 * instead of the previous 3+ separate queries.
 */
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWeeklyPointsChart } from './useWeeklyPointsChart';

interface DailyWinner {
  id: string;
  name: string;
  prize: number;
  percentage: number;
}

interface WeeklyPerformance {
  week: number;
  points: number;
}

interface SpotlightData {
  currentDay: number;
  totalDays: number;
  currentWeek: number;
  totalWeeks: number;
  cycleId: string | null;
  daysRemaining: number;
  progressPercentage: number;

  userDailyPoints: number;
  userCyclePoints: number;
  userRankPosition: number;
  totalInRank: number;

  weeklyPerformance: WeeklyPerformance[];
  weeklyChartData: { dayOfWeek: number; date: string; points: number }[];

  dailyPool: number;
  dailyWinners: DailyWinner[];
  yesterdayPool: number;
  yesterdayWinners: DailyWinner[];

  nextDrawTime: Date;

  loading: boolean;
  error: string | null;
}

interface RpcDraw {
  total_pool: number;
  first_user_id: string | null;
  first_prize: number;
  first_pct: number;
  second_user_id: string | null;
  second_prize: number;
  second_pct: number;
  is_announced: boolean;
}

interface RpcResult {
  cycle_id: string | null;
  current_day: number;
  total_days: number;
  current_week: number;
  total_weeks: number;
  days_remaining: number;
  progress_pct: number;
  daily_points: number;
  cycle_points: number;
  rank_position: number;
  total_in_rank: number;
  today_draw: RpcDraw | null;
  yesterday_draw: RpcDraw | null;
  weekly_data: Array<{ week: number; points: number }>;
}

export function useSpotlight(): SpotlightData {
  const { user } = useAuth();

  const [rpcData, setRpcData] = useState<RpcResult | null>(null);
  const [winnerProfiles, setWinnerProfiles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weeklyChart = useWeeklyPointsChart(rpcData?.cycle_id ?? null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data, error: rpcError } = await supabase.rpc('get_spotlight_data', {
          p_user_id: user?.id ?? null,
        });

        if (rpcError) throw rpcError;
        if (cancelled) return;

        const result = data as RpcResult;
        setRpcData(result);

        // Fetch winner display names
        const winnerIds = [
          result.today_draw?.first_user_id,
          result.today_draw?.second_user_id,
          result.yesterday_draw?.first_user_id,
          result.yesterday_draw?.second_user_id,
        ].filter(Boolean) as string[];

        if (winnerIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, name')
            .in('user_id', winnerIds);

          if (!cancelled && profiles) {
            setWinnerProfiles(new Map(profiles.map((p) => [p.user_id, p.name])));
          }
        }
      } catch (err) {
        if (!cancelled) setError(String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchData();

    return () => { cancelled = true; };
  }, [user?.id]);

  const buildWinners = (draw: RpcDraw | null | undefined): DailyWinner[] => {
    if (!draw) return [];
    const winners: DailyWinner[] = [];
    if (draw.first_user_id) {
      winners.push({
        id: draw.first_user_id,
        name: winnerProfiles.get(draw.first_user_id) ?? 'User',
        prize: draw.first_prize,
        percentage: draw.first_pct,
      });
    }
    if (draw.second_user_id) {
      winners.push({
        id: draw.second_user_id,
        name: winnerProfiles.get(draw.second_user_id) ?? 'User',
        prize: draw.second_prize,
        percentage: draw.second_pct,
      });
    }
    return winners;
  };

  const nextDrawTime = useMemo(() => {
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
  }, []);

  const weeklyPerformance: WeeklyPerformance[] =
    rpcData?.weekly_data?.length
      ? rpcData.weekly_data.map((w) => ({ week: w.week, points: w.points }))
      : Array.from({ length: 14 }, (_, i) => ({ week: i + 1, points: 0 }));

  return {
    currentDay:         rpcData?.current_day ?? 0,
    totalDays:          rpcData?.total_days ?? 98,
    currentWeek:        rpcData?.current_week ?? 0,
    totalWeeks:         rpcData?.total_weeks ?? 14,
    cycleId:            rpcData?.cycle_id ?? null,
    daysRemaining:      rpcData?.days_remaining ?? 0,
    progressPercentage: rpcData?.progress_pct ?? 0,

    userDailyPoints:   rpcData?.daily_points ?? 0,
    userCyclePoints:   rpcData?.cycle_points ?? 0,
    userRankPosition:  rpcData?.rank_position ?? 0,
    totalInRank:       rpcData?.total_in_rank ?? 0,

    weeklyPerformance,
    weeklyChartData:   weeklyChart.days,

    dailyPool:         rpcData?.today_draw?.total_pool ?? 0,
    dailyWinners:      buildWinners(rpcData?.today_draw),
    yesterdayPool:     rpcData?.yesterday_draw?.total_pool ?? 0,
    yesterdayWinners:  buildWinners(rpcData?.yesterday_draw),

    nextDrawTime,

    loading: loading || weeklyChart.loading,
    error:   error || weeklyChart.error,
  };
}
