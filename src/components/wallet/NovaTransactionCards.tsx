import { motion } from 'framer-motion';
import { Send, Download, Trophy, RefreshCw, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Receipt } from '@/contexts/TransactionContext';

// Format number - remove decimals if whole number
const formatAmount = (value: number): string => {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
};

// Contest Entry Deduction Card (خصم دخول مسابقة)
interface ContestEntryCardProps {
  receipt: Receipt;
  onClick?: () => void;
}

export function ContestEntryCard({ receipt, onClick }: ContestEntryCardProps) {
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
        className="p-4 cursor-pointer hover:shadow-md transition-all bg-destructive/5 border-destructive/20"
        onClick={onClick}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
            <Trophy className="h-5 w-5 text-destructive" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Amount */}
            <p className="text-lg font-bold text-destructive mb-1">
              <span className="text-nova">Ꞥ</span> −{formatAmount(receipt.amount)} Nova
            </p>

            {/* Description */}
            <p className="text-sm font-medium text-foreground mb-0.5">
              {language === 'ar' ? 'دخول مسابقة' : 'Contest Entry'}
            </p>

            {/* Receipt Number */}
            <p className="text-xs text-muted-foreground mb-1">
              {language === 'ar' ? 'رقم العملية:' : 'Ref:'} {receipt.receiptNumber}
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

// Nova Transfer (Sent) Card
interface NovaTransferSentCardProps {
  receipt: Receipt;
  onClick?: () => void;
}

export function NovaTransferSentCard({ receipt, onClick }: NovaTransferSentCardProps) {
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

  const recipientName = receipt.receiver?.name || (language === 'ar' ? 'مستخدم' : 'User');

  return (
    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
      <Card 
        className="p-4 cursor-pointer hover:shadow-md transition-all bg-muted/50 border-border"
        onClick={onClick}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <Send className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Amount */}
            <p className="text-lg font-bold text-foreground mb-1">
              <span className="text-nova">Ꞥ</span> −{formatAmount(receipt.amount)} Nova
            </p>

            {/* Description */}
            <p className="text-sm font-medium text-foreground mb-0.5">
              {language === 'ar' ? 'تحويل Nova' : 'Nova Transfer'}
            </p>

            {/* Recipient */}
            <p className="text-xs text-muted-foreground mb-1">
              {language === 'ar' ? 'إلى:' : 'To:'} {recipientName}
            </p>

            {/* Date & Time */}
            <p className="text-xs text-muted-foreground">
              {formatDate(new Date(receipt.createdAt))} • {formatTime(new Date(receipt.createdAt))}
            </p>
          </div>

          <ChevronRight className="h-4 w-4 text-muted-foreground/50 self-center" />
        </div>
      </Card>
    </motion.div>
  );
}

// Nova Received Card
interface NovaReceivedCardProps {
  receipt: Receipt;
  onClick?: () => void;
}

export function NovaReceivedCard({ receipt, onClick }: NovaReceivedCardProps) {
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

  const senderName = receipt.sender?.name || (language === 'ar' ? 'مستخدم' : 'User');

  return (
    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
      <Card 
        className="p-4 cursor-pointer hover:shadow-md transition-all bg-success/5 border-success/20"
        onClick={onClick}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
            <Download className="h-5 w-5 text-success" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Amount */}
            <p className="text-lg font-bold text-success mb-1">
              <span className="text-nova">Ꞥ</span> +{formatAmount(receipt.amount)} Nova
            </p>

            {/* Description */}
            <p className="text-sm font-medium text-foreground mb-0.5">
              {language === 'ar' ? 'استلام Nova' : 'Nova Received'}
            </p>

            {/* Sender */}
            <p className="text-xs text-muted-foreground mb-1">
              {language === 'ar' ? 'من:' : 'From:'} {senderName}
            </p>

            {/* Date & Time */}
            <p className="text-xs text-muted-foreground">
              {formatDate(new Date(receipt.createdAt))} • {formatTime(new Date(receipt.createdAt))}
            </p>
          </div>

          <ChevronRight className="h-4 w-4 text-muted-foreground/50 self-center" />
        </div>
      </Card>
    </motion.div>
  );
}
