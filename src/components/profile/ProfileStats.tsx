import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { ProfileStatsSection } from '@/components/profile/ProfileStatsSection';

interface ProfileStatsProps {
  weeklyStreak?: number;
  isOwnProfile?: boolean;
  isLoading?: boolean;
}

interface ProfileStatsData {
  contests: number;
  wins: number;
  votesGiven: number;
  votesReceived: number;
  luckyWins: number;
  followers: number;
  following: number;
}

export function ProfileStats({
  weeklyStreak = 0,
  isOwnProfile = true,
  isLoading = false
}: ProfileStatsProps) {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const [stats, setStats] = useState<ProfileStatsData>({
    contests: 0,
    wins: 0,
    votesGiven: 0,
    votesReceived: 0,
    luckyWins: 0,
    followers: 0,
    following: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    async function fetchUserStats() {
      if (!authUser) {
        setStatsLoading(false);
        return;
      }

      try {
        // Fetch contest participation count
        const { count: contestCount } = await supabase
          .from('contest_entries')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', authUser.id);

        // Fetch contest wins (prize_won > 0)
        const { data: contestWins } = await supabase
          .from('contest_entries')
          .select('id, contest_id, prize_won, rank, created_at')
          .eq('user_id', authUser.id)
          .gt('prize_won', 0)
          .order('created_at', { ascending: false });

        // Fetch votes given by user
        const { count: votesGivenCount } = await supabase
          .from('votes')
          .select('id', { count: 'exact', head: true })
          .eq('voter_id', authUser.id);

        // Fetch votes received by user
        const { count: votesReceivedCount } = await supabase
          .from('votes')
          .select('id', { count: 'exact', head: true })
          .eq('contestant_id', authUser.id);

        // Fetch lucky wins from ledger (referral bonuses)
        const { data: luckyWinsData } = await supabase
          .from('wallet_ledger')
          .select('id, amount, created_at')
          .eq('user_id', authUser.id)
          .eq('entry_type', 'referral_bonus')
          .gt('amount', 0)
          .order('created_at', { ascending: false });

        // Fetch followers count (people following this user)
        const { count: followersCount } = await supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', authUser.id);

        // Fetch following count (people this user follows)
        const { count: followingCount } = await supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('follower_id', authUser.id);

        // Set stats
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
      } finally {
        setStatsLoading(false);
      }
    }

    fetchUserStats();
  }, [authUser]);

  if (statsLoading || isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <Skeleton className="h-32 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <ProfileStatsSection
        stats={stats}
        weeklyStreak={weeklyStreak}
        isOwnProfile={isOwnProfile}
      />
    </motion.section>
  );
}
