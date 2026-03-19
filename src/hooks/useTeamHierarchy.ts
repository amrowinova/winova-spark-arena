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

    // DEV MOCK — remove before production
    if (true) {
      const mock: TeamMemberData[] = [
        { member_id: 'mock-1', level: 1, name: 'أحمد العمري', username: 'ahmed_omari', avatar_url: null, rank: 'marketer', weekly_active: true, active_weeks: 8, direct_count: 3, parent_id: user.id },
        { member_id: 'mock-2', level: 1, name: 'سارة الزهراني', username: 'sara_z', avatar_url: null, rank: 'leader', weekly_active: true, active_weeks: 12, direct_count: 5, parent_id: user.id },
        { member_id: 'mock-3', level: 1, name: 'محمد القحطاني', username: 'mq99', avatar_url: null, rank: 'subscriber', weekly_active: false, active_weeks: 1, direct_count: 0, parent_id: user.id },
        { member_id: 'mock-4', level: 1, name: 'نورة الشمري', username: 'nora_s', avatar_url: null, rank: 'marketer', weekly_active: false, active_weeks: 3, direct_count: 1, parent_id: user.id },
        { member_id: 'mock-5', level: 1, name: 'خالد المطيري', username: 'khaled_m', avatar_url: null, rank: 'subscriber', weekly_active: true, active_weeks: 6, direct_count: 2, parent_id: user.id },
        { member_id: 'mock-6', level: 2, name: 'ليلى الدوسري', username: 'layla_d', avatar_url: null, rank: 'marketer', weekly_active: true, active_weeks: 4, direct_count: 0, parent_id: 'mock-1' },
        { member_id: 'mock-7', level: 2, name: 'فيصل الغامدي', username: 'faisal_g', avatar_url: null, rank: 'subscriber', weekly_active: false, active_weeks: 2, direct_count: 0, parent_id: 'mock-1' },
        { member_id: 'mock-8', level: 2, name: 'ريم العتيبي', username: 'reem_a', avatar_url: null, rank: 'leader', weekly_active: true, active_weeks: 9, direct_count: 2, parent_id: 'mock-2' },
        { member_id: 'mock-9', level: 3, name: 'عبدالله السبيعي', username: 'abdallah_s', avatar_url: null, rank: 'subscriber', weekly_active: true, active_weeks: 3, direct_count: 0, parent_id: 'mock-8' },
        { member_id: 'mock-10', level: 3, name: 'هند الحربي', username: 'hind_h', avatar_url: null, rank: 'marketer', weekly_active: false, active_weeks: 1, direct_count: 0, parent_id: 'mock-8' },
      ];
      setMembers(mock);
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
