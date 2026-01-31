import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type Wallet = Database['public']['Tables']['wallets']['Row'];
type Transaction = Database['public']['Tables']['transactions']['Row'];

export function useWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setWallet(null);
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    fetchWallet();
    fetchTransactions();
  }, [user]);

  const fetchWallet = async () => {
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
  };

  const fetchTransactions = async (limit = 50) => {
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
  };

  // Nova balance (available)
  const novaBalance = wallet?.nova_balance ? Number(wallet.nova_balance) : 0;
  
  // Locked Nova (team earnings - released on 15th & 30th)
  const lockedNovaBalance = wallet?.locked_nova_balance ? Number(wallet.locked_nova_balance) : 0;
  
  // Aura balance (voting points)
  const auraBalance = wallet?.aura_balance ? Number(wallet.aura_balance) : 0;

  return {
    wallet,
    transactions,
    novaBalance,
    lockedNovaBalance,
    auraBalance,
    isLoading,
    error,
    refetch: fetchWallet,
    refetchTransactions: fetchTransactions,
  };
}
