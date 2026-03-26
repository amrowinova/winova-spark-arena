import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TeamEarningsSummary {
  totalEarned: number;
  thisMonth: number;
  lastMonth: number;
  totalTransactions: number;
}

export function useTeamEarnings() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<TeamEarningsSummary>({
    totalEarned: 0,
    thisMonth: 0,
    lastMonth: 0,
    totalTransactions: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_team_earnings_summary', {
        p_user_id: user.id,
      });

      if (error) throw error;
      if (!data) return;

      // RPC returns: { total_earned, today_earned, week_earned, month_earned, tx_count }
      setSummary({
        totalEarned: Number(data.total_earned ?? 0),
        thisMonth: Number(data.month_earned ?? 0),
        lastMonth: 0, // not provided by RPC; kept for interface compat
        totalTransactions: Number(data.tx_count ?? 0),
      });
    } catch (err) {
      console.error('useTeamEarnings error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { summary, loading, refresh: fetch };
}
