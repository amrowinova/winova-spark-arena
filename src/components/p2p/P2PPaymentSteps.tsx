import { useState } from 'react';
import { Copy, CheckCircle, XCircle, Clock, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { P2POrder } from '@/contexts/P2PContext';
import { P2PCancelOrderDialog } from './P2PCancelOrderDialog';
import { P2PConfirmPaymentDialog } from './P2PConfirmPaymentDialog';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useP2PDatabase } from '@/hooks/useP2PDatabase';

interface P2PPaymentStepsProps {
  order: P2POrder;
  onConfirmPayment: () => void;
  onCancelOrder: (reason: string) => void;
}

type PaymentStep = 'initial' | 'ready_to_pay';

export function P2PPaymentSteps({
  order,
  onConfirmPayment,
  onCancelOrder,
}: P2PPaymentStepsProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const db = useP2PDatabase();

  const [step, setStep] = useState<PaymentStep>('initial');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);

  // Only show for waiting_payment status
  if (order.status !== 'waiting_payment') {
    return null;
  }

  const handleCopyAndProceed = async () => {
    // Notify that buyer copied bank info
    await db.notifyBuyerCopiedBank(order.id);
    setStep('ready_to_pay');
  };

  const handleCancelConfirm = (reason: string) => {
    setShowCancelDialog(false);
    onCancelOrder(reason);
  };

  const handlePaymentConfirm = () => {
    setShowPaymentConfirm(false);
    onConfirmPayment();
  };

  return (
    <>
      <Card className="p-4 bg-muted/30 border-primary/20">
        <AnimatePresence mode="wait">
          {step === 'initial' && (
            <motion.div
              key="initial"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {/* Step indicator */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">
                  1
                </div>
                <span>
                  {isRTL ? 'انسخ معلومات الحساب' : 'Copy account info'}
                </span>
              </div>

              {/* Main action button */}
              <Button
                onClick={handleCopyAndProceed}
                className="w-full h-12 gap-2 bg-primary hover:bg-primary/90"
              >
                <Copy className="h-4 w-4" />
                <span className="text-sm">
                  {isRTL 
                    ? 'قمت بنسخ معلومات حسابك وسأقوم بالدفع الآن'
                    : "I copied account info and I'm proceeding to pay"
                  }
                </span>
              </Button>

              {/* Helper text */}
              <p className="text-xs text-muted-foreground text-center">
                {isRTL 
                  ? '⚠️ تأكد من نسخ جميع معلومات الحساب قبل المتابعة'
                  : '⚠️ Make sure to copy all account details before proceeding'
                }
              </p>

              {/* Cancel order button - available before payment */}
              <Button
                variant="ghost"
                onClick={() => setShowCancelDialog(true)}
                className="w-full h-10 gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <X className="h-4 w-4" />
                <span className="text-sm">
                  {isRTL ? 'إلغاء الطلب' : 'Cancel Order'}
                </span>
              </Button>
            </motion.div>
          )}

          {step === 'ready_to_pay' && (
            <motion.div
              key="ready_to_pay"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {/* Step indicator */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-success/20 text-success text-xs font-bold">
                  2
                </div>
                <span>
                  {isRTL ? 'أكد عملية الدفع' : 'Confirm payment'}
                </span>
              </div>

              {/* Payment amount reminder */}
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'المبلغ المطلوب' : 'Amount to pay'}
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    {order.currencySymbol} {order.total.toFixed(2)}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'ستحصل على' : "You'll receive"}
                  </p>
                  <p className="text-lg font-bold text-nova">
                    И {order.amount.toFixed(0)}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCancelDialog(true)}
                  className="flex-1 h-11 gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <XCircle className="h-4 w-4" />
                  {isRTL ? 'إلغاء الأمر' : 'Cancel Order'}
                </Button>
                <Button
                  onClick={() => setShowPaymentConfirm(true)}
                  className="flex-1 h-11 gap-2 bg-success hover:bg-success/90"
                >
                  <CheckCircle className="h-4 w-4" />
                  {isRTL ? 'لقد قمت بالدفع' : 'I have paid'}
                </Button>
              </div>

              {/* Timer warning */}
              <div className="flex items-center justify-center gap-2 text-xs text-warning">
                <Clock className="h-3 w-3" />
                <span>
                  {isRTL 
                    ? 'أكمل الدفع قبل انتهاء الوقت'
                    : 'Complete payment before time expires'
                  }
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Cancel Order Dialog */}
      <P2PCancelOrderDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onConfirm={handleCancelConfirm}
      />

      {/* Payment Confirmation Dialog */}
      <P2PConfirmPaymentDialog
        open={showPaymentConfirm}
        onOpenChange={setShowPaymentConfirm}
        order={order}
        onConfirm={handlePaymentConfirm}
      />
    </>
  );
}
