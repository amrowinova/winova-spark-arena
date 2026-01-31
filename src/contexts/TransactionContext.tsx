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
  | 'team_earnings';

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
  p2pOrderId?: string;
}

export interface Receipt extends Transaction {
  receiptNumber: string;
}

// Country pricing (admin-managed, single fixed price per country)
// All 19 supported countries - Aura is always = Nova / 2
export const countryPricing: Record<string, { currency: string; symbol: string; novaRate: number }> = {
  'Saudi Arabia': { currency: 'SAR', symbol: 'ر.س', novaRate: 3.75 },
  'UAE': { currency: 'AED', symbol: 'د.إ', novaRate: 3.67 },
  'Kuwait': { currency: 'KWD', symbol: 'د.ك', novaRate: 0.31 },
  'Qatar': { currency: 'QAR', symbol: 'ر.ق', novaRate: 3.64 },
  'Bahrain': { currency: 'BHD', symbol: 'د.ب', novaRate: 0.38 },
  'Oman': { currency: 'OMR', symbol: 'ر.ع', novaRate: 0.38 },
  'Egypt': { currency: 'EGP', symbol: 'ج.م', novaRate: 30.90 },
  'Jordan': { currency: 'JOD', symbol: 'د.أ', novaRate: 0.71 },
  'Palestine': { currency: 'ILS', symbol: '₪', novaRate: 3.65 },
  'Lebanon': { currency: 'LBP', symbol: 'ل.ل', novaRate: 89500 },
  'Syria': { currency: 'SYP', symbol: 'ل.س', novaRate: 13000 },
  'Yemen': { currency: 'YER', symbol: 'ر.ي', novaRate: 250 },
  'Morocco': { currency: 'MAD', symbol: 'د.م', novaRate: 10.05 },
  'Tunisia': { currency: 'TND', symbol: 'د.ت', novaRate: 3.12 },
  'Algeria': { currency: 'DZD', symbol: 'د.ج', novaRate: 134.50 },
  'Libya': { currency: 'LYD', symbol: 'د.ل', novaRate: 4.85 },
  'Sudan': { currency: 'SDG', symbol: 'ج.س', novaRate: 601 },
  'Turkey': { currency: 'TRY', symbol: '₺', novaRate: 32.15 },
  'Iraq': { currency: 'IQD', symbol: 'د.ع', novaRate: 1310 },
};

// Helper to get Aura rate (always Nova / 2)
export const getAuraRate = (country: string) => {
  const pricing = countryPricing[country] || countryPricing['Saudi Arabia'];
  return pricing.novaRate / 2;
};

// Helper to get pricing for a country
export const getPricing = (country: string) => {
  const pricing = countryPricing[country] || countryPricing['Saudi Arabia'];
  return {
    ...pricing,
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

// Mock initial transactions including team earnings
const initialTransactions: Transaction[] = [
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
    const pricing = countryPricing[country] || countryPricing['Saudi Arabia'];
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
