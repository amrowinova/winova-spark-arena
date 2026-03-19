import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Send,
  Coins,
  Trophy,
  Target,
  Clover,
  Vote,
  MapPin,
  ThumbsUp,
  ThumbsDown,
  Star,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Share2,
  Loader2,
  UserPlus,
  UserMinus,
  Users
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TransferNovaDialog } from '@/components/wallet/TransferNovaDialog';
import { P2PRatingsSheet, type P2PRating } from '@/components/profile/P2PRatingsSheet';
import { UserWinsSection, type ContestWin, type LuckyWin, type UserWin } from '@/components/profile/UserWinsSection';
import { FollowersSheet } from '@/components/profile/FollowersSheet';
import { getCountryFlag } from '@/lib/countryFlags';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useFollows } from '@/hooks/useFollows';

// Real profile data type - from database
interface RealProfileData {
  id: string;
  user_id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  country: string;
  city: string | null;
  rank: 'subscriber' | 'marketer' | 'leader' | 'manager' | 'president';
  engagement_status: 'both' | 'contest' | 'vote' | 'none';
  activity_percentage: number;
  spotlight_points: number;
  referred_by: string | null;
}

// Stats from contest_entries
interface ProfileStats {
  contestsJoined: number;
  contestsWon: number;
  luckyWins: number;
  paidVotesReceived: number;
}

// P2P stats from p2p_orders - will be computed in future
interface P2PStats {
  rating: number;
  tradesCount: number;
  positiveCount: number;
  negativeCount: number;
}

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user: currentUser } = useAuth();
  const isRTL = language === 'ar';

  // State
  const [profile, setProfile] = useState<RealProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ contestsJoined: 0, contestsWon: 0, luckyWins: 0, paidVotesReceived: 0 });
  const [p2pStats, setP2pStats] = useState<P2PStats>({ rating: 0, tradesCount: 0, positiveCount: 0, negativeCount: 0 });
  const [wins, setWins] = useState<UserWin[]>([]);
  const [p2pRatings, setP2pRatings] = useState<P2PRating[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showRatingsSheet, setShowRatingsSheet] = useState(false);
  const [showFollowersSheet, setShowFollowersSheet] = useState(false);
  const [followersSheetTab, setFollowersSheetTab] = useState<'followers' | 'following'>('followers');
  const [teamLevel, setTeamLevel] = useState<number | null>(null);

  // Check if viewing own profile
  const isOwnProfile = currentUser?.id === userId;

  // Follow system
  const { 
    followersCount, 
    followingCount, 
    isFollowing, 
    isActionLoading: isFollowLoading,
    toggleFollow 
  } = useFollows(userId);

  // Fetch real profile data
  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (profileError) {
          if (profileError.code === 'PGRST116') {
            setError('user_not_found');
          } else {
            throw profileError;
          }
          return;
        }

        setProfile(profileData);

        // Check if viewed user is in current user's team hierarchy
        if (currentUser?.id && currentUser.id !== userId) {
          if (profileData.referred_by === currentUser.id) {
            setTeamLevel(1);
          } else {
            const { data: hierarchy } = await supabase.rpc('get_team_hierarchy', {
              p_leader_id: currentUser.id,
              p_max_depth: 5,
            });
            const found = (hierarchy || []).find((m: any) => m.member_id === userId);
            if (found) setTeamLevel(found.level);
          }
        }

        // Fetch contest entries for this user (stats)
        const { data: entries } = await supabase
          .from('contest_entries')
          .select('id, prize_won, rank')
          .eq('user_id', userId);

        const contestsJoined = entries?.length || 0;
        const contestsWon = entries?.filter(e => e.rank && e.rank <= 3).length || 0;

        // Fetch votes received (as contestant)
        const { count: votesReceived } = await supabase
          .from('votes')
          .select('id', { count: 'exact', head: true })
          .eq('contestant_id', userId);

        // Fetch lucky wins from wallet ledger (contest_win entries)
        const { count: luckyWinsCount } = await supabase
          .from('wallet_ledger')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('entry_type', 'contest_win');

        setStats({
          contestsJoined,
          contestsWon,
          luckyWins: luckyWinsCount || 0,
          paidVotesReceived: votesReceived || 0,
        });

        // Fetch contest wins for this user
        const { data: winEntries } = await supabase
          .from('contest_entries')
          .select(`
            id,
            prize_won,
            rank,
            contest_id,
            contests (
              id,
              title,
              title_ar,
              contest_date
            )
          `)
          .eq('user_id', userId)
          .not('rank', 'is', null)
          .lte('rank', 3)
          .order('created_at', { ascending: false })
          .limit(10);

        const userWins: UserWin[] = (winEntries || []).map((entry: any) => ({
          type: 'contest' as const,
          data: {
            id: entry.id,
            contestId: entry.contest_id,
            contestName: entry.contests?.title || 'Daily Contest',
            contestNameAr: entry.contests?.title_ar || 'مسابقة يومية',
            contestDate: entry.contests?.contest_date || '',
            position: entry.rank,
            prizeAmount: entry.prize_won || 0,
          } as ContestWin,
        }));
        setWins(userWins);

        // Fetch P2P stats (completed orders)
        const { data: p2pOrders } = await supabase
          .from('p2p_orders')
          .select('id, status')
          .or(`creator_id.eq.${userId},executor_id.eq.${userId}`)
          .eq('status', 'completed');

        const tradesCount = p2pOrders?.length || 0;
        // For now, assume 100% positive if they have trades, 0 otherwise
        setP2pStats({
          rating: tradesCount > 0 ? 100 : 0,
          tradesCount,
          positiveCount: tradesCount,
          negativeCount: 0,
        });

      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('load_error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleSendMessage = async () => {
    if (!userId) return;
    navigate('/chat', { state: { openDmWith: userId } });
  };

  const handleSendNova = () => {
    setShowTransferDialog(true);
  };

  const handleViewP2PRatings = () => {
    setShowRatingsSheet(true);
  };

  const handleShareProfile = async () => {
    if (!profile) return;
    
    const profileUrl = `${window.location.origin}/user/${userId}`;
    const shareText = language === 'ar' 
      ? `تحقق من ملف ${profile.name} على WINOVA`
      : `Check out ${profile.name}'s profile on WINOVA`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: language === 'ar' ? 'ملف شخصي - WINOVA' : 'Profile - WINOVA',
          text: shareText,
          url: profileUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          navigator.clipboard.writeText(profileUrl);
          toast.success(language === 'ar' ? 'تم نسخ الرابط' : 'Link copied');
        }
      }
    } else {
      navigator.clipboard.writeText(profileUrl);
      toast.success(language === 'ar' ? 'تم نسخ الرابط' : 'Link copied');
    }
  };

  const statsCards = useMemo(() => [
    {
      icon: Target,
      labelKey: 'publicProfile.stats.contestsJoined',
      value: stats.contestsJoined,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: Trophy,
      labelKey: 'publicProfile.stats.contestsWon',
      value: stats.contestsWon,
      color: 'text-nova',
      bgColor: 'bg-nova/10',
    },
    {
      icon: Clover,
      labelKey: 'publicProfile.stats.luckyWins',
      value: stats.luckyWins,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      icon: Vote,
      labelKey: 'publicProfile.stats.paidVotesReceived',
      value: stats.paidVotesReceived,
      color: 'text-aura',
      bgColor: 'bg-aura/10',
    },
  ], [stats]);

  // Loading state
  if (isLoading) {
    return (
      <AppLayout showHeader={false} showNav={false}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (error || !profile) {
    return (
      <AppLayout showHeader={false} showNav={false}>
        <div className="min-h-screen bg-background">
          <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border safe-top">
            <div className="flex items-center gap-3 px-4 py-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                {isRTL ? <ChevronRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
              </Button>
              <h1 className="text-lg font-semibold text-foreground">{t('publicProfile.title')}</h1>
            </div>
          </header>

          <div className="px-4 py-10 space-y-4">
            <Card className="border-border/50">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'المستخدم غير موجود' : 'User not found'}
                </p>
                <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
                  {language === 'ar' ? 'رجوع' : 'Back'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  const engagementStatus = profile.engagement_status;
  const isContestActive = engagementStatus === 'both' || engagementStatus === 'contest';
  const isVotingActive = engagementStatus === 'both' || engagementStatus === 'vote';

  return (
    <AppLayout showHeader={false} showNav={false}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background safe-top">
          <div className="flex items-center justify-between px-4 py-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              onClick={handleBack}
            >
              <ArrowLeft className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              onClick={handleShareProfile}
            >
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <div className="px-4 py-6 space-y-6 pb-28">
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center"
          >
            <Avatar className="h-24 w-24 border-4 border-primary/20">
              {profile.avatar_url && (
                <AvatarImage src={profile.avatar_url} alt={profile.name} />
              )}
              <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                {profile.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Name + Rank + Flag */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xl font-bold text-foreground">
                {profile.name}
              </span>
              {getCountryFlag(profile.country) && (
                <span className="text-lg">{getCountryFlag(profile.country)}</span>
              )}
              <Badge variant="secondary" className="text-xs">
                {t(`ranks.${profile.rank}`)}
              </Badge>
            </div>

            {/* Username */}
            <span className="text-muted-foreground mt-1">
              @{profile.username}
            </span>

            {/* Team Membership Badge */}
            {teamLevel !== null && !isOwnProfile && (
              <Badge
                variant="outline"
                className="mt-2 gap-1.5 bg-primary/10 text-primary border-primary/30 text-xs"
              >
                <Users className="h-3 w-3" />
                {teamLevel === 1
                  ? (language === 'ar' ? 'عضو مباشر في فريقي' : 'Direct Team Member')
                  : (language === 'ar' ? `مستوى ${teamLevel} في فريقي` : `Level ${teamLevel} in Your Team`)}
              </Badge>
            )}

            {/* Followers / Following Stats - Clickable */}
            <div className="mt-3 flex items-center gap-4">
              <button
                onClick={() => {
                  setFollowersSheetTab('followers');
                  setShowFollowersSheet(true);
                }}
                className="text-center hover:opacity-80 transition-opacity"
              >
                <span className="text-lg font-bold text-foreground">
                  {followersCount}
                </span>
                <span className="text-sm text-muted-foreground mx-1">
                  {language === 'ar' ? 'متابِع' : 'Followers'}
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
                  {followingCount}
                </span>
                <span className="text-sm text-muted-foreground mx-1">
                  {language === 'ar' ? 'يتابع' : 'Following'}
                </span>
              </button>
            </div>

            {/* Follow Button - Only for other users */}
            {!isOwnProfile && currentUser && (
              <Button
                variant={isFollowing ? "outline" : "default"}
                size="sm"
                className={cn(
                  "mt-3 gap-2",
                  isFollowing && "border-primary/50"
                )}
                onClick={toggleFollow}
                disabled={isFollowLoading}
              >
                {isFollowLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isFollowing ? (
                  <>
                    <UserMinus className="h-4 w-4" />
                    {language === 'ar' ? 'إلغاء المتابعة' : 'Unfollow'}
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    {language === 'ar' ? 'متابعة' : 'Follow'}
                  </>
                )}
              </Button>
            )}

            {/* Country / City */}
            {(profile.country || profile.city) && (
              <div className="mt-3 flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">
                  {profile.country}{profile.city ? ` · ${profile.city}` : ''}
                </span>
              </div>
            )}

            {/* Engagement Status */}
            <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
              <Badge 
                variant="outline"
                className={cn(
                  "text-xs",
                  isContestActive
                    ? "bg-success/15 text-success border-success/30"
                    : "bg-muted/50 text-muted-foreground border-border"
                )}
              >
                {isContestActive 
                  ? t('publicProfile.contestActive')
                  : t('publicProfile.contestInactive')
                }
              </Badge>
              <Badge 
                variant="outline"
                className={cn(
                  "text-xs",
                  isVotingActive
                    ? "bg-success/15 text-success border-success/30"
                    : "bg-muted/50 text-muted-foreground border-border"
                )}
              >
                {isVotingActive 
                  ? t('publicProfile.votingActive')
                  : t('publicProfile.votingInactive')
                }
              </Badge>
            </div>
          </motion.div>

          {/* Achievements Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-lg font-semibold mb-4">
              {isOwnProfile 
                ? (language === 'ar' ? 'إنجازاتي' : 'My Achievements')
                : (language === 'ar' ? 'إنجازاته' : 'Their Achievements')
              }
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {statsCards.map((stat) => (
                <Card key={stat.labelKey} className="border-border/50">
                  <CardContent className="p-4">
                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center mb-3", stat.bgColor)}>
                      <stat.icon className={cn("h-5 w-5", stat.color)} />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {t(stat.labelKey)}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          {/* Wins Section - Always visible with empty state */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            {wins.length > 0 ? (
              <UserWinsSection
                wins={wins}
                isOwnProfile={isOwnProfile}
                onViewMore={() => navigate('/winners')}
                onViewContest={(contestId) => navigate('/winners')}
              />
            ) : (
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="h-5 w-5 text-nova" />
                    {isOwnProfile 
                      ? (language === 'ar' ? 'انتصاراتي' : 'My Wins')
                      : (language === 'ar' ? 'انتصاراته' : 'Their Wins')
                    }
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6 text-muted-foreground">
                    <Trophy className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      {language === 'ar' ? 'لا توجد انتصارات بعد' : 'No wins yet'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.section>

          {/* P2P Reputation Section - Always visible with empty state */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-base">
                    <Star className="h-5 w-5 text-nova fill-nova" />
                    {isOwnProfile 
                      ? (language === 'ar' ? 'سمعتي P2P' : 'My P2P Reputation')
                      : (language === 'ar' ? 'سمعته P2P' : 'Their P2P Reputation')
                    }
                  </div>
                  <Badge variant="outline" className={cn(
                    "text-sm font-bold",
                    p2pStats.tradesCount > 0 ? "text-success" : "text-muted-foreground"
                  )}>
                    <Star className="h-3.5 w-3.5 mr-1 fill-current" />
                    {p2pStats.rating}%
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Rating Summary */}
                <div className="flex items-center justify-center gap-6 py-2">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-success">
                      <ThumbsUp className="h-5 w-5" />
                      <span className="text-xl font-bold">{p2pStats.positiveCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'إيجابي' : 'Positive'}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-destructive">
                      <ThumbsDown className="h-5 w-5" />
                      <span className="text-xl font-bold">{p2pStats.negativeCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'سلبي' : 'Negative'}
                    </p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg p-3 text-center bg-primary/10">
                    <span className="text-lg font-bold text-foreground">{p2pStats.tradesCount}</span>
                    <p className="text-[10px] text-muted-foreground">
                      {language === 'ar' ? 'عدد الصفقات' : 'Total Deals'}
                    </p>
                  </div>
                  <div className="rounded-lg p-3 text-center bg-success/10">
                    <span className="text-lg font-bold text-foreground">{p2pStats.tradesCount}</span>
                    <p className="text-[10px] text-muted-foreground">
                      {language === 'ar' ? 'طلبات مكتملة' : 'Completed'}
                    </p>
                  </div>
                </div>

                {/* Empty state message if no trades */}
                {p2pStats.tradesCount === 0 && (
                  <p className="text-center text-xs text-muted-foreground">
                    {language === 'ar' ? 'لا توجد صفقات بعد' : 'No trades yet'}
                  </p>
                )}

                {/* View Ratings - only if there are ratings */}
                {p2pRatings.length > 0 && (
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={handleViewP2PRatings}
                  >
                    <MessageSquare className="h-4 w-4" />
                    {language === 'ar' ? 'عرض التقييمات' : 'View Ratings'}
                    {isRTL ? (
                      <ChevronLeft className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.section>
        </div>

        {/* Fixed Action Buttons - Only for other users */}
        {!isOwnProfile && (
          <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border p-4 safe-bottom">
            <div className="flex gap-3 max-w-lg mx-auto">
              <Button 
                variant="outline" 
                className="flex-1 gap-2"
                onClick={handleSendMessage}
              >
                <Send className="h-4 w-4" />
                {t('publicProfile.sendMessage')}
              </Button>
              <Button 
                className="flex-1 gap-2 bg-nova text-nova-foreground hover:bg-nova/90"
                onClick={handleSendNova}
              >
                <Coins className="h-4 w-4" />
                {t('publicProfile.sendNova')}
              </Button>
            </div>
          </div>
        )}

        {/* Nova Transfer Dialog */}
        <TransferNovaDialog
          open={showTransferDialog}
          onClose={() => setShowTransferDialog(false)}
          recipientId={profile.user_id}
          recipientName={profile.name}
          recipientUsername={profile.username}
          recipientCountry={profile.country}
          recipientAvatar={profile.avatar_url || undefined}
        />

        {/* P2P Ratings Sheet */}
        <P2PRatingsSheet
          open={showRatingsSheet}
          onClose={() => setShowRatingsSheet(false)}
          ratings={p2pRatings}
          positiveCount={p2pStats.positiveCount}
          negativeCount={p2pStats.negativeCount}
        />

        {/* Followers/Following Sheet */}
        {userId && (
          <FollowersSheet
            open={showFollowersSheet}
            onOpenChange={setShowFollowersSheet}
            userId={userId}
            initialTab={followersSheetTab}
          />
        )}
      </div>
    </AppLayout>
  );
}