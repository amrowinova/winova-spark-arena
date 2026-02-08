import { useState } from 'react';
import { 
  Trash2,
  XCircle, 
  AlertTriangle, 
  Unlock, 
  MessageSquareWarning,
  Shield,
  FileQuestion,
  CheckCircle,
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
import { P2PPaymentSteps } from './P2PPaymentSteps';
import { P2PSellerSteps } from './P2PSellerSteps';
import { P2PCancelOrderDialog } from './P2PCancelOrderDialog';
import { ReleaseSafetyFlow } from './release-safety';

interface P2PActionButtonsProps {
  order: P2POrder;
  currentUserId: string;
  isSupport?: boolean;
  onOrderCompleted?: () => void;
}

type ActionType = 'confirm_payment' | 'cancel' | 'dispute' | 'release' | 'no_payment' | 'request_proof' | 'resolve_buyer' | 'resolve_seller' | 'delete';

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
  delete: {
    en: 'Delete Order',
    ar: 'حذف الطلب',
    icon: Trash2,
    variant: 'destructive',
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
    cancelOrderWithReason,
    deleteOrder,
    relistOrder,
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
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showSafetyFlow, setShowSafetyFlow] = useState(false);

  const isBuyer = order.buyer.id === currentUserId;
  const isSeller = order.seller.id === currentUserId;
  const isCreator = order.type === 'buy' ? isBuyer : isSeller;
  const isRTL = language === 'ar';

  // Determine if order is in terminal state (no actions allowed)
  const isTerminalState = order.status === 'completed' || order.status === 'cancelled' || order.status === 'released';

  // Check if we should show the payment steps flow (for buyer in waiting_payment status)
  const showPaymentSteps = isBuyer && order.status === 'waiting_payment';
  
  // Check if we should show seller steps (for seller in waiting_payment or paid status)
  const showSellerSteps = isSeller && (order.status === 'waiting_payment' || order.status === 'paid' || order.status === 'dispute');

  // Handle delete order (for open orders only)
  const handleDeleteOrder = async () => {
    const deleted = await deleteOrder(order.id);
    if (deleted) {
      showSuccess(isRTL ? 'تم حذف الطلب' : 'Order deleted');
    } else {
      showError(isRTL ? 'فشل في حذف الطلب' : 'Failed to delete order');
    }
    setConfirmDialog(null);
  };

  // Handle cancel order with reason (for awaiting_payment)
  const handleCancelWithReason = async (reason: string) => {
    setShowCancelDialog(false);
    
    // For awaiting_payment: relist order (return to market)
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
      return;
    }

    // For paid status: open dispute instead
    if (order.status === 'paid') {
      const reason_dispute = isRTL 
        ? 'محاولة إلغاء بعد تأكيد الدفع' 
        : 'Cancellation attempt after payment confirmation';
      openDispute(order.id, reason_dispute);
      showSuccess(isRTL 
        ? '⚖️ تم فتح نزاع – لا يمكن الإلغاء بعد الدفع'
        : '⚖️ Dispute opened – Cannot cancel after payment'
      );
      return;
    }
  };

  const handleAction = (action: ActionType) => {
    switch (action) {
      case 'confirm_payment':
        setShowPaymentConfirm(true);
        break;
      case 'delete':
        handleDeleteOrder();
        break;
      case 'cancel':
        // Show cancel dialog for awaiting_payment or paid
        setShowCancelDialog(true);
        break;
      case 'dispute':
        if (disputeReason.trim()) {
          openDispute(order.id, disputeReason);
          setDisputeReason('');
        }
        break;
      case 'release':
        setShowSafetyFlow(true);
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
    
    if (isMockMode) {
      triggerMockSellerConfirmation(order.id);
    }
  };

  // Handler for PaymentSteps payment confirmation
  const handlePaymentStepsConfirm = () => {
    confirmPayment(order.id);
    showSuccess(isRTL ? 'تم تأكيد الدفع' : 'Payment confirmed');
    
    if (isMockMode) {
      triggerMockSellerConfirmation(order.id);
    }
  };

  // Handler for PaymentSteps cancellation with reason
  const handlePaymentStepsCancel = (reason: string) => {
    handleCancelWithReason(reason);
  };

  // Get available actions based on order status and user role
  const getAvailableActions = (): ActionType[] => {
    const actions: ActionType[] = [];

    // Support actions in dispute
    if (isSupport && order.status === 'dispute') {
      actions.push('request_proof', 'resolve_buyer', 'resolve_seller');
      return actions;
    }

    // Terminal states - no actions
    if (isTerminalState) {
      return actions;
    }

    // OPEN status - creator can delete (no penalty)
    if (order.status === 'created' && isCreator) {
      actions.push('delete');
      return actions;
    }

    // WAITING_PAYMENT - buyer actions are handled by PaymentSteps
    // Seller can cancel (return to market)
    if (order.status === 'waiting_payment') {
      if (isSeller) {
        actions.push('cancel');
      }
      // Buyer actions handled by PaymentSteps component
      return actions;
    }

    // PAID status
    if (order.status === 'paid') {
      if (isSeller) {
        actions.push('release');
        actions.push('no_payment');
      }
      // Buyer can try to cancel (will open dispute)
      if (isBuyer) {
        actions.push('cancel');
      }
      return actions;
    }

    return actions;
  };

  const availableActions = getAvailableActions();

  // If buyer is in waiting_payment, show the payment steps flow
  if (showPaymentSteps) {
    return (
      <div className="p-3 bg-muted/30 border-t border-border">
        <P2PPaymentSteps
          order={order}
          onConfirmPayment={handlePaymentStepsConfirm}
          onCancelOrder={handlePaymentStepsCancel}
        />
      </div>
    );
  }

  // If seller, show seller-specific flow
  if (showSellerSteps) {
    return (
      <>
        <P2PSellerSteps
          order={order}
          currentUserId={currentUserId}
          onOrderCompleted={onOrderCompleted}
        />
        {/* Also show cancel button for seller in waiting_payment */}
        {order.status === 'waiting_payment' && (
          <div className="px-3 pb-3">
            <Button
              variant="ghost"
              onClick={() => setShowCancelDialog(true)}
              className="w-full h-10 gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <XCircle className="h-4 w-4" />
              <span className="text-sm">
                {isRTL ? 'إلغاء الطلب' : 'Cancel Order'}
              </span>
            </Button>
          </div>
        )}
        {/* Cancel Order Dialog */}
        <P2PCancelOrderDialog
          open={showCancelDialog}
          onOpenChange={setShowCancelDialog}
          onConfirm={handleCancelWithReason}
        />
      </>
    );
  }

  // Terminal state message
  if (isTerminalState) {
    return (
      <div className="p-3 bg-muted/30 border-t border-border">
        <div className="text-center text-sm text-muted-foreground py-2">
          {order.status === 'completed' || order.status === 'released' ? (
            isRTL ? '🎉 تمت الصفقة بنجاح' : '🎉 Transaction completed'
          ) : (
            isRTL ? '❌ تم إلغاء الطلب' : '❌ Order cancelled'
          )}
        </div>
      </div>
    );
  }

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

    // For cancel, show the cancel dialog with reasons
    if (action === 'cancel') {
      return (
        <Button
          key={action}
          variant="outline"
          className="flex-1 gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
          onClick={() => setShowCancelDialog(true)}
        >
          <Icon className="h-4 w-4" />
          {language === 'ar' ? config.ar : config.en}
        </Button>
      );
    }

    // For delete, confirm first
    if (action === 'delete') {
      return (
        <Button
          key={action}
          variant="destructive"
          className="flex-1 gap-2"
          onClick={() => setConfirmDialog('delete')}
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

      {/* Cancel Order Dialog with reasons */}
      <P2PCancelOrderDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onConfirm={handleCancelWithReason}
      />

      {/* Payment Confirmation Dialog */}
      <P2PConfirmPaymentDialog
        open={showPaymentConfirm}
        onOpenChange={setShowPaymentConfirm}
        order={order}
        onConfirm={handlePaymentConfirm}
      />

      {/* Delete/Other Confirmation Dialogs */}
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
              {confirmDialog === 'delete' ? (
                <div className="space-y-2">
                  <p>
                    {language === 'ar'
                      ? 'هل أنت متأكد من حذف هذا الطلب؟ سيتم إزالته من السوق.'
                      : 'Are you sure you want to delete this order? It will be removed from the market.'
                    }
                  </p>
                  <p className="text-success text-sm">
                    {language === 'ar'
                      ? '✓ لا يوجد عقوبات أو تأثير على حسابك'
                      : '✓ No penalties or impact on your account'
                    }
                  </p>
                </div>
              ) : confirmDialog === 'dispute' ? (
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

      <ReleaseSafetyFlow
        open={showSafetyFlow}
        onOpenChange={setShowSafetyFlow}
        novaAmount={order.amount}
        currencySymbol={order.currencySymbol}
        localTotal={order.total}
        buyerName={language === 'ar' ? order.buyer.nameAr : order.buyer.name}
        onConfirmRelease={() => {
          releaseFunds(order.id);
          showSuccess(language === 'ar' ? 'تم تحرير Nova بنجاح!' : 'Nova released successfully!');
          onOrderCompleted?.();
        }}
      />
    </>
  );
}
