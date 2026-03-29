import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Wallet, ArrowLeftRight, Info, Trash2, Users, Trophy, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface SettingsAccountProps {
  onLogout: () => void;
  onDeleteAccount: () => void;
}

export function SettingsAccount({
  onLogout,
  onDeleteAccount
}: SettingsAccountProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user: authUser } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const isRTL = language.direction === 'rtl';

  const accountSections = [
    {
      id: 'profile',
      title: isRTL ? 'معلومات الحساب' : 'Account Information',
      description: isRTL ? 'عرض وتحديث معلوماتك الشخصية' : 'View and update your personal information',
      icon: User,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      items: [
        {
          label: isRTL ? 'الاسم' : 'Name',
          value: user?.name || '',
          editable: true,
          onClick: () => navigate('/profile'),
        },
        {
          label: isRTL ? 'اسم المستخدم' : 'Username',
          value: `@${user?.username || ''}`,
          editable: false,
        },
        {
          label: isRTL ? 'المعرف' : 'Nova ID',
          value: user?.novaId || '',
          editable: false,
        },
        {
          label: isRTL ? 'البريد الإلكتروني' : 'Email',
          value: authUser?.email || '',
          editable: false,
        },
      ],
    },
    {
      id: 'verification',
      title: isRTL ? 'التحقق' : 'Verification',
      description: isRTL ? 'حالة التحقق من حسابك' : 'Your account verification status',
      icon: FileText,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      items: [
        {
          label: isRTL ? 'البريد الإلكتروني' : 'Email',
          value: authUser?.email ? (authUser.email_confirmed_at ? (isRTL ? 'موثق' : 'Verified') : (isRTL ? 'غير موثق' : 'Not Verified')) : (isRTL ? 'غير محدد' : 'Not Set'),
          verified: !!authUser?.email_confirmed_at,
        },
        {
          label: isRTL ? 'الهوية' : 'Identity',
          value: user?.kyc_status === 'approved' ? (isRTL ? 'موثق' : 'Verified') : user?.kyc_status === 'pending' ? (isRTL ? 'في الانتظار' : 'Pending') : (isRTL ? 'غير موثق' : 'Not Verified'),
          verified: user?.kyc_status === 'approved',
        },
      ],
    },
    {
      id: 'activity',
      title: isRTL ? 'النشاط' : 'Activity',
      description: isRTL ? 'نظرة عامة على نشاط حسابك' : 'Overview of your account activity',
      icon: Trophy,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      items: [
        {
          label: isRTL ? 'تاريخ الانضمام' : 'Joined',
          value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : (isRTL ? 'غير محدد' : 'Not Set'),
          editable: false,
        },
        {
          label: isRTL ? 'آخر تسجيل دخول' : 'Last Login',
          value: authUser?.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleDateString() : (isRTL ? 'غير محدد' : 'Not Set'),
          editable: false,
        },
        {
          label: isRTL ? 'الرتبة' : 'Rank',
          value: user?.rank || (isRTL ? 'غير محدد' : 'Not Set'),
          editable: false,
        },
      ],
    },
  ];

  const handleExportData = async () => {
    if (!authUser) return;
    
    try {
      // Export user data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single();
      
      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', authUser.id);
      
      const exportData = {
        profile,
        wallet,
        exportDate: new Date().toISOString(),
      };
      
      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `winova-data-${user?.username || 'user'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">
        {isRTL ? 'إعدادات الحساب' : 'Account Settings'}
      </h3>

      {/* Account Sections */}
      <div className="space-y-3">
        {accountSections.map((section, index) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="overflow-hidden">
              <div className={`p-4 ${section.bgColor} ${section.borderColor} border-b`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${section.bgColor} flex items-center justify-center`}>
                    <section.icon className={`h-5 w-5 ${section.color}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">
                      {section.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 space-y-2">
                {section.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-foreground">
                          {item.label}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">
                            {item.value}
                          </p>
                          {item.verified && (
                            <Badge variant="secondary" className="text-xs">
                              <FileText className="h-3 w-3 mr-1" />
                              {isRTL ? 'موثق' : 'Verified'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {item.editable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={item.onClick}
                      >
                        {isRTL ? 'تعديل' : 'Edit'}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Account Actions */}
      <Card className="p-4">
        <h4 className="font-medium text-foreground mb-3">
          {isRTL ? 'إجراءات الحساب' : 'Account Actions'}
        </h4>
        <div className="space-y-3">
          <Button
            variant="outline"
            onClick={handleExportData}
            className="w-full justify-start"
          >
            <FileText className="h-4 w-4 mr-2" />
            {isRTL ? 'تصدير بياناتي' : 'Export My Data'}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => navigate('/wallet')}
            className="w-full justify-start"
          >
            <Wallet className="h-4 w-4 mr-2" />
            {isRTL ? 'إعدادات المحفظة' : 'Wallet Settings'}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => navigate('/support')}
            className="w-full justify-start"
          >
            <Users className="h-4 w-4 mr-2" />
            {isRTL ? 'الدعم والمساعدة' : 'Support & Help'}
          </Button>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-4 border-red-200 bg-red-50">
        <h4 className="font-medium text-red-700 mb-3">
          {isRTL ? 'المنطقة الخطرة' : 'Danger Zone'}
        </h4>
        <div className="space-y-3">
          <Button
            variant="outline"
            onClick={onLogout}
            className="w-full justify-start border-orange-200 hover:bg-orange-50"
          >
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            {isRTL ? 'تسجيل الخروج' : 'Sign Out'}
          </Button>
          
          <Button
            variant="destructive"
            onClick={onDeleteAccount}
            className="w-full justify-start"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isRTL ? 'حذف الحساب' : 'Delete Account'}
          </Button>
        </div>
      </Card>

      {/* Important Notice */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-500" />
        <AlertDescription className="text-blue-700">
          <div className="space-y-1">
            <p className="font-medium">
              {isRTL ? 'معلومات هامة' : 'Important Information'}
            </p>
            <ul className="text-sm space-y-1">
              <li>• {isRTL ? 'يمكنك طلب نسخة من بياناتك في أي وقت' : 'You can request a copy of your data at any time'}</li>
              <li>• {isRTL ? 'حذف الحساب غير قابل للعكس' : 'Account deletion is irreversible'}</li>
              <li>• {isRTL ? 'سيتم حذف جميع بياناتك بشكل دائم' : 'All your data will be permanently deleted'}</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
