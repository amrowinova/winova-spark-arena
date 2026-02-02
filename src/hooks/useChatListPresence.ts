import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ConversationStatus {
  isTyping: boolean;
  typingUserName?: string;
  isOnline: boolean;
  lastSeen: Date | null;
}

/**
 * Global Presence & Typing Tracker for Chat List
 * Tracks typing and online status for ALL conversations at once
 * Shows in the list without opening the conversation
 */
export function useChatListPresence(conversationIds: string[]) {
  const { user } = useAuth();
  const [statusMap, setStatusMap] = useState<Map<string, ConversationStatus>>(new Map());
  const channelsRef = useRef<Map<string, ReturnType<typeof supabase.channel>>>(new Map());
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Subscribe to typing events for all conversations
  useEffect(() => {
    if (!user || conversationIds.length === 0) return;

    // Track which conversations we're already subscribed to
    const currentSubs = new Set(channelsRef.current.keys());
    const targetSubs = new Set(conversationIds);

    // Unsubscribe from removed conversations
    currentSubs.forEach(convId => {
      if (!targetSubs.has(convId)) {
        const channel = channelsRef.current.get(convId);
        if (channel) {
          supabase.removeChannel(channel);
          channelsRef.current.delete(convId);
        }
        // Clear timeout
        const timeout = typingTimeoutsRef.current.get(convId);
        if (timeout) {
          clearTimeout(timeout);
          typingTimeoutsRef.current.delete(convId);
        }
      }
    });

    // Subscribe to new conversations
    targetSubs.forEach(convId => {
      if (currentSubs.has(convId)) return; // Already subscribed

      // Typing channel
      const typingChannel = supabase.channel(`typing:${convId}`);
      
      typingChannel
        .on('broadcast', { event: 'typing' }, (payload) => {
          const data = payload.payload as { userId: string; isTyping: boolean; userName?: string };
          
          // Only track other user's typing
          if (data.userId !== user.id) {
            setStatusMap(prev => {
              const current = prev.get(convId) || { isTyping: false, isOnline: false, lastSeen: null };
              const newMap = new Map(prev);
              newMap.set(convId, {
                ...current,
                isTyping: data.isTyping,
                typingUserName: data.userName,
              });
              return newMap;
            });

            // Clear previous timeout
            const existingTimeout = typingTimeoutsRef.current.get(convId);
            if (existingTimeout) {
              clearTimeout(existingTimeout);
            }

            // Auto-clear typing after 3 seconds (fallback)
            if (data.isTyping) {
              const timeout = setTimeout(() => {
                setStatusMap(prev => {
                  const current = prev.get(convId);
                  if (!current) return prev;
                  const newMap = new Map(prev);
                  newMap.set(convId, { ...current, isTyping: false });
                  return newMap;
                });
              }, 3000);
              typingTimeoutsRef.current.set(convId, timeout);
            }
          }
        })
        .subscribe();

      channelsRef.current.set(convId, typingChannel);
    });

    return () => {
      // Cleanup all subscriptions on unmount
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current.clear();

      typingTimeoutsRef.current.forEach((timeout) => {
        clearTimeout(timeout);
      });
      typingTimeoutsRef.current.clear();
    };
  }, [user, conversationIds.join(',')]); // Re-run when conversation list changes

  // Get status for a specific conversation
  const getStatus = useCallback((conversationId: string): ConversationStatus => {
    return statusMap.get(conversationId) || { isTyping: false, isOnline: false, lastSeen: null };
  }, [statusMap]);

  // Check if any conversation has someone typing
  const getTypingConversations = useCallback((): string[] => {
    const typing: string[] = [];
    statusMap.forEach((status, convId) => {
      if (status.isTyping) typing.push(convId);
    });
    return typing;
  }, [statusMap]);

  return {
    statusMap,
    getStatus,
    getTypingConversations,
  };
}

/**
 * Global Online Presence Tracker
 * Uses a single channel to track which users are online globally
 */
export function useGlobalPresence() {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;

    // Global presence channel - all users subscribe to this
    const channel = supabase.channel('global-presence', {
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
        const online = new Set<string>();
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.user_id && presence.online) {
              online.add(presence.user_id);
            }
          });
        });
        
        setOnlineUsers(online);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          newPresences.forEach((p: any) => {
            if (p.user_id) next.add(p.user_id);
          });
          return next;
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          leftPresences.forEach((p: any) => {
            if (p.user_id) next.delete(p.user_id);
          });
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track my presence
          await channel.track({
            online: true,
            user_id: user.id,
            last_seen: new Date().toISOString(),
          });

          // Heartbeat every 15 seconds
          heartbeatRef.current = setInterval(() => {
            channel.track({
              online: true,
              user_id: user.id,
              last_seen: new Date().toISOString(),
            });
          }, 15000);
        }
      });

    // Track visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && channelRef.current) {
        channelRef.current.track({
          online: true,
          user_id: user.id,
          last_seen: new Date().toISOString(),
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }

      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user]);

  const isUserOnline = useCallback((userId: string): boolean => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  return {
    onlineUsers,
    isUserOnline,
  };
}
