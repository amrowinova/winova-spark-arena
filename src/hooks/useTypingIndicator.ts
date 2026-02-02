import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TypingState {
  isTyping: boolean;
  userId: string;
  userName: string;
}

export function useTypingIndicator(conversationId: string | null) {
  const { user } = useAuth();
  const [otherUserTyping, setOtherUserTyping] = useState<TypingState | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingBroadcast = useRef<number>(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Broadcast typing status
  const broadcastTyping = useCallback((isTyping: boolean) => {
    if (!conversationId || !user || !channelRef.current) return;
    
    // Throttle typing broadcasts to every 2 seconds
    const now = Date.now();
    if (isTyping && now - lastTypingBroadcast.current < 2000) return;
    lastTypingBroadcast.current = now;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: user.id,
        userName: user.user_metadata?.name || 'User',
        isTyping,
        conversationId,
      },
    });
  }, [conversationId, user]);

  // Handle input change - call this when user types
  const handleTyping = useCallback(() => {
    broadcastTyping(true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(false);
    }, 3000);
  }, [broadcastTyping]);

  // Stop typing - call when message is sent
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    broadcastTyping(false);
  }, [broadcastTyping]);

  // Subscribe to typing events
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase.channel(`typing:${conversationId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const data = payload.payload as TypingState & { conversationId: string };
        
        // Ignore own typing
        if (data.userId === user.id) return;
        
        // Only process for this conversation
        if (data.conversationId !== conversationId) return;
        
        if (data.isTyping) {
          setOtherUserTyping({
            isTyping: true,
            userId: data.userId,
            userName: data.userName,
          });
          
          // Auto-clear after 5 seconds (fallback)
          setTimeout(() => {
            setOtherUserTyping(prev => 
              prev?.userId === data.userId ? null : prev
            );
          }, 5000);
        } else {
          setOtherUserTyping(prev => 
            prev?.userId === data.userId ? null : prev
          );
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, user]);

  return {
    otherUserTyping,
    handleTyping,
    stopTyping,
  };
}
