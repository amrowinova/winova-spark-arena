import { useState } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, Loader2 } from 'lucide-react';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSpotlight } from '@/hooks/useSpotlight';
import { OnboardingTip } from '@/components/ui/OnboardingTip';
import {
  CycleProgressCard,
  UserPointsCard,
  DailyLuckyWinnersCard,
  HowItWorksCard,
  HowToEarnPointsSheet,
  WeeklyPerformanceCard,
} from '@/components/spotlight';

function SpotlightContent() {
  const { user } = useUser();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [showEarnPointsSheet, setShowEarnPointsSheet] = useState(false);

  // Use real data from database
  const spotlightData = useSpotlight();

  if (spotlightData.loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <InnerPageHeader title={isRTL ? 'نقاط المحظوظين' : 'Lucky Points'} />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">
              {isRTL ? 'جاري التحميل...' : 'Loading...'}
            </p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InnerPageHeader title={isRTL ? 'نقاط المحظوظين' : 'Lucky Points'} />
      
      <main className="flex-1 px-4 py-4 pb-20 space-y-5">
        {/* First-visit onboarding — shown once, explains the draw system */}
        <OnboardingTip tipType="spotlight_first" condition={true} />

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
            daysRemaining={spotlightData.daysRemaining}
            progressPercentage={spotlightData.progressPercentage}
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
            yesterdayWinners={spotlightData.yesterdayWinners}
            yesterdayPool={spotlightData.yesterdayPool}
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

export default function SpotlightPage() {
  return <SpotlightContent />;
}
