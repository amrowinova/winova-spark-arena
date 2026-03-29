import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Wallet as WalletIcon, TrendingUp, RefreshCw, AlertTriangle, Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNovaPricing } from '@/hooks/useNovaPricing';
import { getNextReleaseDate } from '@/components/wallet/LockedEarningsCard';
import { RANK_COMMISSION_RATES } from '@/contexts/TransactionContext';

interface WalletBalanceProps {
  balance: number;
  auraBalance: number;
  lockedEarnings: number;
  teamEarningsTotal: number;
  isLoading: boolean;
  onRefresh: () => void;
  onTransfer: () => void;
  onQRCode: () => void;
}

export function WalletBalance({
  balance,
  auraBalance,
  lockedEarnings,
  teamEarningsTotal,
  isLoading,
  onRefresh,
  onTransfer,
  onQRCode
}: WalletBalanceProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useUser();
  const { anchorPrices, getCurrencyInfo } = useNovaPricing();
  const isRTL = language === 'ar';
  
  // Get default currency info (Egyptian Pound)
  const currencyInfo = getCurrencyInfo('EGP');

  const formatBalance = (value: number): string => {
    return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
  };

  const canEarn = user?.rank && RANK_COMMISSION_RATES[user.rank] > 0;
  const commissionRate = user?.rank ? RANK_COMMISSION_RATES[user.rank] : 0;
  const nextReleaseDate = lockedEarnings > 0 ? getNextReleaseDate() : null;

  return (
    <div className="space-y-4">
      {/* Main Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <WalletIcon className="h-6 w-6 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                {isRTL ? 'رصيد المحفظة' : 'Wallet Balance'}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="space-y-4">
            {/* Nova Balance */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {isRTL ? 'رصيد Nova' : 'Nova Balance'}
              </p>
              <div className="text-3xl font-bold text-nova">
                <span className="text-4xl">И</span> {formatBalance(balance)}
              </div>
            </div>

            {/* Aura Balance */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {isRTL ? 'رصيد Aura' : 'Aura Balance'}
              </p>
              <div className="text-2xl font-bold text-aura">
                <span className="text-3xl">✦</span> {formatBalance(auraBalance)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <Button onClick={onTransfer} className="flex-1">
              {isRTL ? 'تحويل' : 'Transfer'}
            </Button>
            <Button variant="outline" onClick={onQRCode}>
              {isRTL ? 'رمز QR' : 'QR Code'}
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Locked Earnings Alert */}
      {lockedEarnings > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Alert className="bg-warning/10 border-warning/20">
            <Lock className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {isRTL 
                ? `🔒 ${formatBalance(lockedEarnings)} Nova مقفلة. الإفراج: ${nextReleaseDate}`
                : `🔒 ${formatBalance(lockedEarnings)} Nova locked. Release: ${nextReleaseDate}`
              }
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Team Earnings */}
      {canEarn && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="p-4 bg-primary/5 border-primary/20 cursor-pointer hover:bg-primary/10 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm text-foreground">
                  {isRTL ? 'أرباح الفريق' : 'Team Earnings'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isRTL 
                    ? `عمولة ${commissionRate} Nova لكل مشارك` 
                    : `${commissionRate} Nova per participant`
                  }
                </p>
              </div>
              <div className="text-end">
                <p className="font-bold text-primary">
                  +<span className="text-nova">И</span> {formatBalance(teamEarningsTotal)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'إجمالي' : 'Total'}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Price Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-3 bg-card border border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {isRTL ? 'سعر Nova' : 'Nova Rate'}
            </span>
            <span className="font-semibold text-foreground">
              <span className="text-nova">И</span> 1 = {isRTL ? currencyInfo.symbolAr : currencyInfo.symbol} {currencyInfo.novaRate.toLocaleString()}
            </span>
          </div>
        </Card>
      </motion.div>

      {/* Warning for Low Balance */}
      {balance < 10 && auraBalance < 10 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Alert className="bg-destructive/10 border-destructive/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {isRTL 
                ? '⚠️ رصيد منخفض. قم بشحن محفظتك للمتابعة.'
                : '⚠️ Low balance. Please top up your wallet to continue.'
              }
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
    </div>
  );
}
