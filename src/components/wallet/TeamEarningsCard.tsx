import { motion } from 'framer-motion';
import { Users, TrendingUp, Trophy, ChevronRight, Lock, Unlock, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Receipt } from '@/contexts/TransactionContext';
import { getNextReleaseDate } from './LockedEarningsCard';

interface TeamEarningsCardProps {
  receipt: Receipt;
  onClick?: () => void;
}

const rankLabels: Record<string, { en: string; ar: string; icon: string }> = {
  leader: { en: 'Leader', ar: 'قائد', icon: '⭐' },
  manager: { en: 'Manager', ar: 'مدير', icon: '💎' },
  president: { en: 'President', ar: 'رئيس', icon: '👑' },
};

// Format number - remove decimals if whole number
const formatAmount = (value: number): string => {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
};

/**
 * Calculate release date for a specific earning based on its creation date
 * Profit before 15th → released 15th
 * Profit 15-29 → released 30th
 * Profit 30-31 → released 15th of next month
 */
function getEarningReleaseDate(createdAt: Date): { date: Date; formattedDate: string; formattedDateAr: string; isReleased: boolean } {
  const earningDate = new Date(createdAt);
  const day = earningDate.getDate();
  const month = earningDate.getMonth();
  const year = earningDate.getFullYear();
  const now = new Date();

  let releaseDate: Date;

  if (day < 15) {
    releaseDate = new Date(year, month, 15);
  } else if (day < 30) {
    releaseDate = new Date(year, month, 30);
  } else {
    releaseDate = new Date(year, month + 1, 15);
  }

  const isReleased = now >= releaseDate;

  const formattedDate = releaseDate.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  });

  const formattedDateAr = releaseDate.toLocaleDateString('ar-SA', {
    day: 'numeric',
    month: 'short',
  });

  return { date: releaseDate, formattedDate, formattedDateAr, isReleased };
}

export function TeamEarningsCard({ receipt, onClick }: TeamEarningsCardProps) {
  const { language } = useLanguage();
  const earnings = receipt.teamEarnings;
  
  if (!earnings) return null;

  const rankInfo = rankLabels[earnings.rank] || { en: earnings.rank, ar: earnings.rank, icon: '🔵' };
  const releaseInfo = getEarningReleaseDate(receipt.createdAt);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className={`p-3 hover:bg-muted/30 transition-colors ${releaseInfo.isReleased ? 'border-primary/20 bg-primary/5' : 'border-warning/20 bg-warning/5'}`}>
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${releaseInfo.isReleased ? 'bg-primary/10' : 'bg-warning/10'}`}>
            <Users className={`h-5 w-5 ${releaseInfo.isReleased ? 'text-primary' : 'text-warning'}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-sm font-medium text-foreground">
                {language === 'ar' ? 'أرباح الفريق' : 'Team Earnings'}
              </span>
              {/* Lock/Released Status */}
              {releaseInfo.isReleased ? (
                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary flex items-center gap-1">
                  <Unlock className="h-2.5 w-2.5" />
                  {language === 'ar' ? 'مُفرج' : 'Released'}
                </span>
              ) : (
                <span className="text-xs px-1.5 py-0.5 rounded bg-warning/10 text-warning flex items-center gap-1">
                  <Lock className="h-2.5 w-2.5" />
                  {language === 'ar' ? 'مقفل' : 'Locked'}
                </span>
              )}
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {rankInfo.icon} {language === 'ar' ? rankInfo.ar : rankInfo.en}
              </span>
            </div>

            {/* Contest info */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Trophy className="h-3 w-3" />
              <span>
                {language === 'ar' ? `مسابقة #${earnings.contestNumber}` : `Contest #${earnings.contestNumber}`}
              </span>
              <span>•</span>
              <span>{earnings.country}</span>
            </div>

            {/* Release date - only show if locked */}
            {!releaseInfo.isReleased && (
              <div className="flex items-center gap-1 text-xs text-warning">
                <Calendar className="h-3 w-3" />
                <span>
                  {language === 'ar' 
                    ? `الإفراج: ${releaseInfo.formattedDateAr}`
                    : `Release: ${releaseInfo.formattedDate}`}
                </span>
              </div>
            )}

            {/* Breakdown */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3" />
              <span>
                {earnings.participantCount} {language === 'ar' ? 'مشارك' : 'participants'} × {earnings.ratePerParticipant} Nova
              </span>
            </div>
          </div>

          {/* Amount */}
          <div className="text-end">
            <p className={`font-bold text-sm ${releaseInfo.isReleased ? 'text-primary' : 'text-warning'}`}>
              +<span className="text-nova">И</span> {formatAmount(receipt.amount)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(receipt.createdAt)}
            </p>
          </div>

          <ChevronRight className="h-4 w-4 text-muted-foreground/50 self-center" />
        </div>
      </Card>
    </motion.div>
  );
}
