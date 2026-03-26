/**
 * useDailyMissions — Fetches and manages daily mission progress.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DailyMission {
  id: string;
  code: string;
  title_ar: string;
  title_en: string;
  desc_ar: string;
  desc_en: string;
  target: number;
  reward_nova: number;
  reward_aura: number;
  icon: string;
  progress: number;
  completed: boolean;
  reward_given: boolean;
}

interface MissionsState {
  missions: DailyMission[];
  completed_count: number;
  box_available: boolean;
  box_opened: boolean;
}

export function useDailyMissions() {
  const { user } = useAuth();
  const [state, setState] = useState<MissionsState>({
    missions: [],
    completed_count: 0,
    box_available: false,
    box_opened: false,
  });
  const [loading, setLoading] = useState(true);
  const [openingBox, setOpeningBox] = useState(false);
  const [boxReward, setBoxReward] = useState<{ nova: number; aura: number } | null>(null);

  const fetchMissions = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_daily_missions');
      if (error) throw error;
      setState(data as MissionsState);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { void fetchMissions(); }, [fetchMissions]);

  const recordProgress = useCallback(async (missionCode: string, increment = 1) => {
    const { data } = await supabase.rpc('record_mission_progress', {
      p_mission_code: missionCode,
      p_increment: increment,
    });
    await fetchMissions();
    return data as { success: boolean; progress: number; completed: boolean };
  }, [fetchMissions]);

  const openMysteryBox = useCallback(async () => {
    setOpeningBox(true);
    try {
      const { data, error } = await supabase.rpc('open_mystery_box');
      if (error) throw error;
      const result = data as { success: boolean; nova: number; aura: number; error?: string };
      if (result.success) {
        setBoxReward({ nova: result.nova, aura: result.aura });
        await fetchMissions();
      }
      return result;
    } finally {
      setOpeningBox(false);
    }
  }, [fetchMissions]);

  return {
    ...state,
    loading,
    openingBox,
    boxReward,
    fetchMissions,
    recordProgress,
    openMysteryBox,
    clearBoxReward: () => setBoxReward(null),
  };
}
