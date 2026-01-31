// Map between database status and UI status
// DB uses: open, matched, awaiting_payment, payment_sent, completed, cancelled, disputed
// UI uses: created, waiting_payment, paid, released, completed, dispute, cancelled, expired

import { Database } from '@/integrations/supabase/types';

export type DBP2POrderStatus = Database['public']['Enums']['p2p_order_status'];
export type UIP2POrderStatus = 
  | 'created'
  | 'waiting_payment'
  | 'paid'
  | 'released'
  | 'completed'
  | 'dispute'
  | 'cancelled'
  | 'expired';

// DB Status -> UI Status
export function dbStatusToUI(dbStatus: DBP2POrderStatus): UIP2POrderStatus {
  switch (dbStatus) {
    case 'open':
      return 'created';
    case 'matched':
      return 'created'; // Order matched but not started
    case 'awaiting_payment':
      return 'waiting_payment';
    case 'payment_sent':
      return 'paid';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'disputed':
      return 'dispute';
    default:
      return 'created';
  }
}

// UI Status -> DB Status
export function uiStatusToDB(uiStatus: UIP2POrderStatus): DBP2POrderStatus {
  switch (uiStatus) {
    case 'created':
      return 'open';
    case 'waiting_payment':
      return 'awaiting_payment';
    case 'paid':
      return 'payment_sent';
    case 'released':
      return 'completed'; // Released is a transition to completed
    case 'completed':
      return 'completed';
    case 'dispute':
      return 'disputed';
    case 'cancelled':
      return 'cancelled';
    case 'expired':
      return 'cancelled'; // Expired treated as cancelled
    default:
      return 'open';
  }
}

// Check if order is in an active state (not final)
export function isActiveStatus(status: DBP2POrderStatus | UIP2POrderStatus): boolean {
  const activeDBStatuses: DBP2POrderStatus[] = ['open', 'matched', 'awaiting_payment', 'payment_sent', 'disputed'];
  const activeUIStatuses: UIP2POrderStatus[] = ['created', 'waiting_payment', 'paid', 'dispute'];
  
  return activeDBStatuses.includes(status as DBP2POrderStatus) || 
         activeUIStatuses.includes(status as UIP2POrderStatus);
}

// Check if order is completed (final success state)
export function isCompletedStatus(status: DBP2POrderStatus | UIP2POrderStatus): boolean {
  return status === 'completed' || status === 'released';
}

// Check if order is cancelled/expired (final failure state)
export function isCancelledStatus(status: DBP2POrderStatus | UIP2POrderStatus): boolean {
  return status === 'cancelled' || status === 'expired';
}

// Get status category for UI tabs
export function getStatusCategory(status: DBP2POrderStatus | UIP2POrderStatus): 'active' | 'completed' | 'dispute' | 'cancelled' {
  const uiStatus = typeof status === 'string' && ['open', 'matched', 'awaiting_payment', 'payment_sent', 'disputed'].includes(status)
    ? dbStatusToUI(status as DBP2POrderStatus)
    : status as UIP2POrderStatus;

  switch (uiStatus) {
    case 'created':
    case 'waiting_payment':
    case 'paid':
      return 'active';
    case 'released':
    case 'completed':
      return 'completed';
    case 'dispute':
      return 'dispute';
    case 'cancelled':
    case 'expired':
      return 'cancelled';
    default:
      return 'active';
  }
}
