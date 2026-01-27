import { useState } from 'react';
import { CheckCircle2, ThumbsUp, ThumbsDown, ArrowLeft, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { P2POrder } from '@/contexts/P2PContext';
import { cn } from '@/lib/utils';

interface P2POrderCompletedScreenProps {
  order: P2POrder;
  currentUserId: string;
  onRate: (isPositive: boolean) => void;
  onClose: () => void;
  hasRated?: boolean;
}

export function P2POrderCompletedScreen({
  order,
  currentUserId,
  onRate,
  onClose,
  hasRated = false,
}: P2POrderCompletedScreenProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [selectedRating, setSelectedRating] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState(hasRated);

  const isBuyer = order.buyer.id === currentUserId;
  const counterparty = isBuyer ? order.seller : order.buyer;

  const handleRateSubmit = () => {
    if (selectedRating !== null) {
      onRate(selectedRating);
      setSubmitted(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card flex items-center gap-3 shrink-0 safe-top">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">
          {isRTL ? 'تمت الصفقة' : 'Order Completed'}
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="flex flex-col items-center py-6"
        >
          <div className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-14 w-14 text-success" />
          </div>
          <h2 className="text-xl font-bold text-success">
            {isRTL ? '✓ تمت الصفقة بنجاح' : '✓ Order completed successfully'}
          </h2>
        </motion.div>

        {/* Order Details Card */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {isRTL ? 'رقم الطلب' : 'Order ID'}
              </span>
              <span className="font-mono text-sm">#{order.id}</span>
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {isBuyer 
                    ? (isRTL ? 'Nova المستلمة' : 'Nova Received')
                    : (isRTL ? 'Nova المرسلة' : 'Nova Sent')
                  }
                </span>
                <span className="font-bold text-nova text-lg">
                  И {order.amount.toFixed(0)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {isBuyer
                    ? (isRTL ? 'المبلغ المدفوع' : 'Amount Paid')
                    : (isRTL ? 'المبلغ المستلم' : 'Amount Received')
                  }
                </span>
                <span className="font-bold text-success text-lg">
                  {order.currencySymbol} {order.total.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xl">
                  {counterparty.avatar}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    {isBuyer 
                      ? (isRTL ? 'البائع' : 'Seller')
                      : (isRTL ? 'المشتري' : 'Buyer')
                    }
                  </p>
                  <p className="font-semibold">
                    {isRTL ? counterparty.nameAr : counterparty.name}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 text-warning fill-warning" />
                  <span>{(counterparty.rating * 20).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rating Section */}
        {!submitted ? (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="text-center">
                <h3 className="font-semibold mb-1">
                  {isRTL ? 'قيّم الصفقة' : 'Rate this transaction'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isRTL 
                    ? `كيف كانت تجربتك مع ${counterparty.nameAr}؟`
                    : `How was your experience with ${counterparty.name}?`
                  }
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-16 flex-col gap-2 transition-all",
                    selectedRating === true && "border-success bg-success/10 text-success"
                  )}
                  onClick={() => setSelectedRating(true)}
                >
                  <ThumbsUp className={cn(
                    "h-6 w-6",
                    selectedRating === true && "fill-success"
                  )} />
                  <span className="text-sm font-medium">
                    {isRTL ? 'إيجابي' : 'Positive'}
                  </span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-16 flex-col gap-2 transition-all",
                    selectedRating === false && "border-destructive bg-destructive/10 text-destructive"
                  )}
                  onClick={() => setSelectedRating(false)}
                >
                  <ThumbsDown className={cn(
                    "h-6 w-6",
                    selectedRating === false && "fill-destructive"
                  )} />
                  <span className="text-sm font-medium">
                    {isRTL ? 'سلبي' : 'Negative'}
                  </span>
                </Button>
              </div>

              {selectedRating !== null && (
                <Button 
                  className={cn(
                    "w-full",
                    selectedRating === true && "bg-success hover:bg-success/90",
                    selectedRating === false && "bg-destructive hover:bg-destructive/90"
                  )}
                  onClick={handleRateSubmit}
                >
                  {isRTL ? 'إرسال التقييم' : 'Submit Rating'}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-success/10 border-success/30">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
              <p className="font-medium text-success">
                {isRTL ? 'شكراً لتقييمك!' : 'Thanks for your rating!'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Button */}
      <div className="p-4 border-t border-border bg-card safe-bottom">
        <Button className="w-full" onClick={onClose}>
          {isRTL ? 'رجوع' : 'Exit'}
        </Button>
      </div>
    </div>
  );
}
