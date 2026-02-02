import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useDeliveryStatus(conversationId: string | null) {
  const { user } = useAuth();

  const markAsDelivered = useCallback(async () => {
    if (!user?.id || !conversationId) return;

    try {
      await supabase.rpc('mark_messages_delivered', {
        p_conversation_id: conversationId,
        p_recipient_id: user.id
      });
    } catch (err) {
      console.error('Error marking messages as delivered:', err);
    }
  }, [user?.id, conversationId]);

  // Mark messages as delivered when conversation opens
  useEffect(() => {
    if (conversationId) {
      markAsDelivered();
    }
  }, [conversationId, markAsDelivered]);

  return { markAsDelivered };
}
