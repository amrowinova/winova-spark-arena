import { Bell, Shield, ChevronRight, Lock, Eye, Sliders } from 'lucide-react';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function Settings() {
  const { currentLanguage } = useLanguage();
  const isRTL = currentLanguage.direction === 'rtl';

  const settingsSections = [
    {
      id: 'password',
      icon: Lock,
      emoji: '🔐',
      titleEn: 'Change Password',
      titleAr: 'تغيير كلمة المرور',
      descriptionEn: 'Update your account password',
      descriptionAr: 'تحديث كلمة مرور حسابك',
      action: () => {},
      comingSoon: true,
    },
    {
      id: 'security',
      icon: Shield,
      emoji: '🔒',
      titleEn: 'Account Security',
      titleAr: 'أمان الحساب',
      descriptionEn: '2FA, login history, and devices',
      descriptionAr: 'المصادقة الثنائية وسجل الدخول والأجهزة',
      action: () => {},
      comingSoon: true,
    },
    {
      id: 'notifications',
      icon: Bell,
      emoji: '🔔',
      titleEn: 'Notifications',
      titleAr: 'الإشعارات',
      descriptionEn: 'Push, email, and in-app notifications',
      descriptionAr: 'إشعارات التطبيق والبريد الإلكتروني',
      action: () => {},
      comingSoon: true,
    },
    {
      id: 'privacy',
      icon: Eye,
      emoji: '👁️',
      titleEn: 'Privacy',
      titleAr: 'الخصوصية',
      descriptionEn: 'Profile visibility and data sharing',
      descriptionAr: 'إعدادات الخصوصية ومشاركة البيانات',
      action: () => {},
      comingSoon: true,
    },
    {
      id: 'preferences',
      icon: Sliders,
      emoji: '⚙️',
      titleEn: 'App Preferences',
      titleAr: 'تفضيلات التطبيق',
      descriptionEn: 'Theme, display, and other options',
      descriptionAr: 'المظهر والعرض وخيارات أخرى',
      action: () => {},
      comingSoon: true,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InnerPageHeader title={isRTL ? 'الإعدادات' : 'Settings'} />
      
      <motion.main 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex-1 pb-20"
      >
        <div className="p-4 space-y-2">
          {settingsSections.map((section) => {
            return (
              <Card
                key={section.id}
                className={cn(
                  "p-4 transition-all",
                  section.comingSoon 
                    ? "opacity-60 cursor-not-allowed"
                    : "cursor-pointer hover:bg-muted/50 active:scale-[0.98]"
                )}
                onClick={section.comingSoon ? undefined : section.action}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                    {section.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">
                        {isRTL ? section.titleAr : section.titleEn}
                      </p>
                      {section.comingSoon && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          {isRTL ? 'قريباً' : 'Soon'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isRTL ? section.descriptionAr : section.descriptionEn}
                    </p>
                  </div>
                  {!section.comingSoon && (
                    <ChevronRight className={cn(
                      "h-5 w-5 text-muted-foreground",
                      isRTL && "rotate-180"
                    )} />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </motion.main>

      <BottomNav />
    </div>
  );
}