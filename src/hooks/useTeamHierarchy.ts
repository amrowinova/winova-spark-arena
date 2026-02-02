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

      const { data, error: rpcError } = await supabase.rpc('get_team_hierarchy', {
        p_leader_id: user.id,
        p_max_depth: maxDepth
      });

      if (rpcError) throw rpcError;

      setMembers((data || []) as TeamMemberData[]);
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

  // Computed values
  const directMembers = members.filter(m => m.level === 1);
  const indirectMembers = members.filter(m => m.level > 1);
  
  const totalCount = members.length;
  const directCount = directMembers.length;
  const indirectCount = indirectMembers.length;
  
  const activeDirectCount = directMembers.filter(m => m.weekly_active).length;
  const activeIndirectCount = indirectMembers.filter(m => m.weekly_active).length;

  // Group indirect members by their parent
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
