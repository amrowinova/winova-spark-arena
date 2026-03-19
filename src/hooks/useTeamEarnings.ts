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
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data } = await supabase
        .from('transactions')
        .select('amount, created_at')
        .eq('user_id', user.id)
        .eq('type', 'team_earnings');

      if (!data) return;

      const total = data.reduce((sum, t) => sum + (t.amount || 0), 0);
      const thisMonth = data
        .filter(t => t.created_at >= startOfMonth)
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      const lastMonth = data
        .filter(t => t.created_at >= startOfLastMonth && t.created_at < endOfLastMonth)
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      setSummary({
        totalEarned: total,
        thisMonth,
        lastMonth,
        totalTransactions: data.length,
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
