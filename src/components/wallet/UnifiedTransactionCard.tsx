import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Vote, 
  Trophy, 
  Send, 
  Download, 
  Users, 
  Unlock,
  ChevronRight,
  LucideIcon
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import type { Receipt } from '@/contexts/TransactionContext';

// Format number - remove decimals if whole number
const formatAmount = (value: number): string => {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
};

// Format date (Gregorian only)
const formatDate = (date: Date, language: string): string => {
  return date.toLocaleDateString(language === 'ar' ? 'ar-EG-u-ca-gregory' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Format time
const formatTime = (date: Date, language: string): string => {
  return date.toLocaleTimeString(language === 'ar' ? 'ar-EG-u-ca-gregory' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export type TransactionType = 
  | 'aura_vote_stage1'
  | 'aura_vote_final'
  | 'aura_deduction'
  | 'nova_team_locked'
  | 'nova_team_released'
  | 'nova_earnings_release'
  | 'nova_contest_entry'
  | 'nova_transfer_sent'
  | 'nova_transfer_received';

interface UnifiedTransactionCardProps {
  receipt: Receipt;
  onClick?: () => void;
}

// Get transaction configuration based on type
function getTransactionConfig(receipt: Receipt, language: string, userId: string) {
  const isAura = ['aura_vote_earnings', 'vote_sent', 'vote_received', 'convert_nova_aura'].includes(receipt.type);
  const isDeduction = receipt.type === 'vote_sent' || receipt.type === 'contest_entry' || 
    (receipt.type === 'transfer_nova' && receipt.sender.id === userId);
  
  // Determine specific transaction type
  let icon: LucideIcon = Sparkles;
  let title = '';
  let subtitle = '';
  let colorClass = '';
  let bgClass = '';
  let borderClass = '';
  let symbol = isAura ? '✦' : 'И';
  let symbolColor = isAura ? 'text-aura' : 'text-nova';
  let prefix = isDeduction ? '−' : '+';
  let suffix = isAura ? 'Aura' : 'Nova';
  let showChevron = true;

  // Aura transactions
  if (receipt.type === 'aura_vote_earnings') {
    icon = Sparkles;
    const stage = receipt.auraVoteEarnings?.stage;
    title = stage === 'stage1' 
      ? (language === 'ar' ? 'أرباح تصويت – المرحلة الأولى' : 'Vote Earnings – Stage 1')
      : (language === 'ar' ? 'أرباح تصويت – المرحلة النهائية' : 'Vote Earnings – Final Stage');
    subtitle = `${language === 'ar' ? 'المسابقة' : 'Contest'} #${receipt.auraVoteEarnings?.contestNumber || ''}`;
    colorClass = 'text-aura';
    bgClass = 'bg-aura/20';
    borderClass = 'bg-aura/5 border-aura/20';
  } 
  else if (receipt.type === 'vote_sent') {
    icon = Vote;
    title = language === 'ar' ? 'خصم تصويت' : 'Vote Deduction';
    subtitle = receipt.receiver?.name || (language === 'ar' ? 'متسابق' : 'Contestant');
    colorClass = 'text-destructive';
    bgClass = 'bg-destructive/20';
    borderClass = 'bg-destructive/5 border-destructive/20';
  }
  // Nova transactions
  else if (receipt.type === 'team_earnings') {
    icon = Users;
    // Calculate if released based on date
    const releaseInfo = getEarningReleaseInfo(receipt.createdAt);
    if (releaseInfo.isReleased) {
      title = language === 'ar' ? 'أرباح الفريق – مُفرج عنها' : 'Team Earnings – Released';
      colorClass = 'text-success';
      bgClass = 'bg-success/20';
      borderClass = 'bg-success/5 border-success/20';
      suffix = 'Nova 🔓';
    } else {
      title = language === 'ar' ? 'أرباح الفريق – مقفلة' : 'Team Earnings – Locked';
      colorClass = 'text-warning';
      bgClass = 'bg-warning/20';
      borderClass = 'bg-warning/5 border-warning/20';
      suffix = 'Nova 🔒';
    }
    subtitle = `${language === 'ar' ? 'الدولة:' : 'Country:'} ${receipt.teamEarnings?.country || ''}`;
  }
  else if (receipt.type === 'earnings_release') {
    icon = Unlock;
    title = language === 'ar' ? 'تم الإفراج عن أرباحك' : 'Your Earnings Released';
    subtitle = language === 'ar' ? 'أُضيفت إلى رصيد Nova المتاح' : 'Added to available Nova balance';
    colorClass = 'text-success';
    bgClass = 'bg-success/20';
    borderClass = 'bg-success/5 border-success/20';
    suffix = 'Nova 🔓';
  }
  else if (receipt.type === 'contest_entry') {
    icon = Trophy;
    title = language === 'ar' ? 'دخول مسابقة' : 'Contest Entry';
    subtitle = `${language === 'ar' ? 'رقم العملية:' : 'Ref:'} ${receipt.receiptNumber}`;
    colorClass = 'text-destructive';
    bgClass = 'bg-destructive/20';
    borderClass = 'bg-destructive/5 border-destructive/20';
  }
  else if (receipt.type === 'transfer_nova') {
    if (receipt.sender.id === userId) {
      icon = Send;
      title = language === 'ar' ? 'تحويل Nova' : 'Nova Transfer';
      subtitle = `${language === 'ar' ? 'إلى:' : 'To:'} ${receipt.receiver?.name || ''}`;
      colorClass = 'text-foreground';
      bgClass = 'bg-muted';
      borderClass = 'bg-muted/50 border-border';
    } else {
      icon = Download;
      title = language === 'ar' ? 'استلام Nova' : 'Nova Received';
      subtitle = `${language === 'ar' ? 'من:' : 'From:'} ${receipt.sender.name}`;
      colorClass = 'text-success';
      bgClass = 'bg-success/20';
      borderClass = 'bg-success/5 border-success/20';
      prefix = '+';
    }
  }
  else if (receipt.type === 'convert_nova_aura') {
    icon = Sparkles;
    title = language === 'ar' ? 'تحويل Nova إلى Aura' : 'Nova to Aura';
    subtitle = receipt.receiptNumber;
    colorClass = 'text-aura';
    bgClass = 'bg-aura/20';
    borderClass = 'bg-aura/5 border-aura/20';
    prefix = '+';
  }
  // Default fallback
  else {
    icon = Sparkles;
    title = receipt.type;
    subtitle = receipt.receiptNumber;
    colorClass = 'text-muted-foreground';
    bgClass = 'bg-muted';
    borderClass = 'bg-muted/50 border-border';
  }

  return {
    icon,
    title,
    subtitle,
    colorClass,
    bgClass,
    borderClass,
    symbol,
    symbolColor,
    prefix,
    suffix,
    showChevron,
  };
}

// Calculate release date for team earnings
function getEarningReleaseInfo(createdAt: Date): { isReleased: boolean; releaseDate: string; releaseDateAr: string } {
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
  
  const formattedDateAr = releaseDate.toLocaleDateString('ar-EG-u-ca-gregory', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return { isReleased, releaseDate: formattedDate, releaseDateAr: formattedDateAr };
}

export function UnifiedTransactionCard({ receipt, onClick }: UnifiedTransactionCardProps) {
  const { language } = useLanguage();
  const { user } = useUser();
  
  const config = getTransactionConfig(receipt, language, user.id);
  const Icon = config.icon;
  const createdAt = new Date(receipt.createdAt);

  // For locked team earnings, show release date
  const isLockedTeamEarning = receipt.type === 'team_earnings' && !getEarningReleaseInfo(receipt.createdAt).isReleased;
  const releaseInfo = isLockedTeamEarning ? getEarningReleaseInfo(receipt.createdAt) : null;

  return (
    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
      <Card 
        className={`p-4 cursor-pointer hover:shadow-md transition-all ${config.borderClass}`}
        onClick={onClick}
      >
        <div className="flex items-start gap-3">
          {/* Icon - Fixed size */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.bgClass}`}>
            <Icon className={`h-5 w-5 ${config.colorClass}`} />
          </div>

          {/* Content - Structured layout */}
          <div className="flex-1 min-w-0">
            {/* Line 1: Amount with symbol */}
            <p className={`text-lg font-bold mb-1 ${config.colorClass}`}>
              <span className={config.symbolColor}>{config.symbol}</span> {config.prefix}{formatAmount(receipt.amount)} {config.suffix}
            </p>

            {/* Line 2: Title/Description */}
            <p className="text-sm font-medium text-foreground mb-0.5">
              {config.title}
            </p>

            {/* Line 3: Subtitle (reference/recipient/contest) */}
            <p className="text-xs text-muted-foreground mb-1">
              {config.subtitle}
            </p>

            {/* Line 4: Release date for locked earnings OR Date/Time */}
            {releaseInfo ? (
              <p className="text-xs text-warning font-medium">
                {language === 'ar' 
                  ? `الإفراج بتاريخ: ${releaseInfo.releaseDateAr}`
                  : `Release Date: ${releaseInfo.releaseDate}`}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {formatDate(createdAt, language)} • {formatTime(createdAt, language)}
              </p>
            )}
          </div>

          {/* Chevron */}
          {config.showChevron && (
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 self-center flex-shrink-0" />
          )}
        </div>
      </Card>
    </motion.div>
  );
}
