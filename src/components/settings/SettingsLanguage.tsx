import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Globe, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage, SUPPORTED_LANGUAGES } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface SettingsLanguageProps {
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
}

export function SettingsLanguage({
  currentLanguage,
  onLanguageChange
}: SettingsLanguageProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language.direction === 'rtl';

  const handleLanguageChange = async (languageCode: string) => {
    if (!user) return;

    try {
      // Update user preference in database
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_language: languageCode })
        .eq('user_id', user.id);

      if (error) throw error;

      // Update language in context
      onLanguageChange(languageCode);
    } catch (error) {
      console.error('Error updating language preference:', error);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">
        {isRTL ? 'اللغة والمنطقة' : 'Language & Region'}
      </h3>

      <Card className="p-4">
        <div className="space-y-4">
          {SUPPORTED_LANGUAGES.map((lang, index) => (
            <motion.div
              key={lang.code}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Button
                variant={currentLanguage === lang.code ? "default" : "outline"}
                className={`w-full justify-start h-auto p-4 ${currentLanguage === lang.code ? 'bg-primary/10 border-primary/30' : ''}`}
                onClick={() => handleLanguageChange(lang.code)}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="text-2xl">{lang.flag}</div>
                  <div className="flex-1 text-start">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {isRTL ? lang.nameNative : lang.nameEn}
                      </span>
                      {currentLanguage === lang.code && (
                        <Badge variant="secondary" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          {isRTL ? 'مختار' : 'Selected'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isRTL ? lang.nameNative : lang.nameEn}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Globe className="h-3 w-3" />
                      <span>{lang.direction.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </Button>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Language Info */}
      <Card className="p-4 bg-muted/30">
        <h4 className="font-medium text-foreground mb-2">
          {isRTL ? 'معلومات اللغة' : 'Language Information'}
        </h4>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            {isRTL 
              ? '🌐 تغيير اللغة سيؤثر على جميع جوانب التطبيق بما في ذلك الواجهة والرسائل.'
              : '🌐 Changing language will affect all aspects of the app including interface and messages.'
            }
          </p>
          <p>
            {isRTL 
              ? '📱 يتم حفظ تفضيلاتك تلقائياً لتطبيقها عند تسجيل الدخول مرة أخرى.'
              : '📱 Your preferences are automatically saved and applied when you log in again.'
            }
          </p>
        </div>
      </Card>

      {/* Current Language Display */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-3">
          <div className="text-2xl">
            {SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage)?.flag}
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'اللغة الحالية' : 'Current Language'}
            </p>
            <p className="font-medium text-foreground">
              {isRTL 
                ? SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage)?.nameNative
                : SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage)?.nameEn
              }
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
