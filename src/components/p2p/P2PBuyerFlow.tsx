import { useState, useRef } from 'react';
import { Unlock, Copy, Send, Clock, Loader2, Upload, Image as ImageIcon, CreditCard, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { P2POrder, useP2P } from '@/contexts/P2PContext';
import { P2PCancelOrderDialog } from './P2PCancelOrderDialog';
import { useBanner } from '@/contexts/BannerContext';
import { useP2PDatabase } from '@/hooks/useP2PDatabase';
import { generateSystemMessage } from '@/lib/p2pSystemMessages';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface P2PBuyerFlowProps {
  order: P2POrder;
  currentUserId: string;
  onOrderCompleted?: () => void;
}

type BuyerStep = 'locked' | 'unlocked';

export function P2PBuyerFlow({ order, currentUserId, onOrderCompleted }: P2PBuyerFlowProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { confirmPayment, relistOrder, isMockMode, triggerMockSellerConfirmation, getCancellationsIn24h, isBlockedFromOrders } = useP2P();
  const { success: showSuccess, error: showError } = useBanner();
  const db = useP2PDatabase();

  const [step, setStep] = useState<BuyerStep>('locked');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [screenshot, setScreenshot] = useState<{ file: File; preview: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalize status
  const statusStr = order.status as string;
  const normalizedStatus = statusStr === 'awaiting_payment' ? 'waiting_payment' 
    : statusStr === 'payment_sent' ? 'paid' 
    : statusStr;

  // Buyer waiting for seller (paid status)
  if (normalizedStatus === 'paid') {
    return (
      <div className="p-3 bg-muted/30 border-t border-border">
        <Card className="p-4 bg-warning/10 border-warning/30">
          <div className="flex items-start gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <Loader2 className="absolute -bottom-1 -right-1 h-4 w-4 text-warning animate-spin" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-warning">
                {isRTL ? '⏳ بانتظار تأكيد البائع' : '⏳ Waiting for seller confirmation'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {isRTL
                  ? 'سيتم تحرير Nova بمجرد تأكيد البائع استلام المبلغ'
                  : 'Nova will be released once seller confirms receipt'
                }
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Only show for waiting_payment status
  if (normalizedStatus !== 'waiting_payment') return null;

  const handleUnlock = async () => {
    setStep('unlocked');
    await db.sendSystemMessage(
      order.id,
      'buyer_copied_bank',
      `🔓 ${order.buyer.name} viewed payment details`,
      `🔓 قام ${order.buyer.nameAr || order.buyer.name} بعرض بيانات الدفع`
    );
  };

  const handleFieldCopied = async () => {
    await db.sendSystemMessage(
      order.id,
      'buyer_copied_bank',
      `📋 ${order.buyer.name} copied account details`,
      `📋 قام ${order.buyer.nameAr || order.buyer.name} بنسخ بيانات الحساب`
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      showError(isRTL ? 'يُقبل فقط صور JPG أو PNG' : 'Only JPG or PNG images are accepted');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showError(isRTL ? 'الحد الأقصى 5 ميجابايت' : 'Max file size is 5MB');
      return;
    }
    const preview = URL.createObjectURL(file);
    setScreenshot({ file, preview });
  };

  const handleConfirmPayment = async () => {
    setIsUploading(true);
    try {
      let screenshotUrl: string | undefined;

      if (screenshot) {
        const ext = screenshot.file.name.split('.').pop() || 'jpg';
        const path = `transfers/${order.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('p2p-disputes')
          .upload(path, screenshot.file);

        if (uploadError) {
          showError(isRTL ? 'فشل رفع الصورة، سيتم المتابعة بدونها' : 'Screenshot upload failed, proceeding without it');
        } else {
          const { data: urlData, error: urlError } = await supabase.storage
            .from('p2p-disputes')
            .createSignedUrl(path, 86400);
          if (!urlError) {
            screenshotUrl = urlData?.signedUrl;
          }
        }
      }

      const msgContent = `💸 ${order.buyer.name} sent transfer of ${order.currencySymbol} ${order.total.toFixed(2)} — waiting for seller confirmation`;
      const msgContentAr = `💸 أرسل ${order.buyer.nameAr || order.buyer.name} إشعار تحويل ${order.total.toFixed(2)} ${order.currencySymbol} — في انتظار تأكيد البائع`;

      if (screenshotUrl) {
        await db.sendMessage(order.id, msgContent, msgContentAr, true, 'buyer_paid');
      } else {
        await db.sendSystemMessage(order.id, 'buyer_paid', msgContent, msgContentAr);
      }

      const result = await confirmPayment(order.id);
      if (!result.success) {
        showError(result.error || (isRTL ? 'فشل تأكيد الدفع' : 'Payment confirmation failed'));
        return;
      }

      showSuccess(isRTL ? '✅ تم تأكيد الدفع' : '✅ Payment confirmed');

      if (isMockMode) {
        triggerMockSellerConfirmation(order.id);
      }
    } catch (err) {
      showError(isRTL ? 'حدث خطأ' : 'An error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelWithReason = async (reason: string) => {
    setShowCancelDialog(false);
    const result = await relistOrder(order.id, reason);
    if (result.success) {
      showSuccess(isRTL ? 'تم إلغاء الطلب وإعادته للسوق' : 'Order cancelled and returned to market');
    } else {
      showError(result.error || (isRTL ? 'فشل في إلغاء الطلب' : 'Failed to cancel order'));
    }
  };

  const paymentMethodName = order.paymentDetails.bankName;

  return (
    <>
      <div className="p-3 bg-muted/30 border-t border-border space-y-3">
        <AnimatePresence mode="wait">
          {/* Step 1: Locked — unlock payment details */}
          {step === 'locked' && (
            <motion.div
              key="locked"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <Card className="p-4 bg-muted/50 border-border">
                <div className="flex items-center justify-center gap-2 text-muted-foreground py-6">
                  <Unlock className="h-6 w-6" />
                  <span className="text-sm font-medium">
                    {isRTL ? 'بيانات الدفع مخفية — اضغط لعرضها' : 'Payment details hidden — tap to reveal'}
                  </span>
                </div>
              </Card>

              <Button
                onClick={handleUnlock}
                className="w-full h-12 gap-2 bg-primary hover:bg-primary/90"
              >
                <Unlock className="h-4 w-4" />
                {isRTL ? 'عرض بيانات التحويل 🔓' : '🔓 View Transfer Details'}
              </Button>

              <CancelSection
                isRTL={isRTL}
                isBlocked={isBlockedFromOrders()}
                cancellationsLeft={Math.max(0, 3 - getCancellationsIn24h())}
                onCancel={() => setShowCancelDialog(true)}
              />
            </motion.div>
          )}

          {/* Step 2: Unlocked — Binance-style payment details */}
          {step === 'unlocked' && (
            <motion.div
              key="unlocked"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {/* Step ① header */}
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">①</div>
                <span className="text-sm font-medium text-foreground">
                  {isRTL ? `التحويل عبر: ${paymentMethodName}` : `Transfer via: ${paymentMethodName}`}
                </span>
              </div>

              {/* Payment details card — Binance style */}
              <Card className="border-primary/20 bg-card overflow-hidden">
                <div className="divide-y divide-border">
                  {/* Amount to pay — highlighted */}
                  <PaymentRow
                    label={isRTL ? 'ستقوم بدفع' : 'You will pay'}
                    value={`${order.currencySymbol} ${order.total.toFixed(2)}`}
                    isHighlighted
                  />
                  <CopyRow
                    label={isRTL ? 'الاسم' : 'Account Name'}
                    value={order.paymentDetails.accountHolder}
                    onCopy={handleFieldCopied}
                    isRTL={isRTL}
                  />
                  <CopyRow
                    label={isRTL ? 'رقم الحساب' : 'Account Number'}
                    value={order.paymentDetails.accountNumber}
                    isMono
                    onCopy={handleFieldCopied}
                    isRTL={isRTL}
                  />
                  <CopyRow
                    label={isRTL ? 'البنك' : 'Bank'}
                    value={order.paymentDetails.bankName}
                    onCopy={handleFieldCopied}
                    isRTL={isRTL}
                  />
                </div>
              </Card>

              {/* Nova you'll receive */}
              <Card className="p-3 bg-success/10 border-success/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {isRTL ? 'ستحصل على' : "You'll receive"}
                  </span>
                  <span className="text-lg font-bold text-nova">
                    И {order.amount.toFixed(0)} Nova
                  </span>
                </div>
              </Card>

              {/* Step ② header */}
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-warning/20 text-warning text-xs font-bold">②</div>
                <span className="text-sm font-medium text-foreground">
                  {isRTL ? 'بعد الدفع، اضغط الزر أدناه لإخطار البائع' : 'After payment, tap below to notify seller'}
                </span>
              </div>

              {/* Screenshot upload (optional) */}
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {screenshot ? (
                  <div className="relative rounded-lg overflow-hidden border border-border">
                    <img
                      src={screenshot.preview}
                      alt="Transfer screenshot"
                      className="w-full max-h-32 object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => {
                        URL.revokeObjectURL(screenshot.preview);
                        setScreenshot(null);
                      }}
                    >
                      ×
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-9 gap-2 text-muted-foreground text-xs"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    {isRTL ? '📷 إرفاق صورة التحويل (اختياري)' : '📷 Attach transfer screenshot (optional)'}
                  </Button>
                )}
              </div>

              {/* Big CTA button */}
              <Button
                onClick={handleConfirmPayment}
                disabled={isUploading}
                className="w-full h-14 gap-2 text-base font-bold bg-warning hover:bg-warning/90 text-warning-foreground"
              >
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )}
                {isRTL ? 'تمّ التحويل — أخطر البائع 📲' : '📲 Transfer Done — Notify Seller'}
              </Button>

              {/* Timer warning */}
              <div className="flex items-center justify-center gap-2 text-xs text-warning">
                <Clock className="h-3 w-3" />
                <span>
                  {isRTL ? 'أكمل الدفع قبل انتهاء الوقت' : 'Complete payment before time expires'}
                </span>
              </div>

              <CancelSection
                isRTL={isRTL}
                isBlocked={isBlockedFromOrders()}
                cancellationsLeft={Math.max(0, 3 - getCancellationsIn24h())}
                onCancel={() => setShowCancelDialog(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <P2PCancelOrderDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onConfirm={handleCancelWithReason}
      />
    </>
  );
}

// --- Sub-components ---

function PaymentRow({ label, value, isHighlighted }: { label: string; value: string; isHighlighted?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between px-4 py-3", isHighlighted && "bg-warning/10")}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-bold", isHighlighted ? "text-warning" : "text-foreground")}>{value}</span>
    </div>
  );
}

function CopyRow({ label, value, isMono, onCopy, isRTL }: { 
  label: string; value: string; isMono?: boolean; onCopy: () => void; isRTL: boolean 
}) {
  const { success: showSuccess } = useBanner();
  const [copied, setCopied] = useState(false);
  const [hasSentNotification, setHasSentNotification] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    showSuccess(isRTL ? `تم نسخ ${label}` : `${label} copied`);
    setTimeout(() => setCopied(false), 2000);

    if (!hasSentNotification) {
      setHasSentNotification(true);
      onCopy();
    }
  };

  return (
    <div
      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={handleCopy}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className={cn("text-sm font-medium truncate", isMono && "font-mono")}>{value}</p>
      </div>
      {copied ? (
        <CheckCircle className="h-4 w-4 text-success shrink-0 ms-2" />
      ) : (
        <Copy className="h-4 w-4 text-muted-foreground shrink-0 ms-2" />
      )}
    </div>
  );
}

function CancelSection({ isRTL, isBlocked, cancellationsLeft, onCancel }: {
  isRTL: boolean; isBlocked: boolean; cancellationsLeft: number; onCancel: () => void;
}) {
  if (isBlocked) {
    return (
      <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30 text-center">
        <p className="text-xs text-destructive font-medium">
          {isRTL
            ? '🚫 لقد قمت بالإلغاء 3 مرات — حد الإلغاء اليومي. حاول بعد 24 ساعة'
            : '🚫 You have cancelled 3 times — daily limit reached. Try again in 24 hours'}
        </p>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        onClick={onCancel}
        className="w-full h-10 gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        {isRTL ? 'إلغاء الطلب' : 'Cancel Order'}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        {isRTL ? `باقي لك ${cancellationsLeft} إلغاء اليوم` : `${cancellationsLeft} cancellations left today`}
      </p>
    </>
  );
}
