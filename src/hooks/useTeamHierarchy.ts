import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TeamMemberData {
  member_id: string;
  level: number;
  name: string;
  username: string;
  avatar_url: string | null;
  rank: string;
  weekly_active: boolean;
  active_weeks: number;
  direct_count: number;
  parent_id: string;
}

/**
 * Hook to fetch real team hierarchy from database
 * Uses get_team_hierarchy RPC for production-ready data
 */
export function useTeamHierarchy(maxDepth: number = 5) {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Call real RPC to get team hierarchy from database
      const { data, error: rpcError } = await supabase.rpc('get_team_hierarchy', {
        p_leader_id: user.id,
        p_max_depth: maxDepth
      });

      if (rpcError) {
        console.error('Team hierarchy RPC error:', rpcError);
        throw rpcError;
      }

      // Map the response to our interface
      const mappedMembers: TeamMemberData[] = (data || []).map((m: any) => ({
        member_id: m.member_id,
        level: m.level,
        name: m.name || 'Unknown',
        username: m.username || 'unknown',
        avatar_url: m.avatar_url,
        rank: m.rank || 'subscriber',
        weekly_active: m.weekly_active || false,
        active_weeks: m.active_weeks || 0,
        direct_count: Number(m.direct_count) || 0,
        parent_id: m.parent_id
      }));

      setMembers(mappedMembers);
    } catch (err) {
      console.error('Error fetching team hierarchy:', err);
      setError('Failed to load team');
    } finally {
      setLoading(false);
    }
  }, [user?.id, maxDepth]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  // Computed values - ALL DERIVED FROM REAL DATABASE DATA
  const directMembers = members.filter(m => m.level === 1);
  const indirectMembers = members.filter(m => m.level > 1);
  
  const totalCount = members.length;
  const directCount = directMembers.length;
  const indirectCount = indirectMembers.length;
  
  const activeDirectCount = directMembers.filter(m => m.weekly_active).length;
  const activeIndirectCount = indirectMembers.filter(m => m.weekly_active).length;

  // Get indirect members by their parent (for viewing sub-teams)
  const getIndirectByParent = (parentId: string) => {
    return members.filter(m => m.parent_id === parentId && m.level > 1);
  };

  return {
    members,
    directMembers,
    indirectMembers,
    totalCount,
    directCount,
    indirectCount,
    activeDirectCount,
    activeIndirectCount,
    getIndirectByParent,
    loading,
    error,
    refresh: fetchTeam
  };
}
