import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FollowStats {
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}

export function useFollows(targetUserId: string | undefined) {
  const { user: currentUser } = useAuth();
  const [stats, setStats] = useState<FollowStats>({
    followersCount: 0,
    followingCount: 0,
    isFollowing: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Fetch follow stats
  const fetchStats = useCallback(async () => {
    if (!targetUserId) return;

    try {
      // Get followers count (people following this user)
      const { count: followersCount } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', targetUserId);

      // Get following count (people this user follows)
      const { count: followingCount } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('follower_id', targetUserId);

      // Check if current user is following
      let isFollowing = false;
      if (currentUser?.id && currentUser.id !== targetUserId) {
        const { data } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', currentUser.id)
          .eq('following_id', targetUserId)
          .maybeSingle();
        isFollowing = !!data;
      }

      setStats({
        followersCount: followersCount || 0,
        followingCount: followingCount || 0,
        isFollowing,
      });
    } catch (error) {
      console.error('Error fetching follow stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId, currentUser?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Follow user
  const follow = useCallback(async () => {
    if (!currentUser?.id || !targetUserId || currentUser.id === targetUserId) return;

    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: currentUser.id,
          following_id: targetUserId,
        });

      if (error) {
        if (error.code === '23505') {
          // Already following
          console.log('Already following this user');
        } else {
          throw error;
        }
      }

      // Update local state optimistically
      setStats(prev => ({
        ...prev,
        followersCount: prev.followersCount + 1,
        isFollowing: true,
      }));
    } catch (error) {
      console.error('Error following user:', error);
    } finally {
      setIsActionLoading(false);
    }
  }, [currentUser?.id, targetUserId]);

  // Unfollow user
  const unfollow = useCallback(async () => {
    if (!currentUser?.id || !targetUserId) return;

    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', targetUserId);

      if (error) throw error;

      // Update local state optimistically
      setStats(prev => ({
        ...prev,
        followersCount: Math.max(0, prev.followersCount - 1),
        isFollowing: false,
      }));
    } catch (error) {
      console.error('Error unfollowing user:', error);
    } finally {
      setIsActionLoading(false);
    }
  }, [currentUser?.id, targetUserId]);

  // Toggle follow
  const toggleFollow = useCallback(async () => {
    if (stats.isFollowing) {
      await unfollow();
    } else {
      await follow();
    }
  }, [stats.isFollowing, follow, unfollow]);

  return {
    ...stats,
    isLoading,
    isActionLoading,
    follow,
    unfollow,
    toggleFollow,
    refetch: fetchStats,
  };
}
