import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Receipt } from '@/contexts/TransactionContext';

// Order statuses matching the spec
export type P2POrderStatus = 
  | 'created'
  | 'waiting_payment'
  | 'paid'
  | 'released'
  | 'completed'
  | 'dispute'
  | 'cancelled'
  | 'expired';

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
  isLocked: boolean; // Locked after creation
}

export interface P2PSystemMessage {
  id: string;
  type: 'status_change' | 'payment_confirmed' | 'released' | 'dispute_opened' | 'support_joined' | 'support_message' | 'dispute_resolved';
  content: string;
  contentAr: string;
  time: string;
  orderId: string;
  // For dispute-related messages
  supportAction?: 'request_proof' | 'release_to_buyer' | 'return_to_seller' | 'resolved';
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
  // Optional file/image
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
  receipt?: Receipt;
  disputeReason?: string;
  supportJoined?: boolean;
}

export interface P2PChat {
  id: string;
  // Chat is identified by buyer+seller pair, not order
  participantIds: [string, string]; // [buyerId, sellerId]
  buyer: P2PParticipant;
  seller: P2PParticipant;
  orders: P2POrder[]; // Multiple orders in same chat
  messages: P2PMessage[];
  createdAt: Date;
  lastMessageTime: Date;
  unreadCount: number;
  supportPresent: boolean;
}

// Generate chat ID from participant IDs (sorted for consistency)
export const generateChatId = (buyerId: string, sellerId: string): string => {
  const sorted = [buyerId, sellerId].sort();
  return `p2p-${sorted[0]}-${sorted[1]}`;
};

// Cancellation tracking
interface CancellationRecord {
  timestamp: Date;
}

interface P2PContextType {
  chats: P2PChat[];
  activeChat: P2PChat | null;
  activeOrder: P2POrder | null;
  
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
  cancelOrder: (orderId: string) => boolean; // Returns false if blocked
  openDispute: (orderId: string, reason: string) => void;
  
  // Seller actions
  releaseFunds: (orderId: string) => void;
  reportNoPayment: (orderId: string) => void;
  
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

function generateOrderId(): string {
  return `P2P-${Date.now().toString(36).toUpperCase()}`;
}

function getTimeString(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Mock initial data
const mockBuyer: P2PParticipant = {
  id: '1',
  name: 'Ahmed',
  nameAr: 'أحمد',
  username: 'ahmed_sa',
  avatar: '👤',
  rating: 4.9,
  country: 'Saudi Arabia',
};

const mockSeller: P2PParticipant = {
  id: '2',
  name: 'Khalid Mohammed',
  nameAr: 'خالد محمد',
  username: 'khalid_m',
  avatar: '👨',
  rating: 4.8,
  country: 'Saudi Arabia',
};

const mockOrder: P2POrder = {
  id: 'P2P-ABC123',
  type: 'buy',
  amount: 100,
  price: 3.75,
  total: 375,
  currency: 'SAR',
  currencySymbol: 'ر.س',
  seller: mockSeller,
  buyer: mockBuyer,
  status: 'waiting_payment',
  createdAt: new Date(Date.now() - 30 * 60 * 1000),
  expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  paymentDetails: {
    bankName: 'Al Rajhi Bank',
    accountNumber: 'SA0000000000000000000',
    accountHolder: 'خالد محمد',
    isLocked: true,
  },
};

const initialChats: P2PChat[] = [
  {
    id: generateChatId(mockBuyer.id, mockSeller.id),
    participantIds: [mockBuyer.id, mockSeller.id],
    buyer: mockBuyer,
    seller: mockSeller,
    orders: [mockOrder],
    messages: [
      {
        id: 'sys-1',
        senderId: 'system',
        senderName: 'System',
        content: '',
        time: '10:00 AM',
        isMine: false,
        isSystem: true,
        systemMessage: {
          id: 'sys-1',
          type: 'status_change',
          content: 'Order created - Waiting for payment',
          contentAr: 'تم إنشاء الطلب - بانتظار الدفع',
          time: '10:00 AM',
          orderId: mockOrder.id,
        },
      },
      {
        id: 'msg-1',
        senderId: mockSeller.id,
        senderName: mockSeller.nameAr,
        content: 'مرحباً، حوّل على الحساب البنكي المذكور أعلاه',
        time: '10:05 AM',
        isMine: false,
      },
      {
        id: 'msg-2',
        senderId: mockBuyer.id,
        senderName: mockBuyer.nameAr,
        content: 'تمام، سأحول الآن',
        time: '10:10 AM',
        isMine: true,
      },
    ],
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
    lastMessageTime: new Date(Date.now() - 10 * 60 * 1000),
    unreadCount: 1,
    supportPresent: false,
  },
];

const MAX_CANCELLATIONS_24H = 3;
const BLOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function P2PProvider({ children }: { children: ReactNode }) {
  const [chats, setChats] = useState<P2PChat[]>(initialChats);
  const [activeChat, setActiveChatState] = useState<P2PChat | null>(null);
  const [activeOrder, setActiveOrderState] = useState<P2POrder | null>(null);
  
  // Track cancellations in last 24 hours
  const [cancellations, setCancellations] = useState<CancellationRecord[]>([]);
  // Track rated orders
  const [ratedOrders, setRatedOrders] = useState<Set<string>>(new Set());
  
  // Get all orders from all chats
  const getAllOrders = (): P2POrder[] => {
    return chats.flatMap(c => c.orders);
  };
  
  // Check if user has an open order (not completed or cancelled)
  const hasOpenOrder = (): boolean => {
    const openStatuses: P2POrderStatus[] = ['created', 'waiting_payment', 'paid', 'released', 'dispute'];
    return getAllOrders().some(o => openStatuses.includes(o.status));
  };
  
  // Get cancellations in last 24 hours
  const getCancellationsIn24h = (): number => {
    const now = new Date();
    const validCancellations = cancellations.filter(
      c => (now.getTime() - c.timestamp.getTime()) < BLOCK_DURATION_MS
    );
    return validCancellations.length;
  };
  
  // Check if user is blocked from creating orders
  const isBlockedFromOrders = (): boolean => {
    return getCancellationsIn24h() >= MAX_CANCELLATIONS_24H;
  };
  
  // Check if user can create a new order
  const canCreateOrder = (): { allowed: boolean; reason?: string } => {
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
  };

  const getOrCreateChat = (buyer: P2PParticipant, seller: P2PParticipant): P2PChat => {
    const chatId = generateChatId(buyer.id, seller.id);
    const existingChat = chats.find(c => c.id === chatId);
    
    if (existingChat) {
      return existingChat;
    }

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
  };

  const setActiveChat = (chatId: string | null) => {
    if (!chatId) {
      setActiveChatState(null);
      setActiveOrderState(null);
      return;
    }
    const chat = chats.find(c => c.id === chatId);
    setActiveChatState(chat || null);
    // Set the latest order as active by default
    if (chat && chat.orders.length > 0) {
      const latestOrder = chat.orders[chat.orders.length - 1];
      setActiveOrderState(latestOrder);
    }
  };

  const setActiveOrder = (orderId: string | null) => {
    if (!orderId) {
      setActiveOrderState(null);
      return;
    }
    for (const chat of chats) {
      const order = chat.orders.find(o => o.id === orderId);
      if (order) {
        setActiveOrderState(order);
        return;
      }
    }
  };

  const addSystemMessage = (chatId: string, sysMsg: P2PSystemMessage) => {
    const message: P2PMessage = {
      id: `sys-${Date.now()}`,
      senderId: 'system',
      senderName: 'System',
      content: '',
      time: getTimeString(),
      isMine: false,
      isSystem: true,
      systemMessage: sysMsg,
    };

    setChats(prev =>
      prev.map(c =>
        c.id === chatId
          ? { ...c, messages: [...c.messages, message], lastMessageTime: new Date() }
          : c
      )
    );

    if (activeChat?.id === chatId) {
      setActiveChatState(prev =>
        prev ? { ...prev, messages: [...prev.messages, message] } : prev
      );
    }
  };

  const sendMessage = (chatId: string, content: string, attachment?: P2PMessage['attachment']) => {
    const message: P2PMessage = {
      id: `msg-${Date.now()}`,
      senderId: mockBuyer.id, // Current user
      senderName: mockBuyer.nameAr,
      content,
      time: getTimeString(),
      isMine: true,
      attachment,
    };

    setChats(prev =>
      prev.map(c =>
        c.id === chatId
          ? { ...c, messages: [...c.messages, message], lastMessageTime: new Date() }
          : c
      )
    );

    if (activeChat?.id === chatId) {
      setActiveChatState(prev =>
        prev ? { ...prev, messages: [...prev.messages, message] } : prev
      );
    }
  };

  const createOrder = (orderData: Omit<P2POrder, 'id' | 'createdAt' | 'expiresAt' | 'status'>): P2POrder | null => {
    // Check if user can create order
    const check = canCreateOrder();
    if (!check.allowed) {
      return null;
    }
    
    const order: P2POrder = {
      ...orderData,
      id: generateOrderId(),
      status: 'created',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    };

    const chat = getOrCreateChat(orderData.buyer, orderData.seller);
    
    setChats(prev =>
      prev.map(c =>
        c.id === chat.id
          ? { ...c, orders: [...c.orders, order] }
          : c
      )
    );

    // Add system message
    addSystemMessage(chat.id, {
      id: `sys-${Date.now()}`,
      type: 'status_change',
      content: `Order #${order.id} created`,
      contentAr: `تم إنشاء الطلب #${order.id}`,
      time: getTimeString(),
      orderId: order.id,
    });

    return order;
  };

  const updateOrderStatus = (orderId: string, status: P2POrderStatus, reason?: string) => {
    setChats(prev =>
      prev.map(chat => ({
        ...chat,
        orders: chat.orders.map(o =>
          o.id === orderId
            ? { ...o, status, disputeReason: reason }
            : o
        ),
      }))
    );

    if (activeOrder?.id === orderId) {
      setActiveOrderState(prev =>
        prev ? { ...prev, status, disputeReason: reason } : prev
      );
    }
  };

  // Buyer actions
  const confirmPayment = (orderId: string) => {
    updateOrderStatus(orderId, 'paid');
    
    const chat = chats.find(c => c.orders.some(o => o.id === orderId));
    if (chat) {
      addSystemMessage(chat.id, {
        id: `sys-${Date.now()}`,
        type: 'payment_confirmed',
        content: 'Payment confirmed by buyer - Waiting for seller to release',
        contentAr: 'تم تأكيد الدفع من المشتري - بانتظار البائع لتحرير العملات',
        time: getTimeString(),
        orderId,
      });
    }
  };

  const cancelOrder = (orderId: string): boolean => {
    // Check if user has exceeded cancellation limit
    if (isBlockedFromOrders()) {
      return false;
    }
    
    const order = chats.flatMap(c => c.orders).find(o => o.id === orderId);
    if (order && (order.status === 'created' || order.status === 'waiting_payment')) {
      updateOrderStatus(orderId, 'cancelled');
      
      // Track the cancellation
      setCancellations(prev => [...prev, { timestamp: new Date() }]);
      
      const chat = chats.find(c => c.orders.some(o => o.id === orderId));
      if (chat) {
        addSystemMessage(chat.id, {
          id: `sys-${Date.now()}`,
          type: 'status_change',
          content: 'Order cancelled',
          contentAr: 'تم إلغاء الطلب',
          time: getTimeString(),
          orderId,
        });
      }
      return true;
    }
    return false;
  };

  const openDispute = (orderId: string, reason: string) => {
    updateOrderStatus(orderId, 'dispute', reason);
    
    const chat = chats.find(c => c.orders.some(o => o.id === orderId));
    if (chat) {
      addSystemMessage(chat.id, {
        id: `sys-${Date.now()}`,
        type: 'dispute_opened',
        content: `Dispute opened: ${reason}`,
        contentAr: `تم فتح نزاع: ${reason}`,
        time: getTimeString(),
        orderId,
      });
      
      // Auto-join support
      setTimeout(() => joinDispute(orderId), 1000);
    }
  };

  // Seller actions
  const releaseFunds = (orderId: string) => {
    updateOrderStatus(orderId, 'released');
    
    const chat = chats.find(c => c.orders.some(o => o.id === orderId));
    const order = chat?.orders.find(o => o.id === orderId);
    
    if (chat && order) {
      addSystemMessage(chat.id, {
        id: `sys-${Date.now()}`,
        type: 'released',
        content: `✅ ${order.amount.toFixed(3)} Nova released successfully!`,
        contentAr: `✅ تم تحرير ${order.amount.toFixed(3)} Nova بنجاح!`,
        time: getTimeString(),
        orderId,
      });
      
      // Mark as completed after release
      setTimeout(() => updateOrderStatus(orderId, 'completed'), 500);
    }
  };

  const reportNoPayment = (orderId: string) => {
    openDispute(orderId, 'Seller reports payment not received');
  };

  // Support actions
  const joinDispute = (orderId: string) => {
    const chat = chats.find(c => c.orders.some(o => o.id === orderId));
    if (chat) {
      setChats(prev =>
        prev.map(c =>
          c.id === chat.id
            ? { 
                ...c, 
                supportPresent: true,
                orders: c.orders.map(o =>
                  o.id === orderId ? { ...o, supportJoined: true } : o
                )
              }
            : c
        )
      );

      addSystemMessage(chat.id, {
        id: `sys-${Date.now()}`,
        type: 'support_joined',
        content: '🛡️ Support team has joined the chat',
        contentAr: '🛡️ انضم فريق الدعم للمحادثة',
        time: getTimeString(),
        orderId,
      });
    }
  };

  const requestProof = (orderId: string) => {
    const chat = chats.find(c => c.orders.some(o => o.id === orderId));
    if (chat) {
      addSystemMessage(chat.id, {
        id: `sys-${Date.now()}`,
        type: 'support_message',
        content: '📋 Support requests proof of payment from both parties',
        contentAr: '📋 يطلب الدعم إثبات الدفع من الطرفين',
        time: getTimeString(),
        orderId,
        supportAction: 'request_proof',
      });
    }
  };

  const resolveDispute = (orderId: string, resolution: 'release_to_buyer' | 'return_to_seller') => {
    const newStatus: P2POrderStatus = resolution === 'release_to_buyer' ? 'completed' : 'cancelled';
    updateOrderStatus(orderId, newStatus);
    
    const chat = chats.find(c => c.orders.some(o => o.id === orderId));
    if (chat) {
      addSystemMessage(chat.id, {
        id: `sys-${Date.now()}`,
        type: 'dispute_resolved',
        content: resolution === 'release_to_buyer' 
          ? '✅ Dispute resolved - Funds released to buyer'
          : '🔙 Dispute resolved - Funds returned to seller',
        contentAr: resolution === 'release_to_buyer'
          ? '✅ تم حل النزاع - تحرير العملات للمشتري'
          : '🔙 تم حل النزاع - إعادة العملات للبائع',
        time: getTimeString(),
        orderId,
        supportAction: resolution,
      });
    }
  };

  // Rating
  const rateOrder = (orderId: string, isPositive: boolean) => {
    setRatedOrders(prev => new Set(prev).add(orderId));
    // In a real app, this would call an API to save the rating
    console.log(`Rated order ${orderId}: ${isPositive ? 'positive' : 'negative'}`);
  };

  const hasRatedOrder = (orderId: string): boolean => {
    return ratedOrders.has(orderId);
  };

  // Helpers
  const getOrdersByChat = (chatId: string): P2POrder[] => {
    const chat = chats.find(c => c.id === chatId);
    return chat?.orders || [];
  };

  const getChatByParticipants = (buyerId: string, sellerId: string): P2PChat | undefined => {
    const chatId = generateChatId(buyerId, sellerId);
    return chats.find(c => c.id === chatId);
  };

  const getOrderById = (orderId: string): P2POrder | undefined => {
    return chats.flatMap(c => c.orders).find(o => o.id === orderId);
  };

  return (
    <P2PContext.Provider
      value={{
        chats,
        activeChat,
        activeOrder,
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
        openDispute,
        releaseFunds,
        reportNoPayment,
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
