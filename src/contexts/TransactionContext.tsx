import React, { createContext, useContext, useState, ReactNode } from 'react';

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

/**
 * @deprecated Use useNovaPricing hook instead
 * All prices should come from app_settings via the hook.
 * This is kept for backward compatibility only.
 */
export const countryPricing: Record<string, { currency: string; symbol: string; novaRate: number }> = {};

// Default pricing for TransactionContext internal use (fallback only)
// Components should use useNovaPricing hook instead
const DEFAULT_PRICING: Record<string, { currency: string; symbol: string; novaRate: number }> = {
  'Saudi Arabia': { currency: 'SAR', symbol: 'ر.س', novaRate: 0.75 },
  'السعودية': { currency: 'SAR', symbol: 'ر.س', novaRate: 0.75 },
  'Egypt': { currency: 'EGP', symbol: 'ج.م', novaRate: 10 },
  'مصر': { currency: 'EGP', symbol: 'ج.م', novaRate: 10 },
  'UAE': { currency: 'AED', symbol: 'د.إ', novaRate: 0.73 },
  'الإمارات': { currency: 'AED', symbol: 'د.إ', novaRate: 0.73 },
  'default': { currency: 'EGP', symbol: 'ج.م', novaRate: 10 },
};

/**
 * @deprecated Use useNovaPricing().getCurrencyInfo() instead
 */
export const getAuraRate = (country: string) => {
  console.warn('getAuraRate is deprecated. Use useNovaPricing hook instead.');
  return 5; // Default fallback
};

/**
 * @deprecated Use useNovaPricing().getCurrencyInfo() instead
 */
export const getPricing = (country: string) => {
  console.warn('getPricing is deprecated. Use useNovaPricing hook instead.');
  const pricing = DEFAULT_PRICING[country] || DEFAULT_PRICING['default'];
  return {
    currency: pricing.currency,
    symbol: pricing.symbol,
    novaRate: pricing.novaRate,
    auraRate: pricing.novaRate / 2,
  };
};

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

// Mock initial transactions including team earnings and aura vote earnings
const initialTransactions: Transaction[] = [
  // Aura Vote Earnings - Stage 1 (today)
  {
    id: 'TXN-AURA-001',
    type: 'aura_vote_earnings',
    status: 'completed',
    amount: 20, // 20% of 100 votes
    currency: 'aura',
    localAmount: 0, // Aura has no cash value
    localCurrency: 'SAR',
    sender: { id: 'system', name: 'النظام', username: 'system', country: 'Saudi Arabia' },
    receiver: { id: '1', name: 'أحمد', username: 'ahmed_sa', country: 'Saudi Arabia' },
    reason: 'أرباح تصويت – المرحلة الأولى',
    createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 mins ago
    contestId: 'C-1248',
    auraVoteEarnings: {
      stage: 'stage1',
      contestNumber: 1248,
      totalVotesReceived: 100,
      earningsPercentage: 20,
      country: 'Saudi Arabia',
    },
  },
  // Aura Vote Earnings - Final Stage (yesterday)
  {
    id: 'TXN-AURA-002',
    type: 'aura_vote_earnings',
    status: 'completed',
    amount: 30, // 20% of 150 votes
    currency: 'aura',
    localAmount: 0,
    localCurrency: 'SAR',
    sender: { id: 'system', name: 'النظام', username: 'system', country: 'Saudi Arabia' },
    receiver: { id: '1', name: 'أحمد', username: 'ahmed_sa', country: 'Saudi Arabia' },
    reason: 'أرباح تصويت – المرحلة النهائية',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    contestId: 'C-1247',
    auraVoteEarnings: {
      stage: 'final',
      contestNumber: 1247,
      totalVotesReceived: 150,
      earningsPercentage: 20,
      country: 'Saudi Arabia',
    },
  },
  // Another Aura earnings from earlier
  {
    id: 'TXN-AURA-003',
    type: 'aura_vote_earnings',
    status: 'completed',
    amount: 14, // 20% of 70 votes
    currency: 'aura',
    localAmount: 0,
    localCurrency: 'SAR',
    sender: { id: 'system', name: 'النظام', username: 'system', country: 'Saudi Arabia' },
    receiver: { id: '1', name: 'أحمد', username: 'ahmed_sa', country: 'Saudi Arabia' },
    reason: 'أرباح تصويت – المرحلة الأولى',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    contestId: 'C-1246',
    auraVoteEarnings: {
      stage: 'stage1',
      contestNumber: 1246,
      totalVotesReceived: 70,
      earningsPercentage: 20,
      country: 'Saudi Arabia',
    },
  },
  // Team Earnings - Today's contest
  {
    id: 'TXN-EARN-001',
    type: 'team_earnings',
    status: 'completed',
    amount: 4.5,
    currency: 'nova',
    localAmount: 16.875,
    localCurrency: 'SAR',
    sender: { id: '1', name: 'أحمد', username: 'ahmed_sa', country: 'Saudi Arabia' },
    reason: 'أرباح الفريق - مسابقة #1248',
    createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
    contestId: 'C-1248',
    teamEarnings: {
      rank: 'leader',
      country: 'Saudi Arabia',
      contestNumber: 1248,
      participantCount: 150,
      ratePerParticipant: 0.03,
    },
  },
  // Team Earnings - Yesterday
  {
    id: 'TXN-EARN-002',
    type: 'team_earnings',
    status: 'completed',
    amount: 3.9,
    currency: 'nova',
    localAmount: 14.625,
    localCurrency: 'SAR',
    sender: { id: '1', name: 'أحمد', username: 'ahmed_sa', country: 'Saudi Arabia' },
    reason: 'أرباح الفريق - مسابقة #1247',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    contestId: 'C-1247',
    teamEarnings: {
      rank: 'leader',
      country: 'Saudi Arabia',
      contestNumber: 1247,
      participantCount: 130,
      ratePerParticipant: 0.03,
    },
  },
  // Team Earnings - Different country (for Presidents)
  {
    id: 'TXN-EARN-003',
    type: 'team_earnings',
    status: 'completed',
    amount: 2.1,
    currency: 'nova',
    localAmount: 64.89,
    localCurrency: 'EGP',
    sender: { id: '1', name: 'أحمد', username: 'ahmed_sa', country: 'Saudi Arabia' },
    reason: 'أرباح الفريق - مسابقة #1247 (مصر)',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    contestId: 'C-1247-EG',
    teamEarnings: {
      rank: 'leader',
      country: 'Egypt',
      contestNumber: 1247,
      participantCount: 70,
      ratePerParticipant: 0.03,
    },
  },
  // Regular transactions
  {
    id: 'TXN-001',
    type: 'contest_entry',
    status: 'completed',
    amount: 10,
    currency: 'aura',
    localAmount: 18.75,
    localCurrency: 'SAR',
    sender: { id: '1', name: 'أحمد', username: 'ahmed_sa', country: 'Saudi Arabia' },
    reason: 'دخول المسابقة اليومية #1247',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    contestId: 'C-1247',
  },
  {
    id: 'TXN-002',
    type: 'vote_received',
    status: 'completed',
    amount: 12,
    currency: 'aura',
    localAmount: 22.5,
    localCurrency: 'SAR',
    sender: { id: '2', name: 'سارة', username: 'sara_ksa', country: 'Saudi Arabia' },
    receiver: { id: '1', name: 'أحمد', username: 'ahmed_sa', country: 'Saudi Arabia' },
    reason: 'تصويت في المسابقة #1247 - المرحلة الأولى',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    contestId: 'C-1247',
  },
  {
    id: 'TXN-003',
    type: 'transfer_nova',
    status: 'completed',
    amount: 25.5,
    currency: 'nova',
    localAmount: 95.625,
    localCurrency: 'SAR',
    sender: { id: '3', name: 'محمد', username: 'mohammed_k', country: 'Saudi Arabia' },
    receiver: { id: '1', name: 'أحمد', username: 'ahmed_sa', country: 'Saudi Arabia' },
    reason: 'تحويل Nova',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
];

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [receipts, setReceipts] = useState<Receipt[]>(
    initialTransactions.map(tx => ({
      ...tx,
      receiptNumber: generateReceiptNumber(),
    }))
  );

  const calculateLocalAmount = (amount: number, country: string, currency: 'nova' | 'aura' = 'nova') => {
    const pricing = DEFAULT_PRICING[country] || DEFAULT_PRICING['default'];
    const rate = currency === 'nova' ? pricing.novaRate : pricing.novaRate / 2;
    return {
      amount: amount * rate,
      currency: pricing.currency,
      symbol: pricing.symbol,
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
