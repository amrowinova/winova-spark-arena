import { motion } from 'framer-motion';
import { Target, CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RankBadge } from '@/components/common/RankBadge';
import { useUser, UserRank } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRankBasedData } from '@/hooks/useRankBasedData';
import {
  SubscriberScreen,
  MarketerScreen,
  LeaderScreen,
  ManagerScreen,
  PresidentScreen,
  UnifiedPrinciple,
} from './ranks';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RANK SYSTEM - DEVELOPER REFERENCE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * RANKS (in order):
 * 1. مشترك (Subscriber)  → Entry level
 * 2. مسوّق (Marketer)    → 3 active direct subscribers
 * 3. قائد (Leader)       → 10 direct marketers
 * 4. مدير (Manager)      → 10 direct leaders
 * 5. رئيس (President)    → 10+ managers + highest spotlight points
 * 
 * USER VIEW LOGIC:
 * - User ONLY sees their current rank
 * - No tabs or rank switching visible to user
 * - View automatically updates on promotion
 * - Promotion progress shows requirements for NEXT rank only
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// RANK: مشترك (SUBSCRIBER) → مسوّق (MARKETER)
// ═══════════════════════════════════════════════════════════════════════════
const subscriberRequirements = {
  nextRank: 'marketer' as UserRank,
  directRequired: 3,
  requirementType: 'active_subscribers',
  descriptionEn: 'Bring 3 active subscribers',
  descriptionAr: 'أحضر 3 مشتركين نشيطين',
};

// ═══════════════════════════════════════════════════════════════════════════
// RANK: مسوّق (MARKETER) → قائد (LEADER)
// ═══════════════════════════════════════════════════════════════════════════
const marketerRequirements = {
  nextRank: 'leader' as UserRank,
  directRequired: 10,
  requirementType: 'direct_marketers',
  descriptionEn: 'Bring 10 direct active marketers',
  descriptionAr: 'أحضر 10 مسوّقين مباشرين نشيطين',
};

// ═══════════════════════════════════════════════════════════════════════════
// RANK: قائد (LEADER) → مدير (MANAGER)
// ═══════════════════════════════════════════════════════════════════════════
const leaderRequirements = {
  nextRank: 'manager' as UserRank,
  directRequired: 10,
  requirementType: 'direct_leaders',
  descriptionEn: 'Promote 10 direct active Leaders',
  descriptionAr: 'رقِّ 10 قادة مباشرين نشيطين',
};

// ═══════════════════════════════════════════════════════════════════════════
// RANK: مدير (MANAGER) → رئيس (PRESIDENT)
// ═══════════════════════════════════════════════════════════════════════════
const managerRequirements = {
  nextRank: 'president' as UserRank,
  directRequired: 10,
  requirementType: 'managers_and_points',
  descriptionEn: 'Promote 10 direct Managers + be top in points',
  descriptionAr: 'رقِّ 10 مدراء مباشرين وكن من الأعلى نقاطًا',
};

// ═══════════════════════════════════════════════════════════════════════════
// RANK: رئيس (PRESIDENT) - TOP RANK
// ═══════════════════════════════════════════════════════════════════════════
const presidentRequirements = {
  nextRank: null,
  directRequired: 15,
  requirementType: 'maintain_presidency',
  descriptionEn: 'Maintain 15+ active managers + be top in country',
  descriptionAr: 'حافظ على +15 مدير نشيط وكن الأعلى نقاطًا في الدولة',
};

// Combined requirements map
const promotionRequirements: Record<UserRank, typeof subscriberRequirements> = {
  subscriber: subscriberRequirements,
  marketer: marketerRequirements,
  leader: leaderRequirements,
  manager: managerRequirements,
  president: presidentRequirements,
};

interface PromotionCardProps {
  rankOverride?: UserRank | null;
}

export function PromotionCard({ rankOverride }: PromotionCardProps) {
  const { user } = useUser();
  const { language } = useLanguage();
  
  // Use override rank for dev testing, otherwise use actual user rank
  const displayRank = rankOverride ?? user.rank;
  const rankData = useRankBasedData(displayRank);

  const currentPromotion = promotionRequirements[displayRank];
  
  // ═══════════════════════════════════════════════════════════════════════
  // PRESIDENT VIEW - Full President Screen
  // ═══════════════════════════════════════════════════════════════════════
  if (!currentPromotion.nextRank) {
    return (
      <div className="space-y-4">
        <PresidentScreen language={language} country={user.country} />
        <UnifiedPrinciple language={language} />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PROMOTION PROGRESS VIEW - For all other ranks
  // ═══════════════════════════════════════════════════════════════════════
  // Use rank-based data for progress calculations
  const activeDirectCount = rankData.directTeamActiveCount;
  const promotionProgress = Math.min(100, rankData.promotionProgress);
  const remaining = Math.max(0, currentPromotion.directRequired - activeDirectCount);
  const achieved = Math.min(activeDirectCount, currentPromotion.directRequired);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="space-y-4"
    >
      {/* Promotion Progress Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {language === 'ar' ? 'تقدّم الترقية' : 'Promotion Progress'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current → Next Rank with Progress */}
          <div className="flex items-center gap-3">
            <RankBadge rank={displayRank} size="sm" />
            <div className="flex-1">
              <Progress value={promotionProgress} className="h-2.5" />
            </div>
            <RankBadge rank={currentPromotion.nextRank} size="sm" />
          </div>

          {/* Progress Stats - Clear Numbers */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {language === 'ar' ? 'التقدم' : 'Progress'}
              </span>
              <span className="text-lg font-bold text-primary">
                {Math.round(promotionProgress)}%
              </span>
            </div>
            
            {/* Achieved vs Required */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'تم إنجازه' : 'Achieved'}
                  </p>
                  <p className="font-bold text-primary">{achieved}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'المتبقي' : 'Remaining'}
                  </p>
                  <p className="font-bold text-foreground">{remaining}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Requirement Description */}
          <div className="text-center py-2 px-3 bg-primary/5 rounded-lg border border-primary/10">
            <p className="text-sm text-muted-foreground">
              {language === 'ar' ? 'المطلوب:' : 'Requirement:'}
            </p>
            <p className="font-medium text-foreground mt-1">
              {language === 'ar' 
                ? currentPromotion.descriptionAr 
                : currentPromotion.descriptionEn}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rank-specific educational content */}
      {displayRank === 'subscriber' && (
        <SubscriberScreen language={language} referralCode={user.referralCode} />
      )}
      
      {displayRank === 'marketer' && (
        <MarketerScreen language={language} referralCode={user.referralCode} />
      )}
      
      {displayRank === 'leader' && (
        <LeaderScreen language={language} />
      )}
      
      {displayRank === 'manager' && (
        <ManagerScreen language={language} />
      )}

      {/* Unified Principle - shown for all ranks except president */}
      <UnifiedPrinciple language={language} />
    </motion.div>
  );
}
