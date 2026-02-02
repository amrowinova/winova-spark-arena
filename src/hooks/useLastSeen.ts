import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

export function useLastSeen() {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateLastSeen = useCallback(async () => {
    if (!user?.id) return;

    try {
      await supabase.rpc('update_last_seen', { p_user_id: user.id });
    } catch (err) {
      console.error('Error updating last seen:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    // Update immediately
    updateLastSeen();

    // Set up heartbeat
    intervalRef.current = setInterval(updateLastSeen, HEARTBEAT_INTERVAL);

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateLastSeen();
      }
    };

    // Handle before unload
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable delivery on page close
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/update_last_seen`;
      navigator.sendBeacon(url, JSON.stringify({ p_user_id: user.id }));
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.id, updateLastSeen]);

  return { updateLastSeen };
}
