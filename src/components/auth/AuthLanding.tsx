import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Trophy, Wallet, Users } from 'lucide-react';

interface AuthLandingProps {
  onLogin: () => void;
  onSignUp: () => void;
}

export function AuthLanding({ onLogin, onSignUp }: AuthLandingProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const features = [
    { 
      icon: Trophy, 
      ar: 'شارك في المسابقات اليومية', 
      en: 'Participate in daily contests' 
    },
    { 
      icon: Wallet, 
      ar: 'أدر محفظتك بسهولة وأمان', 
      en: 'Manage your wallet easily and securely' 
    },
    { 
      icon: Users, 
      ar: 'تواصل وابنِ فريقك', 
      en: 'Connect and build your team' 
    },
  ];

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
            <Trophy className="w-10 h-10 text-primary" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-foreground mb-3">
            {isRTL ? 'مرحبًا بك في Winova' : 'Welcome to Winova'}
          </h1>

          {/* Subtitle */}
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
            {isRTL 
              ? 'منصّة واحدة تجمع المسابقات، المحفظة، والتجارة P2P مع فريقك'
              : 'One platform for contests, wallet, and P2P trading with your team'}
          </p>

          {/* Features List */}
          <div className="space-y-4 mb-10">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="flex items-center gap-3 text-start"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm text-foreground">
                  {isRTL ? feature.ar : feature.en}
                </span>
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
