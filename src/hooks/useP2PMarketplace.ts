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
  isOwnOrder: boolean;
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
  positiveRatings: number;
  negativeRatings: number;
  completedTrades: number;
  expiresAt: string | null;
}

// Currency info by country
const COUNTRY_CURRENCIES: Record<string, { code: string; symbol: string }> = {
  'Saudi Arabia': { code: 'SAR', symbol: 'ر.س' },
  'UAE': { code: 'AED', symbol: 'د.إ' },
  'Egypt': { code: 'EGP', symbol: 'ج.م' },
  'Jordan': { code: 'JOD', symbol: 'د.أ' },
  'Qatar': { code: 'QAR', symbol: 'ر.ق' },
  'Kuwait': { code: 'KWD', symbol: 'د.ك' },
  'Bahrain': { code: 'BHD', symbol: 'د.ب' },
  'Oman': { code: 'OMR', symbol: 'ر.ع' },
  'Iraq': { code: 'IQD', symbol: 'د.ع' },
  'Palestine': { code: 'ILS', symbol: '₪' },
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
  const [buyOrders, setBuyOrders] = useState<MarketplaceOrder[]>([]);
  const [sellOrders, setSellOrders] = useState<MarketplaceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [profileCountry, setProfileCountry] = useState<string | null>(null);

  // Fetch user's profile country as default filter
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('country')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.country) setProfileCountry(data.country);
      });
  }, [user]);

  // Effective country: explicit selection > profile country
  const effectiveCountry = selectedCountry || profileCountry;

  // Fetch open orders from marketplace using secure view
  const fetchOpenOrders = useCallback(async () => {
    // Don't fetch until we know the country
    if (!effectiveCountry) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      // Use secure marketplace view that hides sensitive creator data
      // The view only exposes order details needed for marketplace display
      let query = supabase
        .from('p2p_marketplace_orders')
        .select('*')
        .order('created_at', { ascending: false });

      // Always filter by country (effective country)
      if (effectiveCountry) {
        query = query.eq('country', effectiveCountry);
      }

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) throw ordersError;

      if (!ordersData || ordersData.length === 0) {
        setBuyOrders([]);
        setSellOrders([]);
        setIsLoading(false);
        return;
      }

      const marketplaceOrders: MarketplaceOrder[] = ordersData.map((order: any) => {
        const pos = Number(order.positive_ratings) || 0;
        const neg = Number(order.negative_ratings) || 0;
        const total = pos + neg;
        return {
          id: order.id!,
          creatorId: '',
          isOwnOrder: (order as any).is_own_order === true,
          orderType: order.order_type!,
          novaAmount: Number(order.nova_amount),
          localAmount: Number(order.local_amount),
          exchangeRate: Number(order.exchange_rate),
          country: order.country!,
          timeLimitMinutes: order.time_limit_minutes!,
          createdAt: order.created_at!,
          creatorName: order.creator_name || 'Trader',
          creatorUsername: order.creator_username || '',
          creatorAvatar: order.creator_avatar_url || '👤',
          creatorCountry: order.creator_country || order.country!,
          currencySymbol: getCurrencySymbol(order.country!),
          rating: total > 0 ? pos / total : -1,
          positiveRatings: pos,
          negativeRatings: neg,
          completedTrades: Number(order.total_trades) || 0,
          expiresAt: order.expires_at || null,
        };
      });

      // Separate by order type
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
  }, [effectiveCountry]);

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
