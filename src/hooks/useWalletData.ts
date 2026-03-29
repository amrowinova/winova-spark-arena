import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { useChatCleanup } from '@/hooks/useChatCleanup';
import { useWalletHistory, WalletTransaction } from '@/hooks/useWalletHistory';
import { useNovaPricing } from '@/hooks/useNovaPricing';

interface WalletData {
  balance: number;
  auraBalance: number;
  lockedEarnings: number;
  teamEarningsTotal: number;
}

interface UseWalletDataOptions {
  autoFetch?: boolean;
}

export function useWalletData(options: UseWalletDataOptions = {}) {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const { user } = useUser();
  const { addTimeout, cleanup } = useChatCleanup();
  const { anchorPrices, getCurrencyInfo } = useNovaPricing();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [walletData, setWalletData] = useState<WalletData>({
    balance: 0,
    auraBalance: 0,
    lockedEarnings: 0,
    teamEarningsTotal: 0,
  });
  const [error, setError] = useState<Error | null>(null);

  // Wallet history hook
  const {
    transactions,
    loading: historyLoading,
    hasMore,
    loadMore,
    refresh: refreshHistory,
    selectedTab,
    setSelectedTab
  } = useWalletHistory();

  // Fetch wallet data
  const fetchWalletData = useCallback(async () => {
    if (!authUser) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch all wallet data in parallel
      const [
        walletResult,
        auraResult,
        lockedEarningsResult,
        teamEarningsResult
      ] = await Promise.all([
        // Nova balance
        supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', authUser.id)
          .eq('currency', 'nova')
          .single(),
        // Aura balance
        supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', authUser.id)
          .eq('currency', 'aura')
          .single(),
        // Locked earnings
        supabase
          .from('locked_earnings')
          .select('amount')
          .eq('user_id', authUser.id),
        // Team earnings
        supabase.rpc('get_team_earnings_total', { p_user_id: authUser.id }),
      ]);

      const novaBalance = walletResult.data?.balance || 0;
      const auraBalance = auraResult.data?.balance || 0;
      const lockedEarnings = lockedEarningsResult.data?.reduce((sum: number, item: any) => sum + item.amount, 0) || 0;
      const teamEarningsTotal = teamEarningsResult || 0;

      setWalletData({
        balance: novaBalance,
        auraBalance,
        lockedEarnings,
        teamEarningsTotal,
      });
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [authUser]);

  // Transfer Nova
  const transferNova = useCallback(async (recipientId: string, amount: number, message?: string) => {
    if (!authUser) throw new Error('Not authenticated');
    if (amount <= 0) throw new Error('Amount must be positive');
    if (amount > walletData.balance) throw new Error('Insufficient balance');

    try {
      const { error } = await supabase.rpc('transfer_nova', {
        p_sender_id: authUser.id,
        p_recipient_id: recipientId,
        p_amount: amount,
        p_message: message || null,
      });

      if (error) throw error;

      // Refresh wallet data and history
      await Promise.all([fetchWalletData(), refreshHistory()]);
      
      return { success: true };
    } catch (error) {
      console.error('Error transferring Nova:', error);
      return { success: false, error: error as Error };
    }
  }, [authUser, walletData.balance, fetchWalletData, refreshHistory]);

  // Convert currencies
  const convertCurrency = useCallback(async (from: 'nova' | 'aura', to: 'nova' | 'aura', amount: number) => {
    if (!authUser) throw new Error('Not authenticated');
    if (amount <= 0) throw new Error('Amount must be positive');

    const fromBalance = from === 'nova' ? walletData.balance : walletData.auraBalance;
    if (amount > fromBalance) throw new Error('Insufficient balance');

    try {
      const { error } = await supabase.rpc('convert_currency', {
        p_user_id: authUser.id,
        p_from_currency: from,
        p_to_currency: to,
        p_amount: amount,
      });

      if (error) throw error;

      // Refresh wallet data and history
      await Promise.all([fetchWalletData(), refreshHistory()]);
      
      return { success: true };
    } catch (error) {
      console.error('Error converting currency:', error);
      return { success: false, error: error as Error };
    }
  }, [authUser, walletData, fetchWalletData, refreshHistory]);

  // Get wallet summary
  const getWalletSummary = useCallback(() => {
    const currencyInfo = getCurrencyInfo('EGP');
    const novaValueInCurrency = walletData.balance * currencyInfo.novaRate;
    const auraValueInCurrency = walletData.auraBalance * currencyInfo.auraRate;
    const totalValueInCurrency = novaValueInCurrency + auraValueInCurrency;

    return {
      novaBalance: walletData.balance,
      auraBalance: walletData.auraBalance,
      totalValueInCurrency,
      currency: currencyInfo,
      lockedEarnings: walletData.lockedEarnings,
      teamEarningsTotal: walletData.teamEarningsTotal,
    };
  }, [walletData, getCurrencyInfo]);

  // Auto-fetch on mount
  useEffect(() => {
    if (!options.autoFetch) return;
    
    if (!authUser) {
      setIsLoading(false);
      return;
    }

    fetchWalletData();
  }, [authUser, options.autoFetch, fetchWalletData]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // State
    isLoading,
    walletData,
    error,
    
    // History data
    transactions,
    historyLoading,
    hasMore,
    selectedTab,
    
    // Actions
    fetchWalletData,
    transferNova,
    convertCurrency,
    loadMore,
    refreshHistory,
    setSelectedTab,
    getWalletSummary,
    refresh: useCallback(() => {
      return Promise.all([fetchWalletData(), refreshHistory()]);
    }, [fetchWalletData, refreshHistory]),
    
    // Cleanup
    cleanup
  };
}
