import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface RealtimeMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  is_read: boolean;
  created_at: string;
}

interface RealtimeDMOptions {
  onNewMessage?: (message: RealtimeMessage, senderName: string) => void;
  onMessageRead?: (conversationId: string) => void;
  activeConversationId?: string | null;
}

/**
 * Real-time hook for DM updates with instant notifications
 */
export function useRealtimeDM(options: RealtimeDMOptions = {}) {
  const { user } = useAuth();
  const { onNewMessage, onMessageRead, activeConversationId } = options;
  const activeConvRef = useRef(activeConversationId);
  
  // Keep ref updated
  useEffect(() => {
    activeConvRef.current = activeConversationId;
  }, [activeConversationId]);

  // Get sender profile for notification
  const getSenderProfile = useCallback(async (senderId: string): Promise<string> => {
    const { data } = await supabase
      .from('profiles')
      .select('name, username')
      .eq('user_id', senderId)
      .single();
    
    return data?.name || data?.username || 'Someone';
  }, []);

  // Mark messages as read when viewing conversation
  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (!user) return;
    
    await supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .eq('is_read', false);
    
    onMessageRead?.(conversationId);
  }, [user, onMessageRead]);

  useEffect(() => {
    if (!user) return;

    // Subscribe to new messages in all conversations where user is participant
    const channel = supabase
      .channel('dm-realtime-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        async (payload) => {
          const newMsg = payload.new as RealtimeMessage;
          
          // Skip if it's my own message
          if (newMsg.sender_id === user.id) return;
          
          // Verify I'm part of this conversation
          const { data: conv } = await supabase
            .from('conversations')
            .select('participant1_id, participant2_id')
            .eq('id', newMsg.conversation_id)
            .single();
          
          if (!conv) return;
          
          const isMyConversation = conv.participant1_id === user.id || conv.participant2_id === user.id;
          if (!isMyConversation) return;
          
          // Get sender name for notification
          const senderName = await getSenderProfile(newMsg.sender_id);
          
          // If user is viewing this conversation, mark as read immediately
          if (activeConvRef.current === newMsg.conversation_id) {
            await supabase
              .from('direct_messages')
              .update({ is_read: true })
              .eq('id', newMsg.id);
          } else {
            // Show toast notification for new message
            toast.message(`${senderName}`, {
              description: newMsg.content.length > 50 
                ? newMsg.content.substring(0, 50) + '...' 
                : newMsg.content,
              duration: 4000,
            });
          }
          
          // Callback for parent component
          onNewMessage?.(newMsg, senderName);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
          filter: 'is_read=eq.true',
        },
        (payload) => {
          const updatedMsg = payload.new as RealtimeMessage;
          // Notify about read status change
          onMessageRead?.(updatedMsg.conversation_id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, onNewMessage, onMessageRead, getSenderProfile]);

  return {
    markConversationAsRead,
  };
}
