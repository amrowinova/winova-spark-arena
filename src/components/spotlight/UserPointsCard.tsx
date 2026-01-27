import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { RankBadge } from '@/components/common/RankBadge';
import type { UserRank } from '@/contexts/UserContext';

interface UserPointsCardProps {
  dailyPoints: number;
  cyclePoints: number;
  userRank: UserRank;
  rankPosition: number;
  totalInRank: number;
  onInfoClick?: () => void;
}

const rankLabels: Record<UserRank, { ar: string; en: string }> = {
  subscriber: { ar: 'مشترك', en: 'Subscriber' },
  marketer: { ar: 'مسوّق', en: 'Marketer' },
  leader: { ar: 'قائد', en: 'Leader' },
  manager: { ar: 'مدير', en: 'Manager' },
  president: { ar: 'رئيس', en: 'President' },
};

export function UserPointsCard({
  dailyPoints,
  cyclePoints,
  userRank,
  rankPosition,
  totalInRank,
  onInfoClick,
}: UserPointsCardProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      <div className="bg-gradient-nova p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-nova-foreground" />
            <h1 className="text-nova-foreground text-lg font-bold">
              {isRTL ? 'نقاطك' : 'Your Points'}
            </h1>
          </div>
        </div>

        {/* Points Grid */}
        <div className="grid grid-cols-2 gap-3 text-center mb-4">
          <div className="bg-card/20 rounded-lg p-3">
            <p className="text-nova-foreground text-2xl font-bold">
              {dailyPoints.toLocaleString()}
            </p>
            <p className="text-nova-foreground/60 text-xs">
              {isRTL ? 'نقاط اليوم' : "Today's Points"}
            </p>
          </div>
          <div className="bg-card/20 rounded-lg p-3">
            <p className="text-nova-foreground text-2xl font-bold">
              {cyclePoints.toLocaleString()}
            </p>
            <p className="text-nova-foreground/60 text-xs">
              {isRTL ? 'مجموع نقاط الدورة' : 'Cycle Total'}
            </p>
          </div>
        </div>

        {/* Rank Position */}
        <div className="bg-card/20 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-nova-foreground" />
            <span className="text-nova-foreground text-sm">
              {isRTL ? 'ترتيبك' : 'Your Rank'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-nova-foreground font-bold">
              {isRTL ? rankLabels[userRank].ar : rankLabels[userRank].en} #{rankPosition}
            </span>
            <span className="text-nova-foreground/60 text-xs">
              / {totalInRank}
            </span>
            {onInfoClick && (
              <button
                onClick={onInfoClick}
                className="p-1 rounded-full hover:bg-card/30 transition-colors"
              >
                <Info className="h-4 w-4 text-nova-foreground/70" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
