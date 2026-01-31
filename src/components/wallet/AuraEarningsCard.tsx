import { motion } from 'framer-motion';
import { Sparkles, Trophy, Vote, Minus } from 'lucide-react';
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
    return date.toLocaleTimeString(language === 'ar' ? 'ar-EG-u-ca-gregory' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(language === 'ar' ? 'ar-EG-u-ca-gregory' : 'en-US', {
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
            {/* Amount - Primary */}
            <p className="text-lg font-bold text-aura mb-1">
              <span className="text-aura">✨</span> +{receipt.amount} Aura
            </p>

            {/* Description */}
            <p className="text-sm font-medium text-foreground mb-0.5">
              {language === 'ar' 
                ? `أرباح تصويت – ${stageLabel}` 
                : `Vote Earnings – ${stageLabel}`}
            </p>

            {/* Contest ID */}
            <p className="text-xs text-muted-foreground mb-1">
              {language === 'ar' ? 'المسابقة' : 'Contest'} #{earnings.contestNumber}
            </p>

            {/* Date & Time */}
            <p className="text-xs text-muted-foreground">
              {formatDate(new Date(receipt.createdAt))} • {formatTime(new Date(receipt.createdAt))}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// Card for vote deduction (خصم تصويت)
interface VoteDeductionCardProps {
  receipt: Receipt;
  onClick?: () => void;
}

export function VoteDeductionCard({ receipt, onClick }: VoteDeductionCardProps) {
  const { language } = useLanguage();

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(language === 'ar' ? 'ar-EG-u-ca-gregory' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(language === 'ar' ? 'ar-EG-u-ca-gregory' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Get recipient name
  const recipientName = receipt.receiver?.name || (language === 'ar' ? 'متسابق' : 'Contestant');

  return (
    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
      <Card 
        className="p-4 cursor-pointer hover:shadow-md transition-all bg-destructive/5 border-destructive/20"
        onClick={onClick}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
            <Vote className="h-5 w-5 text-destructive" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Amount - Primary (Red for deduction) */}
            <p className="text-lg font-bold text-destructive mb-1">
              <span className="text-aura">✨</span> −{receipt.amount} Aura
            </p>

            {/* Description */}
            <p className="text-sm font-medium text-foreground mb-0.5">
              {language === 'ar' ? 'تم خصم نقاط تصويت' : 'Vote Points Deducted'}
            </p>

            {/* Recipient/Contest */}
            <p className="text-xs text-muted-foreground mb-1">
              {recipientName}
            </p>

            {/* Date & Time */}
            <p className="text-xs text-muted-foreground">
              {formatDate(new Date(receipt.createdAt))} • {formatTime(new Date(receipt.createdAt))}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
