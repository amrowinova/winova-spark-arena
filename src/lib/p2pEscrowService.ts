/**
 * P2P Escrow Service
 * 
 * All P2P financial operations MUST go through these RPCs.
 * NO direct wallet updates allowed from frontend.
 * Every transaction is atomic and recorded in wallet_ledger.
 */

import { supabase } from '@/integrations/supabase/client';
import { logActivity, logMoneyFlow, logFailure } from '@/lib/ai/logger';

export interface P2POrderResult {
  success: boolean;
  error?: string;
  order_id?: string;
  ledger_id?: string;
  nova_balance?: number;
  locked_balance?: number;
}

export interface P2PReleaseResult {
  success: boolean;
  error?: string;
  order_id?: string;
  seller_ledger_id?: string;
  buyer_ledger_id?: string;
  buyer_new_balance?: number;
}

export interface P2PCancelResult {
  success: boolean;
  error?: string;
  order_id?: string;
  status?: string;
  ledger_id?: string;
  nova_refunded?: number;
}

export interface P2PExecuteResult {
  success: boolean;
  error?: string;
  order_id?: string;
  matched_at?: string;
  ledger_id?: string;
}

export interface P2PConfirmPaymentResult {
  success: boolean;
  error?: string;
  order_id?: string;
  status?: string;
}

export interface P2PDisputeResult {
  success: boolean;
  error?: string;
  order_id?: string;
  status?: string;
}

export interface P2PResolveResult {
  success: boolean;
  error?: string;
  order_id?: string;
  resolution?: string;
}

/**
 * Create a SELL order with automatic escrow lock.
 * Nova is moved from nova_balance to locked_nova_balance atomically.
 */
export async function createSellOrder(
  creatorId: string,
  novaAmount: number,
  localAmount: number,
  exchangeRate: number,
  country: string,
  timeLimitMinutes: number = 15,
  paymentMethodId?: string
): Promise<P2POrderResult> {
  const t0 = Date.now();
  try {
    const { data, error } = await supabase.rpc('p2p_create_sell_order', {
      p_creator_id: creatorId,
      p_nova_amount: novaAmount,
      p_local_amount: localAmount,
      p_exchange_rate: exchangeRate,
      p_country: country,
      p_time_limit_minutes: timeLimitMinutes,
      p_payment_method_id: paymentMethodId || null,
    });

    if (error) {
      console.error('p2p_create_sell_order RPC error:', error);
      logFailure({ rpc_name: 'p2p_create_sell_order', user_id: creatorId, error_message: error.message, parameters: { novaAmount, localAmount, country } as any });
      logActivity({ user_id: creatorId, action_type: 'p2p_create_sell', entity_type: 'p2p_order', success: false, error_code: error.code, duration_ms: Date.now() - t0 });
      return { success: false, error: error.message };
    }

    const result = data as unknown as P2POrderResult;
    logActivity({ user_id: creatorId, action_type: 'p2p_create_sell', entity_type: 'p2p_order', entity_id: result.order_id, success: result.success, after_state: { nova_balance: result.nova_balance, locked_balance: result.locked_balance } as any, duration_ms: Date.now() - t0 });
    if (result.success) {
      logMoneyFlow({ operation: 'p2p_sell_escrow_lock', from_user: creatorId, amount: novaAmount, currency: 'nova', reference_type: 'p2p_order', reference_id: result.order_id });
    }
    return result;
  } catch (err) {
    console.error('createSellOrder error:', err);
    logFailure({ rpc_name: 'p2p_create_sell_order', user_id: creatorId, error_message: String(err) });
    return { success: false, error: 'Network error' };
  }
}

/**
 * Create a BUY order (no escrow needed for buyer).
 */
export async function createBuyOrder(
  creatorId: string,
  novaAmount: number,
  localAmount: number,
  exchangeRate: number,
  country: string,
  timeLimitMinutes: number = 15,
  paymentMethodId?: string
): Promise<P2POrderResult> {
  const t0 = Date.now();
  try {
    const { data, error } = await supabase.rpc('p2p_create_buy_order', {
      p_creator_id: creatorId,
      p_nova_amount: novaAmount,
      p_local_amount: localAmount,
      p_exchange_rate: exchangeRate,
      p_country: country,
      p_time_limit_minutes: timeLimitMinutes,
      p_payment_method_id: paymentMethodId || null,
    });

    if (error) {
      console.error('p2p_create_buy_order RPC error:', error);
      logFailure({ rpc_name: 'p2p_create_buy_order', user_id: creatorId, error_message: error.message, parameters: { novaAmount, localAmount, country } as any });
      logActivity({ user_id: creatorId, action_type: 'p2p_create_buy', entity_type: 'p2p_order', success: false, error_code: error.code, duration_ms: Date.now() - t0 });
      return { success: false, error: error.message };
    }

    const result = data as unknown as P2POrderResult;
    logActivity({ user_id: creatorId, action_type: 'p2p_create_buy', entity_type: 'p2p_order', entity_id: result.order_id, success: result.success, duration_ms: Date.now() - t0 });
    return result;
  } catch (err) {
    console.error('createBuyOrder error:', err);
    logFailure({ rpc_name: 'p2p_create_buy_order', user_id: creatorId, error_message: String(err) });
    return { success: false, error: 'Network error' };
  }
}

/**
 * Execute/match an order.
 * For BUY orders: executor (seller) has their Nova locked.
 * For SELL orders: no additional escrow needed.
 */
export async function executeOrder(
  orderId: string,
  executorId: string,
  paymentMethodId?: string
): Promise<P2PExecuteResult> {
  const t0 = Date.now();
  try {
    const { data, error } = await supabase.rpc('p2p_execute_order', {
      p_order_id: orderId,
      p_executor_id: executorId,
      p_payment_method_id: paymentMethodId || null,
    });

    if (error) {
      console.error('p2p_execute_order RPC error:', error);
      logFailure({ rpc_name: 'p2p_execute_order', user_id: executorId, error_message: error.message, parameters: { orderId } as any });
      logActivity({ user_id: executorId, action_type: 'p2p_execute', entity_type: 'p2p_order', entity_id: orderId, success: false, error_code: error.code, duration_ms: Date.now() - t0 });
      return { success: false, error: error.message };
    }

    const result = data as unknown as P2PExecuteResult;
    logActivity({ user_id: executorId, action_type: 'p2p_execute', entity_type: 'p2p_order', entity_id: orderId, success: result.success, duration_ms: Date.now() - t0 });
    return result;
  } catch (err) {
    console.error('executeOrder error:', err);
    logFailure({ rpc_name: 'p2p_execute_order', user_id: executorId, error_message: String(err) });
    return { success: false, error: 'Network error' };
  }
}

/**
 * Buyer confirms payment.
 * Status changes to payment_sent.
 */
export async function confirmPayment(
  orderId: string,
  userId: string
): Promise<P2PConfirmPaymentResult> {
  const t0 = Date.now();
  try {
    const { data, error } = await supabase.rpc('p2p_confirm_payment', {
      p_order_id: orderId,
      p_user_id: userId,
    });

    if (error) {
      console.error('p2p_confirm_payment RPC error:', error);
      logFailure({ rpc_name: 'p2p_confirm_payment', user_id: userId, error_message: error.message, parameters: { orderId } as any });
      logActivity({ user_id: userId, action_type: 'p2p_confirm_payment', entity_type: 'p2p_order', entity_id: orderId, success: false, error_code: error.code, duration_ms: Date.now() - t0 });
      return { success: false, error: error.message };
    }

    const result = data as unknown as P2PConfirmPaymentResult;
    logActivity({ user_id: userId, action_type: 'p2p_confirm_payment', entity_type: 'p2p_order', entity_id: orderId, success: result.success, duration_ms: Date.now() - t0 });
    return result;
  } catch (err) {
    console.error('confirmPayment error:', err);
    logFailure({ rpc_name: 'p2p_confirm_payment', user_id: userId, error_message: String(err) });
    return { success: false, error: 'Network error' };
  }
}

/**
 * Release escrow - transfer Nova from seller to buyer.
 * This is the CRITICAL atomic operation:
 * - Deducts from seller's locked_nova_balance
 * - Adds to buyer's nova_balance
 * - Creates ledger entries for both parties
 */
export async function releaseEscrow(
  orderId: string,
  userId: string
): Promise<P2PReleaseResult> {
  const t0 = Date.now();
  try {
    const { data, error } = await supabase.rpc('p2p_release_escrow', {
      p_order_id: orderId,
      p_user_id: userId,
    });

    if (error) {
      console.error('p2p_release_escrow RPC error:', error);
      logFailure({ rpc_name: 'p2p_release_escrow', user_id: userId, error_message: error.message, parameters: { orderId } as any });
      logActivity({ user_id: userId, action_type: 'p2p_release_escrow', entity_type: 'p2p_order', entity_id: orderId, success: false, error_code: error.code, duration_ms: Date.now() - t0 });
      return { success: false, error: error.message };
    }

    const result = data as unknown as P2PReleaseResult;
    logActivity({ user_id: userId, action_type: 'p2p_release_escrow', entity_type: 'p2p_order', entity_id: orderId, success: result.success, after_state: { buyer_new_balance: result.buyer_new_balance } as any, duration_ms: Date.now() - t0 });
    if (result.success) {
      logMoneyFlow({ operation: 'p2p_escrow_release', from_user: userId, amount: 0, currency: 'nova', reference_type: 'p2p_order', reference_id: orderId });
    }
    return result;
  } catch (err) {
    console.error('releaseEscrow error:', err);
    logFailure({ rpc_name: 'p2p_release_escrow', user_id: userId, error_message: String(err) });
    return { success: false, error: 'Network error' };
  }
}

/**
 * Cancel order with automatic escrow refund.
 * Based on status:
 * - open: refund escrow to seller (for sell orders)
 * - awaiting_payment: refund and mark cancelled
 * - payment_sent: cannot cancel, must dispute
 */
export async function cancelOrder(
  orderId: string,
  userId: string,
  reason?: string
): Promise<P2PCancelResult> {
  const t0 = Date.now();
  try {
    const { data, error } = await supabase.rpc('p2p_cancel_order', {
      p_order_id: orderId,
      p_user_id: userId,
      p_reason: reason || null,
    });

    if (error) {
      console.error('p2p_cancel_order RPC error:', error);
      logFailure({ rpc_name: 'p2p_cancel_order', user_id: userId, error_message: error.message, parameters: { orderId, reason } as any });
      logActivity({ user_id: userId, action_type: 'p2p_cancel', entity_type: 'p2p_order', entity_id: orderId, success: false, error_code: error.code, duration_ms: Date.now() - t0 });
      return { success: false, error: error.message };
    }

    const result = data as unknown as P2PCancelResult;
    logActivity({ user_id: userId, action_type: 'p2p_cancel', entity_type: 'p2p_order', entity_id: orderId, success: result.success, after_state: { status: result.status, nova_refunded: result.nova_refunded } as any, duration_ms: Date.now() - t0 });
    if (result.success && result.nova_refunded && result.nova_refunded > 0) {
      logMoneyFlow({ operation: 'p2p_cancel_refund', to_user: userId, amount: result.nova_refunded, currency: 'nova', reference_type: 'p2p_order', reference_id: orderId });
    }
    return result;
  } catch (err) {
    console.error('cancelOrder error:', err);
    logFailure({ rpc_name: 'p2p_cancel_order', user_id: userId, error_message: String(err) });
    return { success: false, error: 'Network error' };
  }
}

/**
 * Delete an open order (creator only).
 * Refunds escrow for sell orders.
 */
export async function deleteOrder(
  orderId: string,
  userId: string
): Promise<P2PCancelResult> {
  const t0 = Date.now();
  try {
    const { data, error } = await supabase.rpc('p2p_delete_order', {
      p_order_id: orderId,
      p_user_id: userId,
    });

    if (error) {
      console.error('p2p_delete_order RPC error:', error);
      logFailure({ rpc_name: 'p2p_delete_order', user_id: userId, error_message: error.message, parameters: { orderId } as any });
      logActivity({ user_id: userId, action_type: 'p2p_delete', entity_type: 'p2p_order', entity_id: orderId, success: false, error_code: error.code, duration_ms: Date.now() - t0 });
      return { success: false, error: error.message };
    }

    const result = data as unknown as P2PCancelResult;
    logActivity({ user_id: userId, action_type: 'p2p_delete', entity_type: 'p2p_order', entity_id: orderId, success: result.success, duration_ms: Date.now() - t0 });
    return result;
  } catch (err) {
    console.error('deleteOrder error:', err);
    logFailure({ rpc_name: 'p2p_delete_order', user_id: userId, error_message: String(err) });
    return { success: false, error: 'Network error' };
  }
}

/**
 * Relist an order (return to marketplace).
 * Note: Escrow remains locked for sell orders.
 */
export async function relistOrder(
  orderId: string,
  userId: string,
  reason?: string
): Promise<P2PCancelResult> {
  const t0 = Date.now();
  try {
    const { data, error } = await supabase.rpc('p2p_relist_order', {
      p_order_id: orderId,
      p_user_id: userId,
      p_reason: reason || null,
    });

    if (error) {
      console.error('p2p_relist_order RPC error:', error);
      logFailure({ rpc_name: 'p2p_relist_order', user_id: userId, error_message: error.message, parameters: { orderId, reason } as any });
      logActivity({ user_id: userId, action_type: 'p2p_relist', entity_type: 'p2p_order', entity_id: orderId, success: false, error_code: error.code, duration_ms: Date.now() - t0 });
      return { success: false, error: error.message };
    }

    const result = data as unknown as P2PCancelResult;
    logActivity({ user_id: userId, action_type: 'p2p_relist', entity_type: 'p2p_order', entity_id: orderId, success: result.success, duration_ms: Date.now() - t0 });
    return result;
  } catch (err) {
    console.error('relistOrder error:', err);
    logFailure({ rpc_name: 'p2p_relist_order', user_id: userId, error_message: String(err) });
    return { success: false, error: 'Network error' };
  }
}

/**
 * Open a dispute.
 */
export async function openDispute(
  orderId: string,
  userId: string,
  reason: string
): Promise<P2PDisputeResult> {
  const t0 = Date.now();
  try {
    const { data, error } = await supabase.rpc('p2p_open_dispute', {
      p_order_id: orderId,
      p_user_id: userId,
      p_reason: reason,
    });

    if (error) {
      console.error('p2p_open_dispute RPC error:', error);
      logFailure({ rpc_name: 'p2p_open_dispute', user_id: userId, error_message: error.message, parameters: { orderId, reason } as any });
      logActivity({ user_id: userId, action_type: 'p2p_dispute_open', entity_type: 'p2p_order', entity_id: orderId, success: false, error_code: error.code, duration_ms: Date.now() - t0 });
      return { success: false, error: error.message };
    }

    const result = data as unknown as P2PDisputeResult;
    logActivity({ user_id: userId, action_type: 'p2p_dispute_open', entity_type: 'p2p_order', entity_id: orderId, success: result.success, duration_ms: Date.now() - t0 });
    return result;
  } catch (err) {
    console.error('openDispute error:', err);
    logFailure({ rpc_name: 'p2p_open_dispute', user_id: userId, error_message: String(err) });
    return { success: false, error: 'Network error' };
  }
}

/**
 * Resolve dispute (support staff only).
 * Either releases to buyer or returns to seller.
 */
export async function resolveDispute(
  orderId: string,
  staffId: string,
  resolution: 'release_to_buyer' | 'return_to_seller'
): Promise<P2PResolveResult> {
  const t0 = Date.now();
  try {
    const { data, error } = await supabase.rpc('p2p_resolve_dispute', {
      p_order_id: orderId,
      p_staff_id: staffId,
      p_resolution: resolution,
    });

    if (error) {
      console.error('p2p_resolve_dispute RPC error:', error);
      logFailure({ rpc_name: 'p2p_resolve_dispute', user_id: staffId, error_message: error.message, parameters: { orderId, resolution } as any });
      logActivity({ user_id: staffId, role: 'support', action_type: 'p2p_dispute_resolve', entity_type: 'p2p_order', entity_id: orderId, success: false, error_code: error.code, duration_ms: Date.now() - t0 });
      return { success: false, error: error.message };
    }

    const result = data as unknown as P2PResolveResult;
    logActivity({ user_id: staffId, role: 'support', action_type: 'p2p_dispute_resolve', entity_type: 'p2p_order', entity_id: orderId, success: result.success, after_state: { resolution: result.resolution } as any, duration_ms: Date.now() - t0 });
    return result;
  } catch (err) {
    console.error('resolveDispute error:', err);
    logFailure({ rpc_name: 'p2p_resolve_dispute', user_id: staffId, error_message: String(err) });
    return { success: false, error: 'Network error' };
  }
}
