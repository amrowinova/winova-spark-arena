import { useState } from 'react';
import { Clock, Loader2, AlertTriangle, Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { P2POrder, useP2P } from '@/contexts/P2PContext';
import { P2PSellerConfirmCard } from './P2PSellerConfirmCard';
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
  const { releaseFunds, openDispute, updateOrderStatus } = useP2P();
  const { success: showSuccess, error: showError } = useBanner();
  
  const [isExtendedWait, setIsExtendedWait] = useState(false);

  const isSeller = order.seller.id === currentUserId;

  // Only show for seller
  if (!isSeller) return null;

  // Show waiting state when in waiting_payment
  if (order.status === 'waiting_payment') {
    return (
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
      </motion.div>
    );
  }

  // Show confirmation card when buyer has paid
  if (order.status === 'paid') {
    const handleRelease = () => {
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
          onRelease={handleRelease}
          onNoPayment={handleNoPayment}
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
