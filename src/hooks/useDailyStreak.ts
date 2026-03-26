/**
 * useDailyStreak — Calls check_and_award_streak on mount (once per session).
 * Returns streak data and the result of today's check.
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface StreakResult {
  current_streak: number;
  longest_streak: number;
  reward: number;
  day_in_cycle: number;
  milestone: boolean;
  already_done: boolean;
}

interface UseStreakReturn {
  streak: StreakResult | null;
  loading: boolean;
  error: string | null;
}

const DAILY_STREAK_REWARDS = [1, 2, 3, 4, 5, 7, 10] as const;

export function useDailyStreak(): UseStreakReturn {
  const { user } = useAuth();
  const [streak, setStreak] = useState<StreakResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    const check = async () => {
      setLoading(true);
      try {
        const { data, error: rpcErr } = await supabase.rpc('check_and_award_streak');
        if (rpcErr) throw rpcErr;
        if (!cancelled) setStreak(data as StreakResult);
      } catch (err) {
        if (!cancelled) setError(String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void check();
    return () => { cancelled = true; };
  }, [user?.id]);

  return { streak, loading, error };
}

export { DAILY_STREAK_REWARDS };
