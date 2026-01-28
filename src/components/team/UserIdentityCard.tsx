import { motion } from 'framer-motion';
import { Hash, TrendingUp, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { RankBadge } from '@/components/common/RankBadge';
import { ProgressRing } from '@/components/common/ProgressRing';
import { useUser, UserRank } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRankBasedData } from '@/hooks/useRankBasedData';

interface UserIdentityCardProps {
  rankOverride?: UserRank | null;
}

export function UserIdentityCard({ rankOverride }: UserIdentityCardProps) {
  const { user } = useUser();
  const { language } = useLanguage();
  
  // Use override rank for dev testing, otherwise use actual user rank
  const displayRank = rankOverride ?? user.rank;
  const rankData = useRankBasedData(displayRank);

  const activityPercent = Math.round((rankData.activeWeeks / rankData.currentWeek) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="overflow-hidden border-0 shadow-lg">
        {/* Lighter dark gradient - using muted instead of pure black */}
        <div className="bg-gradient-to-br from-muted-foreground/90 to-muted-foreground/70 p-5">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center text-3xl">
              👤
            </div>
            
            {/* User Info */}
            <div className="flex-1">
              <h2 className="text-white text-xl font-bold mb-1">
                {user.name}
              </h2>
              <RankBadge rank={displayRank} size="sm" />
            </div>

            {/* Activity Ring */}
            <ProgressRing progress={activityPercent} size={60} strokeWidth={5}>
              <span className="text-white text-sm font-bold">
                {activityPercent}%
              </span>
            </ProgressRing>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {/* Rank - Enhanced visibility with light badge */}
            <div className="bg-white/95 rounded-lg p-2 text-center shadow-sm">
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <Hash className="h-3 w-3" />
                <span className="text-[10px] font-medium">
                  {language === 'ar' ? 'الترتيب' : 'Rank'}
                </span>
              </div>
              <p className="text-primary text-lg font-bold">#{rankData.weeklyRank}</p>
            </div>
            
            <div className="bg-white/20 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-white/70">
                <TrendingUp className="h-3 w-3" />
                <span className="text-[10px]">
                  {language === 'ar' ? 'النشاط' : 'Activity'}
                </span>
              </div>
              <p className="text-white text-lg font-bold">
                {rankData.activeWeeks}/{rankData.totalWeeks}
              </p>
            </div>
            
            <div className="bg-white/20 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-white/70">
                <Users className="h-3 w-3" />
                <span className="text-[10px]">
                  {language === 'ar' ? 'الفريق' : 'Team'}
                </span>
              </div>
              <p className="text-white text-lg font-bold">{rankData.teamSize}</p>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
