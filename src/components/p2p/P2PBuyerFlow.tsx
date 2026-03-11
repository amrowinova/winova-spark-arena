import { useState, useRef } from 'react';
import { Unlock, Copy, Send, Clock, Loader2, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { P2POrder, useP2P } from '@/contexts/P2PContext';
import { P2PPaymentCard } from './P2PPaymentCard';
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

type BuyerStep = 'locked' | 'unlocked' | 'ready_to_send';

export function P2PBuyerFlow({ order, currentUserId, onOrderCompleted }: P2PBuyerFlowProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { confirmPayment, cancelOrderWithReason, relistOrder, isMockMode, triggerMockSellerConfirmation, getCancellationsIn24h, isBlockedFromOrders } = useP2P();
  const { success: showSuccess, error: showError } = useBanner();
  const db = useP2PDatabase();

  const [step, setStep] = useState<BuyerStep>('locked');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [screenshot, setScreenshot] = useState<{ file: File; preview: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Buyer waiting for seller (paid status)
  if (order.status === 'paid') {
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
  if (order.status !== 'waiting_payment') return null;

  const buyerName = isRTL ? order.buyer.nameAr : order.buyer.name;

  // Step 1: Unlock payment details
  const handleUnlock = async () => {
    setStep('unlocked');
    // Send system message
    const msg = generateSystemMessage('buyer_copied_bank', {
      buyerName: order.buyer.name,
    });
    await db.sendSystemMessage(
      order.id,
      'buyer_copied_bank',
      `🔓 ${order.buyer.name} viewed payment details`,
      `🔓 قام ${order.buyer.nameAr || order.buyer.name} بعرض بيانات الدفع`
    );
  };

  // Step 2: Copy handler (called from PaymentCard)
  const handleFieldCopied = async () => {
    await db.sendSystemMessage(
      order.id,
      'buyer_copied_bank',
      `📋 ${order.buyer.name} copied account details`,
      `📋 قام ${order.buyer.nameAr || order.buyer.name} بنسخ بيانات الحساب`
    );
  };

  // Handle file select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showError(isRTL ? 'يرجى اختيار صورة' : 'Please select an image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showError(isRTL ? 'الحد الأقصى 5 ميجابايت' : 'Max file size is 5MB');
      return;
    }
    const preview = URL.createObjectURL(file);
    setScreenshot({ file, preview });
  };

  // Step 3: Confirm payment sent
  const handleConfirmPayment = async () => {
    setIsUploading(true);
    try {
      let screenshotUrl: string | undefined;

      // Upload screenshot if provided
      if (screenshot) {
        const ext = screenshot.file.name.split('.').pop() || 'jpg';
        const path = `transfers/${order.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('p2p-disputes')
          .upload(path, screenshot.file);

        if (!uploadError) {
          const { data: urlData } = await supabase.storage
            .from('p2p-disputes')
            .createSignedUrl(path, 86400);
          screenshotUrl = urlData?.signedUrl;
        }
      }

      // Send system message with transfer notification
      const msgContent = `💸 ${order.buyer.name} sent transfer of ${order.currencySymbol} ${order.total.toFixed(2)} — waiting for seller confirmation`;
      const msgContentAr = `💸 أرسل ${order.buyer.nameAr || order.buyer.name} إشعار تحويل ${order.total.toFixed(2)} ${order.currencySymbol} — في انتظار تأكيد البائع`;

      if (screenshotUrl) {
        // Send as a message with attachment
        await db.sendMessage(order.id, msgContent, msgContentAr, true, 'buyer_paid');
      } else {
        await db.sendSystemMessage(order.id, 'buyer_paid', msgContent, msgContentAr);
      }

      // Confirm payment via RPC
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

  return (
    <>
      <div className="p-3 bg-muted/30 border-t border-border space-y-3">
        {/* Header: You will receive */}
        <Card className="p-3 bg-success/10 border-success/30">
          <p className="text-sm font-medium text-success text-center">
            {isRTL
              ? `✨ ستتلقى И${order.amount.toFixed(0)} Nova`
              : `✨ You will receive И${order.amount.toFixed(0)} Nova`
            }
          </p>
        </Card>

        <AnimatePresence mode="wait">
          {/* Step 1: Unlock payment details */}
          {step === 'locked' && (
            <motion.div
              key="locked"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {/* Locked payment details placeholder */}
              <Card className="p-4 bg-muted/50 border-border">
                <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
                  <Unlock className="h-5 w-5" />
                  <span className="text-sm">
                    {isRTL ? 'بيانات الدفع مخفية' : 'Payment details hidden'}
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

              {isBlockedFromOrders() ? (
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30 text-center">
                  <p className="text-xs text-destructive font-medium">
                    {isRTL
                      ? '🚫 لقد قمت بالإلغاء 3 مرات — حد الإلغاء اليومي. حاول بعد 24 ساعة'
                      : '🚫 You have cancelled 3 times — daily limit reached. Try again in 24 hours'}
                  </p>
                </div>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => setShowCancelDialog(true)}
                    className="w-full h-10 gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    {isRTL ? 'إلغاء الطلب' : 'Cancel Order'}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    {isRTL ? `باقي لك ${Math.max(0, 3 - getCancellationsIn24h())} إلغاء اليوم` : `${Math.max(0, 3 - getCancellationsIn24h())} cancellations left today`}
                  </p>
                </>
              )}
            </motion.div>
          )}

          {/* Step 2: Payment details revealed + copy */}
          {(step === 'unlocked' || step === 'ready_to_send') && (
            <motion.div
              key="unlocked"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {/* Payment details card with copy-on-click notifications */}
              <P2PPaymentCardWithNotify
                paymentDetails={order.paymentDetails}
                onFieldCopied={handleFieldCopied}
              />

              {/* Amount reminder */}
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'المبلغ المطلوب' : 'Amount to pay'}
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    {order.currencySymbol} {order.total.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'ستحصل على' : "You'll receive"}
                  </p>
                  <p className="text-lg font-bold text-nova">
                    И {order.amount.toFixed(0)}
                  </p>
                </div>
              </div>

              {/* Screenshot upload */}
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {screenshot ? (
                  <div className="relative rounded-lg overflow-hidden border border-border">
                    <img
                      src={screenshot.preview}
                      alt="Transfer screenshot"
                      className="w-full max-h-40 object-cover"
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
                    className="w-full h-10 gap-2 text-muted-foreground"
                  >
                    <ImageIcon className="h-4 w-4" />
                    {isRTL ? '📷 إرفاق صورة التحويل (اختياري)' : '📷 Attach transfer screenshot (optional)'}
                  </Button>
                )}
              </div>

              {/* Confirm payment button */}
              <Button
                onClick={handleConfirmPayment}
                disabled={isUploading}
                className="w-full h-12 gap-2 bg-success hover:bg-success/90"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isRTL ? 'لقد أرسلت المبلغ 💸' : '💸 I have sent the payment'}
              </Button>

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

              <Button
                variant="ghost"
                onClick={() => setShowCancelDialog(true)}
                className="w-full h-10 gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                {isRTL ? 'إلغاء الطلب' : 'Cancel Order'}
              </Button>
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

// Enhanced PaymentCard that notifies on copy
function P2PPaymentCardWithNotify({
  paymentDetails,
  onFieldCopied,
}: {
  paymentDetails: P2POrder['paymentDetails'];
  onFieldCopied: () => void;
}) {
  const { language } = useLanguage();
  const { success: showSuccess } = useBanner();
  const [hasCopied, setHasCopied] = useState(false);

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    showSuccess(language === 'ar' ? `تم نسخ ${label}` : `${label} copied`);

    // Only send the system message once per session
    if (!hasCopied) {
      setHasCopied(true);
      onFieldCopied();
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-medium text-sm">
          {language === 'ar' ? '🏦 بيانات الدفع' : '🏦 Payment Details'}
        </span>
      </div>

      <div className="space-y-2">
        <CopyField
          label={language === 'ar' ? 'البنك' : 'Bank'}
          value={paymentDetails.bankName}
          onCopy={() => handleCopy(paymentDetails.bankName, language === 'ar' ? 'البنك' : 'Bank')}
        />
        <CopyField
          label={language === 'ar' ? 'رقم الحساب' : 'Account Number'}
          value={paymentDetails.accountNumber}
          isMono
          onCopy={() => handleCopy(paymentDetails.accountNumber, language === 'ar' ? 'رقم الحساب' : 'Account')}
        />
        <CopyField
          label={language === 'ar' ? 'اسم صاحب الحساب' : 'Account Holder'}
          value={paymentDetails.accountHolder}
          onCopy={() => handleCopy(paymentDetails.accountHolder, language === 'ar' ? 'الاسم' : 'Name')}
        />
      </div>
    </Card>
  );
}

function CopyField({
  label,
  value,
  isMono,
  onCopy,
}: {
  label: string;
  value: string;
  isMono?: boolean;
  onCopy: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between p-2 bg-background rounded cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onCopy}
    >
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className={cn("text-sm font-medium", isMono && "font-mono")}>{value}</p>
      </div>
      <Copy className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
