import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DayPoints {
  dayOfWeek: number; // 1 = Monday, 7 = Sunday
  date: string;
  points: number;
}

interface WeeklyChartData {
  days: DayPoints[];
  totalWeekPoints: number;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to get weekly points chart data from real database
 * Uses RPC get_weekly_points_chart for accurate daily breakdown
 */
export function useWeeklyPointsChart(cycleId: string | null): WeeklyChartData {
  const { user } = useAuth();
  const [data, setData] = useState<WeeklyChartData>({
    days: [],
    totalWeekPoints: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!user?.id || !cycleId) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    const fetchWeeklyPoints = async () => {
      try {
        const { data: result, error } = await supabase.rpc('get_weekly_points_chart', {
          p_user_id: user.id,
          p_cycle_id: cycleId,
        });

        if (error) throw error;

        // Build all 7 days with real or zero points
        const dayMap = new Map<number, DayPoints>();
        
        // Initialize all days with zero
        for (let i = 1; i <= 7; i++) {
          dayMap.set(i, { dayOfWeek: i, date: '', points: 0 });
        }

        // Fill in real data
        let totalPoints = 0;
        (result || []).forEach((row: any) => {
          dayMap.set(row.day_of_week, {
            dayOfWeek: row.day_of_week,
            date: row.points_date,
            points: row.total_points,
          });
          totalPoints += row.total_points;
        });

        const days = Array.from(dayMap.values()).sort((a, b) => a.dayOfWeek - b.dayOfWeek);

        setData({
          days,
          totalWeekPoints: totalPoints,
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error('Error fetching weekly points:', err);
        setData(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load weekly points',
        }));
      }
    };

    fetchWeeklyPoints();
  }, [user?.id, cycleId]);

  return data;
}
