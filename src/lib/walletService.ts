import { supabase } from '@/integrations/supabase/client';

export interface TransferResult {
  success: boolean;
  error?: string;
  senderLedgerId?: string;
  recipientLedgerId?: string;
  senderBalanceAfter?: number;
  recipientBalanceAfter?: number;
}

export interface RecipientLookupResult {
  id: string;           // profile.id
  userId: string;       // auth user_id
  name: string;
  username: string;
  country: string;
  avatarUrl?: string;
}

/**
 * Execute an atomic Nova/Aura transfer between two users
 * This calls the database function that handles:
 * - Balance checks
 * - Wallet locking
 * - Ledger entries
 * - Transaction records
 */
export async function executeTransfer(
  senderId: string,
  recipientId: string,
  amount: number,
  currency: 'nova' | 'aura' = 'nova',
  referenceType: string = 'transfer',
  referenceId?: string,
  description?: string,
  descriptionAr?: string
): Promise<TransferResult> {
  try {
    const { data, error } = await supabase.rpc('execute_transfer', {
      p_sender_id: senderId,
      p_recipient_id: recipientId,
      p_amount: amount,
      p_currency: currency,
      p_reference_type: referenceType,
      p_reference_id: referenceId || null,
      p_description: description || null,
      p_description_ar: descriptionAr || null,
    });

    if (error) {
      console.error('Transfer RPC error:', error);
      return { success: false, error: error.message };
    }

    const result = data as {
      success: boolean;
      error?: string;
      sender_ledger_id?: string;
      recipient_ledger_id?: string;
      sender_balance_after?: number;
      recipient_balance_after?: number;
    };

    if (!result.success) {
      return { success: false, error: result.error || 'Transfer failed' };
    }

    return {
      success: true,
      senderLedgerId: result.sender_ledger_id,
      recipientLedgerId: result.recipient_ledger_id,
      senderBalanceAfter: result.sender_balance_after,
      recipientBalanceAfter: result.recipient_balance_after,
    };
  } catch (err) {
    console.error('Transfer error:', err);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Look up a user by username
 * Returns user identity information needed for transfers
 */
export async function lookupUserByUsername(
  username: string
): Promise<RecipientLookupResult | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id, name, username, country, avatar_url')
      .eq('username', username.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('User lookup error:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      username: data.username,
      country: data.country,
      avatarUrl: data.avatar_url || undefined,
    };
  } catch (err) {
    console.error('User lookup error:', err);
    return null;
  }
}

/**
 * Search users by partial username OR name (for autocomplete)
 * CRITICAL: Only returns real users from the database
 */
export async function searchUsersByUsername(
  query: string,
  excludeUserId?: string,
  limit: number = 10
): Promise<RecipientLookupResult[]> {
  if (!query || query.length < 2) {
    return [];
  }

  try {
    const searchTerm = query.toLowerCase().trim();
    
    let queryBuilder = supabase
      .from('profiles')
      .select('id, user_id, name, username, country, avatar_url')
      .or(`username.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
      .limit(limit);

    if (excludeUserId) {
      queryBuilder = queryBuilder.neq('user_id', excludeUserId);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('User search error:', error);
      return [];
    }

    // Only return users that actually exist in the database
    return (data || []).map((p) => ({
      id: p.id,
      userId: p.user_id,
      name: p.name,
      username: p.username,
      country: p.country,
      avatarUrl: p.avatar_url || undefined,
    }));
  } catch (err) {
    console.error('User search error:', err);
    return [];
  }
}

/**
 * Get user's wallet balance
 */
export async function getWalletBalance(
  userId: string
): Promise<{ nova: number; aura: number; lockedNova: number } | null> {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('nova_balance, aura_balance, locked_nova_balance')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      nova: Number(data.nova_balance) || 0,
      aura: Number(data.aura_balance) || 0,
      lockedNova: Number(data.locked_nova_balance) || 0,
    };
  } catch {
    return null;
  }
}

/**
 * Check if a wallet is frozen
 */
export async function isWalletFrozen(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_wallet_frozen', {
      _user_id: userId,
    });

    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}
