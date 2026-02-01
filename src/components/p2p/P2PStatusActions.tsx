import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Unlock, Clock, Loader2, FileQuestion, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { P2POrder, useP2P } from '@/contexts/P2PContext';
import { useBanner } from '@/contexts/BannerContext';
import { getP2PRoleInfoFromOrder, getActionPermissions, P2PRoleInfo } from '@/lib/p2pRoleUtils';
import { P2PRoleBadge } from './P2PRoleBadge';
import { P2PPaymentSteps } from './P2PPaymentSteps';
import { P2PSellerConfirmCard } from './P2PSellerConfirmCard';
import { P2PNoPaymentSheet } from './P2PNoPaymentSheet';
import { motion } from 'framer-motion';

interface P2PStatusActionsProps {
  order: P2POrder;
  currentUserId: string;
  isSupport?: boolean;
  onOrderCompleted?: () => void;
}

export function P2PStatusActions({ order, currentUserId, isSupport = false, onOrderCompleted }: P2PStatusActionsProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { 
    confirmPayment, 
    cancelOrderWithReason, 
    releaseFunds, 
    openDispute,
    requestProof,
    resolveDispute,
    isMockMode,
    triggerMockSellerConfirmation,
  } = useP2P();
  const { success: showSuccess, error: showError } = useBanner();
  
  const [isExtendedWait, setIsExtendedWait] = useState(false);
  const [showNoPaymentSheet, setShowNoPaymentSheet] = useState(false);
  
  // Get role info
  const roleInfo = getP2PRoleInfoFromOrder(order, currentUserId);
  const permissions = getActionPermissions(order.status, roleInfo);
  
  // Support actions in dispute
  if (isSupport && order.status === 'dispute') {
    return (
      <div className="p-3 bg-muted/30 border-t border-border space-y-3">
        <Card className="p-4 bg-destructive/10 border-destructive/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="font-medium text-destructive">
                {isRTL ? '⚖️ نزاع قيد المراجعة' : '⚖️ Dispute Under Review'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'اتخذ إجراءً لحل النزاع' : 'Take action to resolve the dispute'}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => {
                requestProof(order.id);
                showSuccess(isRTL ? 'تم طلب الإثبات' : 'Proof requested');
              }}
            >
              <FileQuestion className="h-4 w-4" />
              {isRTL ? 'طلب إثبات' : 'Request Proof'}
            </Button>
            
            <Button
              variant="default"
              size="sm"
              className="gap-2"
              onClick={() => {
                resolveDispute(order.id, 'release_to_buyer');
                showSuccess(isRTL ? 'تم تحرير Nova للمشتري' : 'Nova released to buyer');
                onOrderCompleted?.();
              }}
            >
              <CheckCircle className="h-4 w-4" />
              {isRTL ? 'تحرير للمشتري' : 'Release to Buyer'}
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => {
                resolveDispute(order.id, 'return_to_seller');
                showSuccess(isRTL ? 'تم إعادة Nova للبائع' : 'Nova returned to seller');
              }}
            >
              <Shield className="h-4 w-4" />
              {isRTL ? 'إعادة للبائع' : 'Return to Seller'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }
  
  // Creator can DELETE OPEN orders (no penalty, no reason needed)
  if (order.status === 'created') {
    const isCreator = (order.type === 'buy' && roleInfo.isBuyer) || (order.type === 'sell' && roleInfo.isSeller);
    
    if (isCreator) {
      return (
        <div className="p-3 bg-muted/30 border-t border-border">
          <Card className="p-4 bg-info/10 border-info/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-info/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-info" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-info">
                  {isRTL ? '📢 طلبك معروض في السوق' : '📢 Your order is listed in market'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isRTL 
                    ? '⏳ بانتظار طرف آخر لقبول طلبك – لا يوجد عداد وقت'
                    : '⏳ Waiting for another user to accept – No timer active'
                  }
                </p>
              </div>
            </div>
            
            {/* Delete button for OPEN orders */}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3 gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => {
                const cancelled = cancelOrderWithReason(order.id, isRTL 
                  ? 'تم حذف الطلب من قبل المنشئ'
                  : 'Order deleted by creator'
                );
                if (cancelled) {
                  showSuccess(isRTL ? '🗑️ تم حذف الطلب' : '🗑️ Order deleted');
                }
              }}
            >
              <XCircle className="h-4 w-4" />
              {isRTL ? '🗑️ حذف الطلب' : '🗑️ Delete Order'}
            </Button>
          </Card>
        </div>
      );
    }
    return null;
  }
  
  // Buyer flow: waiting_payment
  if (roleInfo.isBuyer && order.status === 'waiting_payment') {
    return (
      <div className="p-3 bg-muted/30 border-t border-border space-y-3">
        {/* Role indicator */}
        <div className="flex items-center justify-between">
          <P2PRoleBadge role="buyer" isYou size="md" />
          <span className="text-xs text-muted-foreground">
            {isRTL ? 'أكمل الدفع لتحصل على Nova' : 'Complete payment to get Nova'}
          </span>
        </div>
        
        <P2PPaymentSteps
          order={order}
          onConfirmPayment={() => {
            confirmPayment(order.id);
            showSuccess(isRTL ? 'تم تأكيد الدفع' : 'Payment confirmed');
            if (isMockMode) {
              triggerMockSellerConfirmation(order.id);
            }
          }}
          onCancelOrder={(reason) => {
            const cancelled = cancelOrderWithReason(order.id, reason);
            if (cancelled) {
              showSuccess(isRTL ? 'تم إلغاء الطلب' : 'Order cancelled');
            } else {
              showError(isRTL 
                ? 'لا يمكنك الإلغاء. تم تجاوز حد الإلغاءات.'
                : 'Cannot cancel. Cancellation limit exceeded.'
              );
            }
          }}
        />
      </div>
    );
  }
  
  // Buyer flow: paid (waiting for seller)
  if (roleInfo.isBuyer && order.status === 'paid') {
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
              <div className="flex items-center gap-2 mb-1">
                <P2PRoleBadge role="buyer" isYou size="sm" />
              </div>
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
  
  // Seller flow: waiting_payment
  if (roleInfo.isSeller && order.status === 'waiting_payment') {
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
              <div className="flex items-center gap-2 mb-1">
                <P2PRoleBadge role="seller" isYou size="sm" />
              </div>
              <p className="font-medium text-info">
                {isRTL ? '🏦 بانتظار الدفع من المشتري' : '🏦 Waiting for buyer payment'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {isRTL 
                  ? `سيقوم المشتري بتحويل ${order.currencySymbol} ${order.total.toFixed(2)} إلى حسابك`
                  : `Buyer will transfer ${order.currencySymbol} ${order.total.toFixed(2)} to your account`
                }
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }
  
  // Seller flow: paid (can release or dispute)
  if (roleInfo.isSeller && order.status === 'paid') {
    return (
      <div className="p-3 bg-muted/30 border-t border-border space-y-3">
        {/* Extended wait notice */}
        {isExtendedWait && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
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
        
        {/* Buyer paid notification */}
        <Card className="p-3 bg-nova/10 border-nova/30">
          <div className="flex items-center gap-2 mb-1">
            <P2PRoleBadge role="seller" isYou size="sm" />
          </div>
          <p className="text-sm font-medium text-nova">
            {isRTL ? '💸 قام المشتري بتنفيذ التحويل البنكي' : '💸 Buyer executed bank transfer'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isRTL 
              ? 'تأكد من وصول المبلغ قبل تحرير Nova'
              : 'Verify payment before releasing Nova'
            }
          </p>
        </Card>
        
        <P2PSellerConfirmCard
          order={order}
          buyerName={order.buyer.name}
          buyerNameAr={order.buyer.nameAr}
          onRelease={() => {
            releaseFunds(order.id);
            showSuccess(isRTL 
              ? `🎉 تم تحرير ${order.amount.toFixed(0)} Nova بنجاح!`
              : `🎉 ${order.amount.toFixed(0)} Nova released successfully!`
            );
            onOrderCompleted?.();
          }}
          onNoPayment={(action) => {
            if (action === 'wait') {
              setIsExtendedWait(true);
              showSuccess(isRTL 
                ? '⏳ تم تمديد وقت الانتظار 10 دقائق'
                : '⏳ Wait time extended by 10 minutes'
              );
              setTimeout(() => setIsExtendedWait(false), 10000);
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
          }}
        />
        
        <P2PNoPaymentSheet
          open={showNoPaymentSheet}
          onOpenChange={setShowNoPaymentSheet}
          onAction={(action) => {
            setShowNoPaymentSheet(false);
            if (action === 'wait') {
              setIsExtendedWait(true);
            } else {
              openDispute(order.id, 'Seller reports no payment');
            }
          }}
        />
      </div>
    );
  }
  
  // Dispute state (both parties - non-support)
  if (order.status === 'dispute' && !isSupport) {
    return (
      <div className="p-3 bg-muted/30 border-t border-border">
        <Card className="p-4 bg-destructive/10 border-destructive/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <P2PRoleBadge role={roleInfo.myRole} isYou size="sm" />
              </div>
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
