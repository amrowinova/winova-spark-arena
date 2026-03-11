import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock, FileQuestion, Shield, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { P2POrder, useP2P } from '@/contexts/P2PContext';
import { useBanner } from '@/contexts/BannerContext';
import { getP2PRoleInfoFromOrder } from '@/lib/p2pRoleUtils';
import { P2PRoleBadge } from './P2PRoleBadge';
import { P2PBuyerFlow } from './P2PBuyerFlow';
import { P2PSellerFlow } from './P2PSellerFlow';
import { P2PDisputeActions } from './P2PDisputeActions';
import { motion } from 'framer-motion';

interface P2PStatusActionsProps {
  order: P2POrder;
  currentUserId: string;
  isSupport?: boolean;
  onOrderCompleted?: () => void;
}

/**
 * Normalize status to UI values — handles both mapped UI statuses
 * and raw DB statuses that may leak through realtime or edge cases.
 */
function normalizeStatus(status: string): string {
  switch (status) {
    case 'awaiting_payment': return 'waiting_payment';
    case 'payment_sent': return 'paid';
    case 'disputed': return 'dispute';
    case 'open':
    case 'matched': return 'created';
    default: return status;
  }
}

export function P2PStatusActions({ order, currentUserId, isSupport = false, onOrderCompleted }: P2PStatusActionsProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { 
    deleteOrder,
    requestProof,
    resolveDispute,
  } = useP2P();
  const { success: showSuccess, error: showError } = useBanner();
  
  // Get role info
  const roleInfo = getP2PRoleInfoFromOrder(order, currentUserId);
  
  // Normalize status to handle both DB and UI status values at runtime
  const status = normalizeStatus(order.status as string);
  
  // Support actions in dispute
  if (isSupport && status === 'dispute') {
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
  
  // Creator can DELETE OPEN orders
  if (status === 'created') {
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
            
            <Button
              variant="destructive"
              size="sm"
              className="w-full mt-3 gap-2"
              onClick={async () => {
                const result = await deleteOrder(order.id);
                if (result.success) {
                  showSuccess(isRTL ? '🗑️ تم حذف الطلب' : '🗑️ Order deleted');
                } else {
                  showError(result.error || (isRTL ? 'فشل في حذف الطلب' : 'Failed to delete order'));
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              {isRTL ? '🗑️ حذف الطلب' : '🗑️ Delete Order'}
            </Button>
          </Card>
        </div>
      );
    }
    return null;
  }

  // BUYER FLOW
  if (roleInfo.isBuyer && ['waiting_payment', 'paid'].includes(status)) {
    return (
      <P2PBuyerFlow
        order={order}
        currentUserId={currentUserId}
        onOrderCompleted={onOrderCompleted}
      />
    );
  }
  
  // SELLER FLOW
  if (roleInfo.isSeller && ['waiting_payment', 'paid'].includes(status)) {
    return (
      <P2PSellerFlow
        order={order}
        currentUserId={currentUserId}
        onOrderCompleted={onOrderCompleted}
      />
    );
  }
  
  // Dispute state (both parties - non-support)
  if (status === 'dispute' && !isSupport) {
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