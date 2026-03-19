import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface WalletTransaction {
  id: string;
  entry_type: string;
  currency: 'nova' | 'aura';
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  description_ar: string | null;
  reference_type: string | null;
  reference_id: string | null;
  counterparty_id: string | null;
  counterparty_name: string | null;
  counterparty_username: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface UseWalletHistoryOptions {
  currency?: 'nova' | 'aura' | null;
  limit?: number;
}

export function useWalletHistory(options: UseWalletHistoryOptions = {}) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const limit = options.limit || 50;

  // Ref so fetchTransactions always reads the latest offset without being in deps
  const offsetRef = useRef(offset);
  offsetRef.current = offset;

  const fetchTransactions = useCallback(async (reset = false) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const currentOffset = reset ? 0 : offsetRef.current;

      const { data, error: rpcError } = await supabase.rpc('get_wallet_history', {
        p_user_id: user.id,
        p_currency: options.currency || null,
        p_limit: limit,
        p_offset: currentOffset
      });

      if (rpcError) throw rpcError;

      const typedData = (data || []) as WalletTransaction[];

      if (reset) {
        setTransactions(typedData);
        setOffset(typedData.length);
      } else {
        setTransactions(prev => [...prev, ...typedData]);
        setOffset(prev => prev + typedData.length);
      }

      setHasMore(typedData.length === limit);
    } catch (err) {
      console.error('Error fetching wallet history:', err);
      setError('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  }, [user?.id, options.currency, limit]);

  // Initial fetch + refetch when user or currency changes
  useEffect(() => {
    fetchTransactions(true);
  }, [fetchTransactions]);

  // Subscribe to realtime updates on wallet_ledger
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`wallet_ledger_changes_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_ledger',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchTransactions(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchTransactions]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchTransactions(false);
    }
  }, [loading, hasMore, fetchTransactions]);

  const refresh = useCallback(() => {
    fetchTransactions(true);
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    hasMore,
    loadMore,
    refresh
  };
}
