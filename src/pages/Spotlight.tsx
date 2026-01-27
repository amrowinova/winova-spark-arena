import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
  TierRankingList,
  HowItWorksCard,
  HowToEarnPointsSheet,
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
  userWeeklyPoints: 280,
  userCyclePoints: 1250,
  userRankPosition: 3,
  totalInRank: 156,

  // Daily pool and winners
  dailyPool: 800, // Total Nova for today
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

  // Tier ranking (users in same rank as current user)
  tierRanking: [
    { id: '4', name: getPlatformUserById('4')?.nameAr || 'خالد محمد', avatar: '👤', points: 2450, position: 1 },
    { id: '2', name: getPlatformUserById('2')?.nameAr || 'سارة أحمد', avatar: '👤', points: 2120, position: 2 },
    { id: 'current', name: 'أنت', avatar: '🌟', points: 1250, position: 3, isCurrentUser: true },
    { id: '5', name: getPlatformUserById('5')?.nameAr || 'فاطمة سعيد', avatar: '👤', points: 1180, position: 4 },
    { id: '6', name: getPlatformUserById('6')?.nameAr || 'عمر أحمد', avatar: '👤', points: 980, position: 5 },
  ],
};

export default function SpotlightPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [showEarnPointsSheet, setShowEarnPointsSheet] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InnerPageHeader title={isRTL ? 'نقاط المحظوظين' : 'Lucky Points'} />
      
      <main className="flex-1 px-4 py-4 pb-20 space-y-5">
        {/* Explanation Text */}
        <p className="text-sm text-muted-foreground text-center">
          {isRTL 
            ? 'نقاط المحظوظين يتم منحها عشوائيًا ولا تعتمد على الترتيب أو الأصوات'
            : 'Lucky Points are awarded randomly and are not based on ranking or votes'
          }
        </p>

        {/* How to Earn Points Button */}
        <Button
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
          onClick={() => setShowEarnPointsSheet(true)}
        >
          <HelpCircle className="h-4 w-4" />
          {isRTL ? 'كيف تكسب النقاط؟' : 'How to Earn Points?'}
        </Button>

        {/* Cycle Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <CycleProgressCard
            currentDay={spotlightData.currentDay}
            totalDays={spotlightData.totalDays}
            currentWeek={spotlightData.currentWeek}
            totalWeeks={spotlightData.totalWeeks}
          />
        </motion.div>

        {/* User Points Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <UserPointsCard
            dailyPoints={spotlightData.userDailyPoints}
            weeklyPoints={spotlightData.userWeeklyPoints}
            cyclePoints={spotlightData.userCyclePoints}
            userRank={user.rank}
            rankPosition={spotlightData.userRankPosition}
            totalInRank={spotlightData.totalInRank}
            onInfoClick={() => setShowEarnPointsSheet(true)}
          />
        </motion.div>

        {/* Daily Lucky Winners with Countdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <DailyLuckyWinnersCard
            totalPool={spotlightData.dailyPool}
            winners={spotlightData.dailyWinners}
            nextDrawTime={spotlightData.nextDrawTime}
          />
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <HowItWorksCard />
        </motion.div>

        {/* Tier Ranking */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <TierRankingList
            userRank={user.rank}
            rankings={spotlightData.tierRanking}
          />
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
