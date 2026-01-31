import { motion } from 'framer-motion';
import { Users, TrendingUp, Trophy, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Receipt } from '@/contexts/TransactionContext';

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

export function TeamEarningsCard({ receipt, onClick }: TeamEarningsCardProps) {
  const { language } = useLanguage();
  const earnings = receipt.teamEarnings;
  
  if (!earnings) return null;

  const rankInfo = rankLabels[earnings.rank] || { en: earnings.rank, ar: earnings.rank, icon: '🔵' };

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
      <Card className="p-3 hover:bg-muted/30 transition-colors border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-foreground">
                {language === 'ar' ? 'أرباح الفريق' : 'Team Earnings'}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
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

            {/* Breakdown */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>
                {earnings.participantCount} {language === 'ar' ? 'مشارك' : 'participants'} × {earnings.ratePerParticipant} Nova
              </span>
            </div>
          </div>

          {/* Amount */}
          <div className="text-end">
            <p className="font-bold text-sm text-primary">
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
