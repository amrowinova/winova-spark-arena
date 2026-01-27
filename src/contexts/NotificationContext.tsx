import { createContext, useContext, useState, ReactNode } from 'react';

export type NotificationType = 
  | 'transfer_received' 
  | 'transfer_sent' 
  | 'convert_nova_aura'
  | 'contest_entry'
  | 'contest_reminder'
  | 'contest_win'
  | 'contest_qualify'
  | 'vote_received'
  | 'vote_sent'
  | 'team_join'
  | 'team_activity'
  | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  timestamp: Date;
  read: boolean;
  actionPath?: string;
  actionData?: Record<string, unknown>;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAllAsRead: () => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Mock initial notifications
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'transfer_received',
    title: 'Nova Received',
    titleAr: 'استلمت Nova',
    description: 'You received 50 Nova from @ahmed_k',
    descriptionAr: 'استلمت 50 Nova من @ahmed_k',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
    read: false,
    actionPath: '/wallet',
  },
  {
    id: '2',
    type: 'vote_received',
    title: 'New Vote!',
    titleAr: 'صوت جديد!',
    description: '@sara_m voted for you in the daily contest',
    descriptionAr: '@sara_m صوّتت لك في المسابقة اليومية',
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
    read: false,
    actionPath: '/contests',
  },
  {
    id: '3',
    type: 'contest_reminder',
    title: 'Contest Closing Soon',
    titleAr: 'المسابقة تغلق قريباً',
    description: 'Daily contest closes in 30 minutes',
    descriptionAr: 'المسابقة اليومية تغلق بعد 30 دقيقة',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    read: false,
    actionPath: '/contests',
  },
  {
    id: '4',
    type: 'team_join',
    title: 'New Team Member',
    titleAr: 'عضو جديد في الفريق',
    description: '@layla_h joined your direct team',
    descriptionAr: '@layla_h انضمت لفريقك المباشر',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    read: true,
    actionPath: '/team',
  },
  {
    id: '5',
    type: 'contest_qualify',
    title: 'You Qualified!',
    titleAr: 'تأهلت!',
    description: 'Congratulations! You made it to Top 50',
    descriptionAr: 'مبروك! تأهلت لأفضل 50',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    read: true,
    actionPath: '/contests',
  },
  {
    id: '6',
    type: 'convert_nova_aura',
    title: 'Conversion Complete',
    titleAr: 'اكتمل التحويل',
    description: 'Converted 10 Nova to 20 Aura',
    descriptionAr: 'تم تحويل 10 Nova إلى 20 Aura',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
    read: true,
    actionPath: '/wallet',
  },
  {
    id: '7',
    type: 'system',
    title: 'Welcome to Winova!',
    titleAr: 'مرحباً بك في Winova!',
    description: 'Start your journey to win amazing prizes',
    descriptionAr: 'ابدأ رحلتك للفوز بجوائز مذهلة',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    read: true,
  },
];

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAllAsRead,
      markAsRead,
      clearAll,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
