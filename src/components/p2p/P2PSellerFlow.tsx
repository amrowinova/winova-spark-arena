import { useState, useEffect, useRef } from 'react';
import { Clock, Loader2, CheckCircle, Timer, Scale, Lock, XCircle, Upload } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { P2POrder, useP2P } from '@/contexts/P2PContext';
import { ReleaseSafetyFlow } from './release-safety';
import { useBanner } from '@/contexts/BannerContext';
import { useP2PExtendTime } from '@/hooks/useP2PExtendTime';
import { useP2PDisputeFiles } from '@/hooks/useP2PDisputeFiles';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { P2PCancelOrderDialog } from './P2PCancelOrderDialog';

interface P2PSellerFlowProps {
  order: P2POrder;
  currentUserId: string;
  onOrderCompleted?: () => void;
}

export function P2PSellerFlow({ order, currentUserId, onOrderCompleted }: P2PSellerFlowProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const {
    releaseFunds,
    openDispute,
    relistOrder,
    isMockMode,
    triggerMockBuyerPayment,
    getCancellationsIn24h,
    isBlockedFromOrders,
  } = useP2P();
  const { success: showSuccess, error: showError } = useBanner();
  const { extendTime, isExtending } = useP2PExtendTime();

  const [showSafetyFlow, setShowSafetyFlow] = useState(false);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeFile, setDisputeFile] = useState<File | null>(null);
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const disputeFileRef = useRef<HTMLInputElement>(null);

  const hasTriggeredMockRef = useRef<string | null>(null);

  // Auto-trigger mock buyer payment
  useEffect(() => {
    if (
      isMockMode &&
      order.status === 'waiting_payment' &&
      order.type === 'sell' &&
      hasTriggeredMockRef.current !== order.id
    ) {
      hasTriggeredMockRef.current = order.id;
      triggerMockBuyerPayment(order.id);
    }
  }, [isMockMode, order.id, order.status, order.type, triggerMockBuyerPayment]);

  const buyerName = isRTL ? (order.buyer.nameAr || order.buyer.name) : order.buyer.name;
  const paymentMethodName = order.paymentDetails.bankName;

  // Handle cancel
  const handleCancelWithReason = async (reason: string) => {
    setShowCancelDialog(false);
    const result = await relistOrder(order.id, reason);
    if (result.success) {
      showSuccess(isRTL ? 'تم إلغاء الطلب وإعادته للسوق' : 'Order cancelled and returned to market');
    } else {
      showError(result.error || (isRTL ? 'فشل في إلغاء الطلب' : 'Failed to cancel order'));
    }
  };

  // Handle release
  const handleConfirmedRelease = async () => {
    const result = await releaseFunds(order.id);
    if (!result.success) {
      showError(result.error || (isRTL ? 'فشل تحرير Nova' : 'Failed to release Nova'));
      return;
    }
    showSuccess(isRTL
      ? `🎉 تم تحرير ${order.amount.toFixed(0)} Nova بنجاح!`
      : `🎉 ${order.amount.toFixed(0)} Nova released successfully!`
    );
    onOrderCompleted?.();
  };

  // Handle extend time (30 minutes)
  const handleExtendTime = async () => {
    const result = await extendTime(order.id, 30);
    if (result.success) {
      showSuccess(isRTL ? '⏳ تم تمديد الوقت 30 دقيقة إضافية' : '⏳ Time extended by 30 minutes');
    } else {
      showError(result.error || (isRTL ? 'فشل تمديد الوقت' : 'Failed to extend time'));
    }
  };

  // Handle dispute submission
  const handleSubmitDispute = async () => {
    if (!disputeReason.trim()) {
      showError(isRTL ? 'يرجى كتابة سبب النزاع' : 'Please enter a dispute reason');
      return;
    }

    setIsSubmittingDispute(true);
    try {
      const result = await openDispute(order.id, disputeReason.trim());
      if (result.success) {
        showError(isRTL
          ? '⚖️ تم فتح نزاع – سيراجعه فريق الدعم'
          : '⚖️ Dispute opened – Support will review'
        );
        setShowDisputeDialog(false);
        setDisputeReason('');
      } else {
        showError(result.error || (isRTL ? 'فشل فتح النزاع' : 'Failed to open dispute'));
      }
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  // Seller waiting for buyer payment
  if (order.status === 'waiting_payment') {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-muted/30 border-t border-border space-y-3"
        >
          {/* Header: What will happen */}
          <Card className="p-3 bg-info/10 border-info/30">
            <p className="text-sm font-medium text-info text-center">
              {isRTL
                ? `🏦 سيقوم ${buyerName} بتحويل ${order.total.toFixed(2)} ${order.currencySymbol} لحسابك (${paymentMethodName})`
                : `🏦 ${buyerName} will transfer ${order.currencySymbol} ${order.total.toFixed(2)} to your account (${paymentMethodName})`
              }
            </p>
          </Card>

          <Card className="p-4 bg-muted/30 border-border">
            <div className="flex items-start gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-info/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-info" />
                </div>
                <Loader2 className="absolute -bottom-1 -right-1 h-4 w-4 text-info animate-spin" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {isRTL ? '⏳ بانتظار الدفع من المشتري' : '⏳ Waiting for buyer payment'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isRTL
                    ? 'يرجى الانتظار حتى يتم التحويل.'
                    : 'Please wait for the transfer.'
                  }
                </p>
              </div>
            </div>

            {/* Security Notice */}
            <div className="mt-3 p-2 bg-warning/10 rounded-lg border border-warning/20">
              <div className="flex items-start gap-2">
                <Lock className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                <p className="text-[10px] text-warning/80">
                  {isRTL
                    ? '🔒 يجب أن يتم التحويل من حساب باسم المشتري نفسه. ❌ التحويل من طرف ثالث ممنوع.'
                    : "🔒 Transfer must be from buyer's own account. ❌ Third-party transfers are prohibited."
                  }
                </p>
              </div>
            </div>
          </Card>

          <Button
            variant="ghost"
            onClick={() => setShowCancelDialog(true)}
            className="w-full h-10 gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <XCircle className="h-4 w-4" />
            {isRTL ? 'إلغاء الطلب' : 'Cancel Order'}
          </Button>
        </motion.div>

        <P2PCancelOrderDialog
          open={showCancelDialog}
          onOpenChange={setShowCancelDialog}
          onConfirm={handleCancelWithReason}
        />
      </>
    );
  }

  // Seller confirm/release (paid status)
  if (order.status === 'paid') {
    return (
      <>
        <div className="p-3 bg-muted/30 border-t border-border space-y-3">
          {/* Header: Buyer info */}
          <Card className="p-3 bg-nova/10 border-nova/30">
            <p className="text-sm font-medium text-nova text-center">
              {isRTL
                ? `💸 قام ${buyerName} بتحويل ${order.total.toFixed(2)} ${order.currencySymbol} لحسابك`
                : `💸 ${buyerName} transferred ${order.currencySymbol} ${order.total.toFixed(2)} to your account`
              }
            </p>
          </Card>

          {/* Security Warning */}
          <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg border border-warning/30">
            <Lock className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-warning/80">
              {isRTL
                ? '🔒 تأكد من وصول المبلغ لحسابك البنكي قبل التحرير. يجب أن يكون التحويل من حساب باسم المشتري.'
                : '🔒 Verify the payment arrived in your bank account before releasing. Transfer must be from buyer\'s own account.'
              }
            </p>
          </div>

          {/* Three action buttons */}
          <div className="space-y-2">
            {/* Release */}
            <Button
              onClick={() => setShowSafetyFlow(true)}
              className="w-full h-12 gap-2 bg-success hover:bg-success/90"
            >
              <CheckCircle className="h-5 w-5" />
              {isRTL
                ? `✅ وصلني المبلغ — حرّر ${order.amount.toFixed(0)} Nova`
                : `✅ Payment received — Release ${order.amount.toFixed(0)} Nova`
              }
            </Button>

            {/* Extend time */}
            <Button
              variant="outline"
              onClick={handleExtendTime}
              disabled={isExtending}
              className="w-full h-11 gap-2 border-warning/30 text-warning hover:bg-warning/10"
            >
              {isExtending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Timer className="h-4 w-4" />
              )}
              {isRTL ? '⏳ لم يصل بعد — تمديد الوقت' : '⏳ Not received yet — Extend time'}
            </Button>

            {/* Open dispute */}
            <Button
              variant="outline"
              onClick={() => setShowDisputeDialog(true)}
              className="w-full h-11 gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <Scale className="h-4 w-4" />
              {isRTL ? '⚖️ فتح تحكيم' : '⚖️ Open Arbitration'}
            </Button>
          </div>
        </div>

        {/* Release Safety Flow */}
        <ReleaseSafetyFlow
          open={showSafetyFlow}
          onOpenChange={setShowSafetyFlow}
          novaAmount={order.amount}
          currencySymbol={order.currencySymbol}
          localTotal={order.total}
          buyerName={buyerName}
          onConfirmRelease={handleConfirmedRelease}
        />

        {/* Dispute Dialog */}
        <AlertDialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-destructive" />
                {isRTL ? '⚖️ فتح تحكيم' : '⚖️ Open Arbitration'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isRTL
                  ? 'اشرح سبب النزاع وأرفق أي دليل يدعم موقفك'
                  : 'Explain the dispute reason and attach any evidence to support your case'
                }
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-3 py-2">
              <Textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder={isRTL ? 'اكتب سبب النزاع...' : 'Describe the dispute reason...'}
                rows={3}
              />

              <input
                ref={disputeFileRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setDisputeFile(e.target.files?.[0] || null)}
                className="hidden"
              />

              <Button
                variant="outline"
                size="sm"
                onClick={() => disputeFileRef.current?.click()}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {disputeFile
                  ? disputeFile.name
                  : (isRTL ? '📎 إرفاق دليل' : '📎 Attach evidence')
                }
              </Button>
            </div>

            <AlertDialogFooter className="flex-row gap-2">
              <AlertDialogCancel className="flex-1 mt-0" disabled={isSubmittingDispute}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </AlertDialogCancel>
              <Button
                onClick={handleSubmitDispute}
                disabled={isSubmittingDispute || !disputeReason.trim()}
                className="flex-1 bg-destructive hover:bg-destructive/90"
              >
                {isSubmittingDispute ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  isRTL ? '⚖️ تأكيد فتح النزاع' : '⚖️ Confirm Dispute'
                )}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return null;
}
