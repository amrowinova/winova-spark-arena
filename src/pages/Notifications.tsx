import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Bell, 
  Send, 
  Download, 
  RefreshCw, 
  Trophy, 
  Vote, 
  Users, 
  Star,
  Clock,
  CheckCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications, NotificationType } from '@/contexts/NotificationContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'transfer_received':
      return { icon: Download, color: 'text-success', bg: 'bg-success/10' };
    case 'transfer_sent':
      return { icon: Send, color: 'text-primary', bg: 'bg-primary/10' };
    case 'convert_nova_aura':
      return { icon: RefreshCw, color: 'text-purple-500', bg: 'bg-purple-500/10' };
    case 'contest_entry':
    case 'contest_reminder':
      return { icon: Clock, color: 'text-warning', bg: 'bg-warning/10' };
    case 'contest_win':
    case 'contest_qualify':
      return { icon: Trophy, color: 'text-warning', bg: 'bg-warning/10' };
    case 'vote_received':
    case 'vote_sent':
      return { icon: Vote, color: 'text-purple-500', bg: 'bg-purple-500/10' };
    case 'team_join':
    case 'team_activity':
      return { icon: Users, color: 'text-success', bg: 'bg-success/10' };
    case 'system':
    default:
      return { icon: Star, color: 'text-primary', bg: 'bg-primary/10' };
  }
};

const formatTimeAgo = (date: Date, language: string): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (language === 'ar') {
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays === 1) return 'أمس';
    return `منذ ${diffDays} أيام`;
  } else {
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  }
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();

  // Mark all as read when page opens
  useEffect(() => {
    if (unreadCount > 0) {
      markAllAsRead();
    }
  }, []);

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    markAsRead(notification.id);
    if (notification.actionPath) {
      navigate(notification.actionPath);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-9 w-9 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold">
                {language === 'ar' ? 'الإشعارات' : 'Notifications'}
              </h1>
            </div>
          </div>
          
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              {language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all read'}
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="px-4 py-4">
        {notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">
              {language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' 
                ? 'ستظهر إشعاراتك هنا' 
                : 'Your notifications will appear here'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification, index) => {
              const { icon: Icon, color, bg } = getNotificationIcon(notification.type);
              
              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all',
                    notification.read 
                      ? 'bg-card border-border' 
                      : 'bg-primary/5 border-primary/20',
                    notification.actionPath && 'hover:bg-muted/50'
                  )}
                >
                  {/* Icon */}
                  <div className={cn('h-10 w-10 rounded-full flex items-center justify-center shrink-0', bg)}>
                    <Icon className={cn('h-5 w-5', color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={cn(
                        'font-medium text-sm',
                        !notification.read && 'font-semibold'
                      )}>
                        {language === 'ar' ? notification.titleAr : notification.title}
                      </h4>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatTimeAgo(notification.timestamp, language)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {language === 'ar' ? notification.descriptionAr : notification.description}
                    </p>
                  </div>

                  {/* Unread indicator */}
                  {!notification.read && (
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
