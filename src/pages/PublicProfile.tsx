import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  ArrowRight,
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
  UserPlus,
  UserMinus,
  ChevronRight,
  ChevronLeft,
  MessageSquare
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { CurrencyBadge } from '@/components/common/CurrencyBadge';
import { TransferNovaDialog } from '@/components/wallet/TransferNovaDialog';
import { P2PRatingsSheet, type P2PRating } from '@/components/profile/P2PRatingsSheet';
import { UserWinsSection, type ContestWin } from '@/components/profile/UserWinsSection';
import { getPlatformUserById, type PlatformUser } from '@/lib/platformUsers';

type PublicProfileUser = {
  id: string;
  name: string;
  nameAr: string;
  username: string;
  avatar: string;
  rank: PlatformUser["rank"];
  country: string;
  countryAr: string;
  city: string;
  cityAr: string;
  isOnline: boolean;
  lastSeen?: string;
  lastSeenAr?: string;
  contestEngagement: 'active' | 'inactive';
  votingEngagement: 'active' | 'inactive';
  followers: number;
  following: number;
  isFollowedByMe: boolean;
  stats: {
    contestsJoined: number;
    contestsWon: number;
    luckyWins: number;
    paidVotesReceived: number;
  };
  wins: ContestWin[];
  p2p: {
    rating: number;
    tradesCount: number;
    positiveCount: number;
    negativeCount: number;
    ratings: P2PRating[];
  };
};

const getEngagement = (status?: PlatformUser["engagementStatus"]) => {
  const contest = status === 'both' || status === 'contest';
  const vote = status === 'both' || status === 'vote';
  return {
    contestEngagement: contest ? ('active' as const) : ('inactive' as const),
    votingEngagement: vote ? ('active' as const) : ('inactive' as const),
  };
};

// Mock P2P ratings data
const mockP2PRatings: P2PRating[] = [
  {
    id: '1',
    reviewerName: 'Sara Ahmed',
    reviewerNameAr: 'سارة أحمد',
    rating: 'positive',
    comment: 'Fast and reliable trader!',
    commentAr: 'تاجر سريع وموثوق!',
    tags: ['Fast', 'Trustworthy'],
    tagsAr: ['سريع', 'موثوق'],
    date: '2 days ago',
    dateAr: 'منذ يومين',
  },
  {
    id: '2',
    reviewerName: 'Mohammed Karim',
    reviewerNameAr: 'محمد كريم',
    rating: 'positive',
    comment: 'Great communication',
    commentAr: 'تواصل ممتاز',
    tags: ['Friendly'],
    tagsAr: ['ودود'],
    date: '5 days ago',
    dateAr: 'منذ 5 أيام',
  },
  {
    id: '3',
    reviewerName: 'Khaled M',
    reviewerNameAr: 'خالد م',
    rating: 'negative',
    comment: 'Slow response time',
    commentAr: 'وقت استجابة بطيء',
    reason: 'Late payment confirmation',
    reasonAr: 'تأخر في تأكيد الدفع',
    date: '1 week ago',
    dateAr: 'منذ أسبوع',
  },
];

// Mock wins data
const mockWins: ContestWin[] = [
  {
    id: '1',
    contestId: 'C-1246',
    contestName: 'Daily Contest',
    contestNameAr: 'مسابقة اليوم',
    contestDate: '2026-01-25',
    position: 1,
    prizeAmount: 45,
  },
  {
    id: '2',
    contestId: 'C-1240',
    contestName: 'Weekly Challenge',
    contestNameAr: 'تحدي أسبوعي',
    contestDate: '2026-01-20',
    position: 2,
    prizeAmount: 20,
  },
  {
    id: '3',
    contestId: 'C-1235',
    contestName: 'Daily Contest',
    contestNameAr: 'مسابقة اليوم',
    contestDate: '2026-01-15',
    position: 3,
    prizeAmount: 15,
  },
];

const buildPublicProfileUser = (u: PlatformUser): PublicProfileUser => {
  const engagement = getEngagement(u.engagementStatus);
  return {
    id: u.id,
    name: u.name,
    nameAr: u.nameAr,
    username: u.username,
    avatar: u.avatar,
    rank: u.rank,
    country: u.country,
    countryAr: u.countryAr,
    city: u.city,
    cityAr: u.cityAr,
    isOnline: u.isOnline,
    lastSeen: u.lastSeen,
    lastSeenAr: u.lastSeenAr,
    ...engagement,
    followers: 1250,
    following: 342,
    isFollowedByMe: false,
    stats: {
      contestsJoined: 48,
      contestsWon: 7,
      luckyWins: 3,
      paidVotesReceived: 234,
    },
    wins: mockWins,
    p2p: {
      rating: u.p2pStats?.rating ?? 96,
      tradesCount: u.p2pStats?.trades ?? 67,
      positiveCount: 62,
      negativeCount: 5,
      ratings: mockP2PRatings,
    },
  };
};

const isProbablyUrl = (value?: string) => {
  if (!value) return false;
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/');
};

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user: currentUser } = useUser();
  const isRTL = language === 'ar';

  const baseUser = useMemo(() => getPlatformUserById(userId), [userId]);
  const initialUser = useMemo(() => (baseUser ? buildPublicProfileUser(baseUser) : null), [baseUser]);
  
  // State for follow status and counts
  const [isFollowing, setIsFollowing] = useState(initialUser?.isFollowedByMe ?? false);
  const [followersCount, setFollowersCount] = useState(initialUser?.followers ?? 0);
  const [followingCount, setFollowingCount] = useState(initialUser?.following ?? 0);
  
  // State for dialogs
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showRatingsSheet, setShowRatingsSheet] = useState(false);
  
  useEffect(() => {
    if (!initialUser) return;
    setIsFollowing(initialUser.isFollowedByMe);
    setFollowersCount(initialUser.followers);
    setFollowingCount(initialUser.following);
  }, [initialUser?.id]);

  // If userId is unknown, show a safe "not found" state
  if (!initialUser) {
    return (
      <AppLayout showHeader={false} showNav={false}>
        <div className="min-h-screen bg-background">
          <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border safe-top">
            <div className="flex items-center gap-3 px-4 py-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
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

  // Check if viewing own profile
  const isOwnProfile = currentUser.id === initialUser.id;

  const handleBack = () => {
    navigate(-1);
  };

  const handleSendMessage = () => {
    if (!initialUser) return;
    navigate('/chat', { state: { openDmWith: initialUser.id } });
  };

  const handleSendNova = () => {
    setShowTransferDialog(true);
  };
  
  const handleFollowToggle = () => {
    if (isFollowing) {
      setFollowersCount(prev => prev - 1);
    } else {
      setFollowersCount(prev => prev + 1);
    }
    setIsFollowing(!isFollowing);
  };

  const handleViewP2PRatings = () => {
    setShowRatingsSheet(true);
  };

  const statsCards = [
    {
      icon: Target,
      labelKey: 'publicProfile.stats.contestsJoined',
      value: initialUser.stats.contestsJoined,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: Trophy,
      labelKey: 'publicProfile.stats.contestsWon',
      value: initialUser.stats.contestsWon,
      color: 'text-nova',
      bgColor: 'bg-nova/10',
    },
    {
      icon: Clover,
      labelKey: 'publicProfile.stats.luckyWins',
      value: initialUser.stats.luckyWins,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      icon: Vote,
      labelKey: 'publicProfile.stats.paidVotesReceived',
      value: initialUser.stats.paidVotesReceived,
      color: 'text-aura',
      bgColor: 'bg-aura/10',
    },
  ];

  return (
    <AppLayout showHeader={false} showNav={false}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border safe-top">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
            </Button>
            <h1 className="text-lg font-semibold text-foreground">
              {t('publicProfile.title')}
            </h1>
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
              {isProbablyUrl(initialUser.avatar) ? (
                <AvatarImage src={initialUser.avatar} alt={initialUser.name} />
              ) : null}
              <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                {initialUser.avatar || initialUser.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Name + Rank */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xl font-bold text-foreground">
                {language === 'ar' ? initialUser.nameAr : initialUser.name}
              </span>
              <Badge variant="secondary" className="text-xs">
                {t(`ranks.${initialUser.rank}`)}
              </Badge>
            </div>

            {/* Username */}
            <span className="text-muted-foreground mt-1">
              @{initialUser.username}
            </span>

            {/* Online Status */}
            <div className="mt-2 flex items-center justify-center gap-1.5">
              <span className={cn(
                "h-2 w-2 rounded-full",
                initialUser.isOnline ? "bg-success" : "bg-muted-foreground"
              )} />
              <span className="text-sm text-muted-foreground">
                {initialUser.isOnline 
                  ? t('publicProfile.onlineNow')
                  : `${t('publicProfile.lastSeen')} ${language === 'ar' ? initialUser.lastSeenAr : initialUser.lastSeen}`
                }
              </span>
            </div>

            {/* Followers / Following - TikTok Style */}
            <div className="mt-3 flex items-center gap-6">
              <div className="text-center">
                <span className="text-lg font-bold text-foreground">{followersCount.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground ms-1">
                  {language === 'ar' ? 'متابِع' : 'Followers'}
                </span>
              </div>
              <div className="text-center">
                <span className="text-lg font-bold text-foreground">{followingCount.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground ms-1">
                  {language === 'ar' ? 'أتابع' : 'Following'}
                </span>
              </div>
            </div>

            {/* Follow Button - Always visible for other users */}
            {!isOwnProfile && (
              <Button
                variant={isFollowing ? "outline" : "default"}
                size="sm"
                className={cn(
                  "mt-3 gap-2",
                  isFollowing && "border-primary text-primary"
                )}
                onClick={handleFollowToggle}
              >
                {isFollowing ? (
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
            <div className="mt-3 flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">
                {language === 'ar' ? initialUser.countryAr : initialUser.country} · {language === 'ar' ? initialUser.cityAr : initialUser.city}
              </span>
            </div>

            {/* Engagement Status */}
            <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
              <Badge 
                variant="outline"
                className={cn(
                  "text-xs",
                  initialUser.contestEngagement === 'active'
                    ? "bg-success/15 text-success border-success/30"
                    : "bg-muted/50 text-muted-foreground border-border"
                )}
              >
                {initialUser.contestEngagement === 'active' 
                  ? t('publicProfile.contestActive')
                  : t('publicProfile.contestInactive')
                }
              </Badge>
              <Badge 
                variant="outline"
                className={cn(
                  "text-xs",
                  initialUser.votingEngagement === 'active'
                    ? "bg-success/15 text-success border-success/30"
                    : "bg-muted/50 text-muted-foreground border-border"
                )}
              >
                {initialUser.votingEngagement === 'active' 
                  ? t('publicProfile.votingActive')
                  : t('publicProfile.votingInactive')
                }
              </Badge>
            </div>
          </motion.div>

          {/* Stats Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="grid grid-cols-2 gap-3">
              {statsCards.map((stat, index) => (
                <Card key={index} className="border-border/50">
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

          {/* Wins Section - Redesigned */}
          {initialUser.wins.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <UserWinsSection
                wins={initialUser.wins}
                onViewMore={() => navigate('/winners')}
                onViewContest={(contestId) => navigate('/winners')}
              />
            </motion.section>
          )}

          {/* P2P Summary */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-5 w-5 text-nova fill-nova" />
                  {t('publicProfile.p2pSummary')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Rating + Trades */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl font-bold text-success">
                      {initialUser.p2p.rating}%
                    </div>
                    <span className="text-muted-foreground">
                      {t('publicProfile.rating')}
                    </span>
                  </div>
                  <div className="text-end">
                    <span className="text-lg font-semibold text-foreground">
                      {initialUser.p2p.tradesCount}
                    </span>
                    <span className="text-muted-foreground ms-1">
                      {t('publicProfile.trades')}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Rating Summary */}
                <div className="flex items-center justify-center gap-6 py-2">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-success">
                      <ThumbsUp className="h-4 w-4" />
                      <span className="text-xl font-bold">{initialUser.p2p.positiveCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'إيجابي' : 'Positive'}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-destructive">
                      <ThumbsDown className="h-4 w-4" />
                      <span className="text-xl font-bold">{initialUser.p2p.negativeCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'سلبي' : 'Negative'}
                    </p>
                  </div>
                </div>

                {/* View All Ratings Button */}
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
              </CardContent>
            </Card>
          </motion.section>
        </div>

        {/* Fixed Action Buttons - Always show BOTH for other users */}
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
          recipientId={initialUser.id}
          recipientName={language === 'ar' ? initialUser.nameAr : initialUser.name}
          recipientUsername={initialUser.username}
          recipientCountry={language === 'ar' ? initialUser.countryAr : initialUser.country}
          recipientAvatar={initialUser.avatar}
        />

        {/* P2P Ratings Sheet */}
        <P2PRatingsSheet
          open={showRatingsSheet}
          onClose={() => setShowRatingsSheet(false)}
          ratings={initialUser.p2p.ratings}
          positiveCount={initialUser.p2p.positiveCount}
          negativeCount={initialUser.p2p.negativeCount}
        />
      </div>
    </AppLayout>
  );
}
