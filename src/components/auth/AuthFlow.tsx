import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthLanding } from './AuthLanding';
import { LoginScreen } from './LoginScreen';
import { SignUpScreen } from './SignUpScreen';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';

type AuthScreen = 'landing' | 'login' | 'signup';

interface AuthFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthSuccess: () => void;
}

export function AuthFlow({ open, onOpenChange, onAuthSuccess }: AuthFlowProps) {
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>('landing');

  const handleClose = () => {
    onOpenChange(false);
    // Reset to landing when closed
    setTimeout(() => setCurrentScreen('landing'), 300);
  };

  const handleSuccess = () => {
    handleClose();
    onAuthSuccess();
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
                onSuccess={handleSuccess}
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
                onSuccess={handleSuccess}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
