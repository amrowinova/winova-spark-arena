import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Real Active Users Counter using Supabase Presence
 * Tracks actual online users across the entire platform
 */
export function useRealActiveUsers() {
  const { user } = useAuth();
  const [activeCount, setActiveCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Count users in presence state
  const countUsers = useCallback((state: Record<string, unknown[]>) => {
    let count = 0;
    Object.values(state).forEach((presences) => {
      count += presences.length;
    });
    return count;
  }, []);

  useEffect(() => {
    // Create a global presence channel for counting active users
    const channel = supabase.channel('global-active-users', {
      config: {
        presence: {
          key: user?.id || `anon-${Math.random().toString(36).slice(2)}`,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setActiveCount(countUsers(state));
      })
      .on('presence', { event: 'join' }, () => {
        const state = channel.presenceState();
        setActiveCount(countUsers(state));
      })
      .on('presence', { event: 'leave' }, () => {
        const state = channel.presenceState();
        setActiveCount(countUsers(state));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track presence
          await channel.track({
            online: true,
            user_id: user?.id || 'anonymous',
            joined_at: new Date().toISOString(),
          });

          // Heartbeat every 30 seconds to maintain presence
          heartbeatRef.current = setInterval(() => {
            channel.track({
              online: true,
              user_id: user?.id || 'anonymous',
              joined_at: new Date().toISOString(),
            });
          }, 30000);
        }
      });

    // Track visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && channelRef.current) {
        channelRef.current.track({
          online: true,
          user_id: user?.id || 'anonymous',
          joined_at: new Date().toISOString(),
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
  }, [user?.id, countUsers]);

  return activeCount;
}
