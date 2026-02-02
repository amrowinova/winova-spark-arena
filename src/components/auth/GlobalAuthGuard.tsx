import { AuthRequiredModal } from './AuthRequiredModal';
import { AuthFlow } from './AuthFlow';
import { useContext } from 'react';
import { createContext } from 'react';

// Import the context directly to avoid hook wrapper issues
import React from 'react';

interface AuthRequiredContextType {
  authFlowOpen: boolean;
  authFlowMode: 'login' | 'signup';
  closeAuthFlow: () => void;
}

// Lazy import to handle potential circular dependencies
const useAuthRequiredSafe = () => {
  try {
    // Dynamic import of the hook
    const { useAuthRequired } = require('@/contexts/AuthRequiredContext');
    return useAuthRequired();
  } catch (e) {
    console.warn('[GlobalAuthGuard] Context not available yet');
    return null;
  }
};

export function GlobalAuthGuard() {
  const context = useAuthRequiredSafe();
  
  // Don't render anything if context isn't ready yet
  if (!context) {
    return null;
  }

  const { authFlowOpen, authFlowMode, closeAuthFlow } = context;

  return (
    <>
      <AuthRequiredModal />
      <AuthFlow 
        open={authFlowOpen} 
        onOpenChange={closeAuthFlow}
        initialScreen={authFlowMode}
      />
    </>
  );
}
