import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type AuditAction = 
  | 'nova_add'
  | 'nova_deduct'
  | 'wallet_freeze'
  | 'wallet_unfreeze'
  | 'withdrawal_approve'
  | 'withdrawal_reject';

export interface AuditLogEntry {
  action: AuditAction;
  entity_type: 'wallet' | 'transaction';
  entity_id: string;
  performed_by: string;
  old_value?: Json;
  new_value?: Json;
  metadata?: Json;
}

/**
 * Create an audit log entry for financial operations
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        action: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        performed_by: entry.performed_by,
        old_value: entry.old_value ?? null,
        new_value: entry.new_value ?? null,
        metadata: entry.metadata ?? null,
      }]);

    if (error) {
      console.error('Error creating audit log:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error creating audit log:', err);
    return false;
  }
}

/**
 * Log Nova balance change (add or deduct)
 */
export async function logNovaChange(params: {
  action: 'nova_add' | 'nova_deduct';
  walletId: string;
  performedBy: string;
  targetUserId: string;
  targetUsername: string;
  oldBalance: number;
  newBalance: number;
  amount: number;
  reason?: string;
}): Promise<boolean> {
  return createAuditLog({
    action: params.action,
    entity_type: 'wallet',
    entity_id: params.walletId,
    performed_by: params.performedBy,
    old_value: { nova_balance: params.oldBalance },
    new_value: { nova_balance: params.newBalance },
    metadata: {
      target_user_id: params.targetUserId,
      target_username: params.targetUsername,
      amount: params.amount,
      reason: params.reason ?? null,
    },
  });
}

/**
 * Log wallet freeze/unfreeze action
 */
export async function logWalletFreeze(params: {
  action: 'wallet_freeze' | 'wallet_unfreeze';
  walletId: string;
  performedBy: string;
  targetUserId: string;
  targetUsername: string;
  reason: string;
}): Promise<boolean> {
  return createAuditLog({
    action: params.action,
    entity_type: 'wallet',
    entity_id: params.walletId,
    performed_by: params.performedBy,
    old_value: { is_frozen: params.action === 'wallet_freeze' ? false : true },
    new_value: { is_frozen: params.action === 'wallet_freeze' },
    metadata: {
      target_user_id: params.targetUserId,
      target_username: params.targetUsername,
      reason: params.reason,
    },
  });
}
