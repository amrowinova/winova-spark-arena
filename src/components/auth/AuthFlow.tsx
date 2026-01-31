import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthLanding } from './AuthLanding';
import { LoginScreen } from './LoginScreen';
import { SignUpScreen } from './SignUpScreen';
import { OTPVerificationScreen } from './OTPVerificationScreen';
import { ProfileCompletionScreen } from './ProfileCompletionScreen';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';
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
}

export function AuthFlow({ open, onOpenChange, onAuthSuccess, initialScreen }: AuthFlowProps) {
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>(initialScreen || 'landing');
  const [email, setEmail] = useState('');

  const handleClose = () => {
    onOpenChange(false);
    // Reset to initial screen when closed
    setTimeout(() => {
      setCurrentScreen(initialScreen || 'landing');
      setEmail('');
    }, 300);
  };

  const handleSuccess = () => {
    handleClose();
    onAuthSuccess?.();
  };

  // Login flow: email → OTP → success
  const handleLoginSendOTP = (userEmail: string) => {
    setEmail(userEmail);
    setCurrentScreen('login-otp');
  };

  const handleLoginVerify = () => {
    // Login successful
    handleSuccess();
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
    // Signup successful
    handleSuccess();
  };

  const handleResendOTP = () => {
    // Mock resend - in production this would call API
    console.log('Resending OTP to:', email);
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
