import { Bell, Shield, ChevronRight, Check } from 'lucide-react';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useLanguage, SUPPORTED_LANGUAGES, Language } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function Settings() {
  const { language, setLanguage, currentLanguage } = useLanguage();
  const isRTL = currentLanguage.direction === 'rtl';

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

  const handleLanguageChange = (langCode: Language) => {
    setLanguage(langCode);
  };

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

          {/* Language Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className="text-lg">🌐</span>
              <h3 className="font-semibold">
                {isRTL ? 'اللغة' : 'Language'}
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = language === lang.code;
                
                return (
                  <Card
                    key={lang.code}
                    className={cn(
                      "p-3 cursor-pointer transition-all",
                      isSelected 
                        ? "border-primary bg-primary/5 ring-1 ring-primary" 
                        : "hover:bg-muted/50 active:scale-[0.98]"
                    )}
                    onClick={() => handleLanguageChange(lang.code)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{lang.flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-medium text-sm",
                          isSelected && "text-primary"
                        )}>
                          {lang.nameNative}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {lang.nameEn}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </motion.main>

      <BottomNav />
    </div>
  );
}