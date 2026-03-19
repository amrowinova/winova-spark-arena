import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useNovaPricing } from '@/hooks/useNovaPricing';

export type TransactionType = 
  | 'transfer_nova'
  | 'convert_nova_aura'
  | 'contest_entry'
  | 'vote_received'
  | 'vote_sent'
  | 'p2p_buy'
  | 'p2p_sell'
  | 'spotlight_win'
  | 'aura_reward'
  | 'team_earnings'
  | 'earnings_release' // Bi-monthly locked earnings release (15th & 30th)
  | 'aura_vote_earnings'; // 20% of paid votes received - added after stage ends

// Rank commission rates (Nova per qualified participant)
export const RANK_COMMISSION_RATES = {
  subscriber: 0,
  marketer: 0,
  leader: 0.82,
  manager: 0.15,
  president: 0.03,
} as const;

export type UserRank = keyof typeof RANK_COMMISSION_RATES;

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: 'nova' | 'aura';
  localAmount: number;
  localCurrency: string;
  sender: {
    id: string;
    name: string;
    username: string;
    country: string;
  };
  receiver?: {
    id: string;
    name: string;
    username: string;
    country: string;
  };
  reason: string;
  createdAt: Date;
  contestId?: string;
  // Team earnings specific fields
  teamEarnings?: {
    rank: UserRank;
    country: string;
    contestNumber: number;
    participantCount: number;
    ratePerParticipant: number;
  };
  // Aura vote earnings (20% of paid votes received)
  auraVoteEarnings?: {
    stage: 'stage1' | 'final';
    contestNumber: number;
    totalVotesReceived: number; // Total paid votes contestant received
    earningsPercentage: number; // Always 20%
    country?: string;
  };
  p2pOrderId?: string;
}

export interface Receipt extends Transaction {
  receiptNumber: string;
}

// NOTE: Pricing is sourced exclusively via useNovaPricing (from app_settings -> nova_prices).

interface TransactionContextType {
  transactions: Transaction[];
  receipts: Receipt[];
  createTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'localAmount' | 'localCurrency'>) => Receipt;
  getTransactionsByType: (type: TransactionType) => Transaction[];
  getReceiptById: (id: string) => Receipt | undefined;
  getUserReceipts: (userId: string) => Receipt[];
  calculateLocalAmount: (amount: number, country: string, currency: 'nova' | 'aura') => { amount: number; currency: string; symbol: string };
  getNovaToAuraRate: () => number; // Always 2 Nova = 1 Aura value, but 1:1 conversion
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

function generateId(): string {
  return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

function generateReceiptNumber(): string {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `RCP-${dateStr}-${random}`;
}

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { getCurrencyInfo } = useNovaPricing();
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  const calculateLocalAmount = (amount: number, country: string, currency: 'nova' | 'aura' = 'nova') => {
    const info = getCurrencyInfo(country);
    const rate = currency === 'nova' ? info.novaRate : info.auraRate;
    return {
      amount: amount * rate,
      currency: info.code,
      // Keep Arabic symbol for consistency with existing UI expectations
      symbol: info.symbolAr,
    };
  };

  const getNovaToAuraRate = () => 1; // 1 Nova = 1 Aura in conversion (but Aura value is Nova/2)

  const createTransaction = (
    txData: Omit<Transaction, 'id' | 'createdAt' | 'localAmount' | 'localCurrency'>
  ): Receipt => {
    const country = txData.sender.country;
    const localInfo = calculateLocalAmount(txData.amount, country, txData.currency);
    
    const transaction: Transaction = {
      ...txData,
      id: generateId(),
      createdAt: new Date(),
      localAmount: localInfo.amount,
      localCurrency: localInfo.currency,
    };

    const receipt: Receipt = {
      ...transaction,
      receiptNumber: generateReceiptNumber(),
    };

    setTransactions(prev => [transaction, ...prev]);
    setReceipts(prev => [receipt, ...prev]);

    return receipt;
  };

  const getTransactionsByType = (type: TransactionType) => {
    return transactions.filter(tx => tx.type === type);
  };

  const getReceiptById = (id: string) => {
    return receipts.find(r => r.id === id || r.receiptNumber === id);
  };

  const getUserReceipts = (userId: string) => {
    return receipts.filter(r => r.sender.id === userId || r.receiver?.id === userId);
  };

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        receipts,
        createTransaction,
        getTransactionsByType,
        getReceiptById,
        getUserReceipts,
        calculateLocalAmount,
        getNovaToAuraRate,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
}
