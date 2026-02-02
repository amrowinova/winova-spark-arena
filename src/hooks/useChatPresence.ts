import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PresenceState {
  isOnline: boolean;
  lastSeen: Date | null;
  userId: string;
}

/**
 * Real-time Presence Tracking for Chat
 * Uses Supabase Presence with heartbeat every 15 seconds
 * Provides: Online/Offline status + Last Seen timestamp
 */
export function useChatPresence(conversationId: string | null, otherUserId: string | null) {
  const { user } = useAuth();
  const [otherUserPresence, setOtherUserPresence] = useState<PresenceState | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Track my presence - called on subscribe and heartbeat
  const trackPresence = useCallback(async () => {
    if (!conversationId || !user || !channelRef.current) return;

    try {
      await channelRef.current.track({
        online: true,
        user_id: user.id,
        last_seen: new Date().toISOString(),
      });
    } catch {
      // Ignore tracking errors silently
    }
  }, [conversationId, user]);

  // Untrack when leaving
  const untrackPresence = useCallback(async () => {
    if (!channelRef.current) return;
    
    try {
      await channelRef.current.untrack();
    } catch {
      // Ignore untrack errors silently
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
        let lastSeenTime: Date | null = null;

        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.user_id === otherUserId) {
              foundOnline = presence.online === true;
              lastSeenTime = presence.last_seen ? new Date(presence.last_seen) : null;
              setOtherUserPresence({
                isOnline: foundOnline,
                lastSeen: lastSeenTime,
                userId: otherUserId,
              });
            }
          });
        });

        // If not found in state, they're offline
        if (!foundOnline && !Object.keys(state).some(key => {
          const presences = state[key] as any[];
          return presences?.some((p: any) => p.user_id === otherUserId);
        })) {
          setOtherUserPresence(prev => 
            prev ? { ...prev, isOnline: false } : { isOnline: false, lastSeen: null, userId: otherUserId }
          );
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
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
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
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
          
          // Heartbeat every 15 seconds for accurate presence
          heartbeatRef.current = setInterval(() => {
            trackPresence();
          }, 15000);
        }
      });

    // Track window focus/blur for accurate presence
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        trackPresence();
      } else {
        // When tab is hidden, update last_seen but stay subscribed
        untrackPresence();
      }
    };

    // Handle page unload - set offline
    const handleBeforeUnload = () => {
      untrackPresence();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      
      untrackPresence();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, user, otherUserId, trackPresence, untrackPresence]);

  // Format last seen for display - WhatsApp style
  const getLastSeenText = useCallback((language: 'en' | 'ar' = 'en'): string | null => {
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
          ? `آخر ظهور منذ ${minutes} ${minutes === 1 ? 'دقيقة' : 'دقائق'}` 
          : `Last seen ${minutes}m ago`;
      }
      
      const hours = Math.floor(minutes / 60);
      if (hours < 24) {
        return language === 'ar' 
          ? `آخر ظهور منذ ${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}` 
          : `Last seen ${hours}h ago`;
      }
      
      // Show time for recent days
      const timeStr = otherUserPresence.lastSeen.toLocaleTimeString(
        language === 'ar' ? 'ar-SA' : 'en-US', 
        { hour: '2-digit', minute: '2-digit' }
      );
      
      const isToday = otherUserPresence.lastSeen.toDateString() === now.toDateString();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = otherUserPresence.lastSeen.toDateString() === yesterday.toDateString();
      
      if (isToday) {
        return language === 'ar' ? `آخر ظهور اليوم ${timeStr}` : `Last seen today at ${timeStr}`;
      }
      if (isYesterday) {
        return language === 'ar' ? `آخر ظهور أمس ${timeStr}` : `Last seen yesterday at ${timeStr}`;
      }
      
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
