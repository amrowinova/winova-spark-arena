import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, Calendar, Award, Zap, Target, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDailyStreak } from '@/hooks/useDailyStreak';
import { toast } from 'sonner';

interface StreakDisplayProps {
  className?: string;
  showDetails?: boolean;
}

export function StreakDisplay({ className = "", showDetails = false }: StreakDisplayProps) {
  const { language } = useLanguage();
  const { streak, claimStreakReward } = useDailyStreak();
  const isRTL = language === 'ar';

  const [isClaiming, setIsClaiming] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  const handleClaimReward = async () => {
    if (!streak?.reward || streak?.already_done) return;
    
    setIsClaiming(true);
    try {
      await claimStreakReward();
      setShowAnimation(true);
      setTimeout(() => setShowAnimation(false), 2000);
    } catch (error) {
      console.error('Error claiming reward:', error);
    } finally {
      setIsClaiming(false);
    }
  };

  const getStreakLevel = (days: number) => {
    if (days >= 30) return { level: 'Master', color: 'text-purple-600', bg: 'bg-purple-100', emoji: '👑' };
    if (days >= 14) return { level: 'Expert', color: 'text-orange-600', bg: 'bg-orange-100', emoji: '🔥' };
    if (days >= 7) return { level: 'Pro', color: 'text-blue-600', bg: 'bg-blue-100', emoji: '⭐' };
    if (days >= 3) return { level: 'Rising', color: 'text-green-600', bg: 'bg-green-100', emoji: '📈' };
    return { level: 'Beginner', color: 'text-gray-600', bg: 'bg-gray-100', emoji: '🌱' };
  };

  const getProgressToNextMilestone = (current: number) => {
    const milestones = [3, 7, 14, 30];
    const nextMilestone = milestones.find(m => m > current) || 60;
    const prevMilestone = milestones.filter(m => m <= current).pop() || 0;
    const progress = ((current - prevMilestone) / (nextMilestone - prevMilestone)) * 100;
    return { progress, nextMilestone, prevMilestone };
  };

  if (!streak) return null;

  const streakLevel = getStreakLevel(streak.current_streak);
  const progressData = getProgressToNextMilestone(streak.current_streak);

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-4">
        {/* Main Streak Display */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`relative`}>
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center"
              >
                <Flame className="h-6 w-6 text-white" />
              </motion.div>
              
              {showAnimation && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 1 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Zap className="h-8 w-8 text-yellow-400" />
                </motion.div>
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">
                  {streak.current_streak} {isRTL ? 'يوم' : 'days'}
                </h3>
                <Badge className={`${streakLevel.bg} ${streakLevel.color} text-xs`}>
                  {streakLevel.emoji} {streakLevel.level}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {isRTL ? `أفضل: ${streak.longest_streak} يوم` : `Best: ${streak.longest_streak} days`}
              </p>
            </div>
          </div>

          {/* Claim Reward Button */}
          {streak.reward > 0 && !streak.already_done && (
            <Button
              onClick={handleClaimReward}
              disabled={isClaiming}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
            >
              {isClaiming ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {isRTL ? 'جاري...' : 'Claiming...'}
                </>
              ) : (
                <>
                  <Award className="h-4 w-4 mr-2" />
                  {isRTL ? 'استلم' : 'Claim'} {streak.reward} И
                </>
              )}
            </Button>
          )}
        </div>

        {/* Progress to Next Milestone */}
        {showDetails && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {isRTL ? `التقدم لـ ${progressData.nextMilestone} يوم` : `Progress to ${progressData.nextMilestone} days`}
              </span>
              <span className="font-medium">{Math.round(progressData.progress)}%</span>
            </div>
            <Progress value={progressData.progress} className="h-2" />
          </div>
        )}

        {/* Weekly Calendar */}
        {showDetails && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium text-sm">
                {isRTL ? 'الأسبوع الحالي' : 'This Week'}
              </h4>
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => {
                const isActive = streak.current_streak > 0 && index < (streak.current_streak % 7);
                const isToday = index === (new Date().getDay() + 6) % 7;
                
                return (
                  <div
                    key={day}
                    className={`text-center p-1 rounded-lg ${
                      isToday ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <div className={`text-xs text-muted-foreground mb-1`}>
                      {day}
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        isActive
                          ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {isActive && <Flame className="h-3 w-3" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Milestone Rewards */}
        {showDetails && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium text-sm">
                {isRTL ? 'مكافآت الأيام' : 'Day Milestones'}
              </h4>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {[3, 7, 14, 30].map((day) => {
                const achieved = streak.current_streak >= day;
                const reward = day * 2; // 2 Nova per day
                
                return (
                  <div
                    key={day}
                    className={`p-2 rounded-lg border ${
                      achieved
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {day} {isRTL ? 'يوم' : 'days'}
                      </span>
                      {achieved ? (
                        <Badge variant="secondary" className="text-xs">
                          ✓
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {reward} И
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-orange-600">
                  {streak.current_streak}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'حالي' : 'Current'}
                </p>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {streak.longest_streak}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'أطول' : 'Longest'}
                </p>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">
                  {streak.total_days || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'إجمالي' : 'Total'}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
