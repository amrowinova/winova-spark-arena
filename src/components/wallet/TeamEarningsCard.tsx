import { motion } from 'framer-motion';
import { Users, Lock, Unlock, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Receipt } from '@/contexts/TransactionContext';

interface TeamEarningsCardProps {
  receipt: Receipt;
  onClick?: () => void;
}

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
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Use ar-EG with Gregorian calendar for Arabic
  const formattedDateAr = releaseDate.toLocaleDateString('ar-EG-u-ca-gregory', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return { date: releaseDate, formattedDate, formattedDateAr, isReleased };
}

export function TeamEarningsCard({ receipt, onClick }: TeamEarningsCardProps) {
  const { language } = useLanguage();
  const earnings = receipt.teamEarnings;
  
  if (!earnings) return null;

  const releaseInfo = getEarningReleaseDate(receipt.createdAt);

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className={`p-4 hover:shadow-md transition-all ${releaseInfo.isReleased ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20'}`}>
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${releaseInfo.isReleased ? 'bg-success/20' : 'bg-warning/20'}`}>
            <Users className={`h-5 w-5 ${releaseInfo.isReleased ? 'text-success' : 'text-warning'}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Amount with Lock/Unlock icon */}
            <p className={`text-lg font-bold mb-1 ${releaseInfo.isReleased ? 'text-success' : 'text-warning'}`}>
              🟡 +{formatAmount(receipt.amount)} Nova {releaseInfo.isReleased ? '🔓' : '🔒'}
            </p>

            {/* Description */}
            <p className="text-sm font-medium text-foreground mb-0.5">
              {releaseInfo.isReleased 
                ? (language === 'ar' ? 'أرباح الفريق – مُفرج عنها' : 'Team Earnings – Released')
                : (language === 'ar' ? 'أرباح الفريق – مقفلة' : 'Team Earnings – Locked')}
            </p>

            {/* Country */}
            <p className="text-xs text-muted-foreground mb-1">
              {language === 'ar' ? 'الدولة:' : 'Country:'} {earnings.country}
            </p>

            {/* Release date for locked earnings */}
            {!releaseInfo.isReleased && (
              <p className="text-xs text-warning font-medium">
                {language === 'ar' 
                  ? `الإفراج بتاريخ: ${releaseInfo.formattedDateAr}`
                  : `Release Date: ${releaseInfo.formattedDate}`}
              </p>
            )}
          </div>

          <ChevronRight className="h-4 w-4 text-muted-foreground/50 self-center" />
        </div>
      </Card>
    </motion.div>
  );
}

// Earnings Release Card (إفراج الأرباح)
interface EarningsReleaseCardProps {
  receipt: Receipt;
  onClick?: () => void;
}

export function EarningsReleaseCard({ receipt, onClick }: EarningsReleaseCardProps) {
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

  return (
    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
      <Card 
        className="p-4 cursor-pointer hover:shadow-md transition-all bg-success/5 border-success/20"
        onClick={onClick}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
            <Unlock className="h-5 w-5 text-success" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Amount */}
            <p className="text-lg font-bold text-success mb-1">
              🟢 +{formatAmount(receipt.amount)} Nova 🔓
            </p>

            {/* Description */}
            <p className="text-sm font-medium text-foreground mb-0.5">
              {language === 'ar' ? 'تم الإفراج عن أرباحك' : 'Your Earnings Released'}
            </p>

            {/* Sub description */}
            <p className="text-xs text-muted-foreground mb-1">
              {language === 'ar' ? 'أُضيفت إلى رصيد Nova المتاح' : 'Added to available Nova balance'}
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
