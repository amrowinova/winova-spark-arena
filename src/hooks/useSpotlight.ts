import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCycleProgress } from './useCycleProgress';
import { useWeeklyPointsChart } from './useWeeklyPointsChart';

interface DailyDraw {
  id: string;
  draw_date: string;
  total_pool: number;
  first_place_user_id: string | null;
  first_place_prize: number;
  first_place_percentage: number;
  second_place_user_id: string | null;
  second_place_prize: number;
  second_place_percentage: number;
  is_announced: boolean;
  announced_at: string | null;
}

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
  // Cycle info (from useCycleProgress)
  currentDay: number;
  totalDays: number;
  currentWeek: number;
  totalWeeks: number;
  cycleId: string | null;
  daysRemaining: number;
  progressPercentage: number;

  // User points
  userDailyPoints: number;
  userCyclePoints: number;
  userRankPosition: number;
  totalInRank: number;

  // Weekly performance
  weeklyPerformance: WeeklyPerformance[];
  weeklyChartData: { dayOfWeek: number; date: string; points: number }[];

  // Daily pool and winners
  dailyPool: number;
  dailyWinners: DailyWinner[];
  yesterdayPool: number;
  yesterdayWinners: DailyWinner[];
  
  // Next draw time
  nextDrawTime: Date;
  
  // Loading states
  loading: boolean;
  error: string | null;
}

export function useSpotlight(): SpotlightData {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  // Use real cycle progress from RPC
  const cycleProgress = useCycleProgress();
  
  // Use real weekly chart data from RPC
  const weeklyChart = useWeeklyPointsChart(cycleProgress.cycleId);

  const [todayDraw, setTodayDraw] = useState<DailyDraw | null>(null);
  const [yesterdayDraw, setYesterdayDraw] = useState<DailyDraw | null>(null);
  const [userPoints, setUserPoints] = useState<{ daily: number; cycle: number; weeklyData: WeeklyPerformance[] }>({
    daily: 0,
    cycle: 0,
    weeklyData: []
  });
  const [rankingData, setRankingData] = useState<{ position: number; totalInRank: number }>({
    position: 0,
    totalInRank: 0
  });
  const [winnerProfiles, setWinnerProfiles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch daily draws (today and yesterday)
  useEffect(() => {
    if (!cycleProgress.cycleId) return;

    const fetchDailyDraws = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // Fetch today's draw
        const { data: todayData } = await supabase
          .from('spotlight_daily_draws')
          .select('*')
          .eq('cycle_id', cycleProgress.cycleId)
          .eq('draw_date', today)
          .single();

        setTodayDraw(todayData);

        // Fetch yesterday's draw
        const { data: yesterdayData } = await supabase
          .from('spotlight_daily_draws')
          .select('*')
          .eq('cycle_id', cycleProgress.cycleId)
          .eq('draw_date', yesterday)
          .single();

        setYesterdayDraw(yesterdayData);

        // Fetch winner profiles
        const winnerIds = [
          todayData?.first_place_user_id,
          todayData?.second_place_user_id,
          yesterdayData?.first_place_user_id,
          yesterdayData?.second_place_user_id
        ].filter(Boolean) as string[];

        if (winnerIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, name')
            .in('user_id', winnerIds);

          if (profiles) {
            const profileMap = new Map(profiles.map(p => [p.user_id, p.name]));
            setWinnerProfiles(profileMap);
          }
        }
      } catch (err) {
        console.error('Error fetching daily draws:', err);
      }
    };

    fetchDailyDraws();

    // Subscribe to realtime updates for daily draws
    const channel = supabase
      .channel('spotlight_draws')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'spotlight_daily_draws',
          filter: `cycle_id=eq.${cycleProgress.cycleId}`
        },
        () => {
          fetchDailyDraws();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cycleProgress.cycleId]);

  // Fetch user points
  useEffect(() => {
    if (!user?.id || !cycleProgress.cycleId) return;

    const fetchUserPoints = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];

        // Fetch today's points
        const { data: todayPoints } = await supabase
          .from('spotlight_user_points')
          .select('daily_points')
          .eq('user_id', user.id)
          .eq('cycle_id', cycleProgress.cycleId)
          .eq('points_date', today);

        const dailyTotal = todayPoints?.reduce((sum, p) => sum + p.daily_points, 0) || 0;

        // Fetch total cycle points
        const { data: cyclePoints } = await supabase
          .from('spotlight_user_points')
          .select('daily_points, week_number')
          .eq('user_id', user.id)
          .eq('cycle_id', cycleProgress.cycleId);

        const cycleTotal = cyclePoints?.reduce((sum, p) => sum + p.daily_points, 0) || 0;

        // Group by week for weekly performance (used in WeeklyPerformanceCard)
        const weeklyMap = new Map<number, number>();
        for (let i = 1; i <= cycleProgress.totalWeeks; i++) {
          weeklyMap.set(i, 0);
        }
        cyclePoints?.forEach(p => {
          const current = weeklyMap.get(p.week_number) || 0;
          weeklyMap.set(p.week_number, current + p.daily_points);
        });

        const weeklyData: WeeklyPerformance[] = Array.from(weeklyMap.entries())
          .map(([week, points]) => ({ week, points }))
          .sort((a, b) => a.week - b.week);

        setUserPoints({
          daily: dailyTotal,
          cycle: cycleTotal,
          weeklyData
        });
      } catch (err) {
        console.error('Error fetching user points:', err);
      }
    };

    fetchUserPoints();
  }, [user?.id, cycleProgress.cycleId, cycleProgress.totalWeeks]);

  // Fetch user ranking within their rank tier
  useEffect(() => {
    if (!user?.id || !cycleProgress.cycleId) return;

    const fetchRanking = async () => {
      try {
        // Get user's rank
        const { data: profile } = await supabase
          .from('profiles')
          .select('rank')
          .eq('user_id', user.id)
          .single();

        if (!profile) return;

        // Get all users with same rank and their cycle points
        const { data: sameRankUsers } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('rank', profile.rank);

        if (!sameRankUsers) return;

        const userIds = sameRankUsers.map(u => u.user_id);

        // Get points for all users in same rank
        const { data: allPoints } = await supabase
          .from('spotlight_user_points')
          .select('user_id, daily_points')
          .eq('cycle_id', cycleProgress.cycleId)
          .in('user_id', userIds);

        // Aggregate points per user
        const pointsMap = new Map<string, number>();
        allPoints?.forEach(p => {
          const current = pointsMap.get(p.user_id) || 0;
          pointsMap.set(p.user_id, current + p.daily_points);
        });

        // Sort by points descending
        const sortedUsers = Array.from(pointsMap.entries())
          .sort((a, b) => b[1] - a[1]);

        // Find user's position
        const userPosition = sortedUsers.findIndex(([id]) => id === user.id) + 1;

        setRankingData({
          position: userPosition || sameRankUsers.length + 1,
          totalInRank: sameRankUsers.length
        });
      } catch (err) {
        console.error('Error fetching ranking:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
  }, [user?.id, cycleProgress.cycleId]);

  // Build winners arrays
  const buildWinners = (draw: DailyDraw | null): DailyWinner[] => {
    if (!draw) return [];

    const winners: DailyWinner[] = [];
    
    if (draw.first_place_user_id) {
      winners.push({
        id: draw.first_place_user_id,
        name: winnerProfiles.get(draw.first_place_user_id) || (isRTL ? 'مستخدم' : 'User'),
        prize: draw.first_place_prize,
        percentage: draw.first_place_percentage
      });
    }

    if (draw.second_place_user_id) {
      winners.push({
        id: draw.second_place_user_id,
        name: winnerProfiles.get(draw.second_place_user_id) || (isRTL ? 'مستخدم' : 'User'),
        prize: draw.second_place_prize,
        percentage: draw.second_place_percentage
      });
    }

    return winners;
  };

  // Calculate next draw time (end of today at 23:59:59)
  const nextDrawTime = useMemo(() => {
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
  }, []);

  // Combine loading states
  const isLoading = cycleProgress.loading || weeklyChart.loading || loading;

  return {
    // Cycle info from useCycleProgress
    currentDay: cycleProgress.currentDay,
    totalDays: cycleProgress.totalDays,
    currentWeek: cycleProgress.currentWeek,
    totalWeeks: cycleProgress.totalWeeks,
    cycleId: cycleProgress.cycleId,
    daysRemaining: cycleProgress.daysRemaining,
    progressPercentage: cycleProgress.progressPercentage,

    // User points
    userDailyPoints: userPoints.daily,
    userCyclePoints: userPoints.cycle,
    userRankPosition: rankingData.position,
    totalInRank: rankingData.totalInRank,

    // Weekly performance (for 14-week overview chart)
    weeklyPerformance: userPoints.weeklyData.length > 0 
      ? userPoints.weeklyData 
      : Array.from({ length: 14 }, (_, i) => ({ week: i + 1, points: 0 })),
    
    // Weekly chart data (for current week daily breakdown)
    weeklyChartData: weeklyChart.days,

    // Daily draws
    dailyPool: todayDraw?.total_pool || 0,
    dailyWinners: buildWinners(todayDraw),
    yesterdayPool: yesterdayDraw?.total_pool || 0,
    yesterdayWinners: buildWinners(yesterdayDraw),
    
    nextDrawTime,
    
    loading: isLoading,
    error: cycleProgress.error || weeklyChart.error || error
  };
}
