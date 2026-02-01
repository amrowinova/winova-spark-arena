import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type Wallet = Database['public']['Tables']['wallets']['Row'];
type Transaction = Database['public']['Tables']['transactions']['Row'];
type LedgerEntry = Database['public']['Tables']['wallet_ledger']['Row'];

export function useWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWallet = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setWallet(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchTransactions = useCallback(async (limit = 50) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      setError(err as Error);
    }
  }, [user]);

  const fetchLedgerEntries = useCallback(async (limit = 50) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('wallet_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setLedgerEntries(data || []);
    } catch (err) {
      setError(err as Error);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    if (!user) {
      setWallet(null);
      setTransactions([]);
      setLedgerEntries([]);
      setIsLoading(false);
      return;
    }

    fetchWallet();
    fetchTransactions();
    fetchLedgerEntries();
  }, [user, fetchWallet, fetchTransactions, fetchLedgerEntries]);

  // Subscribe to realtime wallet changes (for incoming transfers)
  useEffect(() => {
    if (!user) return;

    const walletChannel = supabase
      .channel(`wallet-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Update wallet state instantly from realtime payload
          const newWallet = payload.new as Wallet;
          setWallet(newWallet);
        }
      )
      .subscribe();

    // Also subscribe to ledger entries for real-time transaction updates
    const ledgerChannel = supabase
      .channel(`ledger-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_ledger',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Add new ledger entry to state
          const newEntry = payload.new as LedgerEntry;
          setLedgerEntries((prev) => [newEntry, ...prev]);
          
          // Also refetch wallet to ensure consistency
          fetchWallet();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(ledgerChannel);
    };
  }, [user, fetchWallet]);

  // Nova balance (available)
  const novaBalance = wallet?.nova_balance ? Number(wallet.nova_balance) : 0;
  
  // Locked Nova (team earnings - released on 15th & 30th)
  const lockedNovaBalance = wallet?.locked_nova_balance ? Number(wallet.locked_nova_balance) : 0;
  
  // Aura balance (voting points)
  const auraBalance = wallet?.aura_balance ? Number(wallet.aura_balance) : 0;

  // Is wallet frozen
  const isFrozen = wallet?.is_frozen ?? false;

  return {
    wallet,
    transactions,
    ledgerEntries,
    novaBalance,
    lockedNovaBalance,
    auraBalance,
    isFrozen,
    isLoading,
    error,
    refetch: fetchWallet,
    refetchTransactions: fetchTransactions,
    refetchLedger: fetchLedgerEntries,
  };
}
