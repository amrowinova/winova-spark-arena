import { motion } from 'framer-motion';
import { Target, ChevronRight, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RankBadge } from '@/components/common/RankBadge';
import { useUser, UserRank } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';

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
    descriptionAr: 'أحضر 3 مشتركين نشطين'
  },
  marketer: { 
    nextRank: 'leader', 
    directRequired: 10, 
    descriptionEn: 'Bring 10 direct marketers',
    descriptionAr: 'أحضر 10 مسوّقين مباشرين'
  },
  leader: { 
    nextRank: 'manager', 
    directRequired: 10, 
    descriptionEn: 'Bring 10 direct leaders',
    descriptionAr: 'أحضر 10 قادة مباشرين'
  },
  manager: { 
    nextRank: 'president', 
    directRequired: 10, 
    descriptionEn: '10+ managers + highest spotlight points',
    descriptionAr: '10+ مديرين + أعلى نقاط أضواء'
  },
  president: { 
    nextRank: null, 
    directRequired: 0, 
    descriptionEn: 'Top rank achieved!',
    descriptionAr: 'أعلى رتبة!'
  },
};

interface PromotionCardProps {
  activeDirectCount: number;
}

export function PromotionCard({ activeDirectCount }: PromotionCardProps) {
  const { user } = useUser();
  const { language } = useLanguage();

  const currentPromotion = promotionRequirements[user.rank];
  
  if (!currentPromotion.nextRank) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="p-4 bg-gradient-nova/10 border-nova/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-nova flex items-center justify-center text-2xl">
              🏆
            </div>
            <div>
              <p className="font-bold text-nova">
                {language === 'ar' ? 'أعلى رتبة!' : 'Top Rank!'}
              </p>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'أنت رئيس WINOVA' : 'You are a WINOVA President'}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  const promotionProgress = Math.min(100, (activeDirectCount / currentPromotion.directRequired) * 100);
  const remaining = Math.max(0, currentPromotion.directRequired - activeDirectCount);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {language === 'ar' ? 'تقدم الترقية' : 'Promotion Progress'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Rank Progress */}
          <div className="flex items-center justify-between mb-4">
            <RankBadge rank={user.rank} size="sm" />
            <div className="flex-1 mx-4 flex items-center gap-2">
              <Progress value={promotionProgress} className="h-3 flex-1" />
              <span className="text-sm font-bold text-primary">
                {Math.round(promotionProgress)}%
              </span>
            </div>
            <RankBadge rank={currentPromotion.nextRank} size="sm" />
          </div>

          {/* Progress Details */}
          <div className="flex items-center justify-between mb-3 text-sm">
            <span className="text-muted-foreground">
              {language === 'ar' ? 'أعضاء نشطون' : 'Active members'}
            </span>
            <span className="font-bold">
              {activeDirectCount} / {currentPromotion.directRequired}
            </span>
          </div>

          {/* Remaining */}
          {remaining > 0 && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-primary">
                    {language === 'ar' 
                      ? `تحتاج ${remaining} أعضاء نشطين إضافيين`
                      : `Need ${remaining} more active members`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'ar' 
                      ? currentPromotion.descriptionAr 
                      : currentPromotion.descriptionEn}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
