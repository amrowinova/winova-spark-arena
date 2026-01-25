import { motion } from 'framer-motion';
import { Vote, Send, Trophy, Sparkles, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Receipt } from '@/contexts/TransactionContext';

type TransactionType = 'vote' | 'transfer' | 'win' | 'aura';

interface TransactionCardProps {
  type: TransactionType;
  amount: number;
  description: string;
  time: string;
  receipt?: Receipt;
  onClick?: () => void;
}

const transactionConfig = {
  vote: {
    icon: Vote,
    gradient: 'from-aura/20 to-aura/5',
    border: 'border-aura/30',
    iconBg: 'bg-aura/20',
    iconColor: 'text-aura',
    labelAr: 'تصويت',
    labelEn: 'Vote',
  },
  transfer: {
    icon: Send,
    gradient: 'from-nova/20 to-nova/5',
    border: 'border-nova/30',
    iconBg: 'bg-nova/20',
    iconColor: 'text-nova',
    labelAr: 'تحويل',
    labelEn: 'Transfer',
  },
  win: {
    icon: Trophy,
    gradient: 'from-success/20 to-success/5',
    border: 'border-success/30',
    iconBg: 'bg-success/20',
    iconColor: 'text-success',
    labelAr: 'فوز',
    labelEn: 'Win',
  },
  aura: {
    icon: Sparkles,
    gradient: 'from-aura/20 to-aura/5',
    border: 'border-aura/30',
    iconBg: 'bg-aura/20',
    iconColor: 'text-aura',
    labelAr: 'مكافأة Aura',
    labelEn: 'Aura Reward',
  },
};

export function TransactionCard({ 
  type, 
  amount, 
  description, 
  time,
  receipt,
  onClick 
}: TransactionCardProps) {
  const { language } = useLanguage();
  const config = transactionConfig[type];
  const Icon = config.icon;

  const currencyLabel = type === 'aura' ? 'Aura' : 'Nova';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-xl border ${config.border}
        bg-gradient-to-br ${config.gradient}
        p-3 cursor-pointer transition-all
        hover:shadow-md
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`p-2 rounded-lg ${config.iconBg}`}>
          <Icon className={`h-5 w-5 ${config.iconColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-medium ${config.iconColor}`}>
              {language === 'ar' ? config.labelAr : config.labelEn}
            </span>
            <span className="text-[10px] text-muted-foreground">{time}</span>
          </div>
          
          <p className="text-sm font-semibold mb-0.5">
            {amount.toFixed(3)} {currencyLabel}
          </p>
          
          <p className="text-xs text-muted-foreground truncate">
            {description}
          </p>
        </div>

        {/* Arrow indicator */}
        <ChevronRight className="h-4 w-4 text-muted-foreground/50 self-center" />
      </div>

      {/* Tap hint */}
      {receipt && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground text-center">
            {language === 'ar' ? 'اضغط لعرض الإيصال' : 'Tap to view receipt'}
          </p>
        </div>
      )}
    </motion.div>
  );
}
