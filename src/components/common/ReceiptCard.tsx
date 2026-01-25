import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Receipt, FileText, Download, Share2, X, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Receipt as ReceiptType, countryPricing } from '@/contexts/TransactionContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface ReceiptCardProps {
  receipt: ReceiptType;
  compact?: boolean;
  onClick?: () => void;
}

interface ReceiptDialogProps {
  receipt: ReceiptType | null;
  open: boolean;
  onClose: () => void;
}

const transactionTypeLabels: Record<string, { en: string; ar: string }> = {
  transfer_nova: { en: 'Nova Transfer', ar: 'تحويل Nova' },
  convert_nova_aura: { en: 'Nova → Aura Conversion', ar: 'تحويل Nova → Aura' },
  contest_entry: { en: 'Contest Entry', ar: 'دخول مسابقة' },
  vote_received: { en: 'Votes Received', ar: 'أصوات مستلمة' },
  vote_sent: { en: 'Votes Sent', ar: 'أصوات مرسلة' },
  p2p_buy: { en: 'P2P Purchase', ar: 'شراء P2P' },
  p2p_sell: { en: 'P2P Sale', ar: 'بيع P2P' },
  spotlight_win: { en: 'Spotlight Win', ar: 'فوز بالأضواء' },
  aura_reward: { en: 'Aura Reward', ar: 'مكافأة Aura' },
};

const statusIcons = {
  completed: CheckCircle,
  pending: Clock,
  failed: AlertCircle,
  cancelled: AlertCircle,
};

const statusColors = {
  completed: 'text-success',
  pending: 'text-warning',
  failed: 'text-destructive',
  cancelled: 'text-muted-foreground',
};

export function ReceiptCard({ receipt, compact = false, onClick }: ReceiptCardProps) {
  const { language } = useLanguage();
  const StatusIcon = statusIcons[receipt.status];
  const typeLabel = transactionTypeLabels[receipt.type]?.[language] || receipt.type;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="cursor-pointer"
      >
        <Card className="p-3 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{typeLabel}</p>
              <p className="text-xs text-muted-foreground truncate">
                {receipt.receiptNumber}
              </p>
            </div>
            <div className="text-end">
              <p className="font-bold text-sm">
                {receipt.amount.toFixed(3)} ✦
              </p>
              <p className="text-xs text-muted-foreground">
                {receipt.localAmount.toFixed(2)} {receipt.localCurrency}
              </p>
            </div>
            <StatusIcon className={`h-4 w-4 ${statusColors[receipt.status]}`} />
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <Card onClick={onClick} className={onClick ? 'cursor-pointer hover:bg-muted/50' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            {typeLabel}
          </CardTitle>
          <span className={`flex items-center gap-1 text-xs ${statusColors[receipt.status]}`}>
            <StatusIcon className="h-3 w-3" />
            {receipt.status}
          </span>
        </div>
        <p className="text-xs text-muted-foreground font-mono">
          {receipt.receiptNumber}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Amount */}
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <p className="text-3xl font-bold text-primary">
            {receipt.amount.toFixed(3)} <span className="text-nova">✦</span>
          </p>
          <p className="text-sm text-muted-foreground">
            ≈ {receipt.localAmount.toFixed(2)} {receipt.localCurrency}
          </p>
        </div>

        <Separator />

        {/* Sender */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            {language === 'ar' ? 'المرسل' : 'From'}
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{receipt.sender.name}</p>
              <p className="text-xs text-muted-foreground">@{receipt.sender.username}</p>
            </div>
            <span className="text-xs px-2 py-1 bg-muted rounded-full">
              {receipt.sender.country}
            </span>
          </div>
        </div>

        {/* Receiver */}
        {receipt.receiver && (
          <>
            <Separator />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'المستلم' : 'To'}
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{receipt.receiver.name}</p>
                  <p className="text-xs text-muted-foreground">@{receipt.receiver.username}</p>
                </div>
                <span className="text-xs px-2 py-1 bg-muted rounded-full">
                  {receipt.receiver.country}
                </span>
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Reason */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            {language === 'ar' ? 'السبب' : 'Reason'}
          </p>
          <p className="text-sm">{receipt.reason}</p>
        </div>

        {/* Date */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{language === 'ar' ? 'التاريخ' : 'Date'}</span>
          <span>{formatDate(receipt.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReceiptDialog({ receipt, open, onClose }: ReceiptDialogProps) {
  const { language } = useLanguage();

  if (!receipt) return null;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `WINOVA Receipt - ${receipt.receiptNumber}`,
        text: `Receipt for ${receipt.amount.toFixed(3)} Nova`,
      });
    }
  };

  const handleDownload = () => {
    // In production, this would generate a PDF
    const receiptData = JSON.stringify(receipt, null, 2);
    const blob = new Blob([receiptData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${receipt.receiptNumber}.json`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            {language === 'ar' ? 'إيصال العملية' : 'Transaction Receipt'}
          </DialogTitle>
        </DialogHeader>
        
        <ReceiptCard receipt={receipt} />

        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={handleDownload}>
            <Download className="h-4 w-4 me-2" />
            {language === 'ar' ? 'تحميل' : 'Download'}
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleShare}>
            <Share2 className="h-4 w-4 me-2" />
            {language === 'ar' ? 'مشاركة' : 'Share'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
