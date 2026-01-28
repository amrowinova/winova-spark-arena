import { useState } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPlatformUserById } from '@/lib/platformUsers';
import {
  CycleProgressCard,
  UserPointsCard,
  DailyLuckyWinnersCard,
  HowItWorksCard,
  HowToEarnPointsSheet,
  WeeklyPerformanceCard,
  NovaLeaderboard,
} from '@/components/spotlight';

// Mock spotlight data
const spotlightData = {
  // Cycle info
  currentDay: 30,
  totalDays: 98,
  currentWeek: 5,
  totalWeeks: 14,

  // User points
  userDailyPoints: 45,
  userCyclePoints: 1250,
  userRankPosition: 3,
  totalInRank: 156,

  // Weekly performance data (14 weeks)
  weeklyPerformance: [
    { week: 1, points: 180 },
    { week: 2, points: 220 },
    { week: 3, points: 195 },
    { week: 4, points: 280 },
    { week: 5, points: 375 }, // Current week
    { week: 6, points: 0 },
    { week: 7, points: 0 },
    { week: 8, points: 0 },
    { week: 9, points: 0 },
    { week: 10, points: 0 },
    { week: 11, points: 0 },
    { week: 12, points: 0 },
    { week: 13, points: 0 },
    { week: 14, points: 0 },
  ],

  // Daily pool and winners
  dailyPool: 800,
  dailyWinners: [
    { 
      id: '5', 
      name: getPlatformUserById('5')?.nameAr || 'فاطمة سعيد', 
      prize: 520, 
      percentage: 65 
    },
    { 
      id: '6', 
      name: getPlatformUserById('6')?.nameAr || 'عمر أحمد', 
      prize: 280, 
      percentage: 35 
    },
  ],

  // Next draw time (end of today)
  nextDrawTime: (() => {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
  })(),

  // Nova Leaderboard - Top winners by highest single win
  novaLeaderboard: [
    { id: '4', name: getPlatformUserById('4')?.nameAr || 'خالد محمد', highestNovaWin: 2450, position: 1 },
    { id: '2', name: getPlatformUserById('2')?.nameAr || 'سارة أحمد', highestNovaWin: 1850, position: 2 },
    { id: '5', name: getPlatformUserById('5')?.nameAr || 'فاطمة سعيد', highestNovaWin: 1520, position: 3 },
    { id: '6', name: getPlatformUserById('6')?.nameAr || 'عمر أحمد', highestNovaWin: 980, position: 4 },
    { id: '7', name: getPlatformUserById('7')?.nameAr || 'ليلى حسن', highestNovaWin: 750, position: 5 },
  ],
};

export default function SpotlightPage() {
  const { user } = useUser();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [showEarnPointsSheet, setShowEarnPointsSheet] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InnerPageHeader title={isRTL ? 'نقاط المحظوظين' : 'Lucky Points'} />
      
      <main className="flex-1 px-4 py-4 pb-20 space-y-5">
        {/* How to Earn Points Button */}
        <Button
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
          onClick={() => setShowEarnPointsSheet(true)}
        >
          <HelpCircle className="h-4 w-4" />
          {isRTL ? 'كيف تكسب النقاط؟' : 'How to Earn Points?'}
        </Button>

        {/* 1. User Points Card (First) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <UserPointsCard
            dailyPoints={spotlightData.userDailyPoints}
            cyclePoints={spotlightData.userCyclePoints}
            userRank={user.rank}
            rankPosition={spotlightData.userRankPosition}
            totalInRank={spotlightData.totalInRank}
            onInfoClick={() => setShowEarnPointsSheet(true)}
          />
        </motion.div>

        {/* 2. Cycle Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <CycleProgressCard
            currentDay={spotlightData.currentDay}
            totalDays={spotlightData.totalDays}
            cyclePoints={spotlightData.userCyclePoints}
          />
        </motion.div>

        {/* 3. Weekly Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <WeeklyPerformanceCard
            currentWeek={spotlightData.currentWeek}
            weeklyData={spotlightData.weeklyPerformance}
          />
        </motion.div>

        {/* 4. Daily Lucky Winners with Countdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <DailyLuckyWinnersCard
            totalPool={spotlightData.dailyPool}
            winners={spotlightData.dailyWinners}
            nextDrawTime={spotlightData.nextDrawTime}
          />
        </motion.div>

        {/* 5. How It Works (Single Card) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <HowItWorksCard />
        </motion.div>

        {/* 6. Nova Leaderboard (Last) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <NovaLeaderboard entries={spotlightData.novaLeaderboard} />
        </motion.div>
      </main>
      
      <BottomNav />

      {/* How to Earn Points Sheet */}
      <HowToEarnPointsSheet
        open={showEarnPointsSheet}
        onOpenChange={setShowEarnPointsSheet}
      />
    </div>
  );
}
