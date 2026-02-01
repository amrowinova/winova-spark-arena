import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';
import { RealtimeChannel } from '@supabase/supabase-js';
import { dbStatusToUI } from '@/lib/p2pStatusMapper';


type P2POrderRow = Database['public']['Tables']['p2p_orders']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type P2POrderType = Database['public']['Enums']['p2p_order_type'];

export interface MarketplaceOrder {
  id: string;
  creatorId: string;
  orderType: P2POrderType;
  novaAmount: number;
  localAmount: number;
  exchangeRate: number;
  country: string;
  timeLimitMinutes: number;
  createdAt: string;
  // Creator profile info
  creatorName: string;
  creatorUsername: string;
  creatorAvatar: string;
  creatorCountry: string;
  // Computed
  currencySymbol: string;
  rating: number;
  completedTrades: number;
}

// Currency info by country
const COUNTRY_CURRENCIES: Record<string, { code: string; symbol: string }> = {
  'Saudi Arabia': { code: 'SAR', symbol: 'ر.س' },
  'UAE': { code: 'AED', symbol: 'د.إ' },
  'Egypt': { code: 'EGP', symbol: 'ج.م' },
  'Morocco': { code: 'MAD', symbol: 'د.م' },
  'Turkey': { code: 'TRY', symbol: '₺' },
  'Pakistan': { code: 'PKR', symbol: 'Rs' },
  'Germany': { code: 'EUR', symbol: '€' },
  'USA': { code: 'USD', symbol: '$' },
};

function getCurrencySymbol(country: string): string {
  return COUNTRY_CURRENCIES[country]?.symbol || '💵';
}

export function useP2PMarketplace(selectedCountry?: string) {
  const { user } = useAuth();
  const [buyOrders, setBuyOrders] = useState<MarketplaceOrder[]>([]); // Users want to buy Nova (you sell)
  const [sellOrders, setSellOrders] = useState<MarketplaceOrder[]>([]); // Users want to sell Nova (you buy)
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch open orders from marketplace
  const fetchOpenOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('p2p_orders')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      // Optionally filter by country
      if (selectedCountry) {
        query = query.eq('country', selectedCountry);
      }

      // Exclude user's own orders
      if (user) {
        query = query.neq('creator_id', user.id);
      }

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) throw ordersError;

      if (!ordersData || ordersData.length === 0) {
        setBuyOrders([]);
        setSellOrders([]);
        setIsLoading(false);
        return;
      }

      // Get unique creator IDs
      const creatorIds = [...new Set(ordersData.map(o => o.creator_id))];

      // Fetch profiles for creators
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', creatorIds);

      if (profilesError) throw profilesError;

      // Create profile map
      const profilesMap = new Map<string, ProfileRow>();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.user_id, profile);
      });

      // Transform orders
      const marketplaceOrders: MarketplaceOrder[] = ordersData.map(order => {
        const profile = profilesMap.get(order.creator_id);
        return {
          id: order.id,
          creatorId: order.creator_id,
          orderType: order.order_type,
          novaAmount: Number(order.nova_amount),
          localAmount: Number(order.local_amount),
          exchangeRate: Number(order.exchange_rate),
          country: order.country,
          timeLimitMinutes: order.time_limit_minutes,
          createdAt: order.created_at,
          creatorName: profile?.name || 'User',
          creatorUsername: profile?.username || 'unknown',
          creatorAvatar: profile?.avatar_url || '👤',
          creatorCountry: profile?.country || order.country,
          currencySymbol: getCurrencySymbol(order.country),
          rating: 5.0, // TODO: Implement rating system
          completedTrades: 0, // TODO: Track completed trades
        };
      });

      // Separate by order type
      // buy orders = user wants to buy Nova, so YOU can sell to them
      // sell orders = user wants to sell Nova, so YOU can buy from them
      const buy = marketplaceOrders.filter(o => o.orderType === 'buy');
      const sell = marketplaceOrders.filter(o => o.orderType === 'sell');

      setBuyOrders(buy);
      setSellOrders(sell);
    } catch (err) {
      console.error('Error fetching marketplace orders:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedCountry]);

  // Initial fetch
  useEffect(() => {
    fetchOpenOrders();
  }, [fetchOpenOrders]);

  // Realtime subscription for open orders
  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel('marketplace-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'p2p_orders',
          filter: 'status=eq.open',
        },
        (payload) => {
          console.log('Marketplace order change:', payload);
          // Refetch on any change to open orders
          fetchOpenOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOpenOrders]);

  // Also listen for status changes (order becoming open or no longer open)
  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel('marketplace-orders-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'p2p_orders',
        },
        (payload) => {
          const newStatus = (payload.new as P2POrderRow).status;
          const oldStatus = (payload.old as Partial<P2POrderRow>).status;
          
          // If status changed to/from open, refetch
          if (newStatus === 'open' || oldStatus === 'open') {
            console.log('Order status changed to/from open, refetching marketplace');
            fetchOpenOrders();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOpenOrders]);

  return {
    buyOrders,   // Orders from users wanting to buy Nova (you can sell)
    sellOrders,  // Orders from users wanting to sell Nova (you can buy)
    isLoading,
    error,
    refetch: fetchOpenOrders,
  };
}
