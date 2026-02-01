/**
 * P2P Role Utilities
 * 
 * CRITICAL: Role determination is based on order_type, NOT who pressed the button
 * 
 * Rules:
 * - If order_type = 'sell' → Creator = Seller, Executor = Buyer
 * - If order_type = 'buy'  → Creator = Buyer, Executor = Seller
 */

export type P2PRole = 'buyer' | 'seller';

export interface P2PRoleInfo {
  /** Current user's role */
  myRole: P2PRole;
  /** Whether current user is the buyer */
  isBuyer: boolean;
  /** Whether current user is the seller */
  isSeller: boolean;
  /** Seller's user ID */
  sellerId: string;
  /** Buyer's user ID */
  buyerId: string;
  /** Role label in English */
  myRoleLabel: string;
  /** Role label in Arabic */
  myRoleLabelAr: string;
  /** Counterparty's role label in English */
  counterpartyRoleLabel: string;
  /** Counterparty's role label in Arabic */
  counterpartyRoleLabelAr: string;
}

interface OrderRoleParams {
  orderType: 'buy' | 'sell';
  creatorId: string;
  executorId: string | null;
  currentUserId: string;
}

/**
 * Determine buyer and seller IDs based on order type
 */
export function getOrderParticipantRoles(
  orderType: 'buy' | 'sell',
  creatorId: string,
  executorId: string | null
): { buyerId: string; sellerId: string } {
  if (orderType === 'sell') {
    // Sell order: Creator = Seller, Executor = Buyer
    return {
      sellerId: creatorId,
      buyerId: executorId || '',
    };
  } else {
    // Buy order: Creator = Buyer, Executor = Seller
    return {
      buyerId: creatorId,
      sellerId: executorId || '',
    };
  }
}

/**
 * Get complete role information for a user in a P2P order
 */
export function getP2PRoleInfo(params: OrderRoleParams): P2PRoleInfo {
  const { orderType, creatorId, executorId, currentUserId } = params;
  const { buyerId, sellerId } = getOrderParticipantRoles(orderType, creatorId, executorId);
  
  const isBuyer = currentUserId === buyerId;
  const isSeller = currentUserId === sellerId;
  const myRole: P2PRole = isBuyer ? 'buyer' : 'seller';
  
  return {
    myRole,
    isBuyer,
    isSeller,
    sellerId,
    buyerId,
    myRoleLabel: isBuyer ? 'Buyer' : 'Seller',
    myRoleLabelAr: isBuyer ? 'مشتري' : 'بائع',
    counterpartyRoleLabel: isBuyer ? 'Seller' : 'Buyer',
    counterpartyRoleLabelAr: isBuyer ? 'بائع' : 'مشتري',
  };
}

/**
 * Get role info from a P2POrder object (UI model)
 */
export function getP2PRoleInfoFromOrder(
  order: { 
    type: 'buy' | 'sell'; 
    buyer: { id: string }; 
    seller: { id: string };
  },
  currentUserId: string
): P2PRoleInfo {
  // In UI model, buyer and seller are already mapped correctly
  const isBuyer = order.buyer.id === currentUserId;
  const isSeller = order.seller.id === currentUserId;
  const myRole: P2PRole = isBuyer ? 'buyer' : 'seller';
  
  return {
    myRole,
    isBuyer,
    isSeller,
    sellerId: order.seller.id,
    buyerId: order.buyer.id,
    myRoleLabel: isBuyer ? 'Buyer' : 'Seller',
    myRoleLabelAr: isBuyer ? 'مشتري' : 'بائع',
    counterpartyRoleLabel: isBuyer ? 'Seller' : 'Buyer',
    counterpartyRoleLabelAr: isBuyer ? 'بائع' : 'مشتري',
  };
}

/**
 * Role Badge configuration for UI
 */
export const ROLE_BADGE_CONFIG = {
  buyer: {
    en: 'Buyer',
    ar: 'مشتري',
    className: 'bg-success/20 text-success border-success/30',
  },
  seller: {
    en: 'Seller',
    ar: 'بائع',
    className: 'bg-nova/20 text-nova border-nova/30',
  },
  you_buyer: {
    en: 'You: Buyer',
    ar: 'أنت: مشتري',
    className: 'bg-success/20 text-success border-success/30',
  },
  you_seller: {
    en: 'You: Seller',
    ar: 'أنت: بائع',
    className: 'bg-nova/20 text-nova border-nova/30',
  },
} as const;

/**
 * Status-based action permissions
 * 
 * awaiting_payment:
 *   - Buyer: Can pay, can cancel
 *   - Seller: No actions (waiting)
 * 
 * paid:
 *   - Buyer: No actions (waiting)
 *   - Seller: Can release, can report no payment
 * 
 * released/completed:
 *   - Both: No actions
 */
export interface P2PActionPermissions {
  canPay: boolean;
  canCancel: boolean;
  canRelease: boolean;
  canReportNoPayment: boolean;
  canOpenDispute: boolean;
  canCancelOpen: boolean;
  isWaiting: boolean;
  waitingMessage: string;
  waitingMessageAr: string;
}

interface ActionPermissionsParams {
  status: string;
  roleInfo: P2PRoleInfo;
  orderType: 'buy' | 'sell';
  isCreator: boolean;
}

export function getActionPermissions(
  status: string,
  roleInfo: P2PRoleInfo,
  orderType?: 'buy' | 'sell',
  creatorId?: string,
  currentUserId?: string
): P2PActionPermissions {
  const { isBuyer, isSeller } = roleInfo;
  
  // Determine if current user is the order creator
  const isCreator = creatorId && currentUserId ? creatorId === currentUserId : false;
  
  // Default: no actions
  const permissions: P2PActionPermissions = {
    canPay: false,
    canCancel: false,
    canRelease: false,
    canReportNoPayment: false,
    canOpenDispute: false,
    canCancelOpen: false,
    isWaiting: false,
    waitingMessage: '',
    waitingMessageAr: '',
  };
  
  switch (status) {
    case 'created':
    case 'open':
      // Only creator can cancel open orders
      if (isCreator) {
        permissions.canCancelOpen = true;
      } else {
        permissions.isWaiting = true;
        permissions.waitingMessage = 'Order is open in marketplace';
        permissions.waitingMessageAr = 'الطلب معروض في السوق';
      }
      break;
      
    case 'waiting_payment':
    case 'awaiting_payment':
      if (isBuyer) {
        permissions.canPay = true;
        permissions.canCancel = true;
      } else if (isSeller) {
        permissions.isWaiting = true;
        permissions.waitingMessage = 'Waiting for buyer to complete payment';
        permissions.waitingMessageAr = 'بانتظار المشتري لإتمام الدفع';
      }
      break;
      
    case 'paid':
    case 'payment_sent':
      if (isBuyer) {
        permissions.isWaiting = true;
        permissions.waitingMessage = 'Waiting for seller to confirm receipt';
        permissions.waitingMessageAr = 'بانتظار تأكيد البائع لاستلام المبلغ';
      } else if (isSeller) {
        permissions.canRelease = true;
        permissions.canReportNoPayment = true;
        permissions.canOpenDispute = true;
      }
      break;
      
    case 'dispute':
    case 'disputed':
      permissions.isWaiting = true;
      permissions.waitingMessage = 'Under support review';
      permissions.waitingMessageAr = 'قيد مراجعة الدعم';
      break;
      
    case 'released':
    case 'completed':
    case 'cancelled':
    case 'expired':
      // No actions for closed orders
      break;
  }
  
  return permissions;
}
