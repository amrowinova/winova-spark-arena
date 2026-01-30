import { useState } from 'react';
import { CreditCard, Bell, Shield, ChevronRight, Wallet } from 'lucide-react';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useLanguage } from '@/contexts/LanguageContext';
import { P2PPaymentMethodsManager, useSavedPaymentMethods } from '@/components/p2p/P2PPaymentMethodsManager';
import { COUNTRIES } from '@/components/p2p/P2PCountrySelector';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function Settings() {
  const { language, toggleLanguage } = useLanguage();
  const isRTL = language === 'ar';
  
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState('SA');
  
  const savedMethods = useSavedPaymentMethods();
  const selectedCountry = COUNTRIES.find(c => c.code === selectedCountryCode) || COUNTRIES[0];

  const settingsSections = [
    {
      id: 'payment',
      icon: CreditCard,
      emoji: '💳',
      titleEn: 'Payment Methods',
      titleAr: 'طرق الدفع',
      descriptionEn: 'Manage your bank accounts and wallets for P2P',
      descriptionAr: 'إدارة حساباتك البنكية ومحافظك لـ P2P',
      badge: savedMethods.length > 0 ? `${savedMethods.length}` : undefined,
      action: () => setIsPaymentSheetOpen(true),
    },
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

      {/* Payment Methods Sheet */}
      <Sheet open={isPaymentSheetOpen} onOpenChange={setIsPaymentSheetOpen}>
        <SheetContent side={isRTL ? 'left' : 'right'} className="w-full sm:max-w-md p-0 overflow-y-auto">
          <SheetHeader className="p-4 border-b border-border sticky top-0 bg-background z-10">
            <SheetTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              {isRTL ? 'طرق الدفع' : 'Payment Methods'}
            </SheetTitle>
            <SheetDescription>
              {isRTL 
                ? 'إدارة حساباتك البنكية ومحافظك الإلكترونية'
                : 'Manage your bank accounts and wallets'
              }
            </SheetDescription>
          </SheetHeader>
          
          <div className="p-4 space-y-4">
            {/* Country Selector */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {isRTL ? 'اختر الدولة' : 'Select Country'}
              </p>
              <div className="flex flex-wrap gap-2">
                {COUNTRIES.map((country) => {
                  const countryMethods = savedMethods.filter(m => m.countryCode === country.code);
                  return (
                    <button
                      key={country.code}
                      onClick={() => setSelectedCountryCode(country.code)}
                      className={cn(
                        "px-3 py-2 rounded-lg border transition-all flex items-center gap-2",
                        selectedCountryCode === country.code
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted"
                      )}
                    >
                      <span>{country.flag}</span>
                      <span className="text-sm font-medium">
                        {isRTL ? country.nameAr : country.name}
                      </span>
                      {countryMethods.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {countryMethods.length}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Payment Methods Manager */}
            <P2PPaymentMethodsManager 
              country={selectedCountry}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
