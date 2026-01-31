import { Lock, Calendar, Unlock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { getWalletCountryPricing } from './WalletCountrySelector';

// Format number - remove decimals if whole number
const formatAmount = (value: number): string => {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
};

/**
 * Calculate next release date (15th or 30th of month)
 * Returns exact date formatted for display
 */
export function getNextReleaseDate(): { date: Date; formattedDate: string; formattedDateAr: string } {
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let nextRelease: Date;

  if (currentDay < 15) {
    // Next release is 15th of current month
    nextRelease = new Date(currentYear, currentMonth, 15);
  } else if (currentDay < 30) {
    // Next release is 30th of current month
    nextRelease = new Date(currentYear, currentMonth, 30);
  } else {
    // Next release is 15th of next month
    nextRelease = new Date(currentYear, currentMonth + 1, 15);
  }

  // Format date for display
  const formattedDate = nextRelease.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  });

  const formattedDateAr = nextRelease.toLocaleDateString('ar-SA', {
    day: 'numeric',
    month: 'short',
  });

  return { date: nextRelease, formattedDate, formattedDateAr };
}

interface LockedEarningsCardProps {
  lockedBalance: number;
  walletCountry: string;
}

export function LockedEarningsCard({ lockedBalance, walletCountry }: LockedEarningsCardProps) {
  const { language } = useLanguage();
  const pricing = getWalletCountryPricing(walletCountry);
  const localValue = lockedBalance * pricing.novaRate;
  const releaseInfo = getNextReleaseDate();

  if (lockedBalance <= 0) return null;

  return (
    <Card className="p-4 bg-warning/5 border-warning/20">
      <div className="flex items-start gap-3">
        {/* Lock Icon */}
        <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
          <Lock className="h-5 w-5 text-warning" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-foreground">
              {language === 'ar' ? 'أرباح مقفلة' : 'Locked Earnings'}
            </span>
          </div>

          {/* Locked Amount */}
          <p className="text-xl font-bold text-foreground">
            <span className="text-nova">И</span> {formatAmount(lockedBalance)}
          </p>
          <p className="text-xs text-muted-foreground">
            ≈ {pricing.symbol} {formatAmount(localValue)}
          </p>
        </div>

        {/* Release Info */}
        <div className="text-end shrink-0">
          <div className="flex items-center gap-1 text-warning mb-1">
            <Calendar className="h-3 w-3" />
            <span className="text-xs font-medium">
              {language === 'ar' ? 'تاريخ الإفراج' : 'Release Date'}
            </span>
          </div>
          <p className="text-base font-bold text-foreground">
            {language === 'ar' ? releaseInfo.formattedDateAr : releaseInfo.formattedDate}
          </p>
        </div>
      </div>

      {/* Info footer */}
      <div className="mt-3 pt-3 border-t border-warning/20 flex items-center gap-2 text-xs text-muted-foreground">
        <Unlock className="h-3 w-3" />
        <span>
          {language === 'ar' 
            ? 'يتم الإفراج عن الأرباح تلقائياً في 15 و 30 من كل شهر'
            : 'Earnings are automatically released on the 15th & 30th of each month'}
        </span>
      </div>
    </Card>
  );
}
