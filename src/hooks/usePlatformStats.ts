import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlatformStats {
  activeUsers:       number;
  completedContests: number;
  totalNovaPrizes:   number;
}

export interface LeaderboardEntry {
  rank:         number;
  user_id:      string;
  name:         string;
  username:     string;
  avatar_url:   string | null;
  country:      string;
  total_nova:   number;
  contest_count: number;
}

const STATS_REFRESH_MS = 60_000; // refresh every 60 s

export function usePlatformStats() {
  const [stats, setStats]       = useState<PlatformStats | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchStats = async () => {
      const { data } = await supabase.rpc('get_platform_stats');
      if (!mounted || !data) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        setStats({
          activeUsers:       Number(row.active_users)       ?? 0,
          completedContests: Number(row.completed_contests) ?? 0,
          totalNovaPrizes:   Number(row.total_nova_prizes)  ?? 0,
        });
      }
      setLoading(false);
    };

    fetchStats();
    const interval = setInterval(fetchStats, STATS_REFRESH_MS);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return { stats, isLoading };
}

export function usePublicLeaderboard(limit = 10) {
  const [entries, setEntries]   = useState<LeaderboardEntry[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .rpc('get_public_leaderboard', { p_limit: limit })
      .then(({ data }) => {
        if (data) setEntries(data as LeaderboardEntry[]);
        setLoading(false);
      });
  }, [limit]);

  return { entries, isLoading };
}
