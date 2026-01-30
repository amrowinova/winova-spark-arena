import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface AuthLandingProps {
  onLogin: () => void;
  onSignUp: () => void;
}

export function AuthLanding({ onLogin, onSignUp }: AuthLandingProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-sm"
        >
          {/* Logo/Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-foreground mb-3">
            {isRTL ? 'مرحبًا بك في Winova' : 'Welcome to Winova'}
          </h1>

          {/* Subtitle */}
          <p className="text-muted-foreground text-sm mb-8">
            {isRTL 
              ? 'سجّل دخولك أو أنشئ حسابًا جديدًا للبدء في رحلتك'
              : 'Sign in or create a new account to start your journey'}
          </p>

          {/* Features List */}
          <div className="space-y-3 mb-10 text-start">
            {[
              { ar: '🏆 شارك في المسابقات واربح جوائز', en: '🏆 Participate in contests and win prizes' },
              { ar: '💰 أدِر محفظتك بسهولة', en: '💰 Manage your wallet easily' },
              { ar: '👥 تواصل مع فريقك', en: '👥 Connect with your team' },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <span>{isRTL ? feature.ar : feature.en}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="px-6 pb-8 space-y-3"
      >
        <Button
          onClick={onLogin}
          className="w-full h-12 text-base font-semibold"
        >
          {isRTL ? 'تسجيل الدخول' : 'Sign In'}
        </Button>
        
        <Button
          onClick={onSignUp}
          variant="outline"
          className="w-full h-12 text-base font-semibold"
        >
          {isRTL ? 'إنشاء حساب جديد' : 'Create Account'}
        </Button>
      </motion.div>
    </div>
  );
}
