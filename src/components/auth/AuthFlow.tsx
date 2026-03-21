import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthLanding } from './AuthLanding';
import { LoginScreen } from './LoginScreen';
import { SignUpScreen } from './SignUpScreen';
import { OTPVerificationScreen } from './OTPVerificationScreen';
import { ProfileCompletionScreen } from './ProfileCompletionScreen';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthRequired } from '@/contexts/AuthRequiredContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';

type AuthScreen = 'landing' | 'login' | 'signup' | 'login-otp' | 'signup-otp' | 'profile-completion' | 'forgot-password';

export interface AuthFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthSuccess?: () => void;
  initialScreen?: 'login' | 'signup';
  initialReferralCode?: string;
}

export function AuthFlow({ open, onOpenChange, onAuthSuccess, initialScreen, initialReferralCode }: AuthFlowProps) {
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>(initialScreen || 'landing');
  const [email, setEmail] = useState('');
  const { language } = useLanguage();
  const { t } = useTranslation();
  const { user, session, lastAuthEvent } = useAuth();
  const { markAuthComplete } = useAuthRequired();
  const isRTL = language === 'ar';
  const navigate = useNavigate();
  // Ref to carry signup meta from handleSignupSuccess → handleAuthComplete (avoids race condition)
  const signupMetaRef = useRef<{ name: string; isPioneer: boolean } | null>(null);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleAuthComplete = useCallback(async () => {
    markAuthComplete();
    onAuthSuccess?.();
    navigate('/', { replace: true });

    // Check if this was a fresh signup (set synchronously by handleSignupSuccess)
    const signupMeta = signupMetaRef.current;
    signupMetaRef.current = null;

    if (signupMeta) {
      // Fresh signup toast
      if (signupMeta.isPioneer) {
        toast({
          title: isRTL ? '🌟 مرحباً أيها الرائد!' : '🌟 Welcome, Pioneer!',
          description: isRTL
            ? `${signupMeta.name}، أنت أول من يسجّل في منطقتك — شارك كود إحالتك وابدأ مجتمعك!`
            : `${signupMeta.name}, you're the first in your area — share your referral code and build your community!`,
          duration: 6000,
        });
      } else {
        toast({
          title: isRTL ? 'تم إنشاء الحساب بنجاح! 🎉' : 'Account created successfully! 🎉',
          description: isRTL ? `مرحباً ${signupMeta.name}` : `Welcome ${signupMeta.name}`,
        });
      }
      return;
    }

    // Login: fetch profile name for welcome-back toast
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', sessionData.session.user.id)
          .single();
        const userName = profile?.name || sessionData.session.user.user_metadata?.name || 'User';
        toast({
          title: t('home.welcomeBackToast'),
          description: t('home.helloUser', { name: userName }),
        });
      }
    } catch (error) {
      console.error('Error fetching profile for welcome message:', error);
    }
  }, [isRTL, markAuthComplete, onAuthSuccess, navigate]);

  // Reset screen when modal opens
  useEffect(() => {
    if (open) {
      setCurrentScreen(initialScreen || 'landing');
      setEmail('');
    }
  }, [open, initialScreen]);

  // Watch for auth state changes to auto-close and redirect
  // Skip during signup screens - handleSignupSuccess is the sole handler there
  const isCompletingSignup = currentScreen === 'signup' || currentScreen === 'signup-otp' || currentScreen === 'profile-completion';

  useEffect(() => {
    if ((user || session) && open && !isCompletingSignup) {
      handleAuthComplete();
    }
  }, [user, session, open, isCompletingSignup, handleAuthComplete]);

  // Extra safety: on SIGNED_IN, force navigation to home (only for login flows)
  useEffect(() => {
    if (lastAuthEvent === 'SIGNED_IN' && open && !isCompletingSignup) {
      handleAuthComplete();
    }
  }, [lastAuthEvent, open, isCompletingSignup, handleAuthComplete]);

  // Login success handler (for password login)
  const handleLoginSuccess = useCallback(async () => {
    // Mark auth complete immediately
    markAuthComplete();
    
    // Trigger success callback
    onAuthSuccess?.();

    // Enter app - navigate to root (/)
    navigate('/', { replace: true });
    
    // Show welcome toast
    toast({
      title: isRTL ? 'مرحباً بعودتك! 👋' : 'Welcome back! 👋',
      description: isRTL ? 'تم تسجيل الدخول بنجاح' : 'Signed in successfully',
    });
  }, [markAuthComplete, onAuthSuccess, isRTL, navigate]);

  // Signup success handler (password mode)
  // Sets signupMetaRef synchronously so handleAuthComplete shows the right toast
  const handleSignupSuccess = useCallback((name: string, isPioneer: boolean) => {
    signupMetaRef.current = { name, isPioneer };
    handleAuthComplete();
  }, [handleAuthComplete]);

  // Login flow: email → OTP → success
  const handleLoginSendOTP = (userEmail: string) => {
    setEmail(userEmail);
    setCurrentScreen('login-otp');
  };

  const handleLoginVerify = () => {
    // Login successful via OTP
    handleAuthComplete();
  };

  // Signup flow: email → OTP → profile completion → success
  const handleSignupSendOTP = (userEmail: string) => {
    setEmail(userEmail);
    setCurrentScreen('signup-otp');
  };

  const handleSignupVerify = () => {
    // OTP verified, now complete profile
    setCurrentScreen('profile-completion');
  };

  const handleProfileComplete = () => {
    // Close the sheet first, then complete auth
    handleClose();
    handleAuthComplete();
  };

  const handleResendOTP = () => {

  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent 
        side="bottom" 
        className="h-[100dvh] p-0 rounded-t-none overflow-hidden flex flex-col"
      >
        <AnimatePresence mode="wait">
          {currentScreen === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-y-auto"
            >
              <AuthLanding
                onLogin={() => setCurrentScreen('login')}
                onSignUp={() => setCurrentScreen('signup')}
              />
            </motion.div>
          )}

          {currentScreen === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-y-auto"
            >
              <LoginScreen
                onBack={() => setCurrentScreen('landing')}
                onSignUp={() => setCurrentScreen('signup')}
                onSendOTP={handleLoginSendOTP}
                onForgotPassword={() => setCurrentScreen('forgot-password')}
                onLoginSuccess={handleLoginSuccess}
              />
            </motion.div>
          )}

          {currentScreen === 'forgot-password' && (
            <motion.div
              key="forgot-password"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-y-auto"
            >
              <ForgotPasswordScreen
                onBack={() => setCurrentScreen('login')}
              />
            </motion.div>
          )}

          {currentScreen === 'login-otp' && (
            <motion.div
              key="login-otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-y-auto"
            >
              <OTPVerificationScreen
                email={email}
                onBack={() => setCurrentScreen('login')}
                onVerify={handleLoginVerify}
                onResend={handleResendOTP}
              />
            </motion.div>
          )}

          {currentScreen === 'signup' && (
            <motion.div
              key="signup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-y-auto overscroll-contain"
            >
              <SignUpScreen
                onBack={() => setCurrentScreen('landing')}
                onLogin={() => setCurrentScreen('login')}
                onSendOTP={handleSignupSendOTP}
                onSignupSuccess={handleSignupSuccess}
                initialReferralCode={initialReferralCode}
              />
            </motion.div>
          )}

          {currentScreen === 'signup-otp' && (
            <motion.div
              key="signup-otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-y-auto"
            >
              <OTPVerificationScreen
                email={email}
                onBack={() => setCurrentScreen('signup')}
                onVerify={handleSignupVerify}
                onResend={handleResendOTP}
              />
            </motion.div>
          )}

          {currentScreen === 'profile-completion' && (
            <motion.div
              key="profile-completion"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-y-auto overscroll-contain"
            >
              <ProfileCompletionScreen
                email={email}
                onBack={() => setCurrentScreen('signup-otp')}
                onComplete={handleProfileComplete}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
