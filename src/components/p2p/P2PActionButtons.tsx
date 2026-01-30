import { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Unlock, 
  MessageSquareWarning,
  Shield,
  FileQuestion
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { P2POrder, P2POrderStatus, useP2P } from '@/contexts/P2PContext';
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
import { Input } from '@/components/ui/input';
import { useBanner } from '@/contexts/BannerContext';
import { P2PConfirmPaymentDialog } from './P2PConfirmPaymentDialog';

interface P2PActionButtonsProps {
  order: P2POrder;
  currentUserId: string;
  isSupport?: boolean;
  onOrderCompleted?: () => void;
}

type ActionType = 'confirm_payment' | 'cancel' | 'dispute' | 'release' | 'no_payment' | 'request_proof' | 'resolve_buyer' | 'resolve_seller';

const actionConfig: Record<ActionType, {
  en: string;
  ar: string;
  icon: React.ElementType;
  variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'success';
}> = {
  confirm_payment: {
    en: 'Confirm Payment',
    ar: 'تأكيد الدفع',
    icon: CheckCircle,
    variant: 'default',
  },
  cancel: {
    en: 'Cancel Order',
    ar: 'إلغاء الطلب',
    icon: XCircle,
    variant: 'outline',
  },
  dispute: {
    en: 'Open Dispute',
    ar: 'فتح نزاع',
    icon: AlertTriangle,
    variant: 'destructive',
  },
  release: {
    en: 'Release Nova',
    ar: 'تحرير Nova',
    icon: Unlock,
    variant: 'default',
  },
  no_payment: {
    en: 'Payment Not Received',
    ar: 'لم يصلني الدفع',
    icon: MessageSquareWarning,
    variant: 'outline',
  },
  request_proof: {
    en: 'Request Proof',
    ar: 'طلب إثبات',
    icon: FileQuestion,
    variant: 'secondary',
  },
  resolve_buyer: {
    en: 'Release to Buyer',
    ar: 'تحرير للمشتري',
    icon: CheckCircle,
    variant: 'default',
  },
  resolve_seller: {
    en: 'Return to Seller',
    ar: 'إعادة للبائع',
    icon: Shield,
    variant: 'secondary',
  },
};

export function P2PActionButtons({ order, currentUserId, isSupport = false, onOrderCompleted }: P2PActionButtonsProps) {
  const { language } = useLanguage();
  const { 
    confirmPayment, 
    cancelOrder, 
    openDispute, 
    releaseFunds, 
    reportNoPayment, 
    requestProof, 
    resolveDispute,
    getCancellationsIn24h,
    isBlockedFromOrders,
    triggerMockSellerConfirmation,
    isMockMode
  } = useP2P();
  const { success: showSuccess, error: showError } = useBanner();
  
  const [confirmDialog, setConfirmDialog] = useState<ActionType | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);

  const isBuyer = order.buyer.id === currentUserId;
  const isSeller = order.seller.id === currentUserId;
  const isRTL = language === 'ar';

  const handleAction = (action: ActionType) => {
    switch (action) {
      case 'confirm_payment':
        // Show the specialized payment confirmation dialog
        setShowPaymentConfirm(true);
        break;
      case 'cancel':
        // Check cancellation limit
        const cancellations = getCancellationsIn24h();
        if (cancellations >= 2) {
          // Warn user this is their last cancellation
          showError(isRTL 
            ? 'تحذير: هذا إلغاءك الأخير. الإلغاء مرة أخرى سيحظرك 24 ساعة.'
            : 'Warning: This is your last cancellation. One more will block you for 24 hours.'
          );
        }
        
        const cancelled = cancelOrder(order.id);
        if (cancelled) {
          showSuccess(isRTL ? 'تم إلغاء الطلب' : 'Order cancelled');
        } else {
          showError(isRTL 
            ? 'لا يمكنك الإلغاء. تم تجاوز حد الإلغاءات (3 خلال 24 ساعة).'
            : 'Cannot cancel. You have exceeded the cancellation limit (3 per 24 hours).'
          );
        }
        break;
      case 'dispute':
        if (disputeReason.trim()) {
          openDispute(order.id, disputeReason);
          setDisputeReason('');
        }
        break;
      case 'release':
        releaseFunds(order.id);
        showSuccess(isRTL ? 'تم تحرير Nova بنجاح!' : 'Nova released successfully!');
        onOrderCompleted?.();
        break;
      case 'no_payment':
        reportNoPayment(order.id);
        break;
      case 'request_proof':
        requestProof(order.id);
        break;
      case 'resolve_buyer':
        resolveDispute(order.id, 'release_to_buyer');
        onOrderCompleted?.();
        break;
      case 'resolve_seller':
        resolveDispute(order.id, 'return_to_seller');
        break;
    }
    setConfirmDialog(null);
  };

  const handlePaymentConfirm = () => {
    confirmPayment(order.id);
    setShowPaymentConfirm(false);
    showSuccess(isRTL ? 'تم تأكيد الدفع' : 'Payment confirmed');
    
    // In mock mode, trigger automatic seller confirmation after 3-5 seconds
    if (isMockMode) {
      triggerMockSellerConfirmation(order.id);
    }
  };

  const getAvailableActions = (): ActionType[] => {
    const actions: ActionType[] = [];

    // Support actions in dispute
    if (isSupport && order.status === 'dispute') {
      actions.push('request_proof', 'resolve_buyer', 'resolve_seller');
      return actions;
    }

    // Buyer actions
    if (isBuyer) {
      if (order.status === 'waiting_payment') {
        actions.push('confirm_payment');
      }
      if (['created', 'waiting_payment'].includes(order.status)) {
        actions.push('cancel');
      }
      // Note: When status is 'paid', buyer is waiting - no actions available
      // Dispute is handled separately after some time waiting
    }

    // Seller actions
    if (isSeller) {
      if (order.status === 'paid') {
        actions.push('release');
        actions.push('no_payment');
      }
      if (order.status === 'waiting_payment') {
        actions.push('dispute');
      }
    }

    return actions;
  };

  const availableActions = getAvailableActions();

  if (availableActions.length === 0) return null;

  const renderButton = (action: ActionType) => {
    const config = actionConfig[action];
    const Icon = config.icon;
    
    // For confirm_payment, open the specialized dialog
    if (action === 'confirm_payment') {
      return (
        <Button
          key={action}
          variant={config.variant as any}
          className="flex-1 gap-2"
          onClick={() => setShowPaymentConfirm(true)}
        >
          <Icon className="h-4 w-4" />
          {language === 'ar' ? config.ar : config.en}
        </Button>
      );
    }
    
    return (
      <Button
        key={action}
        variant={config.variant as any}
        className="flex-1 gap-2"
        onClick={() => setConfirmDialog(action)}
      >
        <Icon className="h-4 w-4" />
        {language === 'ar' ? config.ar : config.en}
      </Button>
    );
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 p-3 bg-muted/50 border-t border-border">
        {availableActions.map(renderButton)}
      </div>

      {/* Payment Confirmation Dialog */}
      <P2PConfirmPaymentDialog
        open={showPaymentConfirm}
        onOpenChange={setShowPaymentConfirm}
        order={order}
        onConfirm={handlePaymentConfirm}
      />

      {/* Other Confirmation Dialogs */}
      <AlertDialog open={confirmDialog !== null} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog && (language === 'ar' 
                ? actionConfig[confirmDialog].ar 
                : actionConfig[confirmDialog].en
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog === 'dispute' ? (
                <div className="space-y-3">
                  <p>
                    {language === 'ar' 
                      ? 'اكتب سبب فتح النزاع:'
                      : 'Enter the reason for opening a dispute:'
                    }
                  </p>
                  <Input
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder={language === 'ar' ? 'سبب النزاع...' : 'Dispute reason...'}
                  />
                </div>
              ) : confirmDialog === 'release' ? (
                language === 'ar'
                  ? `هل أنت متأكد من تحرير ${order.amount.toFixed(0)} Nova للمشتري؟`
                  : `Are you sure you want to release ${order.amount.toFixed(0)} Nova to the buyer?`
              ) : confirmDialog === 'cancel' ? (
                <div className="space-y-2">
                  <p>
                    {language === 'ar'
                      ? 'هل أنت متأكد من إلغاء هذا الطلب؟'
                      : 'Are you sure you want to cancel this order?'
                    }
                  </p>
                  <p className="text-warning text-sm">
                    {language === 'ar'
                      ? `عدد الإلغاءات اليوم: ${getCancellationsIn24h()}/3`
                      : `Cancellations today: ${getCancellationsIn24h()}/3`
                    }
                  </p>
                </div>
              ) : (
                language === 'ar'
                  ? 'هل أنت متأكد من هذا الإجراء؟'
                  : 'Are you sure you want to proceed?'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmDialog && handleAction(confirmDialog)}
              disabled={confirmDialog === 'dispute' && !disputeReason.trim()}
            >
              {language === 'ar' ? 'تأكيد' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
