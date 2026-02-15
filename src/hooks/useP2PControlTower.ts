import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface P2PGlobalKPIs {
  totalOpen: number;
  awaitingPayment: number;
  paymentSent: number;
  disputed: number;
  completedToday: number;
  cancelledToday: number;
  totalLockedEscrow: number;
  totalVolumeToday: number;
  avgCompletionMinutes: number;
  expiringIn10: number;
  sellerDecisionWindow: number;
}

export interface P2POrderRow {
  id: string;
  country: string;
  order_type: string;
  creator_id: string;
  executor_id: string | null;
  nova_amount: number;
  local_amount: number;
  exchange_rate: number;
  status: string;
  created_at: string;
  matched_at: string | null;
  expires_at: string | null;
  time_limit_minutes: number;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  completed_at: string | null;
  extension_count: number;
  assigned_to: string | null;
  creator_name?: string;
  executor_name?: string;
  payment_method_id: string | null;
}

export interface P2PRiskAnomaly {
  type: string;
  severity: 'critical' | 'high' | 'medium';
  description: string;
  description_ar: string;
  data: any;
}

export interface P2PFilters {
  country: string;
  status: string;
  minAmount: number | null;
  maxAmount: number | null;
  userId: string;
  riskLevel: string;
  dateFrom: string;
  dateTo: string;
}

const defaultFilters: P2PFilters = {
  country: '',
  status: '',
  minAmount: null,
  maxAmount: null,
  userId: '',
  riskLevel: '',
  dateFrom: '',
  dateTo: '',
};

export function useP2PControlTower() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<P2PFilters>(defaultFilters);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // KPIs
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['p2p-control-kpis'],
    queryFn: async (): Promise<P2PGlobalKPIs> => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const in10min = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

      const [ordersRes, walletsRes, completedRes, cancelledRes] = await Promise.all([
        supabase.from('p2p_orders').select('id, status, expires_at, matched_at, completed_at, nova_amount'),
        supabase.from('wallets').select('locked_nova_balance'),
        supabase.from('p2p_orders').select('id, completed_at, matched_at, nova_amount').eq('status', 'completed').gte('completed_at', todayStart),
        supabase.from('p2p_orders').select('id').eq('status', 'cancelled').gte('updated_at', todayStart),
      ]);

      const orders = ordersRes.data || [];
      const wallets = walletsRes.data || [];
      const completedToday = completedRes.data || [];
      const cancelledToday = cancelledRes.data || [];

      const totalLockedEscrow = wallets.reduce((s, w) => s + (w.locked_nova_balance || 0), 0);
      const totalVolumeToday = completedToday.reduce((s, o) => s + (o.nova_amount || 0), 0);

      // avg completion time
      let totalMinutes = 0;
      let countCompleted = 0;
      completedToday.forEach(o => {
        if (o.matched_at && o.completed_at) {
          const diff = (new Date(o.completed_at).getTime() - new Date(o.matched_at).getTime()) / 60000;
          totalMinutes += diff;
          countCompleted++;
        }
      });

      const expiringIn10 = orders.filter(o =>
        o.expires_at && ['awaiting_payment', 'payment_sent'].includes(o.status as string) &&
        new Date(o.expires_at) <= new Date(in10min) && new Date(o.expires_at) > now
      ).length;

      const sellerDecisionWindow = orders.filter(o => o.status === 'payment_sent').length;

      return {
        totalOpen: orders.filter(o => o.status === 'open').length,
        awaitingPayment: orders.filter(o => o.status === 'awaiting_payment').length,
        paymentSent: orders.filter(o => o.status === 'payment_sent').length,
        disputed: orders.filter(o => o.status === 'disputed').length,
        completedToday: completedToday.length,
        cancelledToday: cancelledToday.length,
        totalLockedEscrow,
        totalVolumeToday,
        avgCompletionMinutes: countCompleted > 0 ? Math.round(totalMinutes / countCompleted) : 0,
        expiringIn10,
        sellerDecisionWindow,
      };
    },
    refetchInterval: 15000,
  });

  // Live orders with profiles
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['p2p-control-orders', filters],
    queryFn: async (): Promise<P2POrderRow[]> => {
      let query = supabase
        .from('p2p_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (filters.country) query = query.eq('country', filters.country);
      if (filters.status) query = query.eq('status', filters.status as any);
      if (filters.minAmount) query = query.gte('nova_amount', filters.minAmount);
      if (filters.maxAmount) query = query.lte('nova_amount', filters.maxAmount);
      if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
      if (filters.dateTo) query = query.lte('created_at', filters.dateTo);

      const { data, error } = await query;
      if (error) { console.error(error); return []; }

      // Fetch profile names for creators and executors
      const userIds = new Set<string>();
      (data || []).forEach(o => {
        if (o.creator_id) userIds.add(o.creator_id);
        if (o.executor_id) userIds.add(o.executor_id);
      });

      let profileMap: Record<string, string> = {};
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name, username')
          .in('user_id', Array.from(userIds));
        (profiles || []).forEach((p: any) => {
          profileMap[p.user_id] = p.name || p.username || p.user_id.slice(0, 8);
        });
      }

      let result = (data || []).map(o => ({
        ...o,
        creator_name: profileMap[o.creator_id] || o.creator_id?.slice(0, 8),
        executor_name: o.executor_id ? (profileMap[o.executor_id] || o.executor_id?.slice(0, 8)) : null,
      }));

      // Client-side user filter
      if (filters.userId) {
        const uid = filters.userId.toLowerCase();
        result = result.filter(o =>
          o.creator_id?.toLowerCase().includes(uid) ||
          o.executor_id?.toLowerCase().includes(uid) ||
          o.creator_name?.toLowerCase().includes(uid) ||
          o.executor_name?.toLowerCase().includes(uid)
        );
      }

      return result;
    },
    refetchInterval: 15000,
  });

  // Risk anomalies
  const { data: anomalies, isLoading: anomaliesLoading } = useQuery({
    queryKey: ['p2p-control-anomalies'],
    queryFn: async (): Promise<P2PRiskAnomaly[]> => {
      const results: P2PRiskAnomaly[] = [];

      // 1. Locked nova with no active order
      const { data: walletsWithLock } = await supabase
        .from('wallets')
        .select('user_id, locked_nova_balance')
        .gt('locked_nova_balance', 0);

      if (walletsWithLock && walletsWithLock.length > 0) {
        const lockedUserIds = walletsWithLock.map(w => w.user_id);
        const { data: activeOrders } = await supabase
          .from('p2p_orders')
          .select('creator_id, executor_id, status')
          .in('status', ['open', 'awaiting_payment', 'payment_sent', 'disputed']);

        const activeUserIds = new Set<string>();
        (activeOrders || []).forEach(o => {
          if (o.creator_id) activeUserIds.add(o.creator_id);
          if (o.executor_id) activeUserIds.add(o.executor_id);
        });

        walletsWithLock.forEach(w => {
          if (!activeUserIds.has(w.user_id)) {
            results.push({
              type: 'orphaned_lock',
              severity: 'critical',
              description: `User ${w.user_id.slice(0, 8)} has ${w.locked_nova_balance} locked Nova with no active order`,
              description_ar: `المستخدم ${w.user_id.slice(0, 8)} لديه ${w.locked_nova_balance} نوفا مقفلة بدون طلب نشط`,
              data: w,
            });
          }
        });
      }

      // 2. Expired timers not processed
      const { data: expiredOrders } = await supabase
        .from('p2p_orders')
        .select('id, status, expires_at, creator_id, executor_id')
        .in('status', ['awaiting_payment', 'payment_sent'])
        .lt('expires_at', new Date().toISOString());

      (expiredOrders || []).forEach(o => {
        results.push({
          type: 'expired_unprocessed',
          severity: 'high',
          description: `Order ${o.id.slice(0, 8)} expired at ${o.expires_at} but still in ${o.status}`,
          description_ar: `طلب ${o.id.slice(0, 8)} انتهى في ${o.expires_at} لكنه لا يزال ${o.status}`,
          data: o,
        });
      });

      // 3. Negative balances
      const { data: negativeWallets } = await supabase
        .from('wallets')
        .select('user_id, nova_balance, aura_balance, locked_nova_balance')
        .or('nova_balance.lt.0,aura_balance.lt.0,locked_nova_balance.lt.0');

      (negativeWallets || []).forEach(w => {
        results.push({
          type: 'negative_balance',
          severity: 'critical',
          description: `User ${w.user_id.slice(0, 8)} has negative balance: Nova=${w.nova_balance} Aura=${w.aura_balance} Locked=${w.locked_nova_balance}`,
          description_ar: `المستخدم ${w.user_id.slice(0, 8)} لديه رصيد سلبي`,
          data: w,
        });
      });

      // 4. Repeated cancel patterns (>3 cancels in 24h)
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      const { data: recentCancels } = await supabase
        .from('p2p_orders')
        .select('cancelled_by')
        .eq('status', 'cancelled')
        .gte('updated_at', yesterday)
        .not('cancelled_by', 'is', null);

      const cancelCount: Record<string, number> = {};
      (recentCancels || []).forEach(o => {
        if (o.cancelled_by) cancelCount[o.cancelled_by] = (cancelCount[o.cancelled_by] || 0) + 1;
      });
      Object.entries(cancelCount).forEach(([uid, count]) => {
        if (count >= 3) {
          results.push({
            type: 'cancel_abuse',
            severity: 'medium',
            description: `User ${uid.slice(0, 8)} cancelled ${count} orders in 24h`,
            description_ar: `المستخدم ${uid.slice(0, 8)} ألغى ${count} طلبات في 24 ساعة`,
            data: { user_id: uid, count },
          });
        }
      });

      return results;
    },
    refetchInterval: 30000,
  });

  // Order detail
  const { data: orderDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['p2p-control-order-detail', selectedOrderId],
    queryFn: async () => {
      if (!selectedOrderId) return null;

      const [orderRes, ledgerRes, messagesRes, disputeRes, auditRes] = await Promise.all([
        supabase.from('p2p_orders').select('*').eq('id', selectedOrderId).single(),
        supabase.from('wallet_ledger').select('*').eq('reference_id', selectedOrderId).order('created_at', { ascending: true }),
        supabase.from('p2p_messages').select('*').eq('order_id', selectedOrderId).order('created_at', { ascending: true }),
        supabase.from('p2p_dispute_actions').select('*').eq('order_id', selectedOrderId).order('created_at', { ascending: true }),
        supabase.from('audit_logs').select('*').eq('entity_id', selectedOrderId).order('created_at', { ascending: true }),
      ]);

      // Gather all user IDs for name resolution
      const userIds = new Set<string>();
      if (orderRes.data?.creator_id) userIds.add(orderRes.data.creator_id);
      if (orderRes.data?.executor_id) userIds.add(orderRes.data.executor_id);
      (messagesRes.data || []).forEach(m => { if (m.sender_id) userIds.add(m.sender_id); });
      (disputeRes.data || []).forEach(d => { if (d.staff_id) userIds.add(d.staff_id); });

      let profileMap: Record<string, string> = {};
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name, username')
          .in('user_id', Array.from(userIds));
        (profiles || []).forEach((p: any) => {
          profileMap[p.user_id] = p.name || p.username || p.user_id.slice(0, 8);
        });
      }

      // Wallet snapshots for creator & executor
      const walletUserIds = [orderRes.data?.creator_id, orderRes.data?.executor_id].filter(Boolean);
      let walletMap: Record<string, any> = {};
      if (walletUserIds.length > 0) {
        const { data: wallets } = await supabase
          .from('wallets')
          .select('user_id, nova_balance, locked_nova_balance, aura_balance, is_frozen')
          .in('user_id', walletUserIds as string[]);
        (wallets || []).forEach(w => { walletMap[w.user_id] = w; });
      }

      return {
        order: orderRes.data,
        ledger: ledgerRes.data || [],
        messages: messagesRes.data || [],
        disputes: disputeRes.data || [],
        audits: auditRes.data || [],
        profileMap,
        walletMap,
      };
    },
    enabled: !!selectedOrderId,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('p2p-control-tower')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'p2p_orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['p2p-control-kpis'] });
        queryClient.invalidateQueries({ queryKey: ['p2p-control-orders'] });
        queryClient.invalidateQueries({ queryKey: ['p2p-control-anomalies'] });
        if (selectedOrderId) {
          queryClient.invalidateQueries({ queryKey: ['p2p-control-order-detail', selectedOrderId] });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, () => {
        queryClient.invalidateQueries({ queryKey: ['p2p-control-kpis'] });
        queryClient.invalidateQueries({ queryKey: ['p2p-control-anomalies'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedOrderId, queryClient]);

  // Countries for filter
  const { data: countries } = useQuery({
    queryKey: ['p2p-control-countries'],
    queryFn: async () => {
      const { data } = await supabase.from('p2p_orders').select('country').limit(1000);
      return [...new Set((data || []).map(d => d.country).filter(Boolean))].sort();
    },
    staleTime: 60000,
  });

  return {
    kpis: kpis || {
      totalOpen: 0, awaitingPayment: 0, paymentSent: 0, disputed: 0,
      completedToday: 0, cancelledToday: 0, totalLockedEscrow: 0,
      totalVolumeToday: 0, avgCompletionMinutes: 0, expiringIn10: 0, sellerDecisionWindow: 0,
    },
    kpisLoading,
    orders: orders || [],
    ordersLoading,
    anomalies: anomalies || [],
    anomaliesLoading,
    orderDetail,
    detailLoading,
    selectedOrderId,
    setSelectedOrderId,
    filters,
    setFilters,
    resetFilters: () => setFilters(defaultFilters),
    countries: countries || [],
  };
}
