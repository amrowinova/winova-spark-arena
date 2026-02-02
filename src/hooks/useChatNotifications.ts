import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Notification sound - using a simple beep generated via Web Audio API
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Pleasant notification tone
    oscillator.frequency.value = 830; // Hz
    oscillator.type = 'sine';
    
    // Quick fade in/out for a soft sound
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (e) {
    // Audio not supported or blocked
    console.log('Could not play notification sound:', e);
  }
};

interface NewMessagePayload {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  is_read: boolean;
  created_at: string;
}

interface UseChatNotificationsOptions {
  enabled?: boolean;
  activeConversationId?: string | null;
  onNewMessage?: (message: NewMessagePayload, senderName: string) => void;
}

/**
 * Hook for real-time chat notifications
 * Shows toast banners when new messages arrive
 */
export function useChatNotifications(options: UseChatNotificationsOptions = {}) {
  const { user } = useAuth();
  const { enabled = true, activeConversationId, onNewMessage } = options;
  const activeConvRef = useRef(activeConversationId);
  
  // Keep ref updated
  useEffect(() => {
    activeConvRef.current = activeConversationId;
  }, [activeConversationId]);

  // Get sender profile for notification
  const getSenderProfile = useCallback(async (senderId: string): Promise<{ name: string; username: string }> => {
    const { data } = await supabase
      .from('profiles')
      .select('name, username')
      .eq('user_id', senderId)
      .single();
    
    return {
      name: data?.name || 'Someone',
      username: data?.username || 'user',
    };
  }, []);

  useEffect(() => {
    if (!user || !enabled) return;

    const channel = supabase
      .channel('chat-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        async (payload) => {
          const newMsg = payload.new as NewMessagePayload;
          
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
          
          // Get sender info
          const sender = await getSenderProfile(newMsg.sender_id);
          
          // Don't show notification if user is viewing this conversation
          if (activeConvRef.current === newMsg.conversation_id) {
            // Auto-mark as read
            await supabase
              .from('direct_messages')
              .update({ is_read: true })
              .eq('id', newMsg.id);
            return;
          }
          
          // EMIT EVENT FIRST - so chat list updates at the SAME TIME as notification
          window.dispatchEvent(new CustomEvent('dm-message-received', {
            detail: {
              id: newMsg.id,
              conversationId: newMsg.conversation_id,
              senderId: newMsg.sender_id,
              senderName: sender.name,
              senderUsername: sender.username,
              content: newMsg.content,
              createdAt: newMsg.created_at,
              messageType: newMsg.message_type,
            }
          }));
          
          // Play notification sound
          playNotificationSound();
          
          // Show toast notification
          const truncatedContent = newMsg.content.length > 60 
            ? newMsg.content.substring(0, 60) + '...' 
            : newMsg.content;
          
          toast.message(`💬 ${sender.name}`, {
            description: truncatedContent,
            duration: 4000,
            action: {
              label: 'عرض',
              onClick: () => {
                window.dispatchEvent(new CustomEvent('open-dm-conversation', {
                  detail: { conversationId: newMsg.conversation_id }
                }));
              },
            },
          });
          
          // Callback for parent component
          onNewMessage?.(newMsg, sender.name);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, enabled, getSenderProfile, onNewMessage]);
}
