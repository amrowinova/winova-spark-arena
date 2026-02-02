import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CycleProgress {
  cycleId: string | null;
  cycleNumber: number;
  startDate: string;
  endDate: string;
  totalDays: number;
  currentDay: number;
  daysRemaining: number;
  progressPercentage: number;
  currentWeek: number;
  totalWeeks: number;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to get real cycle progress from database
 * Uses RPC get_cycle_progress for accurate calculations
 */
export function useCycleProgress(): CycleProgress {
  const [data, setData] = useState<CycleProgress>({
    cycleId: null,
    cycleNumber: 1,
    startDate: '',
    endDate: '',
    totalDays: 98,
    currentDay: 1,
    daysRemaining: 97,
    progressPercentage: 1,
    currentWeek: 1,
    totalWeeks: 14,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchCycleProgress = async () => {
      try {
        const { data: result, error } = await supabase.rpc('get_cycle_progress');

        if (error) throw error;

        if (result && result.length > 0) {
          const row = result[0];
          setData({
            cycleId: row.cycle_id,
            cycleNumber: row.cycle_number,
            startDate: row.start_date,
            endDate: row.end_date,
            totalDays: row.total_days,
            currentDay: row.current_day,
            daysRemaining: row.days_remaining,
            progressPercentage: parseFloat(String(row.progress_percentage)) || 0,
            currentWeek: row.current_week,
            totalWeeks: row.total_weeks,
            loading: false,
            error: null,
          });
        } else {
          // No active cycle - show empty state
          setData(prev => ({
            ...prev,
            loading: false,
            error: null,
          }));
        }
      } catch (err) {
        console.error('Error fetching cycle progress:', err);
        setData(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load cycle progress',
        }));
      }
    };

    fetchCycleProgress();
  }, []);

  return data;
}
