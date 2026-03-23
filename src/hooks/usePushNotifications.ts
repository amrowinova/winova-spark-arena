/**
 * usePushNotifications
 *
 * Thin wrapper around the Browser Notification API.
 * - Requests OS-level permission once (remembers answer in localStorage)
 * - Exposes `notify()` to fire a native browser notification
 * - Reads the user's per-category preferences from the DB
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type PushCategory =
  | 'contest'
  | 'earnings'
  | 'p2p'
  | 'team'
  | 'system';

interface NotifyOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;          // deduplication key
  category: PushCategory;
}

const APP_ICON = '/favicon.ico';
const PERM_ASKED_KEY = 'push_permission_asked';

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [prefs, setPrefs] = useState<Record<PushCategory, boolean>>({
    contest: true,
    earnings: true,
    p2p:     true,
    team:    true,
    system:  true,
  });

  // Load user preferences from DB
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('notifications_contest, notifications_earnings, notifications_p2p, notifications_team, notifications_system')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setPrefs({
          contest: data.notifications_contest ?? true,
          earnings: data.notifications_earnings ?? true,
          p2p:     data.notifications_p2p ?? true,
          team:    data.notifications_team ?? true,
          system:  data.notifications_system ?? true,
        });
      });
  }, [user]);

  /** Request OS permission. Returns the resulting permission state. */
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof Notification === 'undefined') return 'denied';
    if (Notification.permission === 'granted') {
      setPermission('granted');
      localStorage.setItem(PERM_ASKED_KEY, 'yes');
      return 'granted';
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    localStorage.setItem(PERM_ASKED_KEY, 'yes');
    return result;
  }, []);

  /** Fire a native browser notification if allowed. */
  const notify = useCallback((opts: NotifyOptions) => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    if (!prefs[opts.category]) return;

    new Notification(opts.title, {
      body: opts.body,
      icon: opts.icon ?? APP_ICON,
      tag:  opts.tag,
    });
  }, [prefs]);

  const hasAsked   = localStorage.getItem(PERM_ASKED_KEY) === 'yes';
  const isGranted  = permission === 'granted';
  const isDenied   = permission === 'denied';
  const isDefault  = permission === 'default';
  const supported  = typeof Notification !== 'undefined';

  return {
    permission,
    isGranted,
    isDenied,
    isDefault,
    supported,
    hasAsked,
    prefs,
    requestPermission,
    notify,
  };
}
