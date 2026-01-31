import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthRequired } from '@/contexts/AuthRequiredContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export function AuthRequiredModal() {
  const { language } = useLanguage();
  const { isModalOpen, closeModal, openAuthFlow } = useAuthRequired();
  const isRTL = language === 'ar';

  const content = {
    title: isRTL ? 'تسجيل الدخول مطلوب' : 'Login Required',
    description: isRTL
      ? 'أنت غير مسجل في التطبيق\nيرجى تسجيل الدخول أو إنشاء حساب جديد للمتابعة'
      : "You're not logged in\nPlease login or create an account to continue",
    login: isRTL ? 'تسجيل الدخول' : 'Login',
    signup: isRTL ? 'إنشاء حساب جديد' : 'Create Account',
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={closeModal}>
      <DialogContent 
        className="sm:max-w-md mx-4 rounded-2xl border-border/50 bg-gradient-to-b from-card to-card/95"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <DialogHeader className="text-center space-y-4 pt-2">
          {/* Lock Icon with Animation */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, type: 'spring' }}
            className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <Lock className="w-8 h-8 text-primary" />
          </motion.div>

          <DialogTitle className="text-xl font-bold text-foreground">
            {content.title}
          </DialogTitle>

          <DialogDescription className="text-muted-foreground whitespace-pre-line text-center leading-relaxed">
            {content.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-6">
          {/* Login Button */}
          <Button
            onClick={() => openAuthFlow('login')}
            className="w-full h-12 rounded-xl text-base font-medium gap-2"
            variant="default"
          >
            <LogIn className="w-5 h-5" />
            {content.login}
          </Button>

          {/* Sign Up Button */}
          <Button
            onClick={() => openAuthFlow('signup')}
            className="w-full h-12 rounded-xl text-base font-medium gap-2"
            variant="outline"
          >
            <UserPlus className="w-5 h-5" />
            {content.signup}
          </Button>
        </div>

        {/* Decorative gradient */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 rounded-b-2xl" />
      </DialogContent>
    </Dialog>
  );
}
