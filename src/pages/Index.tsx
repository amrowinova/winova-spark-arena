import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Users, Wallet, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProgressRing } from '@/components/common/ProgressRing';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPricing } from '@/contexts/TransactionContext';

// New Home Components
import { ActiveUsersCard } from '@/components/home/ActiveUsersCard';
import { UserRankingCard } from '@/components/home/UserRankingCard';
import { ContestWinnersCard } from '@/components/home/ContestWinnersCard';
import { LuckyWinnersCard } from '@/components/home/LuckyWinnersCard';
import { ContestJoinCard } from '@/components/home/ContestJoinCard';
import { useActiveUsers, useContestActiveUsers } from '@/hooks/useActiveUsers';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Mock contest data
const mockContest = {
  id: 'C-1247',
  participants: 156,
  prizePool: 936, // 6 Nova × 156 participants
  stage: 'stage1' as const,
  entryFee: 10,
};

// Mock top 5 winners (from yesterday)
const contestWinners = [
  { id: 1, name: 'خالد محمد', avatar: '👨', rank: 'Leader', prize: 468, position: 1 }, // 50%
  { id: 2, name: 'فاطمة سعيد', avatar: '👩', rank: 'Marketer', prize: 187.2, position: 2 }, // 20%
  { id: 3, name: 'عمر أحمد', avatar: '👨', rank: 'Leader', prize: 140.4, position: 3 }, // 15%
  { id: 4, name: 'ليلى حسن', avatar: '👩', rank: 'Manager', prize: 93.6, position: 4 }, // 10%
  { id: 5, name: 'أحمد كريم', avatar: '👨', rank: 'Marketer', prize: 46.8, position: 5 }, // 5%
];

// Mock lucky (spotlight) winners
const luckyWinners = [
  { id: 1, name: 'سارة أحمد', avatar: '👩', prize: 18.5 },
  { id: 2, name: 'محمد كريم', avatar: '👨', prize: 9.75 },
];

export default function HomePage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user, autoConvertNovaToAura, spendAura, spendNova } = useUser();
  
  // Active users counters
  const globalActiveUsers = useActiveUsers();
  const contestActiveUsers = useContestActiveUsers();
  
  // Contest timing - closes at 6 PM today
  const now = new Date();
  const closesAt = new Date();
  closesAt.setHours(18, 0, 0, 0);
  if (closesAt < now) {
    closesAt.setDate(closesAt.getDate() + 1);
  }
  const endsAt = new Date(closesAt.getTime() + 4 * 60 * 60 * 1000); // 4 hours after close
  
  // Get local currency info - single price per country
  const pricing = getPricing(user.country);
  const novaLocalValue = user.novaBalance * pricing.novaRate;
  const auraLocalValue = user.auraBalance * pricing.auraRate;
  const totalLocalValue = novaLocalValue + auraLocalValue;

  // User contest state
  const [hasJoined, setHasJoined] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  
  // Mock user ranking data
  const userDailyRank = 47;
  const userVotes = 24;
  const votesNeededForTop50 = 45;

  const handleJoinContest = () => {
    setJoinDialogOpen(true);
  };

  const confirmJoin = (useAura: boolean) => {
    const entryFee = mockContest.entryFee;
    
    if (useAura) {
      if (user.auraBalance >= entryFee) {
        spendAura(entryFee);
      } else if (autoConvertNovaToAura(entryFee)) {
        // Auto-converted
      } else {
        toast.error(language === 'ar' ? 'رصيد غير كافي' : 'Insufficient balance');
        return;
      }
    } else {
      if (user.novaBalance >= entryFee) {
        spendNova(entryFee);
      } else {
        toast.error(language === 'ar' ? 'رصيد غير كافي' : 'Insufficient balance');
        return;
      }
    }
    
    setHasJoined(true);
    setJoinDialogOpen(false);
    toast.success(language === 'ar' ? '🎉 تم الانضمام للمسابقة!' : '🎉 Joined the contest!');
  };

  return (
    <AppLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-4 py-4 space-y-4"
      >
        {/* Global Active Users */}
        <motion.div variants={itemVariants} className="flex justify-center">
          <ActiveUsersCard count={globalActiveUsers} type="global" />
        </motion.div>

        {/* Wallet Cards - Single local currency display */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="bg-gradient-dark p-4">
              {/* Total Value in Local Currency */}
              <div className="text-center mb-4">
                <p className="text-secondary-foreground/60 text-xs">
                  {language === 'ar' ? 'إجمالي رصيدك' : 'Your Total Balance'}
                </p>
                <p className="text-secondary-foreground text-3xl font-bold">
                  {pricing.symbol} {totalLocalValue.toFixed(2)}
                </p>
                <p className="text-secondary-foreground/50 text-xs">
                  {pricing.currency}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Nova Balance */}
                <div className="bg-gradient-nova/20 backdrop-blur rounded-xl p-3 border border-nova/20">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-nova">✦</span>
                    <span className="text-secondary-foreground/70 text-xs">Nova</span>
                  </div>
                  <p className="text-secondary-foreground text-xl font-bold">
                    {user.novaBalance.toFixed(3)}
                  </p>
                  <p className="text-secondary-foreground/50 text-[10px]">
                    = {pricing.symbol} {novaLocalValue.toFixed(2)}
                  </p>
                </div>

                {/* Aura Balance */}
                <div className="bg-gradient-aura/20 backdrop-blur rounded-xl p-3 border border-aura/20">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-aura">◈</span>
                    <span className="text-secondary-foreground/70 text-xs">Aura</span>
                  </div>
                  <p className="text-secondary-foreground text-xl font-bold">
                    {user.auraBalance.toFixed(3)}
                  </p>
                  <p className="text-secondary-foreground/50 text-[10px]">
                    = {pricing.symbol} {auraLocalValue.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Quick Stats Row */}
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-2">
          <Card className="p-2 text-center">
            <Users className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{user.teamSize}</p>
            <p className="text-[9px] text-muted-foreground">{t('home.teamSize')}</p>
          </Card>
          
          <Card className="p-2 text-center">
            <ProgressRing progress={user.activityPercentage} size={36} strokeWidth={3}>
              <span className="text-[10px] font-bold">{user.activityPercentage}%</span>
            </ProgressRing>
            <p className="text-[9px] text-muted-foreground mt-0.5">{t('home.weeklyActivity')}</p>
          </Card>
          
          <Card className="p-2 text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-success" />
            <p className="text-lg font-bold">{user.spotlightPoints}</p>
            <p className="text-[9px] text-muted-foreground">{t('spotlight.yourPoints')}</p>
          </Card>
        </motion.div>

        {/* Daily Contest Card with Join Button */}
        <motion.div variants={itemVariants}>
          <ContestJoinCard
            prizePool={mockContest.prizePool}
            participants={mockContest.participants}
            stage={mockContest.stage}
            closesAt={closesAt}
            endsAt={endsAt}
            entryFee={mockContest.entryFee}
            hasJoined={hasJoined}
            activeInContest={contestActiveUsers}
            onJoin={handleJoinContest}
          />
        </motion.div>

        {/* User Ranking Card */}
        <motion.div variants={itemVariants}>
          <UserRankingCard
            dailyRank={userDailyRank}
            currentVotes={userVotes}
            votesNeededForTop50={votesNeededForTop50}
          />
        </motion.div>

        {/* Contest Winners (Top 5) */}
        <motion.div variants={itemVariants}>
          <ContestWinnersCard
            winners={contestWinners}
            prizePool={mockContest.prizePool}
            country={user.country}
          />
        </motion.div>

        {/* Lucky Winners (Spotlight) */}
        <motion.div variants={itemVariants}>
          <LuckyWinnersCard
            winners={luckyWinners}
            country={user.country}
          />
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 pb-4">
          <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1">
            <Link to="/p2p">
              <span className="text-xl">🤝</span>
              <span className="text-sm">{t('nav.p2p')}</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1">
            <Link to="/wallet">
              <Wallet className="h-5 w-5 text-primary" />
              <span className="text-sm">{t('nav.wallet')}</span>
            </Link>
          </Button>
        </motion.div>
      </motion.div>

      {/* Join Contest Dialog */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {language === 'ar' ? 'انضم للمسابقة' : 'Join Contest'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ar' 
                ? 'اختر طريقة الدفع للانضمام'
                : 'Choose payment method to join'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            <div className="p-3 bg-muted/50 rounded-lg grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Nova</p>
                <p className="font-bold text-nova">{user.novaBalance.toFixed(3)} ✦</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aura</p>
                <p className="font-bold text-aura">{user.auraBalance.toFixed(3)} ◈</p>
              </div>
            </div>

            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm text-center">
                {language === 'ar' ? 'رسوم الدخول:' : 'Entry Fee:'} 
                <span className="font-bold"> {mockContest.entryFee}</span>
              </p>
            </div>
            
            <Button 
              className="w-full bg-gradient-aura text-aura-foreground"
              onClick={() => confirmJoin(true)}
              disabled={user.auraBalance < mockContest.entryFee && user.novaBalance < mockContest.entryFee}
            >
              <span className="me-2">◈</span>
              {language === 'ar' ? 'ادفع بـ Aura' : 'Pay with Aura'}
            </Button>
            
            <Button 
              className="w-full bg-gradient-nova text-nova-foreground"
              onClick={() => confirmJoin(false)}
              disabled={user.novaBalance < mockContest.entryFee}
            >
              <span className="me-2">✦</span>
              {language === 'ar' ? 'ادفع بـ Nova' : 'Pay with Nova'}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              {language === 'ar' 
                ? 'إذا لم يكن لديك Aura كافٍ، سيتم التحويل تلقائياً من Nova'
                : 'If you don\'t have enough Aura, it will auto-convert from Nova'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
