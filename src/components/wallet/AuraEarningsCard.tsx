import { motion } from 'framer-motion';
import { Sparkles, Trophy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Receipt } from '@/contexts/TransactionContext';

interface AuraEarningsCardProps {
  receipt: Receipt;
  onClick?: () => void;
}

export function AuraEarningsCard({ receipt, onClick }: AuraEarningsCardProps) {
  const { language } = useLanguage();
  const earnings = receipt.auraVoteEarnings;
  
  if (!earnings) return null;

  const stageLabel = earnings.stage === 'stage1' 
    ? (language === 'ar' ? 'المرحلة الأولى' : 'Stage 1')
    : (language === 'ar' ? 'المرحلة النهائية' : 'Final Stage');

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
      <Card 
        className="p-4 cursor-pointer hover:shadow-md transition-all bg-aura/5 border-aura/20"
        onClick={onClick}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-full bg-aura/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5 text-aura" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-aura">
                +{receipt.amount} Aura
              </span>
              <span className="text-[10px] text-muted-foreground">
                {formatTime(new Date(receipt.createdAt))}
              </span>
            </div>

            <p className="text-sm font-medium text-foreground mb-0.5">
              {language === 'ar' ? 'أرباح تصويت' : 'Vote Earnings'}
            </p>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Trophy className="h-3 w-3" />
                {stageLabel}
              </span>
              <span>•</span>
              <span>
                {language === 'ar' ? 'المسابقة' : 'Contest'} #{earnings.contestNumber}
              </span>
            </div>

            <p className="text-[10px] text-muted-foreground mt-1">
              {formatDate(new Date(receipt.createdAt))}
            </p>
          </div>
        </div>

        {/* Vote breakdown */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {language === 'ar' ? 'إجمالي الأصوات المستلمة' : 'Total Votes Received'}
            </span>
            <span className="font-medium text-foreground">
              {earnings.totalVotesReceived} {language === 'ar' ? 'صوت' : 'votes'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-muted-foreground">
              {language === 'ar' ? 'نسبة الأرباح' : 'Earnings Rate'}
            </span>
            <span className="font-medium text-aura">
              {earnings.earningsPercentage}%
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
