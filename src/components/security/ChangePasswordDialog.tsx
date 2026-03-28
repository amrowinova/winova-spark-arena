import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBanner } from '@/contexts/BannerContext';
import { supabase } from '@/integrations/supabase/client';

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordDialog({ open, onClose }: ChangePasswordDialogProps) {
  const { language } = useLanguage();
  const { success: showSuccess, error: showError } = useBanner();
  const isRTL = language === 'ar' || language === 'ur' || language === 'fa';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>('current');

  const validatePassword = (password: string) => {
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
      isValid: hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar,
      hasMinLength,
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      hasSpecialChar
    };
  };

  const passwordValidation = validatePassword(newPassword);

  const handleNext = async () => {
    if (step === 'current') {
      if (!currentPassword) {
        showError(isRTL ? 'يرجى إدخال كلمة المرور الحالية' : 'Please enter current password');
        return;
      }
      setStep('new');
    } else if (step === 'new') {
      if (!passwordValidation.isValid) {
        showError(isRTL ? 'كلمة المرور الجديدة لا تلبي المتطلبات' : 'New password does not meet requirements');
        return;
      }
      if (newPassword !== confirmPassword) {
        showError(isRTL ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
        return;
      }
      setStep('confirm');
    } else if (step === 'confirm') {
      await handleChangePassword();
    }
  };

  const handleChangePassword = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          showError(isRTL ? 'كلمة المرور الحالية غير صحيحة' : 'Current password is incorrect');
        } else {
          showError(error.message);
        }
        return;
      }

      showSuccess(isRTL ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully');
      onClose();
      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setStep('current');
    } catch (error) {
      showError(isRTL ? 'فشل تغيير كلمة المرور' : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'current':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">
                {isRTL ? 'كلمة المرور الحالية' : 'Current Password'}
              </Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={isRTL ? 'أدخل كلمة المرور الحالية' : 'Enter current password'}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        );

      case 'new':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">
                {isRTL ? 'كلمة المرور الجديدة' : 'New Password'}
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={isRTL ? 'أدخل كلمة المرور الجديدة' : 'Enter new password'}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">
                {isRTL ? 'تأكيد كلمة المرور' : 'Confirm Password'}
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={isRTL ? 'أعد إدخال كلمة المرور' : 'Re-enter password'}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="p-3 bg-muted rounded-lg">
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {isRTL ? 'متطلبات كلمة المرور:' : 'Password Requirements:'}
                </p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    {passwordValidation.hasMinLength ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className={passwordValidation.hasMinLength ? 'text-green-600' : 'text-muted-foreground'}>
                      {isRTL ? '8 أحرف على الأقل' : 'At least 8 characters'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {passwordValidation.hasUpperCase ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className={passwordValidation.hasUpperCase ? 'text-green-600' : 'text-muted-foreground'}>
                      {isRTL ? 'حرف كبير واحد' : 'One uppercase letter'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {passwordValidation.hasLowerCase ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className={passwordValidation.hasLowerCase ? 'text-green-600' : 'text-muted-foreground'}>
                      {isRTL ? 'حرف صغير واحد' : 'One lowercase letter'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {passwordValidation.hasNumber ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className={passwordValidation.hasNumber ? 'text-green-600' : 'text-muted-foreground'}>
                      {isRTL ? 'رقم واحد' : 'One number'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {passwordValidation.hasSpecialChar ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className={passwordValidation.hasSpecialChar ? 'text-green-600' : 'text-muted-foreground'}>
                      {isRTL ? 'رمز خاص واحد' : 'One special character'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'confirm':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border-blue-200 rounded-lg">
              <div className="text-center space-y-2">
                <Lock className="h-8 w-8 mx-auto text-blue-600" />
                <h3 className="font-semibold text-blue-800">
                  {isRTL ? 'تأكيد تغيير كلمة المرور' : 'Confirm Password Change'}
                </h3>
                <p className="text-sm text-blue-600">
                  {isRTL 
                    ? 'هل أنت متأكد من تغيير كلمة المرور؟ هذا الإجراء لا يمكن التراجع عنه.'
                    : 'Are you sure you want to change your password? This action cannot be undone.'
                  }
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {isRTL ? 'تغيير كلمة المرور' : 'Change Password'}
          </DialogTitle>
          <DialogDescription>
            {step === 'current' && (isRTL ? 'أدخل كلمة المرور الحالية للمتابعة' : 'Enter your current password to continue')}
            {step === 'new' && (isRTL ? 'اختر كلمة مرور جديدة وآمنة' : 'Choose a new, secure password')}
            {step === 'confirm' && (isRTL ? 'تأكيد تغيير كلمة المرور' : 'Confirm password change')}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => {
              if (step === 'current') {
                onClose();
              } else if (step === 'new') {
                setStep('current');
              } else if (step === 'confirm') {
                setStep('new');
              }
            }}
            disabled={loading}
            className="flex-1"
          >
            {step === 'current' ? (isRTL ? 'إلغاء' : 'Cancel') : (isRTL ? 'السابق' : 'Previous')}
          </Button>
          <Button
            onClick={handleNext}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
            ) : (
              <>
                {step === 'confirm' ? (isRTL ? 'تغيير' : 'Change') : (isRTL ? 'التالي' : 'Next')}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
