import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DirectLeader {
  user_id: string;
  profile_id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  rank: string;
  country: string;
}

interface DirectLeaderResult {
  found: boolean;
  leader: DirectLeader | null;
}

/**
 * Hook to fetch the current user's direct leader (level=1) from team_members
 * This represents the person who recruited/referred them
 */
export function useDirectLeader() {
  const { user } = useAuth();
  const [leader, setLeader] = useState<DirectLeader | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeader = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_my_direct_leader', {
        p_user_id: user.id
      });

      if (rpcError) {
        console.error('Direct leader RPC error:', rpcError);
        throw rpcError;
      }

      const result = data as unknown as DirectLeaderResult;
      
      if (result?.found && result.leader) {
        setLeader(result.leader);
      } else {
        setLeader(null);
      }
    } catch (err) {
      console.error('Error fetching direct leader:', err);
      setError('Failed to load leader info');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchLeader();
  }, [fetchLeader]);

  return {
    leader,
    hasLeader: !!leader,
    loading,
    error,
    refresh: fetchLeader
  };
}
