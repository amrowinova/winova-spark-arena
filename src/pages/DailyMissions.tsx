/**
 * DailyMissions — Daily quests with mystery box reward.
 * 4 missions per day. Complete 3 → mystery box unlocks.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Gift, CheckCircle2, Loader2, Package, Star, Zap, Trophy, RefreshCw } from 'lucide-react';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDailyMissions, type DailyMission } from '@/hooks/useDailyMissions';
import { useDailyStreak } from '@/hooks/useDailyStreak';

const DAILY_STREAK_REWARDS = [1, 2, 3, 4, 5, 7, 10];

function StreakCard({ streak, isRTL }: { streak: ReturnType<typeof useDailyStreak>['streak']; isRTL: boolean }) {
  if (!streak) return null;
  return (
    <Card className="overflow-hidden border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-nova/10">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🔥</span>
          <div className="flex-1">
            <p className="font-bold text-base">
              {isRTL ? `${streak.current_streak} يوم متواصل` : `${streak.current_streak} day streak`}
            </p>
            <p className="text-xs text-muted-foreground">
              {isRTL ? `أطول سلسلة: ${streak.longest_streak} يوم` : `Best: ${streak.longest_streak} days`}
            </p>
          </div>
          {streak.reward > 0 && !streak.already_done && (
            <div className="text-center">
              <span className="text-xs text-muted-foreground">{isRTL ? 'مكافأة اليوم' : "Today's reward"}</span>
              <p className="text-nova font-bold text-lg">И {streak.reward}</p>
            </div>
          )}
        </div>

        {/* 7-day progress dots */}
        <div className="flex gap-1.5 mt-3 justify-center">
          {DAILY_STREAK_REWARDS.map((reward, i) => {
            const day = i + 1;
            const isDone = streak.current_streak % 7 >= day || (streak.current_streak % 7 === 0 && streak.current_streak > 0);
            const isToday = (streak.current_streak % 7 === day) || (day === 7 && streak.current_streak % 7 === 0 && streak.current_streak > 0);
            return (
              <div key={day} className="flex flex-col items-center gap-0.5">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                  isDone ? 'bg-orange-500 border-orange-500 text-white' :
                  isToday ? 'border-orange-500 text-orange-500' :
                  'border-border text-muted-foreground'
                }`}>
                  {isDone ? '✓' : day}
                </div>
                <span className="text-[9px] text-muted-foreground">И{reward}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function MissionCard({ mission, isRTL, onMark }: {
  mission: DailyMission;
  isRTL: boolean;
  onMark: (code: string) => void;
}) {
  const pct = Math.min(100, Math.round((mission.progress / mission.target) * 100));
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`overflow-hidden ${mission.completed ? 'border-green-500/30 bg-green-500/5' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">{mission.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm">{isRTL ? mission.title_ar : mission.title_en}</p>
                {mission.completed && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isRTL ? mission.desc_ar : mission.desc_en}
              </p>

              {/* Progress bar */}
              {mission.target > 1 && (
                <div className="mt-2 space-y-1">
                  <Progress value={pct} className="h-1.5" />
                  <p className="text-xs text-muted-foreground text-end">
                    {mission.progress}/{mission.target}
                  </p>
                </div>
              )}

              {/* Rewards */}
              <div className="flex items-center gap-2 mt-2">
                {mission.reward_nova > 0 && (
                  <span className="text-xs font-bold text-nova bg-nova/10 px-2 py-0.5 rounded-full">
                    +И {mission.reward_nova}
                  </span>
                )}
                {mission.reward_aura > 0 && (
                  <span className="text-xs font-bold text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full">
                    +✦ {mission.reward_aura}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Manual mark button for share_link mission */}
          {mission.code === 'share_link' && !mission.completed && (
            <Button
              size="sm" variant="outline" className="w-full mt-3 text-xs"
              onClick={() => onMark(mission.code)}
            >
              {isRTL ? 'تأكيد المشاركة' : 'Confirm Share'}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MysteryBoxCard({
  available,
  opened,
  onOpen,
  opening,
  reward,
  isRTL,
}: {
  available: boolean;
  opened: boolean;
  onOpen: () => void;
  opening: boolean;
  reward: { nova: number; aura: number } | null;
  isRTL: boolean;
}) {
  return (
    <Card className={`overflow-hidden border-2 transition-all ${
      available ? 'border-yellow-500/60 bg-gradient-to-br from-yellow-500/10 to-nova/10 shadow-lg' :
      opened ? 'border-green-500/30 bg-green-500/5' :
      'border-border opacity-60'
    }`}>
      <CardContent className="p-5 text-center space-y-3">
        <motion.div
          animate={available ? { rotate: [0, -5, 5, -5, 5, 0], scale: [1, 1.05, 1] } : {}}
          transition={{ repeat: available ? Infinity : 0, repeatDelay: 3, duration: 0.6 }}
        >
          <Package className={`h-12 w-12 mx-auto ${available ? 'text-yellow-500' : opened ? 'text-green-500' : 'text-muted-foreground'}`} />
        </motion.div>

        <div>
          <p className="font-bold text-base">
            {isRTL ? '📦 صندوق الغموض' : '📦 Mystery Box'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {opened ? (isRTL ? 'تم فتحه اليوم' : 'Opened today') :
             available ? (isRTL ? 'جاهز للفتح!' : 'Ready to open!') :
             (isRTL ? 'أكمل 3 مهام لفتحه' : 'Complete 3 missions to unlock')}
          </p>
        </div>

        {reward && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 space-y-1"
          >
            <p className="text-sm font-bold text-yellow-600">🎉 {isRTL ? 'مكافأتك' : 'Your reward'}!</p>
            {reward.nova > 0 && <p className="text-nova font-bold">+И {reward.nova} Nova</p>}
            {reward.aura > 0 && <p className="text-purple-500 font-bold">+✦ {reward.aura} Aura</p>}
          </motion.div>
        )}

        {available && !opening && (
          <Button className="w-full gap-2 bg-gradient-to-r from-yellow-500 to-nova" onClick={onOpen}>
            <Gift className="h-4 w-4" />
            {isRTL ? 'افتح الصندوق' : 'Open Box'}
          </Button>
        )}
        {opening && <Loader2 className="h-6 w-6 animate-spin mx-auto text-yellow-500" />}
      </CardContent>
    </Card>
  );
}

export default function DailyMissionsPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isRTL = language === 'ar' || language === 'ur';

  const { streak } = useDailyStreak();
  const {
    missions, completed_count, box_available, box_opened,
    loading, openingBox, boxReward,
    fetchMissions, recordProgress, openMysteryBox, clearBoxReward,
  } = useDailyMissions();

  const handleMark = async (code: string) => {
    await recordProgress(code, 1);
  };

  const handleOpenBox = async () => {
    clearBoxReward();
    await openMysteryBox();
  };

  return (
    <div className="min-h-screen bg-background pb-24" dir={isRTL ? 'rtl' : 'ltr'}>
      <InnerPageHeader
        title={isRTL ? '🎯 المهام اليومية' : '🎯 Daily Missions'}
        rightAction={
          <Button variant="ghost" size="icon" onClick={fetchMissions}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        }
      />

      <main className="px-4 pt-4 pb-8 space-y-4">
        {/* Streak Card */}
        <StreakCard streak={streak} isRTL={isRTL} />

        {/* Progress bar for missions */}
        {!loading && (
          <div className="flex items-center gap-3 px-1">
            <div className="flex-1">
              <Progress value={(completed_count / 4) * 100} className="h-2" />
            </div>
            <span className="text-sm font-bold text-muted-foreground shrink-0">
              {completed_count}/4 {isRTL ? 'مكتمل' : 'done'}
            </span>
          </div>
        )}

        {/* Missions list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {missions.map((m) => (
              <MissionCard
                key={m.id}
                mission={m}
                isRTL={isRTL}
                onMark={handleMark}
              />
            ))}
          </div>
        )}

        {/* Mystery Box */}
        {!loading && (
          <MysteryBoxCard
            available={box_available}
            opened={box_opened}
            onOpen={handleOpenBox}
            opening={openingBox}
            reward={boxReward}
            isRTL={isRTL}
          />
        )}
      </main>

      <BottomNav />
    </div>
  );
}
