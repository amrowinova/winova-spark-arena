import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { UserWinsSection } from '@/components/profile/UserWinsSection';
import type { UserWin, ContestWin, LuckyWin } from '@/components/profile/UserWinsSection';

interface ProfileWinsProps {
  isOwnProfile?: boolean;
  isLoading?: boolean;
  onViewContest?: (contestId: string) => void;
}

export function ProfileWins({
  isOwnProfile = true,
  isLoading = false,
  onViewContest
}: ProfileWinsProps) {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const [wins, setWins] = useState<UserWin[]>([]);
  const [winsLoading, setWinsLoading] = useState(true);
  const isRTL = t('profile.locale') === 'ar';

  useEffect(() => {
    async function fetchUserWins() {
      if (!authUser) {
        setWinsLoading(false);
        return;
      }

      try {
        const winsArray: UserWin[] = [];

        // Fetch contest wins
        const { data: contestWins } = await supabase
          .from('contest_entries')
          .select(`
            id,
            contest_id,
            prize_won,
            rank,
            created_at,
            contests!inner(
              id,
              title,
              title_ar,
              image,
              category,
              end_date
            )
          `)
          .eq('user_id', authUser.id)
          .gt('prize_won', 0)
          .order('created_at', { ascending: false });

        // Add contest wins
        if (contestWins) {
          const contestWinsData: UserWin[] = contestWins.map((entry: any) => ({
            type: 'contest' as const,
            data: {
              id: entry.id,
              contestId: entry.contest_id,
              contestName: isRTL ? entry.contests.title_ar : entry.contests.title,
              contestNameAr: entry.contests.title_ar,
              contestDate: entry.created_at,
              position: entry.rank as 1 | 2 | 3 | 4 | 5,
              prizeAmount: entry.prize_won,
            }
          }));
          winsArray.push(...contestWinsData);
        }

        // Fetch lucky wins from ledger (referral bonuses)
        const { data: luckyWinsData } = await supabase
          .from('wallet_ledger')
          .select('id, amount, created_at, description')
          .eq('user_id', authUser.id)
          .eq('entry_type', 'referral_bonus')
          .gt('amount', 0)
          .order('created_at', { ascending: false });

        // Add lucky wins
        if (luckyWinsData) {
          const luckyWins: UserWin[] = luckyWinsData.map((entry: any) => ({
            type: 'lucky' as const,
            data: {
              id: entry.id,
              date: entry.created_at,
              prizeAmount: entry.amount,
              isToday: false,
            }
          }));
          winsArray.push(...luckyWins);
        }

        // Sort by date (most recent first)
        winsArray.sort((a, b) => {
          const dateA = new Date(a.type === 'contest' ? a.data.contestDate : a.data.date).getTime();
          const dateB = new Date(b.type === 'contest' ? b.data.contestDate : b.data.date).getTime();
          return dateB - dateA;
        });
        setWins(winsArray);
      } catch (error) {
        console.error('Error fetching user wins:', error);
      } finally {
        setWinsLoading(false);
      }
    }

    fetchUserWins();
  }, [authUser, isRTL]);

  if (winsLoading || isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Skeleton className="h-48 w-full rounded-lg" />
      </motion.div>
    );
  }

  if (wins.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center py-8 px-4 bg-muted/30 rounded-xl border border-border"
      >
        <p className="text-muted-foreground">
          {isRTL ? '🏆 لم تفز بعد — شارك في المسابقات!' : '🏆 No wins yet — join contests!'}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <UserWinsSection 
        wins={wins}
        isOwnProfile={isOwnProfile}
        onViewContest={onViewContest || (() => {})}
      />
    </motion.section>
  );
}
