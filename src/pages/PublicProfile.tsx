import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Users
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

// Mock user data for public profile
const getMockPublicUser = (userId: string) => ({
  id: userId,
  name: 'Mohammed Ali',
  nameAr: 'محمد علي',
  username: 'mohammed_ali',
  avatar: '',
  rank: 'leader' as const,
  country: 'Saudi Arabia',
  countryAr: 'السعودية',
  city: 'Jeddah',
  cityAr: 'جدة',
  isOnline: true,
  lastSeen: '5 minutes ago',
  lastSeenAr: 'منذ 5 دقائق',
  contestEngagement: 'active' as 'active' | 'inactive',
  votingEngagement: 'active' as 'active' | 'inactive',
  followers: 1250,
  following: 342,
  isFollowedByMe: false,
  stats: {
    contestsJoined: 48,
    contestsWon: 7,
    luckyWins: 3,
    paidVotesReceived: 234,
  },
  achievements: [
    {
      id: '1',
      type: 'contest' as const,
      contestName: 'Daily Photo Contest',
      contestNameAr: 'مسابقة الصور اليومية',
      date: '2025-01-20',
      position: 1 as const,
      prizeAmount: 45,
      prizeType: 'nova' as const,
    },
    {
      id: '2',
      type: 'contest' as const,
      contestName: 'Weekly Art Challenge',
      contestNameAr: 'تحدي الفن الأسبوعي',
      date: '2025-01-15',
      position: 2 as const,
      prizeAmount: 20,
      prizeType: 'nova' as const,
    },
    {
      id: '3',
      type: 'lucky' as const,
      contestName: 'Spotlight Draw',
      contestNameAr: 'سحب الأضواء',
      date: '2025-01-10',
      prizeAmount: 25,
      prizeType: 'nova' as const,
    },
  ],
  p2p: {
    rating: 96,
    tradesCount: 67,
    latestReview: {
      userName: 'Sara',
      userNameAr: 'سارة',
      comment: 'Fast and reliable!',
      commentAr: 'سريع وموثوق!',
      rating: 'positive' as const,
    },
  },
});

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user: currentUser } = useUser();
  const isRTL = language === 'ar';
  
  // Get mock user data
  const initialUser = getMockPublicUser(userId || '1');
  
  // State for follow status and counts
  const [isFollowing, setIsFollowing] = useState(initialUser.isFollowedByMe);
  const [followersCount, setFollowersCount] = useState(initialUser.followers);
  const [followingCount] = useState(initialUser.following);
  
  // State for Nova transfer dialog
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  
  // Check if viewing own profile
  const isOwnProfile = currentUser.id === userId;

  const handleBack = () => {
    navigate(-1);
  };

  const handleSendMessage = () => {
    // Navigate to DM or create new chat
    navigate('/chat', { state: { openDmWith: initialUser.id } });
  };

  const handleSendNova = () => {
    // Open transfer dialog directly
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

  const handleViewP2PDetails = () => {
    // Could navigate to full P2P rating page
    console.log('View P2P Details');
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

  const getPositionLabel = (position: number) => {
    if (language === 'ar') {
      switch (position) {
        case 1: return 'الأول';
        case 2: return 'الثاني';
        case 3: return 'الثالث';
        default: return `Top ${position}`;
      }
    }
    switch (position) {
      case 1: return '1st';
      case 2: return '2nd';
      case 3: return '3rd';
      default: return `Top ${position}`;
    }
  };

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1: return 'text-nova bg-nova/10';
      case 2: return 'text-muted-foreground bg-muted';
      case 3: return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30';
      default: return 'text-primary bg-primary/10';
    }
  };

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

        <div className="px-4 py-6 space-y-6 pb-24">
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center"
          >
            <Avatar className="h-24 w-24 border-4 border-primary/20">
              <AvatarImage src={initialUser.avatar} alt={initialUser.name} />
              <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                {initialUser.name.charAt(0).toUpperCase()}
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

            {/* Follow Button - Hidden for own profile */}
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

            {/* Status Section */}
            <div className="mt-3 flex flex-col gap-2">
              {/* Engagement Status */}
              <div className="flex items-center gap-2 flex-wrap justify-center">
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

              {/* Online Status */}
              <div className="flex items-center justify-center gap-1.5">
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

          {/* Achievements Section */}
          {initialUser.achievements.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-lg font-semibold mb-4">{t('publicProfile.achievements')}</h3>
              <ScrollArea className="w-full">
                <div className="flex gap-3 pb-2">
                  {initialUser.achievements.map((achievement) => (
                    <Card key={achievement.id} className="min-w-[280px] border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-12 w-12 rounded-full flex items-center justify-center",
                            achievement.type === 'lucky' ? 'bg-success/10' : 'bg-nova/10'
                          )}>
                            {achievement.type === 'lucky' ? (
                              <Clover className="h-6 w-6 text-success" />
                            ) : (
                              <Trophy className="h-6 w-6 text-nova" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">
                              {language === 'ar' ? achievement.contestNameAr : achievement.contestName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {achievement.date}
                            </p>
                          </div>
                        </div>
                        
                        <div className="mt-3 flex items-center justify-between">
                          {achievement.type === 'contest' && achievement.position && (
                            <Badge className={cn("text-xs", getPositionColor(achievement.position))}>
                              {getPositionLabel(achievement.position)}
                            </Badge>
                          )}
                          {achievement.type === 'lucky' && (
                            <Badge className="text-xs bg-success/10 text-success">
                              {t('publicProfile.luckyWinner')}
                            </Badge>
                          )}
                          <CurrencyBadge
                            type={achievement.prizeType}
                            amount={achievement.prizeAmount}
                            size="sm"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </motion.section>
          )}

          {/* P2P Summary */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-5 w-5 text-nova" />
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

                {/* Latest Review */}
                {initialUser.p2p.latestReview && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {t('publicProfile.latestReview')}
                    </p>
                    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center",
                        initialUser.p2p.latestReview.rating === 'positive'
                          ? "bg-success/10"
                          : "bg-destructive/10"
                      )}>
                        {initialUser.p2p.latestReview.rating === 'positive' ? (
                          <ThumbsUp className="h-4 w-4 text-success" />
                        ) : (
                          <ThumbsDown className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-foreground">
                          {language === 'ar' 
                            ? initialUser.p2p.latestReview.userNameAr 
                            : initialUser.p2p.latestReview.userName
                          }
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {language === 'ar' 
                            ? initialUser.p2p.latestReview.commentAr 
                            : initialUser.p2p.latestReview.comment
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleViewP2PDetails}
                >
                  {t('publicProfile.viewP2PDetails')}
                </Button>
              </CardContent>
            </Card>
          </motion.section>
        </div>

        {/* Fixed Action Buttons */}
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

        {/* Nova Transfer Dialog */}
        <TransferNovaDialog
          open={showTransferDialog}
          onClose={() => setShowTransferDialog(false)}
          recipientId={initialUser.id}
          recipientName={language === 'ar' ? initialUser.nameAr : initialUser.name}
          recipientUsername={initialUser.username}
        />
      </div>
    </AppLayout>
  );
}
