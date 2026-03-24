import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AgentMessage {
  id: string;
  sender_id: string;
  content: string;
  is_system_msg: boolean;
  created_at: string;
}

export interface AgentReservation {
  id: string;
  agent_id: string;
  user_id: string;
  agent_user_id?: string;
  shop_name?: string;
  type: 'deposit' | 'withdraw';
  nova_amount: number;
  fiat_amount: number | null;
  fiat_currency: string | null;
  commission_pct: number;
  commission_nova: number;
  status: string;
  escrow_holder: 'user' | 'agent' | null;
  user_confirmed_at: string | null;
  agent_confirmed_at: string | null;
  escrow_deadline: string | null;
  extension_requested_by: string | null;
  extension_minutes: number | null;
  extension_status: string | null;
  dispute_reason: string | null;
  dispute_resolution: string | null;
  notes: string | null;
  expires_at: string;
  created_at: string;
  messages?: AgentMessage[];
  is_agent?: boolean;
  avg_rating?: number;
  trust_score?: number;
  whatsapp?: string;
}

export interface CreateReservationParams {
  agent_id: string;
  type: 'deposit' | 'withdraw';
  nova_amount: number;
  fiat_amount?: number;
  fiat_currency?: string;
  notes?: string;
}

export function useAgentReservations() {
  const { user: authUser } = useAuth();
  const [myReservations, setMyReservations] = useState<AgentReservation[]>([]);
  const [agentReservations, setAgentReservations] = useState<AgentReservation[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Fetch user's own reservations ─────────────────────────────────────────
  const fetchMyReservations = useCallback(async () => {
    if (!authUser) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('agent_reservations') as any)
        .select('*, agents(shop_name, whatsapp, avg_rating, trust_score, commission_pct)')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMyReservations(
        (data ?? []).map((r: any) => ({
          ...r,
          shop_name:    r.agents?.shop_name,
          whatsapp:     r.agents?.whatsapp,
          avg_rating:   r.agents?.avg_rating,
          trust_score:  r.agents?.trust_score,
        })) as AgentReservation[]
      );
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  // ── Fetch agent's incoming reservations ───────────────────────────────────
  const fetchAgentReservations = useCallback(async (agentId: string) => {
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('agent_reservations') as any)
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgentReservations((data ?? []) as AgentReservation[]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Get single reservation with messages ──────────────────────────────────
  const getReservation = useCallback(async (reservationId: string): Promise<AgentReservation | null> => {
    const { data, error } = await (supabase.rpc as any)('get_reservation_with_messages', {
      p_reservation_id: reservationId,
    });
    if (error || !data) return null;
    const d = data as AgentReservation & { found: boolean };
    if (!d.found) return null;
    return d;
  }, []);

  // ── Create reservation ────────────────────────────────────────────────────
  const createReservation = useCallback(async (
    params: CreateReservationParams
  ): Promise<{ success: boolean; reservation_id?: string; error?: string }> => {
    if (!authUser) return { success: false, error: 'Not authenticated' };
    const { data, error } = await (supabase.rpc as any)('create_agent_reservation', {
      p_agent_id:      params.agent_id,
      p_type:          params.type,
      p_nova_amount:   params.nova_amount,
      p_fiat_amount:   params.fiat_amount   ?? null,
      p_fiat_currency: params.fiat_currency ?? null,
      p_notes:         params.notes         ?? null,
    });
    if (error) return { success: false, error: error.message };
    return data as { success: boolean; reservation_id?: string; error?: string };
  }, [authUser]);

  // ── Agent accepts or rejects ──────────────────────────────────────────────
  const respondToReservation = useCallback(async (
    reservationId: string,
    accept: boolean,
    rejectReason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await (supabase.rpc as any)('agent_respond_reservation', {
      p_reservation_id: reservationId,
      p_accept:         accept,
      p_reject_reason:  rejectReason ?? null,
    });
    if (error) return { success: false, error: error.message };
    return data as { success: boolean; error?: string };
  }, []);

  // ── Confirm reservation (user or agent) ──────────────────────────────────
  const confirmReservation = useCallback(async (
    reservationId: string
  ): Promise<{ success: boolean; status?: string; error?: string }> => {
    const { data, error } = await (supabase.rpc as any)('confirm_agent_reservation', {
      p_reservation_id: reservationId,
    });
    if (error) return { success: false, error: error.message };
    return data as { success: boolean; status?: string; error?: string };
  }, []);

  // ── Cancel reservation ────────────────────────────────────────────────────
  const cancelReservation = useCallback(async (
    reservationId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await (supabase.rpc as any)('cancel_agent_reservation', {
      p_reservation_id: reservationId,
      p_reason:         reason ?? null,
    });
    if (error) return { success: false, error: error.message };
    return data as { success: boolean; error?: string };
  }, []);

  // ── Raise dispute ─────────────────────────────────────────────────────────
  const raiseDispute = useCallback(async (
    reservationId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await (supabase.rpc as any)('raise_agent_dispute', {
      p_reservation_id: reservationId,
      p_reason:         reason,
    });
    if (error) return { success: false, error: error.message };
    return data as { success: boolean; error?: string };
  }, []);

  // ── Submit review (user rates agent) ─────────────────────────────────────
  const submitReview = useCallback(async (
    reservationId: string,
    rating: number,
    comment: string,
    hasIssue: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await (supabase.rpc as any)('submit_agent_review', {
      p_reservation_id: reservationId,
      p_rating:         rating,
      p_comment:        comment,
      p_has_issue:      hasIssue,
    });
    if (error) return { success: false, error: error.message };
    return data as { success: boolean; error?: string };
  }, []);

  // ── Agent rates user ──────────────────────────────────────────────────────
  const rateUser = useCallback(async (
    reservationId: string,
    rating: number,
    comment: string,
    hasIssue: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await (supabase.rpc as any)('rate_user_by_agent', {
      p_reservation_id: reservationId,
      p_rating:         rating,
      p_comment:        comment,
      p_has_issue:      hasIssue,
    });
    if (error) return { success: false, error: error.message };
    return data as { success: boolean; error?: string };
  }, []);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (
    reservationId: string,
    content: string
  ): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase.rpc('send_agent_message', {
      p_reservation_id: reservationId,
      p_content:        content,
    });
    if (error) return { success: false, error: error.message };
    return data as { success: boolean; error?: string };
  }, []);

  // ── Request time extension ────────────────────────────────────────────────
  const requestExtension = useCallback(async (
    reservationId: string,
    minutes: 10 | 20 | 30
  ): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase.rpc('request_extension', {
      p_reservation_id: reservationId,
      p_minutes:        minutes,
    });
    if (error) return { success: false, error: error.message };
    return data as { success: boolean; error?: string };
  }, []);

  // ── Respond to extension request ──────────────────────────────────────────
  const respondExtension = useCallback(async (
    reservationId: string,
    accept: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase.rpc('respond_extension', {
      p_reservation_id: reservationId,
      p_accept:         accept,
    });
    if (error) return { success: false, error: error.message };
    return data as { success: boolean; error?: string };
  }, []);

  // ── Admin resolves dispute ────────────────────────────────────────────────
  const adminResolveDispute = useCallback(async (
    reservationId: string,
    resolution: 'release_to_user' | 'release_to_agent'
  ): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase.rpc('admin_resolve_agent_dispute', {
      p_reservation_id: reservationId,
      p_resolution:     resolution,
    });
    if (error) return { success: false, error: error.message };
    return data as { success: boolean; error?: string };
  }, []);

  // ── Realtime subscription for agent_messages ──────────────────────────────
  const subscribeToMessages = useCallback((
    reservationId: string,
    onNewMessage: (msg: AgentMessage) => void
  ) => {
    const channel = supabase
      .channel(`agent_msgs_${reservationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_messages',
          filter: `reservation_id=eq.${reservationId}`,
        },
        (payload) => onNewMessage(payload.new as AgentMessage)
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, []);

  // ── Realtime subscription for reservation status changes ──────────────────
  const subscribeToReservation = useCallback((
    reservationId: string,
    onUpdate: (r: Partial<AgentReservation>) => void
  ) => {
    const channel = supabase
      .channel(`agent_res_${reservationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_reservations',
          filter: `id=eq.${reservationId}`,
        },
        (payload) => onUpdate(payload.new as Partial<AgentReservation>)
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, []);

  return {
    myReservations, agentReservations, loading,
    fetchMyReservations, fetchAgentReservations,
    getReservation, createReservation,
    respondToReservation, confirmReservation,
    cancelReservation, raiseDispute,
    submitReview, rateUser,
    sendMessage, requestExtension, respondExtension,
    adminResolveDispute,
    subscribeToMessages, subscribeToReservation,
  };
}
