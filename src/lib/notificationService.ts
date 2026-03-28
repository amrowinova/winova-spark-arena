import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface NotificationData {
  user_name?: string;
  amount?: string | number;
  prize_amount?: string | number;
  contest_name?: string;
  shop_name?: string;
  family_name?: string;
  order_type?: string;
  member_name?: string;
  minutes?: string | number;
  [key: string]: any;
}

class NotificationService {
  private static instance: NotificationService;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Send notification to a specific user
   */
  async sendNotification(params: {
    userId: string;
    type: string;
    event: string;
    data: NotificationData;
    channels?: string[];
    scheduledAt?: string;
  }): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('send_notification', {
        p_user_id: params.userId,
        p_type: params.type,
        p_event: params.event,
        p_data: params.data,
        p_channels: params.channels || ['in_app', 'push'],
        p_scheduled_at: params.scheduledAt || null,
      });

      if (error) {
        console.error('Error sending notification:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendBulkNotifications(params: {
    userIds: string[];
    type: string;
    event: string;
    data: NotificationData;
    channels?: string[];
    scheduledAt?: string;
  }): Promise<number> {
    let successCount = 0;
    
    for (const userId of params.userIds) {
      const success = await this.sendNotification({
        userId,
        type: params.type,
        event: params.event,
        data: params.data,
        channels: params.channels,
        scheduledAt: params.scheduledAt,
      });
      
      if (success) successCount++;
    }

    return successCount;
  }

  /**
   * Contest win notification
   */
  async notifyContestWin(params: {
    userId: string;
    userName: string;
    prizeAmount: number;
    contestName: string;
  }): Promise<boolean> {
    return this.sendNotification({
      userId: params.userId,
      type: 'push',
      event: 'contest_win',
      data: {
        user_name: params.userName,
        prize_amount: params.prizeAmount.toString(),
        contest_name: params.contestName,
      },
      channels: ['push', 'in_app'],
    });
  }

  /**
   * Contest reminder notification
   */
  async notifyContestReminder(params: {
    userIds: string[];
    contestName: string;
    minutesUntilStart: number;
  }): Promise<number> {
    return this.sendBulkNotifications({
      userIds: params.userIds,
      type: 'push',
      event: 'contest_reminder',
      data: {
        contest_name: params.contestName,
        minutes: params.minutesUntilStart.toString(),
      },
      channels: ['push', 'in_app'],
    });
  }

  /**
   * Agent application received notification (for admin)
   */
  async notifyAgentApplicationReceived(params: {
    adminIds: string[];
    shopName: string;
  }): Promise<number> {
    return this.sendBulkNotifications({
      userIds: params.adminIds,
      type: 'push',
      event: 'agent_request_received',
      data: {
        shop_name: params.shopName,
      },
      channels: ['in_app', 'push'],
    });
  }

  /**
   * Agent application approved notification
   */
  async notifyAgentApplicationApproved(params: {
    userId: string;
    shopName: string;
  }): Promise<boolean> {
    return this.sendNotification({
      userId: params.userId,
      type: 'push',
      event: 'agent_approved',
      data: {
        shop_name: params.shopName,
      },
      channels: ['push', 'in_app'],
    });
  }

  /**
   * Donation received notification
   */
  async notifyDonationReceived(params: {
    userId: string;
    amount: number;
    familyName: string;
  }): Promise<boolean> {
    return this.sendNotification({
      userId: params.userId,
      type: 'push',
      event: 'donation_received',
      data: {
        amount: params.amount.toString(),
        family_name: params.familyName,
      },
      channels: ['push', 'in_app'],
    });
  }

  /**
   * Giving hour reminder notification
   */
  async notifyGivingHourReminder(params: {
    userIds: string[];
    minutesUntilStart: number;
  }): Promise<number> {
    return this.sendBulkNotifications({
      userIds: params.userIds,
      type: 'push',
      event: 'giving_hour_reminder',
      data: {
        minutes: params.minutesUntilStart.toString(),
      },
      channels: ['push', 'in_app'],
    });
  }

  /**
   * P2P order created notification
   */
  async notifyP2POrderCreated(params: {
    userId: string;
    orderType: string;
    amount: number;
  }): Promise<boolean> {
    return this.sendNotification({
      userId: params.userId,
      type: 'push',
      event: 'p2p_order_created',
      data: {
        order_type: params.orderType,
        amount: params.amount.toString(),
      },
      channels: ['push', 'in_app'],
    });
  }

  /**
   * Team member joined notification
   */
  async notifyTeamMemberJoined(params: {
    userIds: string[];
    memberName: string;
  }): Promise<number> {
    return this.sendBulkNotifications({
      userIds: params.userIds,
      type: 'push',
      event: 'team_member_joined',
      data: {
        member_name: params.memberName,
      },
      channels: ['in_app'],
    });
  }

  /**
   * Track notification interaction
   */
  async trackInteraction(params: {
    notificationId: string;
    event: 'opened' | 'clicked' | 'dismissed';
    deviceInfo?: Record<string, any>;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('track_notification_interaction', {
        p_notification_id: params.notificationId,
        p_event: params.event,
        p_device_info: params.deviceInfo || null,
        p_user_agent: params.userAgent || null,
        p_ip_address: params.ipAddress || null,
      });

      if (error) {
        console.error('Error tracking notification interaction:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error tracking notification interaction:', error);
      return false;
    }
  }

  /**
   * Get notification analytics for a user
   */
  async getUserAnalytics(userId: string, days = 30) {
    try {
      const { data, error } = await supabase.rpc('get_notification_analytics', {
        p_user_id: userId,
        p_days: days,
      });

      if (error) {
        console.error('Error fetching notification analytics:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching notification analytics:', error);
      return null;
    }
  }

  /**
   * Process notification queue (for admin/cron jobs)
   */
  async processQueue(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('process_notification_queue');

      if (error) {
        console.error('Error processing notification queue:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error processing notification queue:', error);
      return 0;
    }
  }

  /**
   * Schedule contest reminders (for cron jobs)
   */
  async scheduleContestReminders(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('schedule_contest_reminders');

      if (error) {
        console.error('Error scheduling contest reminders:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error scheduling contest reminders:', error);
      return 0;
    }
  }

  /**
   * Schedule giving hour reminders (for cron jobs)
   */
  async scheduleGivingHourReminders(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('schedule_giving_hour_reminders');

      if (error) {
        console.error('Error scheduling giving hour reminders:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error scheduling giving hour reminders:', error);
      return 0;
    }
  }
}

export const notificationService = NotificationService.getInstance();
