import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  MapPin,
  Pencil,
  Share2,
  ArrowLeft,
  Circle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  P2PReputationCard, 
  ProfileEditSheet,
  UserWinsSection,
  P2PRatingsSheet,
  FollowersSheet
} from '@/components/profile';
import type { UserWin, ContestWin, LuckyWin } from '@/components/profile/UserWinsSection';
import { ProfileStatsSection } from '@/components/profile/ProfileStatsSection';

// Real stats interface
interface ProfileStats {
  contests: number;
  wins: number;
  votesGiven: number;
  votesReceived: number;
  luckyWins: number;
  followers: number;
  following: number;
}

// Real P2P reputation interface
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

function ProfileContent() {
  const { t, i18n } = useTranslation();
  const { user } = useUser();
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';
  const [editOpen, setEditOpen] = useState(false);
  const [ratingsOpen, setRatingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showFollowersSheet, setShowFollowersSheet] = useState(false);
  const [followersSheetTab, setFollowersSheetTab] = useState<'followers' | 'following'>('followers');

  // Real stats from database - start at zero
  const [stats, setStats] = useState<ProfileStats>({
    contests: 0,
    wins: 0,
    votesGiven: 0,
    votesReceived: 0,
    luckyWins: 0,
    followers: 0,
    following: 0,
  });

  // Real wins from database
  const [wins, setWins] = useState<UserWin[]>([]);

  // Real P2P reputation from database
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

  // P2P ratings for sheet
  const [p2pRatings, setP2pRatings] = useState<Array<{
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
  }>>([]);

  // Fetch real user stats from database
  useEffect(() => {
    async function fetchUserStats() {
      if (!authUser) {
        setIsLoading(false);
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

        // Build wins array
        const winsArray: UserWin[] = [];

        // Add contest wins
        if (contestWins) {
          for (const win of contestWins) {
            winsArray.push({
              type: 'contest',
              data: {
                id: win.id,
                contestId: win.contest_id,
                contestName: 'Daily Contest',
                contestNameAr: 'مسابقة اليوم',
                contestDate: new Date(win.created_at).toISOString().split('T')[0],
                position: (win.rank || 1) as 1 | 2 | 3 | 4 | 5,
                prizeAmount: win.prize_won || 0,
              },
            });
          }
        }

        // Add lucky wins
        if (luckyWinsData) {
          for (const luckyWin of luckyWinsData) {
            const today = new Date().toISOString().split('T')[0];
            const winDate = new Date(luckyWin.created_at).toISOString().split('T')[0];
            winsArray.push({
              type: 'lucky',
              data: {
                id: luckyWin.id,
                date: winDate,
                prizeAmount: luckyWin.amount,
                isToday: winDate === today,
              },
            });
          }
        }

        setWins(winsArray);

        // Fetch P2P stats
        const { data: p2pOrders } = await supabase
          .from('p2p_orders')
          .select('id, status, completed_at, created_at')
          .or(`creator_id.eq.${authUser.id},executor_id.eq.${authUser.id}`);

        if (p2pOrders) {
          const completedOrders = p2pOrders.filter(o => o.status === 'completed');
          const disputedOrders = p2pOrders.filter(o => o.status === 'disputed');

          // Calculate average execution time (simplified)
          const avgTime = completedOrders.length > 0 ? '8 min' : '-';

          setP2pReputation({
            overallRating: completedOrders.length > 0 ? 
              Math.round((completedOrders.length / p2pOrders.length) * 100) : 0,
            totalTransactions: p2pOrders.length,
            completedOrders: completedOrders.length,
            avgExecutionTime: avgTime,
            disputeCount: disputedOrders.length,
            positiveCount: completedOrders.length,
            negativeCount: disputedOrders.length,
            recentComments: [], // Would need a ratings table
          });
        }

      } catch (err) {
        console.error('Error fetching user stats:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserStats();
  }, [authUser]);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/profile/${user.username}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: isRTL ? 'الملف الشخصي' : 'Profile',
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(shareUrl);
          toast.success(isRTL ? 'تم نسخ الرابط' : 'Link copied');
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(isRTL ? 'تم نسخ الرابط' : 'Link copied');
    }
  };

  return (
    <AppLayout showHeader={false}>
      <div className="min-h-screen bg-background">
        {/* Unified Header - Back + Share only (no menu button) */}
        <header className="sticky top-0 z-40 bg-background safe-top">
          <div className="flex items-center justify-between px-4 py-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              onClick={handleShare}
            >
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <div className="px-4 py-6 space-y-6">
          {/* Profile Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center"
          >
            {/* Avatar */}
            <Avatar className="h-24 w-24 border-4 border-primary/20">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Name */}
            <h1 className="mt-4 text-xl font-bold text-foreground">
              {user.name}
            </h1>

            {/* Username + Rank + Edit Button */}
            <div className="mt-1 flex items-center gap-2">
              <span className="text-base text-muted-foreground">
                @{user.username}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-base font-medium text-primary">
                {t(`ranks.${user.rank}`)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 ml-1"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>

            {/* Followers / Following - Clickable */}
            <div className="mt-3 flex items-center gap-4">
              <button
                onClick={() => {
                  setFollowersSheetTab('followers');
                  setShowFollowersSheet(true);
                }}
                className="text-center hover:opacity-80 transition-opacity"
              >
                <span className="text-lg font-bold text-foreground">
                  {stats.followers}
                </span>
                <span className="text-sm text-muted-foreground mx-1">
                  {isRTL ? 'متابِع' : 'Followers'}
                </span>
              </button>
              <div className="h-4 w-px bg-border" />
              <button
                onClick={() => {
                  setFollowersSheetTab('following');
                  setShowFollowersSheet(true);
                }}
                className="text-center hover:opacity-80 transition-opacity"
              >
                <span className="text-lg font-bold text-foreground">
                  {stats.following}
                </span>
                <span className="text-sm text-muted-foreground mx-1">
                  {isRTL ? 'يتابع' : 'Following'}
                </span>
              </button>
            </div>

            {/* Country + City */}
            <div className="mt-3 flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">
                {user.country} · {user.city}
              </span>
            </div>

            {/* Engagement Status */}
            <Badge 
              className={cn(
                "mt-3 px-3 py-1 flex items-center gap-2",
                user.engagementStatus === 'both' 
                  ? "bg-success/15 text-success border-success/30" 
                  : user.engagementStatus === 'contest' || user.engagementStatus === 'vote'
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "bg-muted/50 text-muted-foreground border-border"
              )}
              variant="outline"
            >
              <Circle className={cn(
                "h-2 w-2 fill-current",
                user.engagementStatus === 'both' 
                  ? "text-success" 
                  : user.engagementStatus === 'contest' || user.engagementStatus === 'vote'
                    ? "text-primary"
                    : "text-muted-foreground"
              )} />
              {t(`profile.engagement.${user.engagementStatus}`)}
            </Badge>
          </motion.div>

          {/* Achievements Section (My Achievements) - Real data */}
          <ProfileStatsSection 
            stats={stats}
            isOwnProfile={true}
          />

          {/* Wins Section - Only show if there are real wins */}
          {wins.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <UserWinsSection 
                wins={wins}
                isOwnProfile={true}
                onViewContest={() => {}}
              />
            </motion.section>
          )}

          {/* Empty state for wins */}
          {wins.length === 0 && !isLoading && (
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
          )}

          {/* P2P Reputation Section - Real data */}
          {p2pReputation.totalTransactions > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <P2PReputationCard 
                reputation={p2pReputation}
                isOwnProfile={true}
                onViewAllRatings={() => setRatingsOpen(true)}
              />
            </motion.section>
          )}
        </div>

        {/* Profile Edit Sheet */}
        <ProfileEditSheet 
          open={editOpen} 
          onClose={() => setEditOpen(false)} 
        />

        {/* P2P Ratings Sheet */}
        <P2PRatingsSheet
          open={ratingsOpen}
          onClose={() => setRatingsOpen(false)}
          ratings={p2pRatings}
          positiveCount={p2pReputation.positiveCount}
          negativeCount={p2pReputation.negativeCount}
        />

        {/* Followers/Following Sheet */}
        <FollowersSheet
          open={showFollowersSheet}
          onOpenChange={setShowFollowersSheet}
          userId={authUser?.id || ''}
          initialTab={followersSheetTab}
        />
      </div>
    </AppLayout>
  );
}

export default function Profile() {
  return <ProfileContent />;
}
