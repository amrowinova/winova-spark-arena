import { useState } from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  P2PReputationCard, 
  ProfileEditSheet,
  UserWinsSection,
  P2PRatingsSheet
} from '@/components/profile';
import type { UserWin, ContestWin, LuckyWin } from '@/components/profile/UserWinsSection';
import { ProfileStatsSection } from '@/components/profile/ProfileStatsSection';

// Mock stats data
const mockStats = {
  contests: 24,
  wins: 3,
  votesGiven: 156,
  votesReceived: 89,
  luckyWins: 2,
  followers: 234,
  following: 156,
};

// Mock wins history - Daily contests AND lucky wins
const mockContestWins: ContestWin[] = [
  {
    id: '1',
    contestId: 'contest-1',
    contestName: 'Daily Contest',
    contestNameAr: 'مسابقة اليوم',
    contestDate: '2025-01-20',
    position: 1 as const,
    prizeAmount: 45,
  },
  {
    id: '2',
    contestId: 'contest-2',
    contestName: 'Daily Contest',
    contestNameAr: 'مسابقة اليوم',
    contestDate: '2025-01-15',
    position: 2 as const,
    prizeAmount: 18,
  },
  {
    id: '3',
    contestId: 'contest-3',
    contestName: 'Daily Contest',
    contestNameAr: 'مسابقة اليوم',
    contestDate: '2025-01-10',
    position: 3 as const,
    prizeAmount: 13.5,
  },
];

// Mock lucky wins for own profile
const mockLuckyWins: LuckyWin[] = [
  {
    id: 'lucky-1',
    date: '2025-01-18',
    prizeAmount: 312,
    isToday: false,
  },
  {
    id: 'lucky-2',
    date: '2025-01-12',
    prizeAmount: 98,
    isToday: false,
  },
];

// Combined wins array
const mockWins: UserWin[] = [
  ...mockContestWins.map(w => ({ type: 'contest' as const, data: w })),
  ...mockLuckyWins.map(w => ({ type: 'lucky' as const, data: w })),
];

// Mock P2P reputation with ALL required fields
const mockP2PReputation = {
  overallRating: 94,
  totalTransactions: 47,
  completedOrders: 44,
  avgExecutionTime: '8 min',
  disputeCount: 1,
  positiveCount: 44,
  negativeCount: 2,
  recentComments: [
    {
      id: '1',
      userName: 'Mohammed',
      comment: 'Fast payment, very professional!',
      rating: 'positive' as const,
      date: '2 days ago',
      tags: ['Fast', 'Professional'],
    },
    {
      id: '2',
      userName: 'Sara',
      comment: 'Quick and smooth transaction',
      rating: 'positive' as const,
      date: '5 days ago',
      tags: ['Fast'],
    },
    {
      id: '3',
      userName: 'Omar',
      comment: 'Good experience overall',
      rating: 'positive' as const,
      date: '1 week ago',
      tags: ['Reliable'],
    },
  ],
};

// Mock P2P ratings for the sheet
const mockP2PRatings = [
  {
    id: '1',
    reviewerName: 'Mohammed Ali',
    reviewerNameAr: 'محمد علي',
    reviewerAvatar: undefined,
    rating: 'positive' as const,
    comment: 'Fast payment, very professional trader!',
    commentAr: 'دفع سريع، تاجر محترف جداً!',
    tags: ['Fast', 'Professional'],
    tagsAr: ['سريع', 'محترف'],
    date: '2025-01-25',
    dateAr: '٢٥ يناير ٢٠٢٥',
  },
  {
    id: '2',
    reviewerName: 'Sara Ahmed',
    reviewerNameAr: 'سارة أحمد',
    reviewerAvatar: undefined,
    rating: 'positive' as const,
    comment: 'Quick and smooth transaction, highly recommend',
    commentAr: 'معاملة سريعة وسلسة، أنصح به بشدة',
    tags: ['Fast', 'Reliable'],
    tagsAr: ['سريع', 'موثوق'],
    date: '2025-01-22',
    dateAr: '٢٢ يناير ٢٠٢٥',
  },
  {
    id: '3',
    reviewerName: 'Omar Hassan',
    reviewerNameAr: 'عمر حسن',
    reviewerAvatar: undefined,
    rating: 'positive' as const,
    comment: 'Good experience overall',
    commentAr: 'تجربة جيدة بشكل عام',
    tags: ['Reliable'],
    tagsAr: ['موثوق'],
    date: '2025-01-18',
    dateAr: '١٨ يناير ٢٠٢٥',
  },
  {
    id: '4',
    reviewerName: 'Khaled M',
    reviewerNameAr: 'خالد م',
    reviewerAvatar: undefined,
    rating: 'negative' as const,
    comment: 'Took too long to respond',
    commentAr: 'استغرق وقتاً طويلاً للرد',
    reason: 'Slow response time',
    reasonAr: 'بطء في الاستجابة',
    date: '2025-01-10',
    dateAr: '١٠ يناير ٢٠٢٥',
  },
];

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { user } = useUser();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';
  const [editOpen, setEditOpen] = useState(false);
  const [ratingsOpen, setRatingsOpen] = useState(false);

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

            {/* Followers / Following - TikTok Style */}
            <div className="mt-3 flex items-center gap-4">
              <div className="text-center">
                <span className="text-lg font-bold text-foreground">
                  {mockStats.followers}
                </span>
                <span className="text-sm text-muted-foreground mx-1">
                  {isRTL ? 'متابِع' : 'Followers'}
                </span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="text-center">
                <span className="text-lg font-bold text-foreground">
                  {mockStats.following}
                </span>
                <span className="text-sm text-muted-foreground mx-1">
                  {isRTL ? 'يتابع' : 'Following'}
                </span>
              </div>
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

          {/* Achievements Section (My Achievements) */}
          <ProfileStatsSection 
            stats={mockStats}
            isOwnProfile={true}
          />

          {/* Wins Section (My Wins) */}
          {mockWins.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <UserWinsSection 
                wins={mockWins}
                isOwnProfile={true}
                onViewContest={(id) => console.log('View contest:', id)}
              />
            </motion.section>
          )}

          {/* P2P Reputation Section (My P2P Reputation) */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <P2PReputationCard 
              reputation={mockP2PReputation}
              isOwnProfile={true}
              onViewAllRatings={() => setRatingsOpen(true)}
            />
          </motion.section>
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
          ratings={mockP2PRatings}
          positiveCount={mockP2PReputation.positiveCount}
          negativeCount={mockP2PReputation.negativeCount}
        />
      </div>
    </AppLayout>
  );
}
