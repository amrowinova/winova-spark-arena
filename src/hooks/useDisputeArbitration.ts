import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DisputePartyProfile {
  user_id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  country: string;
}

export interface DisputeWalletSnapshot {
  nova_balance: number;
  locked_nova_balance: number;
  aura_balance: number;
  is_frozen: boolean;
}

export interface DisputeOrder {
  id: string;
  order_type: 'buy' | 'sell';
  status: string;
  nova_amount: number;
  local_amount: number;
  exchange_rate: number;
  country: string;
  payment_method_id: string | null;
  time_limit_minutes: number;
  cancellation_reason: string | null;
  created_at: string;
  matched_at: string | null;
  completed_at: string | null;
  updated_at: string;
  assigned_to: string | null;
  assigned_at: string | null;
}

export interface DisputeCaseData {
  order: DisputeOrder;
  buyer: DisputePartyProfile;
  seller: DisputePartyProfile;
  buyer_wallet: DisputeWalletSnapshot;
  seller_wallet: DisputeWalletSnapshot;
  message_count: number;
  dispute_files_count: number;
}

export interface DisputeMessage {
  id: string;
  order_id: string;
  sender_id: string;
  content: string;
  content_ar: string | null;
  is_system_message: boolean;
  message_type: string;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
}

export interface DisputeAuditEntry {
  id: string;
  order_id: string;
  staff_id: string;
  action_type: string;
  previous_status: string | null;
  new_status: string | null;
  note: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  staff_name?: string;
}

export function useDisputeArbitration(orderId: string | null) {
  const { user } = useAuth();
  const [caseData, setCaseData] = useState<DisputeCaseData | null>(null);
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [auditLog, setAuditLog] = useState<DisputeAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derived: is this case assigned to current user?
  const isAssignedToMe = caseData?.order.assigned_to === user?.id;
  const isUnassigned = !caseData?.order.assigned_to;
  const assignedTo = caseData?.order.assigned_to ?? null;
  const assignedAt = caseData?.order.assigned_at ?? null;

  // Fetch case data via RPC
  const fetchCaseData = useCallback(async () => {
    if (!orderId || !user) return;
    setIsLoading(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc('support_get_dispute_case', {
      p_order_id: orderId,
    });

    if (rpcError) {
      setError(rpcError.message);
      setIsLoading(false);
      return;
    }

    const result = data as unknown as { success: boolean; error?: string } & DisputeCaseData;
    if (!result.success) {
      setError(result.error || 'Unknown error');
      setIsLoading(false);
      return;
    }

    setCaseData(result);
    setIsLoading(false);
  }, [orderId, user]);

  // Fetch chat messages
  const fetchMessages = useCallback(async () => {
    if (!orderId) return;

    const { data, error: msgError } = await supabase
      .from('p2p_messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('Error fetching dispute messages:', msgError);
      return;
    }

    const userIds = new Set((data || []).map(m => m.sender_id));
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name, avatar_url')
      .in('user_id', Array.from(userIds));

    const profileMap = new Map(
      (profiles || []).map(p => [p.user_id, p])
    );

    setMessages(
      (data || []).map(m => ({
        ...m,
        sender_name: profileMap.get(m.sender_id)?.name || 'Unknown',
        sender_avatar: profileMap.get(m.sender_id)?.avatar_url || undefined,
      }))
    );
  }, [orderId]);

  // Fetch audit log
  const fetchAuditLog = useCallback(async () => {
    if (!orderId) return;

    const { data, error: auditError } = await supabase
      .from('p2p_dispute_actions')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (auditError) {
      console.error('Error fetching audit log:', auditError);
      return;
    }

    const staffIds = new Set((data || []).map(a => a.staff_id));
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name')
      .in('user_id', Array.from(staffIds));

    const profileMap = new Map(
      (profiles || []).map(p => [p.user_id, p.name])
    );

    setAuditLog(
      (data || []).map(a => ({
        ...a,
        metadata: (a.metadata || {}) as Record<string, unknown>,
        staff_name: profileMap.get(a.staff_id) || 'Staff',
      }))
    );
  }, [orderId]);

  // Initialize
  useEffect(() => {
    if (orderId) {
      fetchCaseData();
      fetchMessages();
      fetchAuditLog();
    }
  }, [orderId, fetchCaseData, fetchMessages, fetchAuditLog]);

  // Realtime for messages
  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`dispute_msgs_${orderId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'p2p_messages',
        filter: `order_id=eq.${orderId}`,
      }, () => fetchMessages())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId, fetchMessages]);

  // ===== ACTIONS =====

  const logAction = async (actionType: string, prevStatus: string | null, newStatus: string | null, note?: string) => {
    await supabase.rpc('support_log_dispute_action', {
      p_order_id: orderId!,
      p_action_type: actionType,
      p_previous_status: prevStatus,
      p_new_status: newStatus,
      p_note: note || null,
    });
    fetchAuditLog();
  };

  // Claim case
  const claimCase = async (): Promise<{ success: boolean; error?: string }> => {
    if (!orderId || !user) return { success: false, error: 'Missing data' };

    const { data, error: rpcError } = await supabase.rpc('support_claim_dispute', {
      p_order_id: orderId,
    });

    if (rpcError) return { success: false, error: rpcError.message };
    const result = data as unknown as { success: boolean; error?: string };
    if (result.success) {
      fetchCaseData();
      fetchAuditLog();
    }
    return result;
  };

  // Release to buyer (complete trade)
  const releaseToBuyer = async (): Promise<{ success: boolean; error?: string }> => {
    if (!orderId || !user) return { success: false, error: 'Missing data' };

    const prevStatus = caseData?.order.status || null;

    const { data, error: rpcError } = await supabase.rpc('p2p_resolve_dispute', {
      p_order_id: orderId,
      p_staff_id: user.id,
      p_resolution: 'release_to_buyer',
    });

    if (rpcError) return { success: false, error: rpcError.message };
    const result = data as unknown as { success: boolean; error?: string };
    if (result.success) {
      await logAction('release_to_buyer', prevStatus, 'completed', 'Dispute resolved — Nova released to buyer');
      await supabase.from('p2p_messages').insert({
        order_id: orderId,
        sender_id: user.id,
        content: '⚖️ Support Decision: Nova released to buyer. Trade completed.',
        content_ar: '⚖️ قرار الدعم: تم تحرير Nova للمشتري. تمت الصفقة.',
        is_system_message: true,
        message_type: 'dispute_resolved',
      });
      // Auto-send rating prompt
      await supabase.from('p2p_messages').insert({
        order_id: orderId,
        sender_id: user.id,
        content: 'The dispute has been resolved by Support ⚖️\nYour feedback matters. How would you rate the agent\'s decision?\n\n👍 Fair\n👎 Unfair',
        content_ar: 'تم حل النزاع بواسطة فريق الدعم ⚖️\nرأيك يهمنا. كيف تقيّم قرار موظف الدعم؟\n\n👍 عادل\n👎 غير عادل',
        is_system_message: true,
        message_type: 'rating_prompt',
      });
      fetchCaseData();
    }
    return result;
  };

  // Refund seller (cancel trade)
  const refundSeller = async (): Promise<{ success: boolean; error?: string }> => {
    if (!orderId || !user) return { success: false, error: 'Missing data' };

    const prevStatus = caseData?.order.status || null;

    const { data, error: rpcError } = await supabase.rpc('p2p_resolve_dispute', {
      p_order_id: orderId,
      p_staff_id: user.id,
      p_resolution: 'return_to_seller',
    });

    if (rpcError) return { success: false, error: rpcError.message };
    const result = data as unknown as { success: boolean; error?: string };
    if (result.success) {
      await logAction('refund_seller', prevStatus, 'cancelled', 'Dispute resolved — Nova returned to seller');
      await supabase.from('p2p_messages').insert({
        order_id: orderId,
        sender_id: user.id,
        content: '⚖️ Support Decision: Nova returned to seller. Trade cancelled.',
        content_ar: '⚖️ قرار الدعم: تم إرجاع Nova للبائع. تم إلغاء الصفقة.',
        is_system_message: true,
        message_type: 'dispute_resolved',
      });
      // Auto-send rating prompt
      await supabase.from('p2p_messages').insert({
        order_id: orderId,
        sender_id: user.id,
        content: 'The dispute has been resolved by Support ⚖️\nYour feedback matters. How would you rate the agent\'s decision?\n\n👍 Fair\n👎 Unfair',
        content_ar: 'تم حل النزاع بواسطة فريق الدعم ⚖️\nرأيك يهمنا. كيف تقيّم قرار موظف الدعم؟\n\n👍 عادل\n👎 غير عادل',
        is_system_message: true,
        message_type: 'rating_prompt',
      });
      fetchCaseData();
    }
    return result;
  };

  // Mark fraud
  const markFraud = async (targetUserId: string, note: string): Promise<{ success: boolean; error?: string }> => {
    if (!orderId || !user) return { success: false, error: 'Missing data' };

    const { error: freezeError } = await supabase
      .from('wallets')
      .update({
        is_frozen: true,
        frozen_by: user.id,
        frozen_reason: 'fraud',
        frozen_at: new Date().toISOString(),
      })
      .eq('user_id', targetUserId);

    if (freezeError) return { success: false, error: freezeError.message };

    await logAction('mark_fraud', null, null, `Fraud flagged on user ${targetUserId}: ${note}`);
    await supabase.from('p2p_messages').insert({
      order_id: orderId,
      sender_id: user.id,
      content: '🚨 Account flagged for fraud investigation. Wallet frozen.',
      content_ar: '🚨 تم تحديد الحساب للتحقيق في الاحتيال. تم تجميد المحفظة.',
      is_system_message: true,
      message_type: 'support_message',
    });

    fetchCaseData();
    return { success: true };
  };

  // Request more proof
  const requestProof = async (note: string): Promise<{ success: boolean; error?: string }> => {
    if (!orderId || !user) return { success: false, error: 'Missing data' };

    await logAction('request_proof', null, null, note);
    await supabase.from('p2p_messages').insert({
      order_id: orderId,
      sender_id: user.id,
      content: `📎 Support requests additional proof: ${note}`,
      content_ar: `📎 يطلب الدعم إثباتات إضافية: ${note}`,
      is_system_message: true,
      message_type: 'support_message',
    });

    fetchMessages();
    return { success: true };
  };

  // Escalate
  const escalate = async (note: string): Promise<{ success: boolean; error?: string }> => {
    if (!orderId || !user) return { success: false, error: 'Missing data' };

    await logAction('escalate', null, null, note);
    await supabase.from('p2p_messages').insert({
      order_id: orderId,
      sender_id: user.id,
      content: '⬆️ This case has been escalated to senior authority.',
      content_ar: '⬆️ تم تصعيد هذه القضية إلى سلطة أعلى.',
      is_system_message: true,
      message_type: 'support_message',
    });

    fetchMessages();
    return { success: true };
  };

  return {
    caseData,
    messages,
    auditLog,
    isLoading,
    error,
    isAssignedToMe,
    isUnassigned,
    assignedTo,
    assignedAt,
    refetch: fetchCaseData,
    claimCase,
    releaseToBuyer,
    refundSeller,
    markFraud,
    requestProof,
    escalate,
  };
}
