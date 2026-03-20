import { useState, useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { PINSetupDialog } from '@/components/security/PINSetupDialog';
import { useNavigate } from 'react-router-dom';
import { 
  User, Lock, Shield, Eye, Bell, Wallet, ArrowLeftRight, Info,
  ChevronRight, ChevronDown, Key, Smartphone, Mail, Phone, UserX, Trash2,
  Fingerprint, Monitor, History, AlertTriangle, MessageCircle, Users,
  Trophy, DollarSign, Globe, ToggleLeft, Gavel, Headphones, FileText,
  CheckCircle
} from 'lucide-react';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBanner } from '@/contexts/BannerContext';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';

interface SettingItem {
  id: string;
  icon: React.ElementType;
  titleEn: string;
  titleAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  type: 'link' | 'toggle' | 'info';
  value?: boolean;
  comingSoon?: boolean;
  destructive?: boolean;
  verified?: boolean;
  route?: string;
}

interface SettingSection {
  id: string;
  icon: React.ElementType;
  emoji: string;
  titleEn: string;
  titleAr: string;
  items: SettingItem[];
}

export default function Settings() {
  const { currentLanguage } = useLanguage();
  const isRTL = currentLanguage.direction === 'rtl';
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useBanner();
  const { isGranted: pushGranted, isDenied: pushDenied, supported: pushSupported, requestPermission: requestPush } = usePushNotifications();
  const [pinSetupOpen, setPinSetupOpen] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(['account']);
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({
    '2fa': false,
    'securityAlerts': true,
    'appLock': false,
    'showOnline': true,
    'showEarnings': true,
    'contestNotif': true,
    'earningsNotif': true,
    'p2pNotif': true,
    'chatNotif': true,
    'teamNotif': true,
    'systemNotif': true,
    'showLocalCurrency': true,
    'releaseAlerts': true,
    'p2pEnabled': true,
    'p2pReceive': true,
    'p2pAlerts': true,
  });

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Load saved settings from DB
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('notifications_contest, notifications_earnings, notifications_p2p, notifications_chat, notifications_team, notifications_system, preferred_language')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setToggleStates(prev => ({
            ...prev,
            contestNotif: data.notifications_contest ?? true,
            earningsNotif: data.notifications_earnings ?? true,
            p2pNotif: data.notifications_p2p ?? true,
            chatNotif: data.notifications_chat ?? true,
            teamNotif: data.notifications_team ?? true,
            systemNotif: data.notifications_system ?? true,
          }));
        }
      });
  }, [user]);

  // Map toggle IDs to DB column names
  const toggleToColumn: Record<string, string> = {
    contestNotif: 'notifications_contest',
    earningsNotif: 'notifications_earnings',
    p2pNotif: 'notifications_p2p',
    chatNotif: 'notifications_chat',
    teamNotif: 'notifications_team',
    systemNotif: 'notifications_system',
  };

  const handleToggle = async (itemId: string) => {
    const newValue = !toggleStates[itemId];
    setToggleStates(prev => ({ ...prev, [itemId]: newValue }));

    // Persist to DB if it's a notification toggle
    const column = toggleToColumn[itemId];
    if (column && user) {
      const { error } = await supabase
        .from('profiles')
        .update({ [column]: newValue })
        .eq('user_id', user.id);

      if (error) {
        // Revert on failure
        setToggleStates(prev => ({ ...prev, [itemId]: !newValue }));
        showError(isRTL ? 'فشل حفظ الإعداد' : 'Failed to save setting');
      }
    }
  };

  const settingsSections: SettingSection[] = [
    {
      id: 'account',
      icon: User,
      emoji: '👤',
      titleEn: 'Account',
      titleAr: 'الحساب',
      items: [
        { id: 'accountInfo', icon: User, titleEn: 'Account Info', titleAr: 'معلومات الحساب', descriptionEn: 'Name, photo, username', descriptionAr: 'الاسم، الصورة، اسم المستخدم', type: 'link', comingSoon: true },
        { id: 'changePassword', icon: Key, titleEn: 'Change Password', titleAr: 'تغيير كلمة المرور', type: 'link', comingSoon: true },
        { id: 'loginMethods', icon: Smartphone, titleEn: 'Login Methods', titleAr: 'وسائل تسجيل الدخول', descriptionEn: 'Google, Apple, Email', descriptionAr: 'Google, Apple, البريد', type: 'link', comingSoon: true },
        { id: 'verifyEmail', icon: Mail, titleEn: 'Verify Email', titleAr: 'توثيق البريد الإلكتروني', type: 'link', verified: true, comingSoon: true },
        { id: 'verifyPhone', icon: Phone, titleEn: 'Verify Phone', titleAr: 'توثيق رقم الهاتف', descriptionEn: 'Optional', descriptionAr: 'اختياري', type: 'link', comingSoon: true },
        { id: 'disableAccount', icon: UserX, titleEn: 'Disable Account', titleAr: 'تعطيل الحساب', type: 'link', destructive: true, comingSoon: true },
        { id: 'deleteAccount', icon: Trash2, titleEn: 'Delete Account', titleAr: 'حذف الحساب', type: 'link', destructive: true, comingSoon: true },
      ]
    },
    {
      id: 'security',
      icon: Shield,
      emoji: '🔐',
      titleEn: 'Security',
      titleAr: 'الأمان',
      items: [
        { id: 'transactionPin', icon: Lock, titleEn: 'Transaction PIN', titleAr: 'رمز PIN للعمليات', descriptionEn: '6-digit PIN for transfers & P2P', descriptionAr: 'رمز سري 6 أرقام للتحويلات وP2P', type: 'link' },
        { id: '2fa', icon: Lock, titleEn: 'Two-Factor Authentication', titleAr: 'التحقق بخطوتين', type: 'toggle', value: false, comingSoon: true },
        { id: 'connectedDevices', icon: Monitor, titleEn: 'Connected Devices', titleAr: 'الأجهزة المتصلة', type: 'link', comingSoon: true },
        { id: 'loginHistory', icon: History, titleEn: 'Login History', titleAr: 'سجل تسجيل الدخول', type: 'link', comingSoon: true },
        { id: 'securityAlerts', icon: AlertTriangle, titleEn: 'Security Alerts', titleAr: 'تنبيهات الأمان', type: 'toggle', value: true, comingSoon: true },
        { id: 'appLock', icon: Fingerprint, titleEn: 'App Lock (Biometrics)', titleAr: 'قفل التطبيق (بصمة/وجه)', descriptionEn: 'Face ID / Touch ID', descriptionAr: 'Face ID / Touch ID', type: 'toggle', value: false, comingSoon: true },
      ]
    },
    {
      id: 'privacy',
      icon: Eye,
      emoji: '🔒',
      titleEn: 'Privacy',
      titleAr: 'الخصوصية',
      items: [
        { id: 'whoCanMessage', icon: MessageCircle, titleEn: 'Who Can Message Me', titleAr: 'من يمكنه مراسلتي', type: 'link', comingSoon: true },
        { id: 'whoCanP2P', icon: ArrowLeftRight, titleEn: 'Who Can Send P2P Requests', titleAr: 'من يمكنه إرسال طلبات P2P', type: 'link', comingSoon: true },
        { id: 'showOnline', icon: Eye, titleEn: 'Show Online Status', titleAr: 'إظهار الحالة', descriptionEn: 'Online / Last seen', descriptionAr: 'متصل / آخر ظهور', type: 'toggle', value: true, comingSoon: true },
        { id: 'showEarnings', icon: DollarSign, titleEn: 'Show Earnings', titleAr: 'إظهار الأرباح', type: 'toggle', value: true, comingSoon: true },
        { id: 'blockedUsers', icon: UserX, titleEn: 'Blocked Users', titleAr: 'المستخدمون المحظورون', type: 'link', comingSoon: true },
      ]
    },
    {
      id: 'notifications',
      icon: Bell,
      emoji: '🔔',
      titleEn: 'Notifications',
      titleAr: 'الإشعارات',
      items: [
        { id: 'contestNotif', icon: Trophy, titleEn: 'Contest Notifications', titleAr: 'إشعارات المسابقات', type: 'toggle', value: true },
        { id: 'earningsNotif', icon: DollarSign, titleEn: 'Earnings & Votes', titleAr: 'الأرباح والتصويت', type: 'toggle', value: true },
        { id: 'p2pNotif', icon: ArrowLeftRight, titleEn: 'P2P Notifications', titleAr: 'إشعارات P2P', type: 'toggle', value: true },
        { id: 'chatNotif', icon: MessageCircle, titleEn: 'Chat Notifications', titleAr: 'إشعارات الدردشة', type: 'toggle', value: true },
        { id: 'teamNotif', icon: Users, titleEn: 'Team Notifications', titleAr: 'إشعارات الفريق', type: 'toggle', value: true },
        { id: 'systemNotif', icon: Bell, titleEn: 'System Notifications', titleAr: 'إشعارات النظام', type: 'toggle', value: true },
      ]
    },
    {
      id: 'wallet',
      icon: Wallet,
      emoji: '💰',
      titleEn: 'Wallet',
      titleAr: 'المحفظة',
      items: [
        { id: 'displayCurrency', icon: DollarSign, titleEn: 'Default Display Currency', titleAr: 'عملة العرض الافتراضية', type: 'link', comingSoon: true },
        { id: 'changeCountry', icon: Globe, titleEn: 'Change Country', titleAr: 'تغيير الدولة', descriptionEn: 'Changes currency only', descriptionAr: 'يغيّر العملة فقط', type: 'link', comingSoon: true },
        { id: 'showLocalCurrency', icon: Eye, titleEn: 'Show Local Currency Values', titleAr: 'إظهار القيم بالعملة المحلية', type: 'toggle', value: true, comingSoon: true },
        { id: 'releaseAlerts', icon: Bell, titleEn: 'Earnings Release Alerts', titleAr: 'تنبيهات الإفراج عن الأرباح', descriptionEn: '15th & 30th of each month', descriptionAr: '15 و30 من كل شهر', type: 'toggle', value: true, comingSoon: true },
      ]
    },
    {
      id: 'p2p',
      icon: ArrowLeftRight,
      emoji: '🤝',
      titleEn: 'P2P',
      titleAr: 'P2P',
      items: [
        { id: 'p2pEnabled', icon: ToggleLeft, titleEn: 'Enable P2P', titleAr: 'تفعيل P2P', type: 'toggle', value: true, comingSoon: true },
        { id: 'p2pReceive', icon: ArrowLeftRight, titleEn: 'Receive Requests', titleAr: 'استقبال الطلبات', type: 'toggle', value: true, comingSoon: true },
        { id: 'p2pAlerts', icon: Bell, titleEn: 'Transaction Alerts', titleAr: 'تنبيهات الصفقات', type: 'toggle', value: true, comingSoon: true },
        { id: 'p2pDisputes', icon: Gavel, titleEn: 'Disputes & Support', titleAr: 'النزاعات والتواصل مع الدعم', type: 'link', comingSoon: true },
      ]
    },
    {
      id: 'general',
      icon: Info,
      emoji: 'ℹ️',
      titleEn: 'General',
      titleAr: 'عام',
      items: [
        { id: 'aboutWinova', icon: Info, titleEn: 'About WINOVA', titleAr: 'عن WINOVA', type: 'link', comingSoon: true },
        { id: 'helpCenter', icon: Headphones, titleEn: 'Help Center', titleAr: 'مركز المساعدة', type: 'link', route: '/help' },
        { id: 'contactSupport', icon: MessageCircle, titleEn: 'Contact Support', titleAr: 'تواصل مع الدعم', type: 'link', route: '/contact' },
        { id: 'terms', icon: FileText, titleEn: 'Terms & Conditions', titleAr: 'الشروط والأحكام', type: 'link', route: '/terms' },
        { id: 'privacyPolicy', icon: Shield, titleEn: 'Privacy Policy', titleAr: 'سياسة الخصوصية', type: 'link', route: '/privacy' },
        { id: 'refundPolicy', icon: Wallet, titleEn: 'Refund Policy', titleAr: 'سياسة الاسترداد', type: 'link', route: '/refund' },
        { id: 'amlPolicy', icon: Shield, titleEn: 'Anti-Fraud Policy', titleAr: 'سياسة مكافحة الاحتيال', type: 'link', route: '/aml' },
        { id: 'appVersion', icon: Info, titleEn: 'App Version', titleAr: 'إصدار التطبيق', descriptionEn: 'v1.0.0', descriptionAr: 'v1.0.0', type: 'info' },
      ]
    },
  ];

  const renderSettingItem = (item: SettingItem) => {
    const Icon = item.icon;
    
    const handleClick = () => {
      if (item.id === 'transactionPin') { setPinSetupOpen(true); return; }
      if (!item.comingSoon && item.route) {
        navigate(item.route);
      }
    };
    
    return (
      <div
        key={item.id}
        onClick={handleClick}
        className={cn(
          "flex items-center gap-3 py-3 px-2 rounded-lg transition-all",
          item.comingSoon ? "opacity-60" : "hover:bg-muted/50 cursor-pointer",
          item.destructive && "text-destructive"
        )}
      >
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center",
          item.destructive ? "bg-destructive/10" : "bg-muted"
        )}>
          <Icon className="h-4 w-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("text-sm font-medium", item.destructive && "text-destructive")}>
              {isRTL ? item.titleAr : item.titleEn}
            </span>
            {item.verified && (
              <CheckCircle className="h-4 w-4 text-success" />
            )}
            {item.comingSoon && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                {isRTL ? 'قريباً' : 'Soon'}
              </Badge>
            )}
          </div>
          {(item.descriptionEn || item.descriptionAr) && (
            <p className="text-xs text-muted-foreground">
              {isRTL ? item.descriptionAr : item.descriptionEn}
            </p>
          )}
        </div>
        
        {item.type === 'toggle' && (
          <Switch
            checked={toggleStates[item.id] ?? item.value}
            onCheckedChange={() => !item.comingSoon && handleToggle(item.id)}
            disabled={item.comingSoon}
          />
        )}
        
        {item.type === 'link' && !item.comingSoon && (
          <ChevronRight className={cn("h-4 w-4 text-muted-foreground", isRTL && "rotate-180")} />
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InnerPageHeader title={isRTL ? 'الإعدادات والخصوصية' : 'Settings & Privacy'} />
      
      <motion.main 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex-1 pb-20"
      >
        <div className="p-4 space-y-3">
          {settingsSections.map((section) => {
            const isOpen = openSections.includes(section.id);
            const SectionIcon = section.icon;
            
            return (
              <Card key={section.id} className="overflow-hidden">
                <Collapsible open={isOpen} onOpenChange={() => toggleSection(section.id)}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                        {section.emoji}
                      </div>
                      <div className="flex-1 text-start">
                        <p className="font-semibold">
                          {isRTL ? section.titleAr : section.titleEn}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {section.items.length} {isRTL ? 'خيارات' : 'options'}
                        </p>
                      </div>
                      <ChevronDown className={cn(
                        "h-5 w-5 text-muted-foreground transition-transform",
                        isOpen && "rotate-180"
                      )} />
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <Separator />
                    <div className="p-3 space-y-1">
                      {section.id === 'notifications' && pushSupported && !pushGranted && (
                        <div className={`flex items-center gap-3 p-2 mb-2 rounded-lg ${pushDenied ? 'bg-red-50 border border-red-200' : 'bg-primary/5 border border-primary/20'}`}>
                          <Bell className="w-4 h-4 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">
                              {pushDenied
                                ? (isRTL ? 'الإشعارات محظورة من المتصفح' : 'Notifications blocked in browser')
                                : (isRTL ? 'إشعارات المتصفح غير مفعّلة' : 'Browser notifications not enabled')}
                            </p>
                            {!pushDenied && (
                              <p className="text-xs text-muted-foreground">
                                {isRTL ? 'فعّلها لتلقّي إشعارات فورية' : 'Enable to receive instant alerts'}
                              </p>
                            )}
                          </div>
                          {!pushDenied && (
                            <button
                              onClick={requestPush}
                              className="text-xs font-semibold text-primary shrink-0 hover:underline"
                            >
                              {isRTL ? 'تفعيل' : 'Enable'}
                            </button>
                          )}
                        </div>
                      )}
                      {section.items.map(renderSettingItem)}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      </motion.main>

      <BottomNav />

      <PINSetupDialog
        open={pinSetupOpen}
        onOpenChange={setPinSetupOpen}
      />
    </div>
  );
}
