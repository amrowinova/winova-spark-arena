import { useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

const CACHE_KEY = (userId: string, depth: number) => ['team_hierarchy', userId, depth];
// 5 minutes stale time — hierarchy doesn't change second-by-second
const STALE_TIME = 5 * 60 * 1000;
// Keep unused data for 10 minutes before garbage-collecting
const GC_TIME = 10 * 60 * 1000;
// Debounce realtime refetches: wait 3s after last event before hitting DB
const REALTIME_DEBOUNCE_MS = 3000;

async function fetchHierarchy(userId: string, maxDepth: number): Promise<TeamMemberData[]> {
  const { data, error } = await supabase.rpc('get_team_hierarchy', {
    p_leader_id: userId,
    p_max_depth: maxDepth,
  });

  if (error) throw error;

  return (data || []).map((m: any) => ({
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
}

/**
 * Hook to fetch real team hierarchy from database.
 * Uses React Query for caching (5 min stale time) + debounced realtime subscription
 * to avoid hammering the DB on every new signup during viral growth.
 */
export function useTeamHierarchy(maxDepth: number = 5) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const membersRef = useRef<TeamMemberData[]>([]);

  const queryKey = user?.id ? CACHE_KEY(user.id, maxDepth) : null;

  const { data: members = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: queryKey ?? ['team_hierarchy_disabled'],
    queryFn: () => fetchHierarchy(user!.id, maxDepth),
    enabled: !!user?.id,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: 2,
  });

  membersRef.current = members;
  const error = queryError ? 'Failed to load team' : null;

  // Debounced invalidation — collapses bursts of realtime events into one refetch
  const scheduleRefetch = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (queryKey) queryClient.invalidateQueries({ queryKey });
    }, REALTIME_DEBOUNCE_MS);
  }, [queryClient, queryKey]);

  // Realtime: refresh when someone new is referred or a member's profile changes
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
          // Only fire when new user is a direct referral of this user
          filter: `referred_by=eq.${user.id}`,
        },
        scheduleRefetch
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `referred_by=eq.${user.id}`,
        },
        scheduleRefetch
      )
      .subscribe((status, err) => {
        if (err) console.error('[TeamHierarchy] realtime error:', err);
      });

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      channel.unsubscribe();
    };
  }, [user?.id, scheduleRefetch]);

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
    refresh: refetch,
  };
}
