import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TypingPayload {
  userId: string;
  isTyping: boolean;
  userName?: string;
}

/**
 * Instant Typing Indicator - No Throttle, No Delay
 * Uses Supabase Broadcast for real-time typing status
 * Broadcasts userName for display in chat list
 */
export function useTypingIndicator(conversationId: string | null, userName?: string) {
  const { user } = useAuth();
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [otherUserName, setOtherUserName] = useState<string | undefined>(undefined);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoStopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isTypingRef = useRef(false);

  // INSTANT: Send typing event on first keystroke (no throttle)
  const handleTyping = useCallback(() => {
    if (!conversationId || !user || !channelRef.current) return;

    // Send immediately (no throttle for instant feedback)
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: user.id, isTyping: true, userName } as TypingPayload,
      });
    }

    // Reset stop timer - stop after 2 seconds of inactivity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  }, [conversationId, user, userName]);

  // Stop typing signal
  const stopTyping = useCallback(() => {
    if (!channelRef.current || !user) return;
    
    isTypingRef.current = false;
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id, isTyping: false, userName } as TypingPayload,
    });
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [user, userName]);

  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase.channel(`typing:${conversationId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        const data = payload.payload as TypingPayload;
        
        // Only track other user's typing
        if (data.userId !== user.id) {
          setOtherUserTyping(data.isTyping);
          setOtherUserName(data.userName);
          
          // Auto-clear after 3 seconds if typing (fallback if stop missed)
          if (autoStopTimeoutRef.current) {
            clearTimeout(autoStopTimeoutRef.current);
          }
          
          if (data.isTyping) {
            autoStopTimeoutRef.current = setTimeout(() => {
              setOtherUserTyping(false);
            }, 3000);
          }
        }
      })
      .subscribe();

    return () => {
      stopTyping();
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (autoStopTimeoutRef.current) {
        clearTimeout(autoStopTimeoutRef.current);
      }
      
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, user, stopTyping]);

  return {
    otherUserTyping,
    otherUserName,
    handleTyping,
    stopTyping,
  };
}
