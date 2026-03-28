import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBanner } from '@/contexts/BannerContext';

interface NotificationSettings {
  id: string;
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  in_app_enabled: boolean;
  contest_wins: boolean;
  contest_reminders: boolean;
  agent_requests: boolean;
  agent_approvals: boolean;
  donations_received: boolean;
  donation_confirmations: boolean;
  giving_hour_reminders: boolean;
  team_activities: boolean;
  p2p_orders: boolean;
  p2p_disputes: boolean;
  system_updates: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  daily_limit: number;
  hourly_limit: number;
  created_at: string;
  updated_at: string;
}

interface NotificationTemplate {
  id: string;
  type: string;
  event: string;
  language: string;
  title: string;
  body: string;
  action_text: string | null;
  action_url: string | null;
  variables: string[];
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export function useNotificationSettings() {
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useBanner();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch user notification settings
  const fetchSettings = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // If no settings exist, create default settings
      if (!data) {
        const defaultSettings = {
          user_id: user.id,
          push_enabled: true,
          email_enabled: true,
          in_app_enabled: true,
          contest_wins: true,
          contest_reminders: true,
          agent_requests: true,
          agent_approvals: true,
          donations_received: true,
          donation_confirmations: true,
          giving_hour_reminders: true,
          team_activities: true,
          p2p_orders: true,
          p2p_disputes: true,
          system_updates: false,
          quiet_hours_enabled: false,
          quiet_hours_start: '22:00:00',
          quiet_hours_end: '08:00:00',
          daily_limit: 20,
          hourly_limit: 5,
        };

        const { data: newSettings, error: insertError } = await supabase
          .from('user_notification_settings')
          .insert(defaultSettings)
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(newSettings);
      } else {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      showError('Failed to load notification settings');
    } finally {
      setIsLoading(false);
    }
  };

  // Update notification settings
  const updateSettings = async (updates: Partial<NotificationSettings>) => {
    if (!user || !settings) return;

    setIsUpdating(true);
    try {
      const { data, error } = await supabase
        .from('user_notification_settings')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setSettings(data);
      showSuccess('Notification settings updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      showError('Failed to update notification settings');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  // Fetch notification templates (for admin use)
  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching notification templates:', error);
    }
  };

  // Send notification
  const sendNotification = async (params: {
    userId: string;
    type: string;
    event: string;
    data: Record<string, any>;
    channels?: string[];
    scheduledAt?: string;
  }) => {
    try {
      // Get template
      const template = templates.find(
        t => t.type === params.type && t.event === params.event
      );

      if (!template) {
        console.warn(`No template found for ${params.type}:${params.event}`);
        return false;
      }

      // Render template with data
      const renderTemplate = (text: string, data: Record<string, any>) => {
        return text.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
      };

      const title = renderTemplate(template.title, params.data);
      const body = renderTemplate(template.body, params.data);
      const actionText = template.action_text ? renderTemplate(template.action_text, params.data) : null;
      const actionUrl = template.action_url ? renderTemplate(template.action_url, params.data) : null;

      // Add to queue
      const { error } = await supabase
        .from('notification_queue')
        .insert({
          user_id: params.userId,
          title,
          body,
          type: params.type,
          event: params.event,
          channels: params.channels || ['in_app', 'push'],
          scheduled_at: params.scheduledAt ? new Date(params.scheduledAt) : new Date(),
          data: params.data,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  };

  // Get notification analytics
  const getAnalytics = async (userId: string, days = 30) => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('notification_analytics')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: false });

      if (error) throw error;

      // Calculate metrics
      const analytics = {
        total: data?.length || 0,
        sent: data?.filter(n => n.event === 'sent').length || 0,
        delivered: data?.filter(n => n.event === 'delivered').length || 0,
        opened: data?.filter(n => n.event === 'opened').length || 0,
        clicked: data?.filter(n => n.event === 'clicked').length || 0,
        openRate: 0,
        clickRate: 0,
      };

      if (analytics.sent > 0) {
        analytics.openRate = (analytics.opened / analytics.sent) * 100;
        analytics.clickRate = (analytics.clicked / analytics.sent) * 100;
      }

      return analytics;
    } catch (error) {
      console.error('Error fetching notification analytics:', error);
      return null;
    }
  };

  useEffect(() => {
    if (user) {
      fetchSettings();
      fetchTemplates();
    }
  }, [user]);

  return {
    settings,
    templates,
    isLoading,
    isUpdating,
    fetchSettings,
    updateSettings,
    fetchTemplates,
    sendNotification,
    getAnalytics,
  };
}
