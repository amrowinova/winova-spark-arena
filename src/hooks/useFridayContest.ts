import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FridayContestInfo {
  found: boolean;
  id?: string;
  title?: string;
  title_ar?: string;
  contest_date?: string;
  start_time?: string;
  end_time?: string;
  status?: string;
  current_participants?: number;
  max_participants?: number | null;
  is_free?: boolean;
  user_joined?: boolean;
  kyc_verified?: boolean;
  account_age_ok?: boolean;
  days_until_eligible?: number;
}

/** Generate or retrieve a stable device fingerprint from localStorage.
 *  Not cryptographic — for soft anti-abuse only.
 *  A real deployment should use FingerprintJS Pro. */
export function getDeviceId(): string {
  const KEY = 'wnv_device_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    // Combine stable browser signals + random salt
    const signals = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      new Date().getTimezoneOffset(),
    ].join('|');
    // Simple djb2 hash for quick fingerprint
    let hash = 5381;
    for (let i = 0; i < signals.length; i++) {
      hash = ((hash << 5) + hash) ^ signals.charCodeAt(i);
      hash = hash >>> 0; // keep unsigned 32-bit
    }
    // Add random suffix for uniqueness
    const rand = Math.random().toString(36).slice(2, 10);
    id = hash.toString(16) + '-' + rand;
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function useFridayContest() {
  const { user: authUser } = useAuth();
  const [fridayContest, setFridayContest] = useState<FridayContestInfo>({ found: false });
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);

  /** Is today Friday in KSA? */
  const isFridayKSA = useCallback((): boolean => {
    const ksaDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
    return ksaDate.getDay() === 5; // 5 = Friday
  }, []);

  /** Is tomorrow Friday in KSA? (to show Thursday reminder) */
  const isTomorrowFridayKSA = useCallback((): boolean => {
    const ksaDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
    return ksaDate.getDay() === 4; // 4 = Thursday
  }, []);

  const fetchFridayContest = useCallback(async () => {
    // Show banner on Thursday (reminder) and Friday
    if (!isFridayKSA() && !isTomorrowFridayKSA()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_friday_contest');
      if (!error && data) {
        setFridayContest(data as FridayContestInfo);
      }
    } finally {
      setLoading(false);
    }
  }, [isFridayKSA, isTomorrowFridayKSA]);

  useEffect(() => {
    fetchFridayContest();
  }, [fetchFridayContest]);

  const joinFridayContest = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
    error_code?: string;
    days_remaining?: number;
  }> => {
    if (!authUser) return { success: false, error: 'Not authenticated', error_code: 'AUTH_REQUIRED' };
    if (!fridayContest.id) return { success: false, error: 'No contest', error_code: 'NOT_FOUND' };

    setJoining(true);
    try {
      const deviceId = getDeviceId();
      const { data, error } = await supabase.rpc('join_friday_contest', {
        p_contest_id: fridayContest.id,
        p_device_id: deviceId,
      });
      if (error) return { success: false, error: error.message };
      const result = data as { success: boolean; error?: string; error_code?: string; days_remaining?: number };
      if (result.success) {
        setFridayContest(prev => ({ ...prev, user_joined: true }));
      }
      return result;
    } finally {
      setJoining(false);
    }
  }, [authUser, fridayContest.id]);

  return {
    fridayContest,
    loading,
    joining,
    isFridayKSA,
    isTomorrowFridayKSA,
    fetchFridayContest,
    joinFridayContest,
  };
}
