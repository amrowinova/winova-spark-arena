import { useState } from 'react';
import { Star, Timer, Lock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { P2PAmountSelector } from './P2PAmountSelector';
import { P2PTimeSelector } from './P2PTimeSelector';
import { P2POffer } from './P2POfferCard';
import { cn } from '@/lib/utils';

interface P2PBuyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: P2POffer | null;
  onConfirm: (amount: number, timeLimit: number) => void;
}

export function P2PBuyDialog({
  open,
  onOpenChange,
  offer,
  onConfirm,
}: P2PBuyDialogProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [amount, setAmount] = useState<number | null>(null);
  const [timeLimit, setTimeLimit] = useState<number | null>(30);

  if (!offer) return null;

  const total = amount ? amount * offer.price : 0;
  const canConfirm = amount && timeLimit && amount <= offer.amount;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(amount!, timeLimit!);
    setAmount(null);
    setTimeLimit(30);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isRTL ? 'شراء Nova' : 'Buy Nova'}
          </DialogTitle>
          <DialogDescription>
            {isRTL ? 'من' : 'From'} {isRTL ? offer.user.nameAr : offer.user.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Seller Info */}
          <Card className="p-4 bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl border border-border">
                  {offer.user.avatar}
                </div>
                <span className="absolute -bottom-0.5 -end-0.5 h-3.5 w-3.5 rounded-full bg-success border-2 border-card" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg">
                  {isRTL ? offer.user.nameAr : offer.user.name}
                </p>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1 text-warning">
                    <Star className="h-4 w-4 fill-warning" />
                    <span className="font-semibold">{(offer.user.rating * 20).toFixed(0)}%</span>
                  </div>
                  <span className="text-muted-foreground">
                    {offer.user.completedTrades} {isRTL ? 'صفقة' : 'trades'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Offer Details */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">
                {isRTL ? 'السعر' : 'Price'}
              </p>
              <p className="text-lg font-bold">
                {offer.currencySymbol} {offer.price.toFixed(2)}
              </p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">
                {isRTL ? 'الكمية المتاحة' : 'Available'}
              </p>
              <p className="text-lg font-bold text-nova">
                И {offer.amount}
              </p>
            </Card>
          </div>

          {/* Payment Methods */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {isRTL ? 'طرق الدفع المقبولة' : 'Accepted Payment Methods'}
            </p>
            <div className="flex flex-wrap gap-2">
              {offer.paymentMethods.map((method) => (
                <Badge key={method.id} variant="secondary" className="gap-1.5 py-1.5">
                  <span>{method.icon}</span>
                  <span>{isRTL ? method.nameAr : method.name}</span>
                </Badge>
              ))}
            </div>
          </div>

          {/* Amount Selector */}
          <P2PAmountSelector
            value={amount}
            onChange={setAmount}
            maxAmount={offer.amount}
          />

          {/* Time Selector */}
          <P2PTimeSelector
            value={timeLimit}
            onChange={setTimeLimit}
          />

          {/* Order Summary */}
          {amount && (
            <Card className="p-4 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'ستحصل على' : "You'll receive"}
                  </p>
                  <p className="text-xl font-bold text-nova">И {amount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'ستدفع' : "You'll pay"}
                  </p>
                  <p className="text-xl font-bold text-success">
                    {offer.currencySymbol} {total.toFixed(2)}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Time Warning */}
          <Card className="p-3 bg-warning/10 border-warning/30">
            <div className="flex items-start gap-2">
              <Timer className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-warning">
                {isRTL 
                  ? `يجب إتمام الدفع خلال ${timeLimit || 30} دقيقة بعد قبول الطلب`
                  : `Payment must be completed within ${timeLimit || 30} minutes after order acceptance`
                }
              </p>
            </div>
          </Card>

          {/* Confirm Button */}
          <Button
            className="w-full h-12 text-base font-semibold bg-success hover:bg-success/90"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {isRTL ? 'تأكيد الشراء' : 'Confirm Purchase'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
