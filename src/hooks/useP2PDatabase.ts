import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';
import { RealtimeChannel } from '@supabase/supabase-js';

type P2POrderRow = Database['public']['Tables']['p2p_orders']['Row'];
type P2POrderInsert = Database['public']['Tables']['p2p_orders']['Insert'];
type P2POrderUpdate = Database['public']['Tables']['p2p_orders']['Update'];
type P2PMessageRow = Database['public']['Tables']['p2p_messages']['Row'];
type P2PMessageInsert = Database['public']['Tables']['p2p_messages']['Insert'];
type P2POrderStatus = Database['public']['Enums']['p2p_order_status'];
type P2POrderType = Database['public']['Enums']['p2p_order_type'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

// Order with joined profile data
export interface P2POrderWithProfiles extends P2POrderRow {
  creator_profile?: ProfileRow | null;
  executor_profile?: ProfileRow | null;
}

export function useP2PDatabase() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<P2POrderWithProfiles[]>([]);
  const [messages, setMessages] = useState<Record<string, P2PMessageRow[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch user's orders with profiles
  const fetchOrders = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch orders first
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

      // Combine orders with profiles
      const ordersWithProfiles: P2POrderWithProfiles[] = ordersData.map(order => ({
        ...order,
        creator_profile: profilesMap.get(order.creator_id) || null,
        executor_profile: order.executor_id ? profilesMap.get(order.executor_id) || null : null,
      }));

      setOrders(ordersWithProfiles);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching P2P orders:', err);
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
    } catch (err) {
      console.error('Error fetching P2P messages:', err);
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
      
      // Refresh orders to get profile data
      fetchOrders();
      
      return data;
    } catch (err) {
      console.error('Error creating P2P order:', err);
      return null;
    }
  }, [user, fetchOrders]);

  // Match/execute an order
  const executeOrder = useCallback(async (orderId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('p2p_orders')
        .update({
          executor_id: user.id,
          status: 'matched',
        } as P2POrderUpdate)
        .eq('id', orderId)
        .eq('status', 'open');

      if (error) throw error;
      
      // Refresh orders
      fetchOrders();
      
      return true;
    } catch (err) {
      console.error('Error executing P2P order:', err);
      return false;
    }
  }, [user, fetchOrders]);

  // Update order status
  const updateOrderStatus = useCallback(async (
    orderId: string, 
    status: P2POrderStatus,
    cancellationReason?: string
  ) => {
    if (!user) return false;

    try {
      const update: P2POrderUpdate = { status };
      
      if (status === 'cancelled' && cancellationReason) {
        update.cancellation_reason = cancellationReason;
        update.cancelled_by = user.id;
      }
      
      if (status === 'completed') {
        update.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('p2p_orders')
        .update(update)
        .eq('id', orderId);

      if (error) throw error;
      
      // Refresh orders
      fetchOrders();
      
      return true;
    } catch (err) {
      console.error('Error updating P2P order status:', err);
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

  // Get open orders (marketplace)
  const fetchOpenOrders = useCallback(async (country?: string) => {
    try {
      // Fetch open orders
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
        creator_profile: profilesMap.get(order.creator_id) || null,
        executor_profile: null,
      }));

      return ordersWithProfiles;
    } catch (err) {
      console.error('Error fetching open P2P orders:', err);
      return [];
    }
  }, []);

  // Check if user has an open order
  const hasOpenOrder = useCallback(async () => {
    if (!user) return false;

    try {
      const { count, error } = await supabase
        .from('p2p_orders')
        .select('*', { count: 'exact', head: true })
        .or(`creator_id.eq.${user.id},executor_id.eq.${user.id}`)
        .in('status', ['open', 'matched', 'awaiting_payment', 'payment_sent']);

      if (error) throw error;
      return (count || 0) > 0;
    } catch (err) {
      console.error('Error checking open orders:', err);
      return false;
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (user) {
      setIsLoading(true);
      fetchOrders().finally(() => setIsLoading(false));
    } else {
      setOrders([]);
      setMessages({});
      setIsLoading(false);
    }
  }, [user, fetchOrders]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;

    let ordersChannel: RealtimeChannel;
    let messagesChannel: RealtimeChannel;

    // Subscribe to orders changes
    ordersChannel = supabase
      .channel('p2p_orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'p2p_orders',
          filter: `creator_id=eq.${user.id}`,
        },
        () => {
          fetchOrders();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'p2p_orders',
          filter: `executor_id=eq.${user.id}`,
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    // Subscribe to messages changes for user's orders
    messagesChannel = supabase
      .channel('p2p_messages_changes')
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
          const belongsToUser = orders.some(o => o.id === newMessage.order_id);
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
  }, [user, fetchOrders, orders]);

  return {
    orders,
    messages,
    isLoading,
    error,
    fetchOrders,
    fetchMessagesForOrder,
    createOrder,
    executeOrder,
    updateOrderStatus,
    sendMessage,
    fetchOpenOrders,
    hasOpenOrder,
  };
}
