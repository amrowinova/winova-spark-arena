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
  const [unreadByConversation, setUnreadByConversation] = useState<Record<string, number>>({});

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      setUnreadByConversation({});
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
        setUnreadByConversation({});
        return;
      }

      const conversationIds = conversations.map(c => c.id);

      // Get unread counts per conversation
      const unreadMap: Record<string, number> = {};
      let total = 0;

      for (const convId of conversationIds) {
        const { count } = await supabase
          .from('direct_messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', convId)
          .eq('is_read', false)
          .neq('sender_id', user.id);
        
        const unread = count || 0;
        if (unread > 0) {
          unreadMap[convId] = unread;
          total += unread;
        }
      }

      setUnreadCount(total);
      setUnreadByConversation(unreadMap);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchUnreadCount();

    // Get user's conversations for scoped subscription
    const setupChannel = async () => {
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`);

      const convIds = convs?.map(c => c.id) || [];
      if (convIds.length === 0) return null;

      const filter = `conversation_id=in.(${convIds.join(',')})`;

      const channel = supabase
        .channel(`dm-unread-count_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'direct_messages',
            filter,
          },
          (payload) => {
            const newMsg = payload.new as any;
            if (newMsg.sender_id !== user.id && !newMsg.is_read) {
              setUnreadCount(prev => prev + 1);
              setUnreadByConversation(prev => ({
                ...prev,
                [newMsg.conversation_id]: (prev[newMsg.conversation_id] || 0) + 1
              }));
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'direct_messages',
            filter,
          },
          () => {
            fetchUnreadCount();
          }
        )
        .subscribe();

      return channel;
    };

    let channelRef: ReturnType<typeof supabase.channel> | null = null;
    setupChannel().then(ch => { channelRef = ch; });

    return () => {
      if (channelRef) supabase.removeChannel(channelRef);
    };
  }, [user, fetchUnreadCount]);

  return { 
    unreadCount, 
    unreadByConversation,
    refetch: fetchUnreadCount 
  };
}
