import { motion } from 'framer-motion';
import { Target, CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RankBadge } from '@/components/common/RankBadge';
import { useUser, UserRank } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';

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
  descriptionEn: 'Recruit 3 active subscribers',
  descriptionAr: 'أحضر 3 مشتركين نشطين',
};

// ═══════════════════════════════════════════════════════════════════════════
// RANK: مسوّق (MARKETER) → قائد (LEADER)
// ═══════════════════════════════════════════════════════════════════════════
const marketerRequirements = {
  nextRank: 'leader' as UserRank,
  directRequired: 10,
  requirementType: 'direct_marketers',
  descriptionEn: 'Have 10 direct marketers',
  descriptionAr: 'لديك 10 مسوّقين مباشرين',
};

// ═══════════════════════════════════════════════════════════════════════════
// RANK: قائد (LEADER) → مدير (MANAGER)
// ═══════════════════════════════════════════════════════════════════════════
const leaderRequirements = {
  nextRank: 'manager' as UserRank,
  directRequired: 10,
  requirementType: 'direct_leaders',
  descriptionEn: 'Have 10 direct leaders',
  descriptionAr: 'لديك 10 قادة مباشرين',
};

// ═══════════════════════════════════════════════════════════════════════════
// RANK: مدير (MANAGER) → رئيس (PRESIDENT)
// ═══════════════════════════════════════════════════════════════════════════
const managerRequirements = {
  nextRank: 'president' as UserRank,
  directRequired: 10,
  requirementType: 'managers_and_points',
  descriptionEn: '10+ managers + top spotlight points',
  descriptionAr: '10+ مديرين + أعلى نقاط الأضواء',
};

// ═══════════════════════════════════════════════════════════════════════════
// RANK: رئيس (PRESIDENT) - TOP RANK
// ═══════════════════════════════════════════════════════════════════════════
const presidentRequirements = {
  nextRank: null,
  directRequired: 0,
  requirementType: 'none',
  descriptionEn: 'Top rank achieved!',
  descriptionAr: 'أعلى رتبة!',
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
  activeDirectCount: number;
  rankOverride?: UserRank | null;
}

export function PromotionCard({ activeDirectCount, rankOverride }: PromotionCardProps) {
  const { user } = useUser();
  const { language } = useLanguage();
  
  // Use override rank for dev testing, otherwise use actual user rank
  const displayRank = rankOverride ?? user.rank;

  const currentPromotion = promotionRequirements[displayRank];
  
  // ═══════════════════════════════════════════════════════════════════════
  // PRESIDENT VIEW - Top rank achieved
  // ═══════════════════════════════════════════════════════════════════════
  if (!currentPromotion.nextRank) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 flex items-center justify-center text-2xl shadow-lg">
              👑
            </div>
            <div>
              <p className="font-bold text-amber-700">
                {language === 'ar' ? 'أعلى رتبة!' : 'Top Rank!'}
              </p>
              <p className="text-sm text-amber-600">
                {language === 'ar' ? 'أنت رئيس WINOVA' : 'You are a WINOVA President'}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PROMOTION PROGRESS VIEW - For all other ranks
  // ═══════════════════════════════════════════════════════════════════════
  const promotionProgress = Math.min(100, (activeDirectCount / currentPromotion.directRequired) * 100);
  const remaining = Math.max(0, currentPromotion.directRequired - activeDirectCount);
  const achieved = Math.min(activeDirectCount, currentPromotion.directRequired);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
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
    </motion.div>
  );
}
