import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Gift, CheckCircle2, Loader2, Star, Zap, Trophy, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDailyMissions, type DailyMission } from '@/hooks/useDailyMissions';
import { useDailyStreak } from '@/hooks/useDailyStreak';
import { useNavigate } from 'react-router-dom';

interface DailyMissionsCardProps {
  isOwnProfile?: boolean;
  className?: string;
}

export function DailyMissionsCard({ 
  isOwnProfile = true, 
  className = "" 
}: DailyMissionsCardProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  const { missions, loading, fetchMissions } = useDailyMissions();
  const { streak } = useDailyStreak();

  if (!isOwnProfile) return null; // Only show on own profile

  const completedCount = missions?.filter(m => m.completed).length || 0;
  const totalCount = missions?.length || 4;
  const progress = (completedCount / totalCount) * 100;
  const canClaimReward = streak?.reward > 0 && !streak?.already_done;

  const handleViewAll = () => {
    navigate('/missions');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className={className}
    >
      <Card className="overflow-hidden border-gradient-to-r from-purple-500/30 to-orange-500/30 bg-gradient-to-br from-purple-500/5 to-orange-500/5">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-orange-500/20 flex items-center justify-center">
                <Gift className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {isRTL ? 'المهام اليومية' : 'Daily Missions'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? `${completedCount}/${totalCount} مكتملة` : `${completedCount}/${totalCount} completed`}
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewAll}
              className="text-xs"
            >
              {isRTL ? 'عرض الكل' : 'View All'}
            </Button>
          </div>

          {/* Progress */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {isRTL ? 'التقدم اليومي' : "Today's Progress"}
              </span>
              <span className="font-medium">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Streak Info */}
          {streak && (
            <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔥</span>
                  <div>
                    <p className="font-bold text-sm">
                      {isRTL ? `${streak.current_streak} يوم متواصل` : `${streak.current_streak} day streak`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? `أفضل: ${streak.longest_streak} يوم` : `Best: ${streak.longest_streak} days`}
                    </p>
                  </div>
                </div>
                
                {canClaimReward && (
                  <Button
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <Gift className="h-3 w-3 mr-1" />
                    {isRTL ? 'استلم' : 'Claim'}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Quick Mission Preview */}
          {missions && missions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">
                {isRTL ? 'المهام المتاحة:' : 'Available Missions:'}
              </p>
              
              <div className="grid gap-2">
                {missions.slice(0, 2).map((mission) => (
                  <div
                    key={mission.id}
                    className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg"
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      mission.completed 
                        ? 'bg-green-500/20 text-green-600' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {mission.completed ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-current" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {isRTL ? mission.title_ar : mission.title_en}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {mission.reward_nova} И
                      </p>
                    </div>
                    
                    {!mission.completed && (
                      <Badge variant="secondary" className="text-xs">
                        {isRTL ? 'جديد' : 'New'}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              
              {missions.length > 2 && (
                <p className="text-xs text-muted-foreground text-center">
                  {isRTL ? `+${missions.length - 2} مهام أخرى` : `+${missions.length - 2} more missions`}
                </p>
              )}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Empty State */}
          {!loading && (!missions || missions.length === 0) && (
            <div className="text-center py-4">
              <Gift className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'لا توجد مهام اليوم' : 'No missions today'}
              </p>
            </div>
          )}

          {/* Action Button */}
          <div className="mt-4 pt-3 border-t border-border/50">
            <Button
              onClick={handleViewAll}
              className="w-full"
              variant="outline"
              size="sm"
            >
              <Gift className="h-3 w-3 mr-1" />
              {isRTL ? 'عرض جميع المهام' : 'View All Missions'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
