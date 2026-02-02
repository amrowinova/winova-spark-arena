import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PresenceState {
  isOnline: boolean;
  lastSeen: Date | null;
  userId: string;
}

interface UserPresence {
  [conversationId: string]: PresenceState;
}

/**
 * Real-time presence tracking for chat - Online/Last Seen status
 * Uses Supabase Presence with heartbeat every 30 seconds
 */
export function useChatPresence(conversationId: string | null, otherUserId: string | null) {
  const { user } = useAuth();
  const [otherUserPresence, setOtherUserPresence] = useState<PresenceState | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Track my presence
  const trackPresence = useCallback(async () => {
    if (!conversationId || !user || !channelRef.current) return;

    try {
      await channelRef.current.track({
        online: true,
        user_id: user.id,
        last_seen: new Date().toISOString(),
      });
    } catch (err) {
      // Ignore tracking errors
    }
  }, [conversationId, user]);

  // Untrack when leaving
  const untrackPresence = useCallback(async () => {
    if (!channelRef.current) return;
    
    try {
      await channelRef.current.untrack();
    } catch (err) {
      // Ignore untrack errors
    }
  }, []);

  useEffect(() => {
    if (!conversationId || !user || !otherUserId) return;

    // Create presence channel for this conversation
    const channel = supabase.channel(`presence:chat:${conversationId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        
        // Find the other user's presence
        let foundOnline = false;
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.user_id === otherUserId) {
              foundOnline = presence.online === true;
              setOtherUserPresence({
                isOnline: foundOnline,
                lastSeen: presence.last_seen ? new Date(presence.last_seen) : null,
                userId: otherUserId,
              });
            }
          });
        });

        // If not found in state, they're offline
        if (!foundOnline) {
          setOtherUserPresence(prev => 
            prev ? { ...prev, isOnline: false } : null
          );
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        newPresences.forEach((presence: any) => {
          if (presence.user_id === otherUserId) {
            setOtherUserPresence({
              isOnline: true,
              lastSeen: new Date(),
              userId: otherUserId,
            });
          }
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        leftPresences.forEach((presence: any) => {
          if (presence.user_id === otherUserId) {
            setOtherUserPresence({
              isOnline: false,
              lastSeen: new Date(),
              userId: otherUserId,
            });
          }
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track immediately after subscription
          await trackPresence();
          
          // Heartbeat every 30 seconds
          heartbeatRef.current = setInterval(() => {
            trackPresence();
          }, 30000);
        }
      });

    // Track window focus/blur for accurate presence
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        trackPresence();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      
      untrackPresence();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, user, otherUserId, trackPresence, untrackPresence]);

  // Format last seen for display
  const getLastSeenText = useCallback((language: 'en' | 'ar' = 'en') => {
    if (!otherUserPresence) return null;
    
    if (otherUserPresence.isOnline) {
      return language === 'ar' ? 'متصل الآن' : 'Online';
    }
    
    if (otherUserPresence.lastSeen) {
      const now = new Date();
      const diff = now.getTime() - otherUserPresence.lastSeen.getTime();
      const minutes = Math.floor(diff / 60000);
      
      if (minutes < 1) {
        return language === 'ar' ? 'آخر ظهور الآن' : 'Last seen just now';
      }
      
      if (minutes < 60) {
        return language === 'ar' 
          ? `آخر ظهور منذ ${minutes} دقيقة` 
          : `Last seen ${minutes}m ago`;
      }
      
      const hours = Math.floor(minutes / 60);
      if (hours < 24) {
        return language === 'ar' 
          ? `آخر ظهور منذ ${hours} ساعة` 
          : `Last seen ${hours}h ago`;
      }
      
      // Show time for recent days
      const timeStr = otherUserPresence.lastSeen.toLocaleTimeString(
        language === 'ar' ? 'ar-SA' : 'en-US', 
        { hour: '2-digit', minute: '2-digit' }
      );
      return language === 'ar' ? `آخر ظهور ${timeStr}` : `Last seen at ${timeStr}`;
    }
    
    return null;
  }, [otherUserPresence]);

  return {
    isOnline: otherUserPresence?.isOnline ?? false,
    lastSeen: otherUserPresence?.lastSeen ?? null,
    getLastSeenText,
  };
}
