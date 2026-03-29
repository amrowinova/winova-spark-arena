import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { P2PReputationCard } from '@/components/profile/P2PReputationCard';

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

interface ProfileSettingsProps {
  isOwnProfile?: boolean;
  isLoading?: boolean;
  onViewAllRatings?: () => void;
}

export function ProfileSettings({
  isOwnProfile = true,
  isLoading = false,
  onViewAllRatings
}: ProfileSettingsProps) {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
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
  const [reputationLoading, setReputationLoading] = useState(true);

  useEffect(() => {
    async function fetchP2PReputation() {
      if (!authUser) {
        setReputationLoading(false);
        return;
      }

      try {
        // Fetch P2P reputation data
        const { data: reputationData } = await supabase
          .from('p2p_reputation')
          .select('*')
          .eq('user_id', authUser.id)
          .single();

        // Fetch P2P ratings
        const { data: ratingsData } = await supabase
          .from('p2p_ratings')
          .select('*')
          .eq('rated_user_id', authUser.id)
          .order('created_at', { ascending: false });

        if (reputationData) {
          setP2pReputation({
            overallRating: reputationData.overall_rating || 0,
            totalTransactions: reputationData.total_transactions || 0,
            completedOrders: reputationData.completed_orders || 0,
            avgExecutionTime: reputationData.avg_execution_time || '-',
            disputeCount: reputationData.dispute_count || 0,
            positiveCount: reputationData.positive_count || 0,
            negativeCount: reputationData.negative_count || 0,
            recentComments: [],
          });
        }

        if (ratingsData) {
          setP2pRatings(ratingsData.map((rating: any) => ({
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
      } finally {
        setReputationLoading(false);
      }
    }

    fetchP2PReputation();
  }, [authUser]);

  if (reputationLoading || isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Skeleton className="h-64 w-full rounded-lg" />
      </motion.div>
    );
  }

  // Only show P2P reputation if there are transactions
  if (p2pReputation.totalTransactions === 0) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <P2PReputationCard 
        reputation={p2pReputation}
        isOwnProfile={isOwnProfile}
        onViewAllRatings={onViewAllRatings || (() => {})}
      />
    </motion.section>
  );
}
