import { useState } from 'react';
import { CheckCircle, XCircle, Wallet, Clock, User, AlertTriangle, Shield, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { P2POrder } from '@/contexts/P2PContext';
import { P2PNoPaymentSheet } from './P2PNoPaymentSheet';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface P2PSellerConfirmCardProps {
  order: P2POrder;
  buyerName: string;
  buyerNameAr: string;
  onRelease: () => void;
  onNoPayment: (action: 'wait' | 'dispute') => void;
}

export function P2PSellerConfirmCard({
  order,
  buyerName,
  buyerNameAr,
  onRelease,
  onNoPayment,
}: P2PSellerConfirmCardProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [showNoPaymentSheet, setShowNoPaymentSheet] = useState(false);

  // Only show for 'paid' status when seller needs to confirm
  if (order.status !== 'paid') {
    return null;
  }

  const displayName = isRTL ? buyerNameAr : buyerName;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-success/30 bg-success/5 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-success" />
              </div>
              <CardTitle className="text-base text-success">
                {isRTL ? '✅ تأكيد استلام التحويل' : '✅ Confirm Transfer Receipt'}
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Question */}
            <div className="p-3 bg-background rounded-lg border border-border">
              <p className="text-sm font-medium text-foreground">
                {isRTL 
                  ? `هل وصلك مبلغ ${order.currencySymbol} ${order.total.toFixed(2)}`
                  : `Did you receive ${order.currencySymbol} ${order.total.toFixed(2)}`
                }
              </p>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>
                  {isRTL ? `من ${displayName}` : `from ${displayName}`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isRTL ? 'إلى حسابك البنكي؟' : 'to your bank account?'}
              </p>
            </div>

            {/* Security Warning */}
            <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg border border-warning/30">
              <Lock className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-warning">
                  {isRTL ? '🔒 تنبيه أمني' : '🔒 Security Notice'}
                </p>
                <p className="text-xs text-warning/80 mt-1">
                  {isRTL 
                    ? 'يجب أن يتم التحويل من حساب باسم المشتري نفسه.'
                    : 'Transfer must be from an account in the buyer\'s name.'
                  }
                </p>
                <p className="text-xs text-warning/80">
                  {isRTL 
                    ? '❌ التحويل من طرف ثالث ممنوع وسيؤدي إلى نزاع.'
                    : '❌ Third-party transfers are prohibited and will result in a dispute.'
                  }
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {/* Release Button */}
              <Button
                onClick={onRelease}
                className="w-full h-12 gap-2 bg-success hover:bg-success/90"
              >
                <CheckCircle className="h-5 w-5" />
                <span>
                  {isRTL 
                    ? `وصلني المبلغ – حرّر ${order.amount.toFixed(0)} Nova`
                    : `Payment Received – Release ${order.amount.toFixed(0)} Nova`
                  }
                </span>
              </Button>

              {/* No Payment Button */}
              <Button
                variant="outline"
                onClick={() => setShowNoPaymentSheet(true)}
                className="w-full h-11 gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <XCircle className="h-4 w-4" />
                {isRTL ? 'لم يصلني المبلغ' : 'Payment Not Received'}
              </Button>
            </div>

            {/* Timer reminder */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {isRTL 
                  ? 'تأكد من وصول المبلغ قبل التحرير'
                  : 'Verify payment before releasing'
                }
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* No Payment Bottom Sheet */}
      <P2PNoPaymentSheet
        open={showNoPaymentSheet}
        onOpenChange={setShowNoPaymentSheet}
        onAction={onNoPayment}
      />
    </>
  );
}
