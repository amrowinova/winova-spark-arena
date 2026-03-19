import { useState, useEffect, useCallback, useRef } from 'react';
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
 * Hook to fetch real team hierarchy from database.
 * Uses get_team_hierarchy RPC + realtime subscription on profiles table
 * to detect new members joining without requiring a manual refresh.
 */
export function useTeamHierarchy(maxDepth: number = 5) {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const membersRef = useRef<TeamMemberData[]>([]);
  membersRef.current = members;

  const fetchTeam = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_team_hierarchy', {
        p_leader_id: user.id,
        p_max_depth: maxDepth,
      });

      if (rpcError) {
        console.error('Team hierarchy RPC error:', rpcError);
        throw rpcError;
      }

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
        parent_id: m.parent_id,
      }));

      setMembers(mappedMembers);
    } catch (err) {
      console.error('Error fetching team hierarchy:', err);
      setError('Failed to load team');
    } finally {
      setLoading(false);
    }
  }, [user?.id, maxDepth]);

  // Initial fetch
  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  // Real-time: refresh when someone new is referred (referred_by changes)
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`team_realtime_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          // New profile created — could be a new team member; re-fetch
          fetchTeam();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `referred_by=eq.${user.id}`,
        },
        () => {
          // Direct member's profile updated (rank, activity) — re-fetch
          fetchTeam();
        }
      )
      .subscribe((status, err) => {
        if (err) console.error('[TeamHierarchy] realtime error:', err);
      });

    return () => { channel.unsubscribe(); };
  }, [user?.id, fetchTeam]);

  // Computed values
  const directMembers   = members.filter(m => m.level === 1);
  const indirectMembers = members.filter(m => m.level > 1);
  const totalCount      = members.length;
  const directCount     = directMembers.length;
  const indirectCount   = indirectMembers.length;
  const activeDirectCount   = directMembers.filter(m => m.weekly_active).length;
  const activeIndirectCount = indirectMembers.filter(m => m.weekly_active).length;

  /** Members directly under a given parent (for sub-team drill-down) */
  const getIndirectByParent = (parentId: string) =>
    members.filter(m => m.parent_id === parentId && m.level > 1);

  /** Quick O(1) check: is this userId anywhere in my hierarchy? */
  const isInMyTeam = (userId: string): TeamMemberData | undefined =>
    membersRef.current.find(m => m.member_id === userId);

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
    isInMyTeam,
    loading,
    error,
    refresh: fetchTeam,
  };
}
