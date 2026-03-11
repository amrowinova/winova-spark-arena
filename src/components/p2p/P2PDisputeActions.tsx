import { useState, useRef } from 'react';
import { CheckCircle, Undo2, Camera, AlertTriangle, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { P2POrder, useP2P } from '@/contexts/P2PContext';
import { useBanner } from '@/contexts/BannerContext';
import { getP2PRoleInfoFromOrder } from '@/lib/p2pRoleUtils';
import { ReleaseSafetyFlow } from './release-safety/ReleaseSafetyFlow';
import { resolveDispute } from '@/lib/p2pEscrowService';
import { useAuth } from '@/contexts/AuthContext';

interface P2PDisputeActionsProps {
  order: P2POrder;
  currentUserId: string;
  onOrderCompleted?: () => void;
}

export function P2PDisputeActions({ order, currentUserId, onOrderCompleted }: P2PDisputeActionsProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { sendMessage } = useP2P();
  const { success: showSuccess, error: showError } = useBanner();
  const { user: authUser } = useAuth();
  const roleInfo = getP2PRoleInfoFromOrder(order, currentUserId);

  // Dialog states
  const [showReleaseFlow, setShowReleaseFlow] = useState(false);
  const [showCancelArbitration, setShowCancelArbitration] = useState(false);
  const [acceptResponsibility, setAcceptResponsibility] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proofSent, setProofSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Find the active chat for sending proof
  const chatId = order.id;

  const handleReleaseFunds = async () => {
    setIsSubmitting(true);
    try {
      const userId = authUser?.id || currentUserId;
      const result = await resolveDispute(order.id, userId, 'release_to_buyer');
      if (result.success) {
        showSuccess(isRTL ? '✅ تم تحرير Nova للمشتري' : '✅ Nova released to buyer');
        onOrderCompleted?.();
      } else {
        showError(result.error || (isRTL ? 'فشل في تحرير Nova' : 'Failed to release Nova'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelArbitration = async () => {
    setIsSubmitting(true);
    try {
      const userId = authUser?.id || currentUserId;
      const result = await resolveDispute(order.id, userId, 'return_to_seller');
      if (result.success) {
        showSuccess(isRTL ? '✅ تم إلغاء التحكيم وإعادة الطلب' : '✅ Arbitration cancelled, order returned');
        setShowCancelArbitration(false);
        onOrderCompleted?.();
      } else {
        showError(result.error || (isRTL ? 'فشل في إلغاء التحكيم' : 'Failed to cancel arbitration'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    sendMessage(chatId, isRTL ? '📸 إثبات التحويل' : '📸 Transfer proof', {
      type: 'image',
      url,
      name: file.name,
    });
    setProofSent(true);
    showSuccess(isRTL ? '✅ تم إرسال الإثبات — بانتظار قرار فريق الدعم' : '✅ Proof sent — awaiting support decision');
  };

  const buyerName = order.buyer?.name || 'Buyer';
  const sellerName = order.seller?.name || 'Seller';

  return (
    <div className="p-3 bg-muted/30 border-t border-border space-y-3">
      {/* Info banner */}
      <Card className="p-3 bg-warning/10 border-warning/30">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-warning shrink-0" />
          <p className="text-sm font-medium text-warning">
            {isRTL ? '⚖️ النزاع قيد المراجعة من فريق الدعم' : '⚖️ Dispute under review by support team'}
          </p>
        </div>
      </Card>

      {/* SELLER actions */}
      {roleInfo.isSeller && (
        <Card className="p-4 border-border space-y-3">
          <Button
            variant="default"
            size="sm"
            className="w-full gap-2"
            onClick={() => setShowReleaseFlow(true)}
            disabled={isSubmitting}
          >
            <CheckCircle className="h-4 w-4" />
            {isRTL ? '✅ وصلني المبلغ — حرّر Nova' : '✅ Payment received — Release Nova'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={() => {
              setAcceptResponsibility(false);
              setShowCancelArbitration(true);
            }}
            disabled={isSubmitting}
          >
            <Undo2 className="h-4 w-4" />
            {isRTL ? '↩️ إلغاء التحكيم — لم أستلم' : '↩️ Cancel arbitration — not received'}
          </Button>
        </Card>
      )}

      {/* BUYER actions */}
      {roleInfo.isBuyer && (
        <Card className="p-4 border-border space-y-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={() => {
              setAcceptResponsibility(false);
              setShowCancelArbitration(true);
            }}
            disabled={isSubmitting}
          >
            <Undo2 className="h-4 w-4" />
            {isRTL ? '↩️ إلغاء التحكيم — لم أحوّل' : '↩️ Cancel arbitration — did not transfer'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            className="w-full gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting || proofSent}
          >
            <Camera className="h-4 w-4" />
            {proofSent
              ? (isRTL ? '✅ تم إرسال الإثبات' : '✅ Proof sent')
              : (isRTL ? '📸 أرسل إثبات التحويل' : '📸 Send transfer proof')
            }
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleProofUpload}
          />
          {proofSent && (
            <p className="text-xs text-muted-foreground text-center">
              {isRTL ? 'تم إرسال الإثبات — بانتظار قرار فريق الدعم' : 'Proof sent — awaiting support decision'}
            </p>
          )}
        </Card>
      )}

      {/* Release Safety Flow (seller only) */}
      <ReleaseSafetyFlow
        open={showReleaseFlow}
        onOpenChange={setShowReleaseFlow}
        novaAmount={order.amount}
        currencySymbol={order.currencySymbol}
        localTotal={order.total}
        buyerName={buyerName}
        onConfirmRelease={handleReleaseFunds}
      />

      {/* Cancel Arbitration Confirmation Dialog */}
      <AlertDialog open={showCancelArbitration} onOpenChange={setShowCancelArbitration}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {isRTL ? 'إلغاء التحكيم' : 'Cancel Arbitration'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-start">
              {roleInfo.isSeller
                ? (isRTL
                    ? `بتأكيدك أنك لم تستلم المبلغ من ${buyerName}، سيتم إلغاء الطلب وإعادته للسوق وأنت تتحمل المسؤولية`
                    : `By confirming you did not receive payment from ${buyerName}, the order will be cancelled and relisted. You bear full responsibility.`)
                : (isRTL
                    ? `بتأكيدك أنك لم تقم بالتحويل، سيتم إلغاء الطلب وإعادته للسوق وأنت تتحمل المسؤولية`
                    : `By confirming you did not transfer, the order will be cancelled and relisted. You bear full responsibility.`)
              }
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex items-start gap-3 py-2">
            <Checkbox
              id="responsibility"
              checked={acceptResponsibility}
              onCheckedChange={(checked) => setAcceptResponsibility(checked === true)}
            />
            <label htmlFor="responsibility" className="text-sm cursor-pointer leading-relaxed">
              {isRTL ? 'أتحمل المسؤولية كاملة' : 'I accept full responsibility'}
            </label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              {isRTL ? 'رجوع' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelArbitration}
              disabled={!acceptResponsibility || isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting
                ? (isRTL ? 'جارٍ...' : 'Processing...')
                : (isRTL ? 'تأكيد الإلغاء' : 'Confirm Cancel')
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
