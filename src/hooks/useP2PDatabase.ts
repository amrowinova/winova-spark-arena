import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';
import { RealtimeChannel } from '@supabase/supabase-js';
import { dbStatusToUI, uiStatusToDB, isActiveStatus, DBP2POrderStatus, UIP2POrderStatus } from '@/lib/p2pStatusMapper';

// Extended order row with matched_at
interface P2POrderRowExtended {
  id: string;
  creator_id: string;
  executor_id: string | null;
  order_type: Database['public']['Enums']['p2p_order_type'];
  nova_amount: number;
  local_amount: number;
  exchange_rate: number;
  country: string;
  status: Database['public']['Enums']['p2p_order_status'];
  time_limit_minutes: number;
  payment_method_id: string | null;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  completed_at: string | null;
  matched_at: string | null; // NEW: When order was matched
  created_at: string;
  updated_at: string;
}

type P2POrderRow = Database['public']['Tables']['p2p_orders']['Row'];
type P2POrderInsert = Database['public']['Tables']['p2p_orders']['Insert'];
type P2POrderUpdate = Database['public']['Tables']['p2p_orders']['Update'];
type P2PMessageRow = Database['public']['Tables']['p2p_messages']['Row'];
type P2PMessageInsert = Database['public']['Tables']['p2p_messages']['Insert'];
type P2POrderType = Database['public']['Enums']['p2p_order_type'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

// Order with joined profile data and UI-compatible status
export interface P2POrderWithProfiles {
  id: string;
  creator_id: string;
  executor_id: string | null;
  order_type: Database['public']['Enums']['p2p_order_type'];
  nova_amount: number;
  local_amount: number;
  exchange_rate: number;
  country: string;
  status: DBP2POrderStatus;
  ui_status: UIP2POrderStatus;
  time_limit_minutes: number;
  payment_method_id: string | null;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  completed_at: string | null;
  matched_at: string | null; // When order was matched (timer starts here)
  created_at: string;
  updated_at: string;
  creator_profile?: ProfileRow | null;
  executor_profile?: ProfileRow | null;
}

// Participant interface for UI compatibility
export interface DBP2PParticipant {
  id: string;
  name: string;
  nameAr: string;
  username: string;
  avatar: string;
  rating: number;
  country: string;
}

// Convert profile to participant
function profileToParticipant(profile: ProfileRow | null, userId: string): DBP2PParticipant {
  if (!profile) {
    return {
      id: userId,
      name: 'User',
      nameAr: 'مستخدم',
      username: 'user',
      avatar: '👤',
      rating: 5.0,
      country: 'Unknown',
    };
  }
  
  return {
    id: profile.user_id,
    name: profile.name,
    nameAr: profile.name, // Use same name for now
    username: profile.username,
    avatar: profile.avatar_url || '👤',
    rating: 5.0, // TODO: Implement rating system
    country: profile.country,
  };
}

export function useP2PDatabase() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<P2POrderWithProfiles[]>([]);
  const [messages, setMessages] = useState<Record<string, P2PMessageRow[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isWalletFrozen, setIsWalletFrozen] = useState(false);
  
  // Track cancellations in last 24 hours
  const [cancellationsCount, setCancellationsCount] = useState(0);
  
  // Ref to track orders for realtime subscription
  const ordersRef = useRef<P2POrderWithProfiles[]>([]);
  ordersRef.current = orders;

  // Check if user's wallet is frozen
  const checkWalletFrozen = useCallback(async () => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('is_frozen')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      const frozen = data?.is_frozen ?? false;
      setIsWalletFrozen(frozen);
      return frozen;
    } catch (err) {
      console.error('Error checking wallet frozen status:', err);
      return false;
    }
  }, [user]);

  // Fetch user's orders with profiles
  const fetchOrders = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('p2p_orders')
        .select('*')
        .or(`creator_id.eq.${user.id},executor_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      
      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        return;
      }

      // Get unique user IDs
      const userIds = new Set<string>();
      ordersData.forEach(order => {
        userIds.add(order.creator_id);
        if (order.executor_id) userIds.add(order.executor_id);
      });

      // Fetch profiles for all users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', Array.from(userIds));

      if (profilesError) throw profilesError;

      // Create a map of user_id to profile
      const profilesMap = new Map<string, ProfileRow>();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.user_id, profile);
      });

      // Combine orders with profiles and UI status
      // Cast to extended type to access matched_at (column added but types not regenerated)
      const ordersWithProfiles: P2POrderWithProfiles[] = ordersData.map(order => {
        const extOrder = order as P2POrderRowExtended;
        return {
          id: order.id,
          creator_id: order.creator_id,
          executor_id: order.executor_id,
          order_type: order.order_type,
          nova_amount: order.nova_amount,
          local_amount: order.local_amount,
          exchange_rate: order.exchange_rate,
          country: order.country,
          status: order.status,
          ui_status: dbStatusToUI(order.status),
          time_limit_minutes: order.time_limit_minutes,
          payment_method_id: order.payment_method_id,
          cancellation_reason: order.cancellation_reason,
          cancelled_by: order.cancelled_by,
          completed_at: order.completed_at,
          matched_at: extOrder.matched_at || null,
          created_at: order.created_at,
          updated_at: order.updated_at,
          creator_profile: profilesMap.get(order.creator_id) || null,
          executor_profile: order.executor_id ? profilesMap.get(order.executor_id) || null : null,
        };
      });
      setOrders(ordersWithProfiles);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching P2P orders:', err);
    }
  }, [user]);

  // Fetch cancellations count in last 24 hours
  const fetchCancellationsCount = useCallback(async () => {
    if (!user) return;

    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { count, error } = await supabase
        .from('p2p_orders')
        .select('*', { count: 'exact', head: true })
        .eq('cancelled_by', user.id)
        .eq('status', 'cancelled')
        .gte('updated_at', twentyFourHoursAgo);

      if (error) throw error;
      setCancellationsCount(count || 0);
    } catch (err) {
      console.error('Error fetching cancellations count:', err);
    }
  }, [user]);

  // Fetch messages for a specific order
  const fetchMessagesForOrder = useCallback(async (orderId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('p2p_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      setMessages(prev => ({
        ...prev,
        [orderId]: data || [],
      }));
      
      return data || [];
    } catch (err) {
      console.error('Error fetching P2P messages:', err);
      return [];
    }
  }, [user]);

  // Create a new order
  const createOrder = useCallback(async (orderData: {
    orderType: P2POrderType;
    novaAmount: number;
    localAmount: number;
    exchangeRate: number;
    country: string;
    timeLimitMinutes: number;
    paymentMethodId?: string;
  }) => {
    if (!user) return null;

    // Check if wallet is frozen
    const frozen = await checkWalletFrozen();
    if (frozen) {
      console.error('Cannot create order: wallet is frozen');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('p2p_orders')
        .insert({
          creator_id: user.id,
          order_type: orderData.orderType,
          nova_amount: orderData.novaAmount,
          local_amount: orderData.localAmount,
          exchange_rate: orderData.exchangeRate,
          country: orderData.country,
          time_limit_minutes: orderData.timeLimitMinutes,
          payment_method_id: orderData.paymentMethodId,
          status: 'open',
        } as P2POrderInsert)
        .select()
        .single();

      if (error) throw error;
      
      // Add initial system message
      if (data) {
        await sendMessage(
          data.id,
          `Order #${data.id.slice(0, 8)} created`,
          `تم إنشاء الطلب #${data.id.slice(0, 8)}`,
          true,
          'status_change'
        );
      }
      
      // Refresh orders to get profile data
      fetchOrders();
      
      return data;
    } catch (err) {
      console.error('Error creating P2P order:', err);
      return null;
    }
  }, [user, fetchOrders, checkWalletFrozen]);

  // Execute/match an order (buyer/seller accepts)
  const executeOrder = useCallback(async (orderId: string) => {
    if (!user) return false;

    // Check if wallet is frozen
    const frozen = await checkWalletFrozen();
    if (frozen) {
      console.error('Cannot execute order: wallet is frozen');
      return false;
    }

    try {
      const { error } = await supabase
        .from('p2p_orders')
        .update({
          executor_id: user.id,
          status: 'awaiting_payment',
        } as P2POrderUpdate)
        .eq('id', orderId)
        .eq('status', 'open');

      if (error) throw error;
      
      // Add system message
      await sendMessage(
        orderId,
        'Order matched - Awaiting payment',
        'تم تأكيد الطلب - بانتظار الدفع',
        true,
        'status_change'
      );
      
      // Refresh orders
      fetchOrders();
      
      return true;
    } catch (err) {
      console.error('Error executing P2P order:', err);
      return false;
    }
  }, [user, fetchOrders, checkWalletFrozen]);

  // Confirm payment (buyer marks as paid)
  const confirmPayment = useCallback(async (orderId: string) => {
    if (!user) return false;

    // Check if wallet is frozen
    const frozen = await checkWalletFrozen();
    if (frozen) {
      console.error('Cannot confirm payment: wallet is frozen');
      return false;
    }

    try {
      const { error } = await supabase
        .from('p2p_orders')
        .update({ status: 'payment_sent' } as P2POrderUpdate)
        .eq('id', orderId)
        .in('status', ['awaiting_payment', 'matched']);

      if (error) throw error;
      
      // Add system message
      await sendMessage(
        orderId,
        '🟡 Payment confirmed - Waiting for seller to confirm receipt',
        '🟡 تم تأكيد الدفع من المشتري - بانتظار تأكيد البائع لتحرير Nova',
        true,
        'payment_confirmed'
      );
      
      fetchOrders();
      return true;
    } catch (err) {
      console.error('Error confirming payment:', err);
      return false;
    }
  }, [user, fetchOrders, checkWalletFrozen]);

  // Release funds (seller confirms receipt)
  const releaseFunds = useCallback(async (orderId: string) => {
    if (!user) return false;

    // Check if wallet is frozen
    const frozen = await checkWalletFrozen();
    if (frozen) {
      console.error('Cannot release funds: wallet is frozen');
      return false;
    }

    try {
      const order = ordersRef.current.find(o => o.id === orderId);
      
      const { error } = await supabase
        .from('p2p_orders')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        } as P2POrderUpdate)
        .eq('id', orderId)
        .eq('status', 'payment_sent');

      if (error) throw error;
      
      // Add system messages
      await sendMessage(
        orderId,
        `✅ ${order?.nova_amount || 0} Nova released successfully!`,
        `✅ تم تحرير ${order?.nova_amount || 0} Nova بنجاح!`,
        true,
        'released'
      );
      
      fetchOrders();
      return true;
    } catch (err) {
      console.error('Error releasing funds:', err);
      return false;
    }
  }, [user, fetchOrders, checkWalletFrozen]);

  // Cancel order
  const cancelOrder = useCallback(async (orderId: string, reason?: string) => {
    if (!user) return false;

    // Check cancellation limit
    if (cancellationsCount >= 3) {
      console.error('Cancellation limit exceeded');
      return false;
    }

    try {
      const update: P2POrderUpdate = {
        status: 'cancelled',
        cancelled_by: user.id,
        cancellation_reason: reason || 'User cancelled',
      };

      const { error } = await supabase
        .from('p2p_orders')
        .update(update)
        .eq('id', orderId)
        .in('status', ['open', 'matched', 'awaiting_payment']);

      if (error) throw error;
      
      // Add system message
      await sendMessage(
        orderId,
        `❌ Order cancelled${reason ? `: ${reason}` : ''}\n🛈 You can continue chatting.`,
        `❌ تم إلغاء الطلب${reason ? `: ${reason}` : ''}\n🛈 يمكنكما متابعة الدردشة.`,
        true,
        'order_cancelled'
      );
      
      // Refresh
      fetchOrders();
      fetchCancellationsCount();
      
      return true;
    } catch (err) {
      console.error('Error cancelling order:', err);
      return false;
    }
  }, [user, cancellationsCount, fetchOrders, fetchCancellationsCount]);

  // Open dispute
  const openDispute = useCallback(async (orderId: string, reason: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('p2p_orders')
        .update({
          status: 'disputed',
          cancellation_reason: reason, // Using this field for dispute reason
        } as P2POrderUpdate)
        .eq('id', orderId);

      if (error) throw error;
      
      // Add system message
      await sendMessage(
        orderId,
        `⚖️ Dispute opened: ${reason}`,
        `⚖️ تم فتح نزاع: ${reason}`,
        true,
        'dispute_opened'
      );
      
      fetchOrders();
      return true;
    } catch (err) {
      console.error('Error opening dispute:', err);
      return false;
    }
  }, [user, fetchOrders]);

  // Send a message
  const sendMessage = useCallback(async (
    orderId: string,
    content: string,
    contentAr?: string,
    isSystemMessage = false,
    messageType = 'text'
  ) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('p2p_messages')
        .insert({
          order_id: orderId,
          sender_id: user.id,
          content,
          content_ar: contentAr,
          is_system_message: isSystemMessage,
          message_type: messageType,
        } as P2PMessageInsert)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error sending P2P message:', err);
      return null;
    }
  }, [user]);

  // Fetch open orders (marketplace)
  const fetchOpenOrders = useCallback(async (country?: string) => {
    try {
      let query = supabase
        .from('p2p_orders')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (country) {
        query = query.eq('country', country);
      }

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) throw ordersError;
      
      if (!ordersData || ordersData.length === 0) {
        return [];
      }

      // Get unique creator IDs
      const creatorIds = [...new Set(ordersData.map(o => o.creator_id))];

      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', creatorIds);

      if (profilesError) throw profilesError;

      // Create a map
      const profilesMap = new Map<string, ProfileRow>();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.user_id, profile);
      });

      // Combine
      const ordersWithProfiles: P2POrderWithProfiles[] = ordersData.map(order => ({
        ...order,
        ui_status: dbStatusToUI(order.status),
        creator_profile: profilesMap.get(order.creator_id) || null,
        executor_profile: null,
      }));

      return ordersWithProfiles;
    } catch (err) {
      console.error('Error fetching open P2P orders:', err);
      return [];
    }
  }, []);

  // Check if user has an active order
  const checkHasActiveOrder = useCallback(async () => {
    if (!user) return false;

    try {
      const { count, error } = await supabase
        .from('p2p_orders')
        .select('*', { count: 'exact', head: true })
        .or(`creator_id.eq.${user.id},executor_id.eq.${user.id}`)
        .in('status', ['open', 'matched', 'awaiting_payment', 'payment_sent', 'disputed']);

      if (error) throw error;
      return (count || 0) > 0;
    } catch (err) {
      console.error('Error checking active orders:', err);
      return false;
    }
  }, [user]);

  // Get participant from order
  const getParticipants = useCallback((order: P2POrderWithProfiles) => {
    const creator = profileToParticipant(order.creator_profile, order.creator_id);
    const executor = order.executor_id 
      ? profileToParticipant(order.executor_profile, order.executor_id)
      : null;
    
    // For buy orders: creator is buyer, executor is seller
    // For sell orders: creator is seller, executor is buyer
    if (order.order_type === 'buy') {
      return {
        buyer: creator,
        seller: executor || creator, // Fallback to creator if no executor yet
      };
    } else {
      return {
        buyer: executor || creator,
        seller: creator,
      };
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (user) {
      setIsLoading(true);
      Promise.all([fetchOrders(), fetchCancellationsCount(), checkWalletFrozen()])
        .finally(() => setIsLoading(false));
    } else {
      setOrders([]);
      setMessages({});
      setIsLoading(false);
      setIsWalletFrozen(false);
    }
  }, [user, fetchOrders, fetchCancellationsCount, checkWalletFrozen]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;

    let ordersChannel: RealtimeChannel;
    let messagesChannel: RealtimeChannel;

    // Subscribe to orders changes
    ordersChannel = supabase
      .channel('p2p_orders_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'p2p_orders',
        },
        (payload) => {
          const changedOrder = payload.new as P2POrderRow | undefined;
          const oldOrder = payload.old as P2POrderRow | undefined;
          
          // Check if this order involves the current user
          const isRelevant = changedOrder?.creator_id === user.id || 
                            changedOrder?.executor_id === user.id ||
                            oldOrder?.creator_id === user.id ||
                            oldOrder?.executor_id === user.id;
          
          if (isRelevant) {
            fetchOrders();
          }
        }
      )
      .subscribe();

    // Subscribe to messages changes
    messagesChannel = supabase
      .channel('p2p_messages_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'p2p_messages',
        },
        (payload) => {
          const newMessage = payload.new as P2PMessageRow;
          // Check if this message belongs to one of user's orders
          const belongsToUser = ordersRef.current.some(o => o.id === newMessage.order_id);
          if (belongsToUser) {
            setMessages(prev => ({
              ...prev,
              [newMessage.order_id]: [...(prev[newMessage.order_id] || []), newMessage],
            }));
          }
        }
      )
      .subscribe();

    return () => {
      ordersChannel?.unsubscribe();
      messagesChannel?.unsubscribe();
    };
  }, [user, fetchOrders]);

  return {
    orders,
    messages,
    isLoading,
    error,
    cancellationsCount,
    isWalletFrozen,
    // Actions
    fetchOrders,
    fetchMessagesForOrder,
    createOrder,
    executeOrder,
    confirmPayment,
    releaseFunds,
    cancelOrder,
    openDispute,
    sendMessage,
    fetchOpenOrders,
    checkHasActiveOrder,
    checkWalletFrozen,
    // Helpers
    getParticipants,
    profileToParticipant,
  };
}
