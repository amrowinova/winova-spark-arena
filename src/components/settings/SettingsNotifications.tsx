import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Bell, Smartphone, Mail, Trophy, DollarSign, Users, MessageCircle, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/integrations/supabase/client';

interface SettingsNotificationsProps {
  toggleStates: Record<string, boolean>;
  onToggleChange: (key: string, value: boolean) => void;
}

export function SettingsNotifications({
  toggleStates,
  onToggleChange
}: SettingsNotificationsProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { isGranted: pushGranted, isDenied: pushDenied, supported: pushSupported, requestPermission: requestPush } = usePushNotifications();
  const isRTL = language.direction === 'rtl';

  const notificationCategories = [
    {
      id: 'contest',
      title: isRTL ? 'المسابقات' : 'Contests',
      titleAr: 'المسابقات',
      description: isRTL ? 'إشعارات بدء المسابقات والفوز' : 'Contest start and win notifications',
      icon: Trophy,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      items: [
        {
          id: 'contestNotif',
          title: isRTL ? 'إشعارات المسابقات' : 'Contest Notifications',
          description: isRTL ? 'عند بدء مسابقة جديدة' : 'When new contest starts',
          enabled: toggleStates.contestNotif,
        },
        {
          id: 'releaseAlerts',
          title: isRTL ? 'تنبيهات الإفراج' : 'Release Alerts',
          description: isRTL ? 'عند إفراج الأرباح المقفلة' : 'When locked earnings are released',
          enabled: toggleStates.releaseAlerts,
        },
      ],
    },
    {
      id: 'earnings',
      title: isRTL ? 'الأرباح' : 'Earnings',
      titleAr: 'الأرباح',
      description: isRTL ? 'إشعارات الأرباح والمكافآت' : 'Earnings and rewards notifications',
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      items: [
        {
          id: 'earningsNotif',
          title: isRTL ? 'إشعارات الأرباح' : 'Earnings Notifications',
          description: isRTL ? 'عند كسب أرباح جديدة' : 'When new earnings are received',
          enabled: toggleStates.earningsNotif,
        },
        {
          id: 'showEarnings',
          title: isRTL ? 'عرض الأرباح' : 'Show Earnings',
          description: isRTL ? 'عرض ملخص الأرباح في الإشعارات' : 'Show earnings summary in notifications',
          enabled: toggleStates.showEarnings,
        },
      ],
    },
    {
      id: 'social',
      title: isRTL ? 'التواصل الاجتماعي' : 'Social',
      titleAr: 'التواصل الاجتماعي',
      description: isRTL ? 'إشعارات الدردشة والفريق' : 'Chat and team notifications',
      icon: MessageCircle,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      items: [
        {
          id: 'chatNotif',
          title: isRTL ? 'إشعارات الدردشة' : 'Chat Notifications',
          description: isRTL ? 'رسائل جديدة وإشعارات الدردشة' : 'New messages and chat notifications',
          enabled: toggleStates.chatNotif,
        },
        {
          id: 'teamNotif',
          title: isRTL ? 'إشعارات الفريق' : 'Team Notifications',
          description: isRTL ? 'نشاط الفريق وأرباحه' : 'Team activity and earnings',
          enabled: toggleStates.teamNotif,
        },
      ],
    },
    {
      id: 'p2p',
      title: isRTL ? 'P2P' : 'P2P',
      titleAr: 'P2P',
      description: isRTL ? 'إشعارات المعاملات P2P' : 'P2P transaction notifications',
      icon: Users,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      items: [
        {
          id: 'p2pNotif',
          title: isRTL ? 'إشعارات P2P' : 'P2P Notifications',
          description: isRTL ? 'عند طلبات المعاملات الجديدة' : 'When new transaction requests arrive',
          enabled: toggleStates.p2pNotif,
        },
        {
          id: 'p2pAlerts',
          title: isRTL ? 'تنبيهات P2P' : 'P2P Alerts',
          description: isRTL ? 'تنبيهات هامة للمعاملات' : 'Important transaction alerts',
          enabled: toggleStates.p2pAlerts,
        },
      ],
    },
    {
      id: 'system',
      title: isRTL ? 'النظام' : 'System',
      titleAr: 'النظام',
      description: isRTL ? 'إشعارات النظام والأمان' : 'System and security notifications',
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      items: [
        {
          id: 'systemNotif',
          title: isRTL ? 'إشعارات النظام' : 'System Notifications',
          description: isRTL ? 'تحديثات النظام والصيانة' : 'System updates and maintenance',
          enabled: toggleStates.systemNotif,
        },
        {
          id: 'securityAlerts',
          title: isRTL ? 'تنبيهات الأمان' : 'Security Alerts',
          description: isRTL ? 'نشاط الأمان وتسجيل الدخول' : 'Security activity and login alerts',
          enabled: toggleStates.securityAlerts,
        },
      ],
    },
  ];

  const handleToggle = (key: string, value: boolean) => {
    onToggleChange(key, value);
    
    // Save to database
    if (user) {
      const updateData: any = {};
      
      // Map notification keys to database fields
      const keyMap: Record<string, string> = {
        'contestNotif': 'notifications_contest',
        'earningsNotif': 'notifications_earnings',
        'p2pNotif': 'notifications_p2p',
        'chatNotif': 'notifications_chat',
        'teamNotif': 'notifications_team',
        'systemNotif': 'notifications_system',
      };
      
      if (keyMap[key]) {
        updateData[keyMap[key]] = value;
        
        supabase
          .from('profiles')
          .update(updateData)
          .eq('user_id', user.id)
          .catch(console.error);
      }
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">
        {isRTL ? 'الإشعارات والتنبيهات' : 'Notifications & Alerts'}
      </h3>

      {/* Browser Push Notifications */}
      {pushSupported && (
        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <h4 className="font-medium text-foreground">
                  {isRTL ? 'إشعارات المتصفح' : 'Browser Notifications'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'استقبل إشعارات حتى عند إغلاق التطبيق' : 'Receive notifications even when app is closed'}
                </p>
              </div>
              <Badge variant={pushGranted ? "default" : pushDenied ? "destructive" : "secondary"}>
                {pushGranted ? (
                  <span>{isRTL ? 'مفعّل' : 'Enabled'}</span>
                ) : pushDenied ? (
                  <span>{isRTL ? 'محظور' : 'Blocked'}</span>
                ) : (
                  <span>{isRTL ? 'غير مفعّل' : 'Disabled'}</span>
                )}
              </Badge>
            </div>
            
            {!pushGranted && !pushDenied && (
              <Button onClick={requestPush} className="w-full">
                <Bell className="h-4 w-4 mr-2" />
                {isRTL ? 'تفعيل الإشعارات' : 'Enable Notifications'}
              </Button>
            )}
            
            {pushDenied && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <p className="text-sm text-red-700">
                  {isRTL 
                    ? 'الإشعارات محظورة من المتصفح. قم بتغيير الإعدادات في المتصفح.'
                    : 'Notifications are blocked in browser. Change settings in browser.'
                  }
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Notification Categories */}
      <div className="space-y-3">
        {notificationCategories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="overflow-hidden">
              <div className={`p-4 ${category.bgColor} ${category.borderColor} border-b`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${category.bgColor} flex items-center justify-center`}>
                    <category.icon className={`h-5 w-5 ${category.color}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">
                      {isRTL ? category.titleAr : category.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {isRTL ? category.description : category.description}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 space-y-2">
                {category.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <Switch
                      checked={item.enabled}
                      onCheckedChange={(value) => handleToggle(item.id, value)}
                    />
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Notification Summary */}
      <Card className="p-4 bg-muted/30">
        <h4 className="font-medium text-foreground mb-2">
          {isRTL ? 'ملخص الإشعارات' : 'Notification Summary'}
        </h4>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            {isRTL 
              ? '🔔 يمكنك التحكم في جميع أنواع الإشعارات من هنا.'
              : '🔔 You can control all notification types from here.'
            }
          </p>
          <p>
            {isRTL 
              ? '📱 الإشعارات الفورية تعمل فقط إذا كانت مفعّلة في المتصفح.'
              : '📱 Push notifications only work if enabled in browser.'
            }
          </p>
        </div>
      </Card>
    </div>
  );
}
