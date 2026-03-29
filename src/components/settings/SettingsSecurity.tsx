import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Shield, Lock, Key, Fingerprint, Eye, Smartphone, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface SettingsSecurityProps {
  toggleStates: Record<string, boolean>;
  onToggleChange: (key: string, value: boolean) => void;
  onPINSetup: () => void;
  onChangePassword: () => void;
}

export function SettingsSecurity({
  toggleStates,
  onToggleChange,
  onPINSetup,
  onChangePassword
}: SettingsSecurityProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language.direction === 'rtl';

  const securityFeatures = [
    {
      id: '2fa',
      title: isRTL ? 'المصادقة الثنائية' : 'Two-Factor Authentication',
      description: isRTL ? 'إضافة طبقة أمان إضافية' : 'Add an extra layer of security',
      icon: Shield,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      enabled: toggleStates['2fa'],
      comingSoon: true,
    },
    {
      id: 'appLock',
      title: isRTL ? 'قفل التطبيق' : 'App Lock',
      description: isRTL ? 'قفل التطبيق بكلمة مرور' : 'Lock app with password',
      icon: Lock,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      enabled: toggleStates.appLock,
      comingSoon: false,
    },
    {
      id: 'biometric',
      title: isRTL ? 'المصادقة البيومترية' : 'Biometric Authentication',
      description: isRTL ? 'استخدام البصمة أو Face ID' : 'Use fingerprint or Face ID',
      icon: Fingerprint,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      enabled: false,
      comingSoon: true,
    },
    {
      id: 'securityAlerts',
      title: isRTL ? 'تنبيهات الأمان' : 'Security Alerts',
      description: isRTL ? 'تنبيهات النشاط المشبوه' : 'Suspicious activity alerts',
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      enabled: toggleStates.securityAlerts,
      comingSoon: false,
    },
  ];

  const handleToggle = (key: string, value: boolean) => {
    onToggleChange(key, value);
    
    // Save to database
    if (user) {
      const updateData: any = {};
      
      // Map security keys to database fields
      const keyMap: Record<string, string> = {
        'securityAlerts': 'security_alerts',
        'appLock': 'app_lock_enabled',
      };
      
      if (keyMap[key]) {
        updateData[keyMap[key]] = value;
        
        supabase
          .from('profiles')
          .update(updateData)
          .eq('user_id', user.id)
          .then(() => {
            // Handle success
          })
          .catch(console.error);
      }
    }
  };

  const getSecurityLevel = () => {
    const enabledFeatures = securityFeatures.filter(f => f.enabled && !f.comingSoon).length;
    const totalFeatures = securityFeatures.filter(f => !f.comingSoon).length;
    
    if (enabledFeatures === 0) return { level: 'low', color: 'text-red-500', text: isRTL ? 'منخفض' : 'Low' };
    if (enabledFeatures < totalFeatures / 2) return { level: 'medium', color: 'text-yellow-500', text: isRTL ? 'متوسط' : 'Medium' };
    return { level: 'high', color: 'text-green-500', text: isRTL ? 'عالي' : 'High' };
  };

  const securityLevel = getSecurityLevel();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">
        {isRTL ? 'الأمان والخصوصية' : 'Security & Privacy'}
      </h3>

      {/* Security Level Indicator */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <h4 className="font-medium text-foreground">
                {isRTL ? 'مستوى الأمان' : 'Security Level'}
              </h4>
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'بناءً على إعداداتك الحالية' : 'Based on your current settings'}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={securityLevel.color}>
            {securityLevel.text}
          </Badge>
        </div>
      </Card>

      {/* Security Features */}
      <div className="space-y-3">
        {securityFeatures.map((feature, index) => (
          <motion.div
            key={feature.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`p-4 ${feature.comingSoon ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${feature.bgColor} flex items-center justify-center`}>
                    <feature.icon className={`h-5 w-5 ${feature.color}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground flex items-center gap-2">
                      {feature.title}
                      {feature.comingSoon && (
                        <Badge variant="secondary" className="text-xs">
                          {isRTL ? 'قريباً' : 'Soon'}
                        </Badge>
                      )}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={feature.enabled}
                  onCheckedChange={(value) => !feature.comingSoon && handleToggle(feature.id, value)}
                  disabled={feature.comingSoon}
                />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Password & Authentication */}
      <Card className="p-4">
        <h4 className="font-medium text-foreground mb-3">
          {isRTL ? 'كلمة المرور والمصادقة' : 'Password & Authentication'}
        </h4>
        <div className="space-y-3">
          <Button
            variant="outline"
            onClick={onChangePassword}
            className="w-full justify-start"
          >
            <Key className="h-4 w-4 mr-2" />
            {isRTL ? 'تغيير كلمة المرور' : 'Change Password'}
          </Button>
          
          <Button
            variant="outline"
            onClick={onPINSetup}
            className="w-full justify-start"
          >
            <Smartphone className="h-4 w-4 mr-2" />
            {isRTL ? 'إعداد PIN' : 'Setup PIN'}
          </Button>
        </div>
      </Card>

      {/* Privacy Settings */}
      <Card className="p-4">
        <h4 className="font-medium text-foreground mb-3">
          {isRTL ? 'إعدادات الخصوصية' : 'Privacy Settings'}
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm text-foreground">
                  {isRTL ? 'الحالة عبر الإنترنت' : 'Online Status'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'إظهار حالتك عبر الإنترنت' : 'Show your online status'}
                </p>
              </div>
            </div>
            <Switch
              checked={toggleStates.showOnline}
              onCheckedChange={(value) => handleToggle('showOnline', value)}
            />
          </div>
        </div>
      </Card>

      {/* Security Tips */}
      <Alert className="bg-blue-50 border-blue-200">
        <CheckCircle className="h-4 w-4 text-blue-500" />
        <AlertDescription className="text-blue-700">
          <div className="space-y-1">
            <p className="font-medium">
              {isRTL ? 'نصائح أمان' : 'Security Tips'}
            </p>
            <ul className="text-sm space-y-1">
              <li>• {isRTL ? 'استخدم كلمة مرور قوية وفريدة' : 'Use a strong, unique password'}</li>
              <li>• {isRTL ? 'فعّل المصادقة الثنائية عندما تتوفر' : 'Enable 2FA when available'}</li>
              <li>• {isRTL ? 'لا تشارك معلوماتك مع أي شخص' : 'Never share your credentials'}</li>
              <li>• {isRTL ? 'راقب نشاط حسابك بانتظام' : 'Monitor your account activity regularly'}</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
