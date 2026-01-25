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
  | 'aura_reward';

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
  p2pOrderId?: string;
}

export interface Receipt extends Transaction {
  receiptNumber: string;
}

// Country pricing (admin-managed, single fixed price per country)
// Aura is always = Nova / 2
export const countryPricing: Record<string, { currency: string; symbol: string; novaRate: number }> = {
  'Saudi Arabia': { currency: 'SAR', symbol: 'ر.س', novaRate: 3.75 },
  'Egypt': { currency: 'EGP', symbol: 'ج.م', novaRate: 30.90 },
  'Palestine': { currency: 'ILS', symbol: '₪', novaRate: 3.65 },
  'Syria': { currency: 'SYP', symbol: 'ل.س', novaRate: 13000 },
  'UAE': { currency: 'AED', symbol: 'د.إ', novaRate: 3.67 },
  'Jordan': { currency: 'JOD', symbol: 'د.أ', novaRate: 0.71 },
  'Kuwait': { currency: 'KWD', symbol: 'د.ك', novaRate: 0.31 },
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

// Mock initial transactions
const initialTransactions: Transaction[] = [
  {
    id: 'TXN-001',
    type: 'contest_entry',
    status: 'completed',
    amount: 10,
    currency: 'aura',
    localAmount: 18.75, // Aura = Nova/2
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
