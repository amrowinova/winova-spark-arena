import { useMemo } from 'react';
import { useWallet } from './useWallet';
import { useLanguage } from '@/contexts/LanguageContext';

export interface FrozenWalletCheck {
  isFrozen: boolean;
  isLoading: boolean;
  message: string;
  messageAr: string;
}

/**
 * Hook to check if the current user's wallet is frozen
 * Use this before any financial operations (Transfer, Convert, P2P)
 */
export function useFrozenWalletGuard(): FrozenWalletCheck {
  const { wallet, isLoading } = useWallet();
  const { language } = useLanguage();

  const result = useMemo(() => {
    const isFrozen = wallet?.is_frozen ?? false;
    
    return {
      isFrozen,
      isLoading,
      message: 'Your wallet is frozen. You cannot perform this action.',
      messageAr: 'رصيدك مجمّد. لا يمكنك تنفيذ هذه العملية.',
    };
  }, [wallet?.is_frozen, isLoading]);

  return result;
}

/**
 * Minimum withdrawal amount in Nova
 */
export const MIN_WITHDRAWAL_AMOUNT = 50;

/**
 * Check if withdrawal amount meets minimum requirement
 */
export function isWithdrawalAmountValid(amount: number): { 
  valid: boolean; 
  message: string; 
  messageAr: string;
} {
  if (amount < MIN_WITHDRAWAL_AMOUNT) {
    return {
      valid: false,
      message: `Minimum withdrawal is ${MIN_WITHDRAWAL_AMOUNT} Nova`,
      messageAr: `الحد الأدنى للسحب هو ${MIN_WITHDRAWAL_AMOUNT} Nova`,
    };
  }
  return { valid: true, message: '', messageAr: '' };
}
