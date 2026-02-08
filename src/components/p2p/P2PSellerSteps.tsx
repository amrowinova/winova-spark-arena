import { useState, useEffect, useRef } from 'react';
import { Clock, Loader2, AlertTriangle, Lock, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { P2POrder, useP2P } from '@/contexts/P2PContext';
import { P2PSellerConfirmCard } from './P2PSellerConfirmCard';
import { P2PCancelOrderDialog } from './P2PCancelOrderDialog';
import { ReleaseSafetyFlow } from './release-safety';
import { useBanner } from '@/contexts/BannerContext';
import { motion, AnimatePresence } from 'framer-motion';

interface P2PSellerStepsProps {
  order: P2POrder;
  currentUserId: string;
  onOrderCompleted?: () => void;
}

export function P2PSellerSteps({
  order,
  currentUserId,
  onOrderCompleted,
}: P2PSellerStepsProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { 
    releaseFunds, 
    openDispute, 
    relistOrder, 
    isBlockedFromOrders, 
    isMockMode, 
    triggerMockBuyerPayment 
  } = useP2P();
  const { success: showSuccess, error: showError } = useBanner();
  
  const [isExtendedWait, setIsExtendedWait] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showSafetyFlow, setShowSafetyFlow] = useState(false);
  
  // Track if we've already triggered the mock simulation for this order
  const hasTriggeredMockRef = useRef<string | null>(null);

  const isSeller = order.seller.id === currentUserId;

  // Auto-trigger mock buyer payment when in waiting_payment status (sell flow)
  // Must be before any early returns to follow React hooks rules
  useEffect(() => {
    if (
      isMockMode && 
      isSeller &&
      order.status === 'waiting_payment' && 
      order.type === 'sell' &&
      hasTriggeredMockRef.current !== order.id
    ) {
      hasTriggeredMockRef.current = order.id;
      triggerMockBuyerPayment(order.id);
    }
  }, [isMockMode, isSeller, order.id, order.status, order.type, triggerMockBuyerPayment]);

  // Handle cancel order with reason
  const handleCancelWithReason = async (reason: string) => {
    setShowCancelDialog(false);
    
    if (order.status === 'waiting_payment') {
      const relisted = await relistOrder(order.id, reason);
      if (relisted) {
        showSuccess(isRTL ? 'تم إلغاء الطلب وإعادته للسوق' : 'Order cancelled and returned to market');
      } else {
        if (isBlockedFromOrders()) {
          showError(isRTL 
            ? 'لا يمكنك الإلغاء. تم تجاوز حد الإلغاءات (3 خلال 24 ساعة).'
            : 'Cannot cancel. You have exceeded the cancellation limit (3 per 24 hours).'
          );
        } else {
          showError(isRTL ? 'فشل في إلغاء الطلب' : 'Failed to cancel order');
        }
      }
    } else if (order.status === 'paid') {
      openDispute(order.id, isRTL 
        ? 'محاولة إلغاء بعد تأكيد الدفع'
        : 'Cancellation attempt after payment confirmation'
      );
      showError(isRTL 
        ? '⚖️ تم فتح نزاع – لا يمكن الإلغاء بعد الدفع'
        : '⚖️ Dispute opened – Cannot cancel after payment'
      );
    }
  };

  // Only show for seller
  if (!isSeller) return null;

  // Show waiting state when in waiting_payment
  if (order.status === 'waiting_payment') {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-muted/30 border-t border-border"
        >
          <Card className="p-4 bg-info/10 border-info/30">
            <div className="flex items-start gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-info/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-info" />
                </div>
                <Loader2 className="absolute -bottom-1 -right-1 h-4 w-4 text-info animate-spin" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-info">
                  {isRTL ? '🏦 قام المشتري بنسخ معلومات حسابك البنكي' : '🏦 Buyer copied your bank info'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isRTL 
                    ? `وسيقوم بتحويل مبلغ ${order.currencySymbol} ${order.total.toFixed(2)}`
                    : `Will transfer ${order.currencySymbol} ${order.total.toFixed(2)}`
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isRTL ? 'يرجى الانتظار حتى يتم التحويل.' : 'Please wait for the transfer.'}
                </p>
              </div>
            </div>

            {/* Security Notice */}
            <div className="mt-3 p-2 bg-warning/10 rounded-lg border border-warning/20">
              <div className="flex items-start gap-2">
                <Lock className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-warning">
                    {isRTL ? '🔒 تنبيه أمني' : '🔒 Security Notice'}
                  </p>
                  <p className="text-[10px] text-warning/80 mt-0.5">
                    {isRTL 
                      ? 'يجب أن يتم التحويل من حساب باسم المشتري نفسه. ❌ التحويل من طرف ثالث ممنوع وسيؤدي إلى نزاع.'
                      : 'Transfer must be from buyer\'s own account. ❌ Third-party transfers are prohibited.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Cancel Button for seller */}
          <Button
            variant="ghost"
            onClick={() => setShowCancelDialog(true)}
            className="w-full mt-3 h-10 gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <XCircle className="h-4 w-4" />
            <span className="text-sm">
              {isRTL ? 'إلغاء الطلب' : 'Cancel Order'}
            </span>
          </Button>
        </motion.div>

        {/* Cancel Dialog */}
        <P2PCancelOrderDialog
          open={showCancelDialog}
          onOpenChange={setShowCancelDialog}
          onConfirm={handleCancelWithReason}
        />
      </>
    );
  }

  // Show confirmation card when buyer has paid
  if (order.status === 'paid') {
    const handleReleaseRequest = () => {
      setShowSafetyFlow(true);
    };

    const handleConfirmedRelease = () => {
      releaseFunds(order.id);
      showSuccess(isRTL 
        ? `🎉 تم تحرير ${order.amount.toFixed(0)} Nova بنجاح!`
        : `🎉 ${order.amount.toFixed(0)} Nova released successfully!`
      );
      onOrderCompleted?.();
    };

    const handleNoPayment = (action: 'wait' | 'dispute') => {
      if (action === 'wait') {
        setIsExtendedWait(true);
        showSuccess(isRTL 
          ? '⏳ تم تمديد وقت الانتظار 10 دقائق'
          : '⏳ Wait time extended by 10 minutes'
        );
        // Reset extended wait after 10 minutes (mock)
        setTimeout(() => setIsExtendedWait(false), 10000); // 10 seconds in mock
      } else {
        openDispute(order.id, isRTL 
          ? 'البائع يبلغ عن عدم استلام التحويل'
          : 'Seller reports payment not received'
        );
        showError(isRTL 
          ? '⚖️ تم فتح نزاع – سيراجعه فريق الدعم'
          : '⚖️ Dispute opened – Support will review'
        );
      }
    };

    return (
      <div className="p-3 bg-muted/30 border-t border-border">
        <AnimatePresence>
          {isExtendedWait && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3"
            >
              <Card className="p-3 bg-warning/10 border-warning/30">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-warning animate-pulse" />
                  <span className="text-sm text-warning font-medium">
                    {isRTL ? '⏳ وقت الانتظار الإضافي جارٍ...' : '⏳ Extended wait in progress...'}
                  </span>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* System message about buyer payment */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3"
        >
          <Card className="p-3 bg-nova/10 border-nova/30">
            <p className="text-sm font-medium text-nova">
              {isRTL ? '💸 قام المشتري بتنفيذ التحويل البنكي' : '💸 Buyer executed bank transfer'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isRTL 
                ? 'يرجى التأكد من وصول المبلغ قبل تحرير Nova.'
                : 'Please verify payment before releasing Nova.'
              }
            </p>
          </Card>
        </motion.div>

        <P2PSellerConfirmCard
          order={order}
          buyerName={order.buyer.name}
          buyerNameAr={order.buyer.nameAr}
          onRelease={handleReleaseRequest}
          onNoPayment={handleNoPayment}
        />

        <ReleaseSafetyFlow
          open={showSafetyFlow}
          onOpenChange={setShowSafetyFlow}
          novaAmount={order.amount}
          currencySymbol={order.currencySymbol}
          localTotal={order.total}
          buyerName={isRTL ? order.buyer.nameAr : order.buyer.name}
          onConfirmRelease={handleConfirmedRelease}
        />
      </div>
    );
  }

  // Show dispute state
  if (order.status === 'dispute') {
    return (
      <div className="p-3 bg-muted/30 border-t border-border">
        <Card className="p-4 bg-destructive/10 border-destructive/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="font-medium text-destructive">
                {isRTL ? '⚖️ نزاع قيد المراجعة' : '⚖️ Dispute Under Review'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isRTL 
                  ? 'تم قفل الأزرار – فريق الدعم يراجع الصفقة'
                  : 'Buttons locked – Support reviewing transaction'
                }
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}
