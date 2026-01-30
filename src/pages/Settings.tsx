import { Bell, Shield, ChevronRight } from 'lucide-react';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function Settings() {
  const { language, toggleLanguage } = useLanguage();
  const isRTL = language === 'ar';

  const settingsSections = [
    {
      id: 'notifications',
      icon: Bell,
      emoji: '🔔',
      titleEn: 'Notifications',
      titleAr: 'الإشعارات',
      descriptionEn: 'Configure push and in-app notifications',
      descriptionAr: 'إعدادات الإشعارات داخل التطبيق',
      badge: undefined,
      action: () => {},
      comingSoon: true,
    },
    {
      id: 'security',
      icon: Shield,
      emoji: '🔒',
      titleEn: 'Security',
      titleAr: 'الأمان',
      descriptionEn: 'Password, 2FA, and login settings',
      descriptionAr: 'كلمة المرور والمصادقة الثنائية',
      badge: undefined,
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
        <div className="p-4 space-y-6">
          {/* Settings List */}
          <div className="space-y-2">
            {settingsSections.map((section) => {
              const Icon = section.icon;
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
                        {section.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {section.badge}
                          </Badge>
                        )}
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

          <Separator />

          {/* Language Toggle */}
          <Card className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                🌐
              </div>
              <div className="flex-1">
                <p className="font-semibold">
                  {isRTL ? 'اللغة' : 'Language'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'العربية' : 'English'}
                </p>
              </div>
              <Switch 
                checked={language === 'ar'} 
                onCheckedChange={toggleLanguage}
              />
            </div>
          </Card>
        </div>
      </motion.main>

      <BottomNav />
    </div>
  );
}