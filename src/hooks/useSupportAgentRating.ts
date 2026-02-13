import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SupportAgentRating {
  id: string;
  order_id: string;
  staff_id: string;
  rater_id: string;
  rating: 'up' | 'down';
  note: string | null;
  created_at: string;
  updated_at: string;
  is_locked: boolean;
}

export interface StaffMetrics {
  staff_id: string;
  staff_name: string;
  total_ratings: number;
  positive_ratings: number;
  negative_ratings: number;
  positive_pct: number;
  cases_handled: number;
  escalations: number;
  fraud_flags: number;
}

export function useSupportAgentRating(orderId: string | null) {
  const { user } = useAuth();
  const [myRating, setMyRating] = useState<SupportAgentRating | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if rating window is still open (30 min)
  const isEditable = myRating
    ? !myRating.is_locked && new Date(myRating.created_at).getTime() + 30 * 60 * 1000 > Date.now()
    : false;

  const fetchMyRating = useCallback(async () => {
    if (!orderId || !user) {
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('support_agent_ratings')
      .select('*')
      .eq('order_id', orderId)
      .eq('rater_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setMyRating(data as SupportAgentRating);
    }
    setIsLoading(false);
  }, [orderId, user]);

  useEffect(() => {
    fetchMyRating();
  }, [fetchMyRating]);

  const submitRating = useCallback(async (
    rating: 'up' | 'down',
    note?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!orderId || !user) return { success: false, error: 'Missing data' };

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('submit_support_agent_rating', {
        p_order_id: orderId,
        p_rating: rating,
        p_note: note || null,
      });

      if (error) return { success: false, error: error.message };

      const result = data as { success: boolean; error?: string };
      if (result.success) {
        await fetchMyRating();
      }
      return result;
    } catch (err) {
      return { success: false, error: 'Failed to submit rating' };
    } finally {
      setIsSubmitting(false);
    }
  }, [orderId, user, fetchMyRating]);

  return {
    myRating,
    isEditable,
    isLoading,
    isSubmitting,
    submitRating,
    hasRated: !!myRating,
  };
}

// Separate hook for admin metrics
export function useStaffMetrics() {
  const [metrics, setMetrics] = useState<StaffMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const NEGATIVE_THRESHOLD = 20; // percentage

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('support_staff_metrics')
      .select('*');

    if (!error && data) {
      setMetrics(data as StaffMetrics[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const flaggedStaff = metrics.filter(m =>
    m.total_ratings >= 5 && (100 - (m.positive_pct || 0)) > NEGATIVE_THRESHOLD
  );

  return { metrics, flaggedStaff, isLoading, refetch: fetchMetrics, NEGATIVE_THRESHOLD };
}
