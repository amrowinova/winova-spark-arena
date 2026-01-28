import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPricing } from '@/contexts/TransactionContext';
import { getPlatformUserById } from '@/lib/platformUsers';

// Home Components
import { ActiveUsersCard } from '@/components/home/ActiveUsersCard';
import { ContestWinnersCard } from '@/components/home/ContestWinnersCard';
import { LuckyLeadersCard } from '@/components/home/LuckyLeadersCard';
import { ContestJoinCard } from '@/components/home/ContestJoinCard';
import { useActiveUsers } from '@/hooks/useActiveUsers';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBanner } from '@/contexts/BannerContext';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

// Format number - remove decimals if whole number
const formatBalance = (value: number): string => {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
};

// Mock contest data
const mockContest = {
  id: 'C-1247',
  participants: 156,
  prizePool: 936, // 6 Nova × 156 participants
  stage: 'stage1' as const,
  entryFee: 10,
};

// Mock top 5 winners (from yesterday) - using PLATFORM_USERS IDs
const contestWinners = [
  { id: '4', name: getPlatformUserById('4')?.nameAr || 'خالد محمد', avatar: getPlatformUserById('4')?.avatar || '👥', rank: 'Leader', prize: 468, position: 1 },
  { id: '5', name: getPlatformUserById('5')?.nameAr || 'فاطمة سعيد', avatar: getPlatformUserById('5')?.avatar || '👤', rank: 'Marketer', prize: 187.2, position: 2 },
  { id: '6', name: getPlatformUserById('6')?.nameAr || 'عمر أحمد', avatar: getPlatformUserById('6')?.avatar || '👥', rank: 'Leader', prize: 140.4, position: 3 },
  { id: '7', name: getPlatformUserById('7')?.nameAr || 'ليلى حسن', avatar: getPlatformUserById('7')?.avatar || '👤', rank: 'Manager', prize: 93.6, position: 4 },
  { id: '8', name: getPlatformUserById('8')?.nameAr || 'أحمد كريم', avatar: getPlatformUserById('8')?.avatar || '👤', rank: 'Marketer', prize: 46.8, position: 5 },
];


const formatBalanceOld = (value: number): string => {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
};

export default function HomePage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user, autoConvertNovaToAura, spendAura, spendNova } = useUser();
  
  // Active users counter - updates every 30 seconds
  const globalActiveUsers = useActiveUsers();
  
  // Contest timing - closes at 6 PM today
  const now = new Date();
  const closesAt = new Date();
  closesAt.setHours(18, 0, 0, 0);
  if (closesAt < now) {
    closesAt.setDate(closesAt.getDate() + 1);
  }
  const endsAt = new Date(closesAt.getTime() + 4 * 60 * 60 * 1000);
  
  // Get local currency info
  const pricing = getPricing(user.country);
  const novaLocalValue = user.novaBalance * pricing.novaRate;

  // User contest state
  const [hasJoined, setHasJoined] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  const handleJoinContest = () => {
    setJoinDialogOpen(true);
  };

  const { success: showSuccess, error: showError } = useBanner();

  const confirmJoin = () => {
    const entryFee = mockContest.entryFee;
    const auraEquivalent = entryFee * 2; // 1 Nova = 2 Aura
    
    // Auto-deduction logic: Try Aura first, then Nova, then mix
    if (user.auraBalance >= auraEquivalent) {
      // Pay fully with Aura
      spendAura(auraEquivalent);
    } else if (user.novaBalance >= entryFee) {
      // Pay fully with Nova
      spendNova(entryFee);
    } else if (user.auraBalance > 0 && user.novaBalance > 0) {
      // Mix: Use all Aura first, then Nova for the rest
      const auraToUse = user.auraBalance;
      const novaEquivalentFromAura = auraToUse / 2;
      const remainingNovaNeeded = entryFee - novaEquivalentFromAura;
      
      if (user.novaBalance >= remainingNovaNeeded) {
        spendAura(auraToUse);
        spendNova(remainingNovaNeeded);
      } else {
        showError(language === 'ar' ? 'رصيد غير كافي' : 'Insufficient balance');
        return;
      }
    } else {
      showError(language === 'ar' ? 'رصيد غير كافي' : 'Insufficient balance');
      return;
    }
    
    setHasJoined(true);
    setJoinDialogOpen(false);
    showSuccess(language === 'ar' ? '🎉 تم الانضمام للمسابقة بنجاح!' : '🎉 Successfully joined the contest!');
  };

  return (
    <AppLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-4 py-3 space-y-4"
      >
        {/* Active Users Badge - Compact inline bar */}
        <motion.div variants={itemVariants} className="flex justify-center">
          <ActiveUsersCard count={globalActiveUsers} />
        </motion.div>

        {/* Wallet Card - Matching Wallet page design */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border border-border bg-card shadow-sm">
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Nova Balance - Gold accent */}
                <div className="bg-nova/5 border border-nova/20 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-nova text-lg font-bold">И</span>
                    <span className="text-foreground/70 text-xs font-medium">Nova</span>
                  </div>
                  <p className="text-foreground text-2xl font-bold">
                    {formatBalance(user.novaBalance)}
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    ≈ {pricing.symbol} {formatBalance(novaLocalValue)}
                  </p>
                </div>

                {/* Aura Balance - Purple accent, no local currency */}
                <div className="bg-aura/5 border border-aura/20 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-aura text-lg font-bold">✦</span>
                    <span className="text-foreground/70 text-xs font-medium">Aura</span>
                  </div>
                  <p className="text-foreground text-2xl font-bold">
                    {formatBalance(user.auraBalance)}
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {language === 'ar' ? 'نقاط تصويت' : 'Voting Points'}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Quick Actions - Wallet & P2P - Directly below balance */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
          <Button asChild variant="outline" className="h-11 flex items-center justify-center gap-2 bg-card hover:bg-muted/50 border-border/50">
            <Link to="/wallet">
              <Wallet className="h-4 w-4 text-nova" />
              <span className="text-sm font-medium">{language === 'ar' ? 'محفظتي' : 'My Wallet'}</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11 flex items-center justify-center gap-2 bg-card hover:bg-muted/50 border-border/50">
            <Link to="/p2p">
              <span className="text-base">🤝</span>
              <span className="text-sm font-medium">{language === 'ar' ? 'تحويل فوري P2P' : 'P2P Transfer'}</span>
            </Link>
          </Button>
        </motion.div>

        {/* Daily Contest Card - Most prominent */}
        <motion.div variants={itemVariants}>
          <ContestJoinCard
            prizePool={mockContest.prizePool}
            participants={mockContest.participants}
            stage={mockContest.stage}
            closesAt={closesAt}
            endsAt={endsAt}
            entryFee={mockContest.entryFee}
            hasJoined={hasJoined}
            onJoin={handleJoinContest}
          />
        </motion.div>

        {/* Contest Winners - Show only 2-3 with See More */}
        <motion.div variants={itemVariants}>
          <ContestWinnersCard
            winners={contestWinners}
            prizePool={mockContest.prizePool}
            country={user.country}
            limit={3}
          />
        </motion.div>

        {/* Lucky Leaders - Top Nova Winners */}
        <motion.div variants={itemVariants}>
          <LuckyLeadersCard limit={5} />
        </motion.div>
      </motion.div>

      {/* Join Contest Dialog - Simplified Single Payment */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center">
              {language === 'ar' ? 'انضم للمسابقة' : 'Join Contest'}
            </DialogTitle>
            <DialogDescription className="text-center">
              {language === 'ar' 
                ? 'سيتم الخصم تلقائياً من رصيدك'
                : 'Will be automatically deducted from your balance'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Combined Balance Box */}
            <div className="p-4 bg-gradient-to-r from-aura/10 to-nova/10 rounded-xl border border-border/50">
              <p className="text-xs text-muted-foreground text-center mb-2">
                {language === 'ar' ? 'رصيدك الحالي' : 'Your Balance'}
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-aura font-bold text-lg">✦ {formatBalance(user.auraBalance)}</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-nova font-bold text-lg">И {formatBalance(user.novaBalance)}</span>
              </div>
            </div>

            {/* Entry Fee */}
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">
                {language === 'ar' ? 'رسوم الدخول' : 'Entry Fee'}
              </p>
              <p className="text-xl font-bold text-primary">И 10</p>
            </div>
            
            {/* Single Payment Button */}
            <Button 
              className="w-full h-12 bg-gradient-primary text-primary-foreground font-bold text-base"
              onClick={confirmJoin}
              disabled={
                (user.novaBalance + (user.auraBalance / 2)) < mockContest.entryFee
              }
            >
              {language === 'ar' ? 'ادفع الآن' : 'Pay Now'}
            </Button>

            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              {language === 'ar' 
                ? 'يتم الخصم تلقائياً من Aura أولاً ثم Nova'
                : 'Auto-deducts from Aura first, then Nova'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
