import { motion } from 'framer-motion';
import { Hash, TrendingUp, Users, AtSign, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { RankBadge } from '@/components/common/RankBadge';
import { ProgressRing } from '@/components/common/ProgressRing';
import { useUser, UserRank } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeamStats } from '@/hooks/useTeamStats';
import { useProfile } from '@/hooks/useProfile';

interface UserIdentityCardProps {
  rankOverride?: UserRank | null;
}

export function UserIdentityCard({ rankOverride }: UserIdentityCardProps) {
  const { user } = useUser();
  const { profile } = useProfile();
  const { language } = useLanguage();
  
  // Get REAL data from database
  const {
    totalCount,
    userActiveWeeks,
    currentWeek,
    totalWeeks,
    ranking,
    loading
  } = useTeamStats();

  // Use override rank for dev testing, otherwise use actual user rank from DB
  const displayRank = rankOverride ?? (profile?.rank as UserRank) ?? user.rank;
  
  // Calculate activity from REAL data
  const activityPercent = currentWeek > 0 
    ? Math.round((userActiveWeeks / currentWeek) * 100) 
    : 0;

  // Use real ranking from DB, show "-" if not available
  const weeklyRank = ranking?.country_rank ?? null;

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-br from-muted-foreground/90 to-muted-foreground/70 p-5">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

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
              <h2 className="text-white text-xl font-bold mb-0.5">
                {user.name}
              </h2>
              {profile?.username && (
                <div className="flex items-center gap-1 text-white/70 text-sm mb-1">
                  <AtSign className="h-3 w-3" />
                  <span>{profile.username}</span>
                </div>
              )}
              <RankBadge rank={displayRank} size="sm" />
            </div>

            {/* Activity Ring */}
            <ProgressRing progress={activityPercent} size={60} strokeWidth={5}>
              <span className="text-white text-sm font-bold">
                {activityPercent}%
              </span>
            </ProgressRing>
          </div>

          {/* Stats Row - ALL FROM REAL DATABASE */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {/* Rank - Real from DB */}
            <div className="bg-white/95 rounded-lg p-2 text-center shadow-sm">
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <Hash className="h-3 w-3" />
                <span className="text-[10px] font-medium">
                  {language === 'ar' ? 'الترتيب' : 'Rank'}
                </span>
              </div>
              <p className="text-primary text-lg font-bold">
                {weeklyRank ? `#${weeklyRank}` : '-'}
              </p>
            </div>
            
            {/* Activity - Real from DB */}
            <div className="bg-white/20 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-white/70">
                <TrendingUp className="h-3 w-3" />
                <span className="text-[10px]">
                  {language === 'ar' ? 'النشاط' : 'Activity'}
                </span>
              </div>
              <p className="text-white text-lg font-bold">
                {userActiveWeeks}/{totalWeeks}
              </p>
            </div>
            
            {/* Team Size - Real from DB */}
            <div className="bg-white/20 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-white/70">
                <Users className="h-3 w-3" />
                <span className="text-[10px]">
                  {language === 'ar' ? 'الفريق' : 'Team'}
                </span>
              </div>
              <p className="text-white text-lg font-bold">{totalCount}</p>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
