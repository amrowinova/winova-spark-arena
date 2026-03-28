import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bell, BellOff, Clock, Smartphone, Mail, MessageSquare, 
  Trophy, Store, Heart, Users, ArrowLeftRight, Shield,
  ChevronLeft, Save, Volume2, VolumeX
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export default function NotificationSettings() {
  const { language } = useLanguage();
  const { settings, isLoading, isUpdating, updateSettings } = useNotificationSettings();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  const [localSettings, setLocalSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

  const handleBack = () => {
    navigate('/settings');
  };

  const handleToggle = (field: keyof typeof localSettings, value: boolean) => {
    setLocalSettings(prev => prev ? { ...prev, [field]: value } : null);
    setHasChanges(true);
  };

  const handleInputChange = (field: keyof typeof localSettings, value: string | number) => {
    setLocalSettings(prev => prev ? { ...prev, [field]: value } : null);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!localSettings || !settings) return;

    const success = await updateSettings(localSettings);
    if (success) {
      setHasChanges(false);
    }
  };

  const handleReset = () => {
    setLocalSettings(settings);
    setHasChanges(false);
  };

  if (isLoading || !localSettings) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <InnerPageHeader title={isRTL ? 'إعدادات الإشعارات' : 'Notification Settings'} />
        <main className="flex-1 p-4 pb-20">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const NotificationToggle = ({ 
    icon: Icon, 
    title, 
    description, 
    field, 
    enabled 
  }: {
    icon: any;
    title: string;
    description: string;
    field: keyof typeof localSettings;
    enabled: boolean;
  }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${enabled ? 'bg-blue-100' : 'bg-gray-100'}`}>
          <Icon className={`w-4 h-4 ${enabled ? 'text-blue-600' : 'text-gray-500'}`} />
        </div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={(checked) => handleToggle(field, checked)}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <InnerPageHeader title={isRTL ? 'إعدادات الإشعارات' : 'Notification Settings'} />
      
      <main className="flex-1 p-4 space-y-6 pb-20">
        {/* Back button */}
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          {isRTL ? 'العودة' : 'Back'}
        </Button>

        {/* General Settings */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {isRTL ? 'الإعدادات العامة' : 'General Settings'}
          </h3>
          
          <div className="space-y-1">
            <NotificationToggle
              icon={Smartphone}
              title={isRTL ? 'الإشعارات الفورية' : 'Push Notifications'}
              description={isRTL ? 'استلام الإشعارات على جهازك' : 'Receive notifications on your device'}
              field="push_enabled"
              enabled={localSettings.push_enabled}
            />
            
            <NotificationToggle
              icon={Mail}
              title={isRTL ? 'البريد الإلكتروني' : 'Email Notifications'}
              description={isRTL ? 'استلام الإشعارات عبر البريد' : 'Receive notifications via email'}
              field="email_enabled"
              enabled={localSettings.email_enabled}
            />
            
            <NotificationToggle
              icon={MessageSquare}
              title={isRTL ? 'إشعارات التطبيق' : 'In-App Notifications'}
              description={isRTL ? 'إشعارات داخل التطبيق' : 'Notifications inside the app'}
              field="in_app_enabled"
              enabled={localSettings.in_app_enabled}
            />
          </div>
        </Card>

        {/* Event Types */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            {isRTL ? 'أنواع الإشعارات' : 'Notification Types'}
          </h3>
          
          <div className="space-y-1">
            <NotificationToggle
              icon={Trophy}
              title={isRTL ? 'الفوز في المسابقات' : 'Contest Wins'}
              description={isRTL ? 'عند الفوز في مسابقة' : 'When winning a contest'}
              field="contest_wins"
              enabled={localSettings.contest_wins}
            />
            
            <NotificationToggle
              icon={Clock}
              title={isRTL ? 'تذكيرات المسابقات' : 'Contest Reminders'}
              description={isRTL ? 'قبل بدء المسابقات' : 'Before contests start'}
              field="contest_reminders"
              enabled={localSettings.contest_reminders}
            />
            
            <NotificationToggle
              icon={Store}
              title={isRTL ? 'طلبات الوكلاء' : 'Agent Requests'}
              description={isRTL ? 'طلبات جديدة وتحديثات الوكلاء' : 'New agent requests and updates'}
              field="agent_requests"
              enabled={localSettings.agent_requests}
            />
            
            <NotificationToggle
              icon={Shield}
              title={isRTL ? 'موافقة الطلب' : 'Application Approvals'}
              description={isRTL ? 'عند الموافقة على طلبك' : 'When your application is approved'}
              field="agent_approvals"
              enabled={localSettings.agent_approvals}
            />
            
            <NotificationToggle
              icon={Heart}
              title={isRTL ? 'التبرعات' : 'Donations'}
              description={isRTL ? 'تأكيدات التبرع والشكر' : 'Donation confirmations and thanks'}
              field="donations_received"
              enabled={localSettings.donations_received}
            />
            
            <NotificationToggle
              icon={Heart}
              title={isRTL ? 'ساعة العطاء' : 'Giving Hour'}
              description={isRTL ? 'تذكيرات ساعة العطاء' : 'Giving hour reminders'}
              field="giving_hour_reminders"
              enabled={localSettings.giving_hour_reminders}
            />
            
            <NotificationToggle
              icon={Users}
              title={isRTL ? 'نشاط الفريق' : 'Team Activities'}
              description={isRTL ? 'تحديثات الفريق والأعضاء' : 'Team updates and member activities'}
              field="team_activities"
              enabled={localSettings.team_activities}
            />
            
            <NotificationToggle
              icon={ArrowLeftRight}
              title={isRTL ? 'طلبات P2P' : 'P2P Orders'}
              description={isRTL ? 'إشعارات الطلبات والنزاعات' : 'Order and dispute notifications'}
              field="p2p_orders"
              enabled={localSettings.p2p_orders}
            />
          </div>
        </Card>

        {/* Quiet Hours */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {isRTL ? 'ساعات الراحة' : 'Quiet Hours'}
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{isRTL ? 'تفعيل ساعات الراحة' : 'Enable Quiet Hours'}</p>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'عدم إزعاجك في أوقات محددة' : 'Don\'t disturb during specific times'}
                </p>
              </div>
              <Switch
                checked={localSettings.quiet_hours_enabled}
                onCheckedChange={(checked) => handleToggle('quiet_hours_enabled', checked)}
              />
            </div>
            
            {localSettings.quiet_hours_enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quiet-hours-start">
                    {isRTL ? 'وقت البدء' : 'Start Time'}
                  </Label>
                  <Input
                    id="quiet-hours-start"
                    type="time"
                    value={localSettings.quiet_hours_start?.substring(0, 5)}
                    onChange={(e) => handleInputChange('quiet_hours_start', e.target.value + ':00')}
                  />
                </div>
                <div>
                  <Label htmlFor="quiet-hours-end">
                    {isRTL ? 'وقت الانتهاء' : 'End Time'}
                  </Label>
                  <Input
                    id="quiet-hours-end"
                    type="time"
                    value={localSettings.quiet_hours_end?.substring(0, 5)}
                    onChange={(e) => handleInputChange('quiet_hours_end', e.target.value + ':00')}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Frequency Limits */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            {isRTL ? 'الحدود اليومية' : 'Daily Limits'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="daily-limit">
                {isRTL ? 'الحد الأقصى يومياً' : 'Maximum Daily Notifications'}
              </Label>
              <Input
                id="daily-limit"
                type="number"
                min="1"
                max="100"
                value={localSettings.daily_limit}
                onChange={(e) => handleInputChange('daily_limit', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {isRTL ? 'الحد الأقصى للإشعارات في اليوم' : 'Maximum notifications per day'}
              </p>
            </div>
            
            <div>
              <Label htmlFor="hourly-limit">
                {isRTL ? 'الحد الأقصى ساعياً' : 'Maximum Hourly Notifications'}
              </Label>
              <Input
                id="hourly-limit"
                type="number"
                min="1"
                max="20"
                value={localSettings.hourly_limit}
                onChange={(e) => handleInputChange('hourly_limit', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {isRTL ? 'الحد الأقصى للإشعارات في الساعة' : 'Maximum notifications per hour'}
              </p>
            </div>
          </div>
        </Card>

        {/* Save/Reset Actions */}
        {hasChanges && (
          <Card className="p-4">
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isUpdating} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                {isUpdating ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ التغييرات' : 'Save Changes')}
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={isUpdating}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </Card>
        )}
      </main>
      
      <BottomNav />
    </div>
  );
}
