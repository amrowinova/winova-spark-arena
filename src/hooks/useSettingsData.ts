import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useChatCleanup } from '@/hooks/useChatCleanup';

interface SettingsData {
  notifications: {
    contest: boolean;
    earnings: boolean;
    p2p: boolean;
    chat: boolean;
    team: boolean;
    system: boolean;
  };
  security: {
    twoFactor: boolean;
    appLock: boolean;
    securityAlerts: boolean;
    showOnline: boolean;
  };
  preferences: {
    showLocalCurrency: boolean;
    releaseAlerts: boolean;
    p2pEnabled: boolean;
    p2pReceive: boolean;
    p2pAlerts: boolean;
  };
}

interface UseSettingsDataOptions {
  autoFetch?: boolean;
}

export function useSettingsData(options: UseSettingsDataOptions = {}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user: authUser } = useAuth();
  const { addTimeout, cleanup } = useChatCleanup();
  const isRTL = language.direction === 'rtl';

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [settingsData, setSettingsData] = useState<SettingsData>({
    notifications: {
      contest: true,
      earnings: true,
      p2p: true,
      chat: true,
      team: true,
      system: true,
    },
    security: {
      twoFactor: false,
      appLock: false,
      securityAlerts: true,
      showOnline: true,
    },
    preferences: {
      showLocalCurrency: true,
      releaseAlerts: true,
      p2pEnabled: true,
      p2pReceive: true,
      p2pAlerts: true,
    },
  });
  const [error, setError] = useState<Error | null>(null);

  // Fetch settings from database
  const fetchSettings = useCallback(async () => {
    if (!authUser) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select(`
          notifications_contest,
          notifications_earnings,
          notifications_p2p,
          notifications_chat,
          notifications_team,
          notifications_system,
          security_alerts,
          app_lock_enabled,
          show_online_status,
          show_local_currency,
          release_alerts,
          p2p_enabled,
          p2p_receive_enabled,
          p2p_alerts,
          preferred_language
        `)
        .eq('user_id', authUser.id)
        .single();

      if (fetchError) throw fetchError;

      if (data) {
        setSettingsData({
          notifications: {
            contest: data.notifications_contest ?? true,
            earnings: data.notifications_earnings ?? true,
            p2p: data.notifications_p2p ?? true,
            chat: data.notifications_chat ?? true,
            team: data.notifications_team ?? true,
            system: data.notifications_system ?? true,
          },
          security: {
            twoFactor: false, // Not implemented yet
            appLock: data.app_lock_enabled ?? false,
            securityAlerts: data.security_alerts ?? true,
            showOnline: data.show_online_status ?? true,
          },
          preferences: {
            showLocalCurrency: data.show_local_currency ?? true,
            releaseAlerts: data.release_alerts ?? true,
            p2pEnabled: data.p2p_enabled ?? true,
            p2pReceive: data.p2p_receive_enabled ?? true,
            p2pAlerts: data.p2p_alerts ?? true,
          },
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [authUser]);

  // Update settings
  const updateSettings = useCallback(async (category: keyof SettingsData, key: string, value: boolean) => {
    if (!authUser) return { success: false, error: new Error('Not authenticated') };

    try {
      const updateData: any = {};
      
      // Map settings to database fields
      const fieldMap: Record<string, string> = {
        'notifications.contest': 'notifications_contest',
        'notifications.earnings': 'notifications_earnings',
        'notifications.p2p': 'notifications_p2p',
        'notifications.chat': 'notifications_chat',
        'notifications.team': 'notifications_team',
        'notifications.system': 'notifications_system',
        'security.appLock': 'app_lock_enabled',
        'security.securityAlerts': 'security_alerts',
        'security.showOnline': 'show_online_status',
        'preferences.showLocalCurrency': 'show_local_currency',
        'preferences.releaseAlerts': 'release_alerts',
        'preferences.p2pEnabled': 'p2p_enabled',
        'preferences.p2pReceive': 'p2p_receive_enabled',
        'preferences.p2pAlerts': 'p2p_alerts',
      };
      
      const fieldKey = `${category}.${key}`;
      if (fieldMap[fieldKey]) {
        updateData[fieldMap[fieldKey]] = value;
        
        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('user_id', authUser.id);

        if (error) throw error;

        // Update local state
        setSettingsData(prev => ({
          ...prev,
          [category]: {
            ...prev[category],
            [key]: value,
          },
        }));

        return { success: true };
      }
      
      return { success: false, error: new Error('Invalid setting key') };
    } catch (error) {
      console.error('Error updating settings:', error);
      return { success: false, error: error as Error };
    }
  }, [authUser]);

  // Update language preference
  const updateLanguage = useCallback(async (language: string) => {
    if (!authUser) return { success: false, error: new Error('Not authenticated') };

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_language: language })
        .eq('user_id', authUser.id);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error updating language:', error);
      return { success: false, error: error as Error };
    }
  }, [authUser]);

  // Reset settings to defaults
  const resetSettings = useCallback(async () => {
    if (!authUser) return { success: false, error: new Error('Not authenticated') };

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          notifications_contest: true,
          notifications_earnings: true,
          notifications_p2p: true,
          notifications_chat: true,
          notifications_team: true,
          notifications_system: true,
          security_alerts: true,
          app_lock_enabled: false,
          show_online_status: true,
          show_local_currency: true,
          release_alerts: true,
          p2p_enabled: true,
          p2p_receive_enabled: true,
          p2p_alerts: true,
        })
        .eq('user_id', authUser.id);

      if (error) throw error;

      // Reset local state
      await fetchSettings();
      
      return { success: true };
    } catch (error) {
      console.error('Error resetting settings:', error);
      return { success: false, error: error as Error };
    }
  }, [authUser, fetchSettings]);

  // Get settings summary
  const getSettingsSummary = useCallback(() => {
    const totalSettings = Object.values(settingsData.notifications).length +
                          Object.values(settingsData.security).length +
                          Object.values(settingsData.preferences).length;
    
    const enabledSettings = Object.values(settingsData.notifications).filter(Boolean).length +
                          Object.values(settingsData.security).filter(Boolean).length +
                          Object.values(settingsData.preferences).filter(Boolean).length;

    const securityLevel = enabledSettings / totalSettings;

    return {
      totalSettings,
      enabledSettings,
      securityLevel,
      isHighSecurity: securityLevel > 0.7,
      isMediumSecurity: securityLevel > 0.4 && securityLevel <= 0.7,
      isLowSecurity: securityLevel <= 0.4,
    };
  }, [settingsData]);

  // Auto-fetch on mount
  useEffect(() => {
    if (!options.autoFetch) return;
    
    if (!authUser) {
      setIsLoading(false);
      return;
    }

    fetchSettings();
  }, [authUser, options.autoFetch, fetchSettings]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // State
    isLoading,
    settingsData,
    error,
    isRTL,
    
    // Actions
    fetchSettings,
    updateSettings,
    updateLanguage,
    resetSettings,
    getSettingsSummary,
    
    // Helpers
    toggleSetting: (category: keyof SettingsData, key: string) => {
      const currentValue = settingsData[category][key as keyof typeof settingsData[typeof category]];
      return updateSettings(category, key, !currentValue);
    },
    
    // Cleanup
    cleanup
  };
}
