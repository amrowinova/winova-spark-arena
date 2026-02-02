import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to track total unread DM count across all conversations
 * Uses realtime subscription for instant updates
 */
export function useDMUnreadCount() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      // Get all conversations where user is a participant
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`);

      if (convError || !conversations?.length) {
        setUnreadCount(0);
        return;
      }

      const conversationIds = conversations.map(c => c.id);

      // Count unread messages in those conversations (not sent by me)
      const { count, error } = await supabase
        .from('direct_messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .eq('is_read', false)
        .neq('sender_id', user.id);

      if (!error) {
        setUnreadCount(count || 0);
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchUnreadCount();

    // Subscribe to realtime updates on direct_messages
    const channel = supabase
      .channel('dm-unread-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages',
        },
        () => {
          // Refetch on any message change
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchUnreadCount]);

  return { unreadCount, refetch: fetchUnreadCount };
}
