import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TypingState {
  isTyping: boolean;
  userId: string;
  userName: string;
}

/**
 * Real-time typing indicator - INSTANT on first character
 * No throttling for better UX
 */
export function useTypingIndicator(conversationId: string | null) {
  const { user } = useAuth();
  const [otherUserTyping, setOtherUserTyping] = useState<TypingState | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stopTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isTypingRef = useRef(false);

  // Broadcast typing status - NO THROTTLE for instant feedback
  const broadcastTyping = useCallback((isTyping: boolean) => {
    if (!conversationId || !user || !channelRef.current) return;
    
    // Prevent duplicate broadcasts
    if (isTyping && isTypingRef.current) return;
    if (!isTyping && !isTypingRef.current) return;
    
    isTypingRef.current = isTyping;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: user.id,
        userName: user.user_metadata?.name || 'User',
        isTyping,
        conversationId,
        timestamp: Date.now(),
      },
    });
  }, [conversationId, user]);

  // Handle input change - INSTANT on first character
  const handleTyping = useCallback(() => {
    // Broadcast immediately on first character
    broadcastTyping(true);
    
    // Clear existing stop timeout
    if (stopTypingTimeoutRef.current) {
      clearTimeout(stopTypingTimeoutRef.current);
    }
    
    // Stop typing after 3 seconds of inactivity
    stopTypingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(false);
    }, 3000);
  }, [broadcastTyping]);

  // Stop typing - call when message is sent
  const stopTyping = useCallback(() => {
    if (stopTypingTimeoutRef.current) {
      clearTimeout(stopTypingTimeoutRef.current);
      stopTypingTimeoutRef.current = null;
    }
    broadcastTyping(false);
    isTypingRef.current = false;
  }, [broadcastTyping]);

  // Subscribe to typing events
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase.channel(`typing:${conversationId}`, {
      config: {
        broadcast: { self: false },
      },
    })
      .on('broadcast', { event: 'typing' }, (payload) => {
        const data = payload.payload as TypingState & { conversationId: string; timestamp: number };
        
        // Ignore own typing
        if (data.userId === user.id) return;
        
        // Only process for this conversation
        if (data.conversationId !== conversationId) return;
        
        // Clear any existing clear timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
        
        if (data.isTyping) {
          setOtherUserTyping({
            isTyping: true,
            userId: data.userId,
            userName: data.userName,
          });
          
          // Auto-clear after 4 seconds (fallback if stop event missed)
          typingTimeoutRef.current = setTimeout(() => {
            setOtherUserTyping(prev => 
              prev?.userId === data.userId ? null : prev
            );
          }, 4000);
        } else {
          // Immediate clear when stop typing received
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
      if (stopTypingTimeoutRef.current) {
        clearTimeout(stopTypingTimeoutRef.current);
      }
      supabase.removeChannel(channel);
      channelRef.current = null;
      isTypingRef.current = false;
    };
  }, [conversationId, user]);

  return {
    otherUserTyping,
    handleTyping,
    stopTyping,
  };
}
