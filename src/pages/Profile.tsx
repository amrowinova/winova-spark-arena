import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  Menu, 
  Users, 
  ArrowLeftRight, 
  Settings, 
  HelpCircle, 
  FileText, 
  LogOut,
  Trophy,
  MapPin,
  Sparkles,
  Pencil,
  Share2,
  ArrowLeft,
  Circle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  P2PReputationCard, 
  ProfileEditSheet,
  UserWinsSection,
  P2PRatingsSheet
} from '@/components/profile';
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

// Mock wins history - Daily contests only (count must match mockStats.wins)
const mockWins = [
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [ratingsOpen, setRatingsOpen] = useState(false);

  const menuItems = [
    { icon: Trophy, labelEn: 'Winners Record', labelAr: 'سجل الفائزون', path: '/winners' },
    { icon: Users, labelEn: 'Team', labelAr: 'الفريق', path: '/team' },
    { icon: ArrowLeftRight, labelEn: 'P2P', labelAr: 'P2P', path: '/p2p' },
    { icon: Sparkles, labelEn: 'Lucky Points', labelAr: 'نقاط المحظوظين', path: '/spotlight' },
    { icon: Settings, labelEn: 'Settings', labelAr: 'الإعدادات', path: '/settings' },
    { icon: HelpCircle, labelEn: 'Help', labelAr: 'المساعدة', path: '/support' },
    { icon: FileText, labelEn: 'Policies', labelAr: 'السياسات', path: '/policies' },
  ];

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
        {/* Unified Header - Back + Share only (no title, no divider) */}
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
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9"
                onClick={handleShare}
              >
                <Share2 className="h-5 w-5" />
              </Button>
              
              {/* Menu for own profile only */}
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side={isRTL ? 'left' : 'right'} className="w-72">
                  <SheetHeader>
                    <SheetTitle>{isRTL ? 'القائمة' : 'Menu'}</SheetTitle>
                  </SheetHeader>
                  <nav className="mt-6 flex flex-col gap-2">
                    {menuItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <item.icon className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{isRTL ? item.labelAr : item.labelEn}</span>
                      </Link>
                    ))}
                    
                    <div className="border-t border-border my-2" />
                    
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        // Handle logout
                      }}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="font-medium">{t('settings.logout')}</span>
                    </button>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
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
