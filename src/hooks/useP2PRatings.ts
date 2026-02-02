import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface P2PRating {
  id: string;
  order_id: string;
  rater_id: string;
  rated_id: string;
  rating: 1 | -1;
  comment: string | null;
  created_at: string;
}

export interface P2PUserReputation {
  user_id: string;
  total_trades: number;
  positive_ratings: number;
  negative_ratings: number;
  reputation_score: number;
}

export function useP2PRatings() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Submit a rating for a completed order
  const submitRating = useCallback(async (
    orderId: string,
    ratedId: string,
    isPositive: boolean,
    comment?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.rpc('p2p_submit_rating', {
        p_order_id: orderId,
        p_rated_id: ratedId,
        p_rating: isPositive ? 1 : -1,
        p_comment: comment || null,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; rating_id?: string };
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (err) {
      console.error('Error submitting rating:', err);
      return { success: false, error: 'Failed to submit rating' };
    } finally {
      setIsSubmitting(false);
    }
  }, [user]);

  // Check if user has already rated an order
  const hasRatedOrder = useCallback(async (orderId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { count, error } = await supabase
        .from('p2p_ratings')
        .select('*', { count: 'exact', head: true })
        .eq('order_id', orderId)
        .eq('rater_id', user.id);

      if (error) throw error;
      return (count || 0) > 0;
    } catch (err) {
      console.error('Error checking rating:', err);
      return false;
    }
  }, [user]);

  // Get reputation for a user
  const getUserReputation = useCallback(async (userId: string): Promise<P2PUserReputation | null> => {
    try {
      const { data, error } = await supabase
        .from('p2p_user_reputation')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // View might not have data for new users
        if (error.code === 'PGRST116') {
          return {
            user_id: userId,
            total_trades: 0,
            positive_ratings: 0,
            negative_ratings: 0,
            reputation_score: 100,
          };
        }
        throw error;
      }

      return data as P2PUserReputation;
    } catch (err) {
      console.error('Error fetching reputation:', err);
      return null;
    }
  }, []);

  // Get all ratings for a user
  const getUserRatings = useCallback(async (userId: string): Promise<P2PRating[]> => {
    try {
      const { data, error } = await supabase
        .from('p2p_ratings')
        .select('*')
        .eq('rated_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as P2PRating[];
    } catch (err) {
      console.error('Error fetching ratings:', err);
      return [];
    }
  }, []);

  return {
    isSubmitting,
    submitRating,
    hasRatedOrder,
    getUserReputation,
    getUserRatings,
  };
}
