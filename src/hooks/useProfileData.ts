import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useChatCleanup } from '@/hooks/useChatCleanup';

interface ProfileStats {
  contests: number;
  wins: number;
  votesGiven: number;
  votesReceived: number;
  luckyWins: number;
  followers: number;
  following: number;
}

interface P2PReputation {
  overallRating: number;
  totalTransactions: number;
  completedOrders: number;
  avgExecutionTime: string;
  disputeCount: number;
  positiveCount: number;
  negativeCount: number;
  recentComments: Array<{
    id: string;
    userName: string;
    comment: string;
    rating: 'positive' | 'negative';
    date: string;
    tags: string[];
  }>;
}

interface P2PRating {
  id: string;
  reviewerName: string;
  reviewerNameAr: string;
  reviewerAvatar?: string;
  rating: 'positive' | 'negative';
  comment: string;
  commentAr: string;
  tags: string[];
  tagsAr: string[];
  date: string;
  dateAr: string;
  reason?: string;
  reasonAr?: string;
}

export interface UseProfileDataOptions {
  autoFetch?: boolean;
}

export function useProfileData(options: UseProfileDataOptions = {}) {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const { addTimeout, cleanup } = useChatCleanup();
  const isRTL = t('profile.locale') === 'ar';

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<ProfileStats>({
    contests: 0,
    wins: 0,
    votesGiven: 0,
    votesReceived: 0,
    luckyWins: 0,
    followers: 0,
    following: 0,
  });
  const [p2pReputation, setP2pReputation] = useState<P2PReputation>({
    overallRating: 0,
    totalTransactions: 0,
    completedOrders: 0,
    avgExecutionTime: '-',
    disputeCount: 0,
    positiveCount: 0,
    negativeCount: 0,
    recentComments: [],
  });
  const [p2pRatings, setP2pRatings] = useState<P2PRating[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // Fetch user stats
  const fetchStats = useCallback(async () => {
    if (!authUser) return;

    try {
      // Fetch all stats in parallel
      const [
        contestCountResult,
        contestWinsResult,
        votesGivenResult,
        votesReceivedResult,
        luckyWinsResult,
        followersResult,
        followingResult
      ] = await Promise.all([
        supabase
          .from('contest_entries')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', authUser.id),
        supabase
          .from('contest_entries')
          .select('id, contest_id, prize_won, rank, created_at')
          .eq('user_id', authUser.id)
          .gt('prize_won', 0)
          .order('created_at', { ascending: false }),
        supabase
          .from('votes')
          .select('id', { count: 'exact', head: true })
          .eq('voter_id', authUser.id),
        supabase
          .from('votes')
          .select('id', { count: 'exact', head: true })
          .eq('contestant_id', authUser.id),
        supabase
          .from('wallet_ledger')
          .select('id, amount, created_at')
          .eq('user_id', authUser.id)
          .eq('entry_type', 'referral_bonus')
          .gt('amount', 0)
          .order('created_at', { ascending: false }),
        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', authUser.id),
        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('follower_id', authUser.id),
      ]);

      const { count: contestCount } = contestCountResult;
      const { data: contestWins } = contestWinsResult;
      const { count: votesGivenCount } = votesGivenResult;
      const { count: votesReceivedCount } = votesReceivedResult;
      const { data: luckyWinsData } = luckyWinsResult;
      const { count: followersCount } = followersResult;
      const { count: followingCount } = followingResult;

      setStats({
        contests: contestCount || 0,
        wins: contestWins?.length || 0,
        votesGiven: votesGivenCount || 0,
        votesReceived: votesReceivedCount || 0,
        luckyWins: luckyWinsData?.length || 0,
        followers: followersCount || 0,
        following: followingCount || 0,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      setError(error as Error);
    }
  }, [authUser]);

  // Fetch P2P reputation
  const fetchP2PReputation = useCallback(async () => {
    if (!authUser) return;

    try {
      const [reputationResult, ratingsResult] = await Promise.all([
        supabase
          .from('p2p_reputation')
          .select('*')
          .eq('user_id', authUser.id)
          .single(),
        supabase
          .from('p2p_ratings')
          .select('*')
          .eq('rated_user_id', authUser.id)
          .order('created_at', { ascending: false }),
      ]);

      if (reputationResult.data) {
        setP2pReputation({
          overallRating: reputationResult.data.overall_rating || 0,
          totalTransactions: reputationResult.data.total_transactions || 0,
          completedOrders: reputationResult.data.completed_orders || 0,
          avgExecutionTime: reputationResult.data.avg_execution_time || '-',
          disputeCount: reputationResult.data.dispute_count || 0,
          positiveCount: reputationResult.data.positive_count || 0,
          negativeCount: reputationResult.data.negative_count || 0,
          recentComments: [],
        });
      }

      if (ratingsResult.data) {
        setP2pRatings(ratingsResult.data.map((rating: any) => ({
          id: rating.id,
          reviewerName: rating.reviewer_name,
          reviewerNameAr: rating.reviewer_name_ar,
          reviewerAvatar: rating.reviewer_avatar,
          rating: rating.rating,
          comment: rating.comment,
          commentAr: rating.comment_ar,
          tags: rating.tags || [],
          tagsAr: rating.tags_ar || [],
          date: rating.created_at,
          dateAr: rating.created_at,
          reason: rating.reason,
          reasonAr: rating.reason_ar,
        })));
      }
    } catch (error) {
      console.error('Error fetching P2P reputation:', error);
      setError(error as Error);
    }
  }, [authUser]);

  // Auto-fetch on mount
  useEffect(() => {
    if (!options.autoFetch) return;
    
    if (!authUser) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        await Promise.all([fetchStats(), fetchP2PReputation()]);
      } catch (error) {
        setError(error as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [authUser, options.autoFetch, fetchStats, fetchP2PReputation]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // State
    isLoading,
    stats,
    p2pReputation,
    p2pRatings,
    error,
    isRTL,
    
    // Actions
    fetchStats,
    fetchP2PReputation,
    refresh: useCallback(() => {
      if (authUser) {
        return Promise.all([fetchStats(), fetchP2PReputation()]);
      }
    }, [authUser, fetchStats, fetchP2PReputation]),
    
    // Cleanup
    cleanup
  };
}
