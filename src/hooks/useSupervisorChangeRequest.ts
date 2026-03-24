import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SupervisorRequest {
  id: string;
  requested_supervisor_name: string;
  requested_supervisor_code: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string;
}

export function useSupervisorChangeRequest() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<SupervisorRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPending = requests.some(r => r.status === 'pending');

  const fetchRequests = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('get_my_supervisor_requests', {
        p_user_id: user.id,
      });
      if (!rpcError) setRequests((data as SupervisorRequest[]) || []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const submitRequest = async (newReferralCode: string, reason?: string): Promise<{ success: boolean; message: string }> => {
    if (!user?.id) return { success: false, message: 'Not authenticated' };
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('submit_supervisor_change_request', {
        p_user_id: user.id,
        p_new_referral_code: newReferralCode,
        p_reason: reason || null,
      });
      if (rpcError) {
        setError(rpcError.message);
        return { success: false, message: rpcError.message };
      }
      const result = data as { success: boolean; error?: string; supervisor_name?: string };
      if (!result.success) {
        setError(result.error || 'Unknown error');
        return { success: false, message: result.error || 'Unknown error' };
      }
      await fetchRequests();
      return { success: true, message: result.supervisor_name || '' };
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setSubmitting(false);
    }
  };

  return { requests, loading, submitting, error, hasPending, submitRequest, refresh: fetchRequests };
}
