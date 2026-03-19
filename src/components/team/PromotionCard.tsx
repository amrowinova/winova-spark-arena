import { motion } from 'framer-motion';
import { Target, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RankBadge } from '@/components/common/RankBadge';
import { useUser, UserRank } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeamStats } from '@/hooks/useTeamStats';
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
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Rank requirements configuration
const promotionRequirements: Record<UserRank, {
  nextRank: UserRank | null;
  directRequired: number;
  descriptionEn: string;
  descriptionAr: string;
}> = {
  subscriber: {
    nextRank: 'marketer',
    directRequired: 3,
    descriptionEn: 'Bring 3 active subscribers',
    descriptionAr: 'أحضر 3 مشتركين نشيطين',
  },
  marketer: {
    nextRank: 'leader',
    directRequired: 10,
    descriptionEn: 'Bring 10 direct active marketers',
    descriptionAr: 'أحضر 10 مسوّقين مباشرين نشيطين',
  },
  leader: {
    nextRank: 'manager',
    directRequired: 10,
    descriptionEn: 'Promote 10 direct active Leaders',
    descriptionAr: 'رقِّ 10 قادة مباشرين نشيطين',
  },
  manager: {
    nextRank: 'president',
    directRequired: 10,
    descriptionEn: 'Have 10+ active direct managers + win the end-of-cycle competition',
    descriptionAr: 'امتلك 10+ مدير مباشر نشيط + فز بمنافسة نهاية الدورة',
  },
  president: {
    nextRank: null,
    directRequired: 15,
    descriptionEn: 'Defend your position each cycle — re-elected based on team strength & activity',
    descriptionAr: 'يُعاد انتخاب الرئيس كل دورة حسب قوة الفريق والنشاط — منافسة مفتوحة بين المدراء',
  },
};

export function PromotionCard() {
  const { user } = useUser();
  const { language } = useLanguage();
  const { 
    activeDirectCount, 
    directCount,
    userRank,
    loading 
  } = useTeamStats();
  
  // Use real rank from DB, fallback to context, then to 'subscriber'
  const rawRank = (userRank as UserRank) || user.rank;
  const displayRank: UserRank = rawRank in promotionRequirements ? rawRank : 'subscriber';
  const currentPromotion = promotionRequirements[displayRank];

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  // President view - top rank
  if (!currentPromotion.nextRank) {
    return (
      <div className="space-y-4">
        <PresidentScreen language={language} country={user.country} />
        <UnifiedPrinciple language={language} />
      </div>
    );
  }

  // Calculate progress from real data
  const achieved = Math.min(activeDirectCount, currentPromotion.directRequired);
  const remaining = Math.max(0, currentPromotion.directRequired - activeDirectCount);
  const promotionProgress = Math.min(100, Math.round((activeDirectCount / currentPromotion.directRequired) * 100));

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

          {/* Progress Stats - Real Numbers */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {language === 'ar' ? 'التقدم' : 'Progress'}
              </span>
              <span className="text-lg font-bold text-primary">
                {promotionProgress}%
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
