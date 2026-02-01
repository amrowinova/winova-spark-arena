import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useP2PDatabase, P2POrderWithProfiles, DBP2PParticipant } from '@/hooks/useP2PDatabase';
import { dbStatusToUI, UIP2POrderStatus, DBP2POrderStatus } from '@/lib/p2pStatusMapper';
import { Database } from '@/integrations/supabase/types';

type P2PMessageRow = Database['public']['Tables']['p2p_messages']['Row'];

// Re-export types for backward compatibility
export type P2POrderStatus = UIP2POrderStatus;

export interface P2PParticipant {
  id: string;
  name: string;
  nameAr: string;
  username: string;
  avatar: string;
  rating: number;
  country: string;
}

export interface P2PPaymentDetails {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  isLocked: boolean;
}

export type P2PCancellationReason = 
  | 'frozen_account'
  | 'payment_not_receiving'
  | 'transfer_error'
  | 'time_expired'
  | 'other';

export interface P2PSystemMessage {
  id: string;
  type: 
    | 'status_change' 
    | 'payment_confirmed' 
    | 'released' 
    | 'dispute_opened' 
    | 'support_joined' 
    | 'support_message' 
    | 'dispute_resolved' 
    | 'seller_confirmed' 
    | 'funds_released' 
    | 'completion_summary'
    | 'buyer_copied_bank'
    | 'awaiting_buyer_payment'
    | 'buyer_paid'
    | 'sell_order_created'
    | 'order_cancelled';
  content: string;
  contentAr: string;
  time: string;
  orderId: string;
  supportAction?: 'request_proof' | 'release_to_buyer' | 'return_to_seller' | 'resolved';
  orderDetails?: {
    amount: number;
    total: number;
    currencySymbol: string;
    price: number;
    paymentMethod: string;
    executionMinutes: number;
  };
}

export interface P2PMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  time: string;
  isMine: boolean;
  isSystem?: boolean;
  systemMessage?: P2PSystemMessage;
  attachment?: {
    type: 'image' | 'file';
    url: string;
    name: string;
  };
}

export interface P2POrder {
  id: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  total: number;
  currency: string;
  currencySymbol: string;
  seller: P2PParticipant;
  buyer: P2PParticipant;
  status: P2POrderStatus;
  createdAt: Date;
  expiresAt: Date;
  paymentDetails: P2PPaymentDetails;
  disputeReason?: string;
  supportJoined?: boolean;
}

export interface P2PChat {
  id: string;
  participantIds: [string, string];
  buyer: P2PParticipant;
  seller: P2PParticipant;
  orders: P2POrder[];
  messages: P2PMessage[];
  createdAt: Date;
  lastMessageTime: Date;
  unreadCount: number;
  supportPresent: boolean;
}

// Generate chat ID from participant IDs
export const generateChatId = (id1: string, id2: string): string => {
  const sorted = [id1, id2].sort();
  return `p2p-${sorted[0].slice(0, 8)}-${sorted[1].slice(0, 8)}`;
};

const MAX_CANCELLATIONS_24H = 3;

interface P2PContextType {
  chats: P2PChat[];
  activeChat: P2PChat | null;
  activeOrder: P2POrder | null;
  isLoading: boolean;
  isMockMode: boolean;
  
  // Order restriction checks
  hasOpenOrder: () => boolean;
  canCreateOrder: () => { allowed: boolean; reason?: string };
  getCancellationsIn24h: () => number;
  isBlockedFromOrders: () => boolean;
  
  // Chat operations
  getOrCreateChat: (buyer: P2PParticipant, seller: P2PParticipant) => P2PChat;
  setActiveChat: (chatId: string | null) => void;
  setActiveOrder: (orderId: string | null) => void;
  sendMessage: (chatId: string, content: string, attachment?: P2PMessage['attachment']) => void;
  
  // Order operations
  createOrder: (order: Omit<P2POrder, 'id' | 'createdAt' | 'expiresAt' | 'status'>) => P2POrder | null;
  updateOrderStatus: (orderId: string, status: P2POrderStatus, reason?: string) => void;
  
  // Buyer actions
  confirmPayment: (orderId: string) => void;
  cancelOrder: (orderId: string) => boolean | Promise<boolean>;
  cancelOrderWithReason: (orderId: string, reason: string) => boolean | Promise<boolean>;
  deleteOrder: (orderId: string) => boolean | Promise<boolean>;
  relistOrder: (orderId: string, reason: string) => boolean | Promise<boolean>;
  openDispute: (orderId: string, reason: string) => void;
  
  // Timer expiration
  expireOrder: (orderId: string) => void;
  
  // Seller actions
  releaseFunds: (orderId: string) => void;
  reportNoPayment: (orderId: string) => void;
  
  // Mock mode triggers (for UI testing when enabled)
  triggerMockSellerConfirmation: (orderId: string) => void;
  triggerMockBuyerPayment: (orderId: string) => void;
  
  // Support actions
  joinDispute: (orderId: string) => void;
  requestProof: (orderId: string) => void;
  resolveDispute: (orderId: string, resolution: 'release_to_buyer' | 'return_to_seller') => void;
  
  // Rating
  rateOrder: (orderId: string, isPositive: boolean) => void;
  hasRatedOrder: (orderId: string) => boolean;
  
  // Helpers
  getOrdersByChat: (chatId: string) => P2POrder[];
  getChatByParticipants: (buyerId: string, sellerId: string) => P2PChat | undefined;
  getOrderById: (orderId: string) => P2POrder | undefined;
}

const P2PContext = createContext<P2PContextType | undefined>(undefined);

// Currency info by country
const COUNTRY_CURRENCIES: Record<string, { code: string; symbol: string; rate: number }> = {
  'Saudi Arabia': { code: 'SAR', symbol: 'ر.س', rate: 3.75 },
  'UAE': { code: 'AED', symbol: 'د.إ', rate: 3.67 },
  'Egypt': { code: 'EGP', symbol: 'ج.م', rate: 50.0 },
  'Morocco': { code: 'MAD', symbol: 'د.م', rate: 10.0 },
  'Turkey': { code: 'TRY', symbol: '₺', rate: 34.0 },
  'Pakistan': { code: 'PKR', symbol: 'Rs', rate: 280.0 },
};

function getTimeString(date?: Date): string {
  return (date || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Convert DB participant to UI participant
function toUIParticipant(p: DBP2PParticipant): P2PParticipant {
  return {
    id: p.id,
    name: p.name,
    nameAr: p.nameAr,
    username: p.username,
    avatar: p.avatar,
    rating: p.rating,
    country: p.country,
  };
}

// Convert DB order to UI order
function toUIOrder(
  dbOrder: P2POrderWithProfiles,
  buyer: P2PParticipant,
  seller: P2PParticipant,
  paymentDetails: P2PPaymentDetails
): P2POrder {
  const currency = COUNTRY_CURRENCIES[dbOrder.country] || COUNTRY_CURRENCIES['Saudi Arabia'];
  
  // Timer starts from matched_at (when order was accepted), not created_at
  // For open orders (not yet matched), use a far future date
  const timerStartTime = dbOrder.matched_at 
    ? new Date(dbOrder.matched_at) 
    : new Date(dbOrder.created_at);
  
  // Only calculate expiry if order is matched (not open)
  const isMatched = dbOrder.executor_id !== null;
  const expiresAt = isMatched 
    ? new Date(timerStartTime.getTime() + dbOrder.time_limit_minutes * 60 * 1000)
    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Far future for open orders
  
  return {
    id: dbOrder.id,
    type: dbOrder.order_type,
    amount: Number(dbOrder.nova_amount),
    price: Number(dbOrder.exchange_rate),
    total: Number(dbOrder.local_amount),
    currency: currency.code,
    currencySymbol: currency.symbol,
    seller,
    buyer,
    status: dbOrder.ui_status,
    createdAt: new Date(dbOrder.created_at),
    expiresAt,
    paymentDetails,
    disputeReason: dbOrder.cancellation_reason || undefined,
    supportJoined: dbOrder.status === 'disputed',
  };
}

// Convert DB message to UI message
function toUIMessage(dbMessage: P2PMessageRow, currentUserId: string): P2PMessage {
  const isSystem = dbMessage.is_system_message;
  
  const msg: P2PMessage = {
    id: dbMessage.id,
    senderId: dbMessage.sender_id,
    senderName: isSystem ? 'System' : 'User',
    content: dbMessage.content,
    time: getTimeString(new Date(dbMessage.created_at)),
    isMine: dbMessage.sender_id === currentUserId,
    isSystem,
  };
  
  if (isSystem) {
    msg.systemMessage = {
      id: dbMessage.id,
      type: dbMessage.message_type as P2PSystemMessage['type'],
      content: dbMessage.content,
      contentAr: dbMessage.content_ar || dbMessage.content,
      time: getTimeString(new Date(dbMessage.created_at)),
      orderId: dbMessage.order_id,
    };
  }
  
  return msg;
}

export function P2PProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const db = useP2PDatabase();
  
  const [chats, setChats] = useState<P2PChat[]>([]);
  const [activeChat, setActiveChatState] = useState<P2PChat | null>(null);
  const [activeOrder, setActiveOrderState] = useState<P2POrder | null>(null);
  const [ratedOrders, setRatedOrders] = useState<Set<string>>(new Set());
  
  // Mock mode is disabled - we're using real database
  const MOCK_MODE = false;

  // Build chats from orders
  useEffect(() => {
    if (!user || db.orders.length === 0) {
      if (db.orders.length === 0) setChats([]);
      return;
    }

    const chatMap = new Map<string, P2PChat>();

    for (const dbOrder of db.orders) {
      const { buyer: dbBuyer, seller: dbSeller } = db.getParticipants(dbOrder);
      const buyer = toUIParticipant(dbBuyer);
      const seller = toUIParticipant(dbSeller);
      
      const chatId = generateChatId(buyer.id, seller.id);
      
      // Get payment details (placeholder for now)
      const paymentDetails: P2PPaymentDetails = {
        bankName: 'Bank Transfer',
        accountNumber: '****',
        accountHolder: seller.name,
        isLocked: true,
      };
      
      const uiOrder = toUIOrder(dbOrder, buyer, seller, paymentDetails);
      
      // Get messages for this order
      const orderMessages = db.messages[dbOrder.id] || [];
      const uiMessages = orderMessages.map(m => toUIMessage(m, user.id));
      
      if (chatMap.has(chatId)) {
        const chat = chatMap.get(chatId)!;
        chat.orders.push(uiOrder);
        chat.messages.push(...uiMessages);
        if (new Date(dbOrder.created_at) > chat.lastMessageTime) {
          chat.lastMessageTime = new Date(dbOrder.created_at);
        }
      } else {
        chatMap.set(chatId, {
          id: chatId,
          participantIds: [buyer.id, seller.id],
          buyer,
          seller,
          orders: [uiOrder],
          messages: uiMessages,
          createdAt: new Date(dbOrder.created_at),
          lastMessageTime: new Date(dbOrder.updated_at),
          unreadCount: 0,
          supportPresent: dbOrder.status === 'disputed',
        });
      }
    }

    setChats(Array.from(chatMap.values()));
  }, [user, db.orders, db.messages, db.getParticipants]);

  // Sync active chat/order when chats update
  useEffect(() => {
    if (activeChat) {
      const updated = chats.find(c => c.id === activeChat.id);
      if (updated) {
        setActiveChatState(updated);
        if (activeOrder) {
          const updatedOrder = updated.orders.find(o => o.id === activeOrder.id);
          if (updatedOrder) {
            setActiveOrderState(updatedOrder);
          }
        }
      }
    }
  }, [chats, activeChat?.id, activeOrder?.id]);

  // Get all orders
  const getAllOrders = useCallback((): P2POrder[] => {
    return chats.flatMap(c => c.orders);
  }, [chats]);

  // Check if user has an open order
  const hasOpenOrder = useCallback((): boolean => {
    const openStatuses: P2POrderStatus[] = ['created', 'waiting_payment', 'paid', 'dispute'];
    return getAllOrders().some(o => openStatuses.includes(o.status));
  }, [getAllOrders]);

  // Get cancellations in last 24 hours
  const getCancellationsIn24h = useCallback((): number => {
    return db.cancellationsCount;
  }, [db.cancellationsCount]);

  // Check if user is blocked
  const isBlockedFromOrders = useCallback((): boolean => {
    return getCancellationsIn24h() >= MAX_CANCELLATIONS_24H;
  }, [getCancellationsIn24h]);

  // Check if user can create order
  const canCreateOrder = useCallback((): { allowed: boolean; reason?: string } => {
    if (hasOpenOrder()) {
      return { 
        allowed: false, 
        reason: 'لديك طلب مفتوح بالفعل. أكمل الطلب الحالي أو ألغه أولاً.' 
      };
    }
    if (isBlockedFromOrders()) {
      return { 
        allowed: false, 
        reason: 'تم حظرك من إنشاء طلبات جديدة لمدة 24 ساعة بسبب تجاوز حد الإلغاءات.' 
      };
    }
    return { allowed: true };
  }, [hasOpenOrder, isBlockedFromOrders]);

  // Chat operations
  const getOrCreateChat = useCallback((buyer: P2PParticipant, seller: P2PParticipant): P2PChat => {
    const chatId = generateChatId(buyer.id, seller.id);
    const existing = chats.find(c => c.id === chatId);
    
    if (existing) return existing;

    const newChat: P2PChat = {
      id: chatId,
      participantIds: [buyer.id, seller.id],
      buyer,
      seller,
      orders: [],
      messages: [],
      createdAt: new Date(),
      lastMessageTime: new Date(),
      unreadCount: 0,
      supportPresent: false,
    };

    setChats(prev => [...prev, newChat]);
    return newChat;
  }, [chats]);

  const setActiveChat = useCallback((chatId: string | null) => {
    if (!chatId) {
      setActiveChatState(null);
      setActiveOrderState(null);
      return;
    }
    const chat = chats.find(c => c.id === chatId);
    setActiveChatState(chat || null);
    
    if (chat && chat.orders.length > 0) {
      const latestOrder = chat.orders[chat.orders.length - 1];
      setActiveOrderState(latestOrder);
      // Fetch messages for all orders in this chat
      chat.orders.forEach(o => db.fetchMessagesForOrder(o.id));
    }
  }, [chats, db]);

  const setActiveOrder = useCallback((orderId: string | null) => {
    if (!orderId) {
      setActiveOrderState(null);
      return;
    }
    for (const chat of chats) {
      const order = chat.orders.find(o => o.id === orderId);
      if (order) {
        setActiveOrderState(order);
        db.fetchMessagesForOrder(orderId);
        return;
      }
    }
  }, [chats, db]);

  const sendMessage = useCallback(async (chatId: string, content: string, _attachment?: P2PMessage['attachment']) => {
    if (!user) return;
    
    const chat = chats.find(c => c.id === chatId);
    if (!chat || chat.orders.length === 0) return;
    
    const latestOrder = chat.orders[chat.orders.length - 1];
    await db.sendMessage(latestOrder.id, content);
  }, [user, chats, db]);

  // Order operations
  const createOrder = useCallback((orderData: Omit<P2POrder, 'id' | 'createdAt' | 'expiresAt' | 'status'>): P2POrder | null => {
    const check = canCreateOrder();
    if (!check.allowed) return null;

    // Create in database
    db.createOrder({
      orderType: orderData.type,
      novaAmount: orderData.amount,
      localAmount: orderData.total,
      exchangeRate: orderData.price,
      country: orderData.seller.country || 'Saudi Arabia',
      timeLimitMinutes: 60,
    });

    // Return a temporary order object
    const tempOrder: P2POrder = {
      ...orderData,
      id: `temp-${Date.now()}`,
      status: 'created',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    };

    return tempOrder;
  }, [canCreateOrder, db]);

  const updateOrderStatus = useCallback(async (orderId: string, status: P2POrderStatus, reason?: string) => {
    const dbStatus: DBP2POrderStatus = 
      status === 'waiting_payment' ? 'awaiting_payment' :
      status === 'paid' ? 'payment_sent' :
      status === 'dispute' ? 'disputed' :
      status === 'released' ? 'completed' :
      status as DBP2POrderStatus;
    
    await db.cancelOrder(orderId, reason); // Generic update - will be refined
  }, [db]);

  // Buyer actions
  const confirmPayment = useCallback(async (orderId: string) => {
    await db.confirmPayment(orderId);
  }, [db]);

  const cancelOrder = useCallback(async (orderId: string): Promise<boolean> => {
    if (isBlockedFromOrders()) return false;
    return await db.cancelOrder(orderId);
  }, [db, isBlockedFromOrders]);

  const cancelOrderWithReason = useCallback(async (orderId: string, reason: string): Promise<boolean> => {
    if (isBlockedFromOrders()) return false;
    return await db.cancelOrder(orderId, reason);
  }, [db, isBlockedFromOrders]);

  const deleteOrder = useCallback(async (orderId: string): Promise<boolean> => {
    return await db.deleteOrder(orderId);
  }, [db]);

  const relistOrder = useCallback(async (orderId: string, reason: string): Promise<boolean> => {
    if (isBlockedFromOrders()) return false;
    return await db.relistOrder(orderId, reason);
  }, [db, isBlockedFromOrders]);

  const openDispute = useCallback(async (orderId: string, reason: string) => {
    await db.openDispute(orderId, reason);
  }, [db]);

  // Timer expiration
  const expireOrder = useCallback(async (orderId: string) => {
    await db.expireOrder(orderId);
  }, [db]);

  // Seller actions
  const releaseFunds = useCallback(async (orderId: string) => {
    await db.releaseFunds(orderId);
  }, [db]);

  const reportNoPayment = useCallback(async (orderId: string) => {
    await db.openDispute(orderId, 'Seller reports payment not received');
  }, [db]);

  // Mock mode triggers (no-op in database mode, but kept for interface compatibility)
  const triggerMockSellerConfirmation = useCallback((_orderId: string) => {
    // No-op in database mode - realtime will handle updates
  }, []);

  const triggerMockBuyerPayment = useCallback((_orderId: string) => {
    // No-op in database mode - realtime will handle updates
  }, []);

  // Support actions
  const joinDispute = useCallback((_orderId: string) => {
    // TODO: Implement support system
  }, []);

  const requestProof = useCallback((_orderId: string) => {
    // TODO: Implement support system
  }, []);

  const resolveDispute = useCallback(async (orderId: string, resolution: 'release_to_buyer' | 'return_to_seller') => {
    if (resolution === 'release_to_buyer') {
      await db.releaseFunds(orderId);
    } else {
      await db.cancelOrder(orderId, 'Dispute resolved - returned to seller');
    }
  }, [db]);

  // Rating
  const rateOrder = useCallback((orderId: string, _isPositive: boolean) => {
    setRatedOrders(prev => new Set(prev).add(orderId));
    // TODO: Implement rating in database
  }, []);

  const hasRatedOrder = useCallback((orderId: string): boolean => {
    return ratedOrders.has(orderId);
  }, [ratedOrders]);

  // Helpers
  const getOrdersByChat = useCallback((chatId: string): P2POrder[] => {
    const chat = chats.find(c => c.id === chatId);
    return chat?.orders || [];
  }, [chats]);

  const getChatByParticipants = useCallback((buyerId: string, sellerId: string): P2PChat | undefined => {
    const chatId = generateChatId(buyerId, sellerId);
    return chats.find(c => c.id === chatId);
  }, [chats]);

  const getOrderById = useCallback((orderId: string): P2POrder | undefined => {
    return chats.flatMap(c => c.orders).find(o => o.id === orderId);
  }, [chats]);

  return (
    <P2PContext.Provider
      value={{
        chats,
        activeChat,
        activeOrder,
        isLoading: db.isLoading,
        isMockMode: MOCK_MODE,
        hasOpenOrder,
        canCreateOrder,
        getCancellationsIn24h,
        isBlockedFromOrders,
        getOrCreateChat,
        setActiveChat,
        setActiveOrder,
        sendMessage,
        createOrder,
        updateOrderStatus,
        confirmPayment,
        cancelOrder,
        cancelOrderWithReason,
        deleteOrder,
        relistOrder,
        openDispute,
        expireOrder,
        releaseFunds,
        reportNoPayment,
        triggerMockSellerConfirmation,
        triggerMockBuyerPayment,
        joinDispute,
        requestProof,
        resolveDispute,
        rateOrder,
        hasRatedOrder,
        getOrdersByChat,
        getChatByParticipants,
        getOrderById,
      }}
    >
      {children}
    </P2PContext.Provider>
  );
}

export function useP2P() {
  const context = useContext(P2PContext);
  if (context === undefined) {
    throw new Error('useP2P must be used within a P2PProvider');
  }
  return context;
}

// Safe version that returns defaults when context is unavailable
export function useP2PSafe() {
  const context = useContext(P2PContext);
  return context ?? { chats: [] as P2PChat[], activeChat: null, activeOrder: null, isLoading: false };
}
