import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface AuthRequiredContextType {
  showAuthRequired: () => void;
  requireAuth: (action: () => void) => void;
  isModalOpen: boolean;
  closeModal: () => void;
  openAuthFlow: (mode: 'login' | 'signup') => void;
  authFlowOpen: boolean;
  authFlowMode: 'login' | 'signup';
  closeAuthFlow: () => void;
}

const AuthRequiredContext = createContext<AuthRequiredContextType | undefined>(undefined);

export function AuthRequiredProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authFlowOpen, setAuthFlowOpen] = useState(false);
  const [authFlowMode, setAuthFlowMode] = useState<'login' | 'signup'>('login');
  
  // Track if we just completed auth to prevent modal from showing during transition
  const justAuthenticatedRef = useRef(false);

  // When user becomes authenticated, mark that we just authenticated
  useEffect(() => {
    if (user && !isLoading) {
      justAuthenticatedRef.current = true;
      // Reset after a short delay to allow state to propagate
      const timer = setTimeout(() => {
        justAuthenticatedRef.current = false;
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, isLoading]);

  const showAuthRequired = () => {
    // Don't show modal if:
    // 1. User is already authenticated
    // 2. Auth is still loading
    // 3. We just completed authentication
    if (!user && !isLoading && !justAuthenticatedRef.current) {
      setIsModalOpen(true);
    }
  };

  const requireAuth = (action: () => void) => {
    if (user) {
      action();
    } else if (!isLoading && !justAuthenticatedRef.current) {
      setIsModalOpen(true);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  /**
   * Opens the auth flow with session isolation.
   * Signs out any existing session to prevent conflicts between devices.
   */
  const openAuthFlow = async (mode: 'login' | 'signup') => {
    setIsModalOpen(false);
    
    // Session isolation: sign out any existing session before starting auth
    // This prevents session conflicts when switching accounts or devices
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Session cleanup failed:', error);
      // Continue anyway - the auth flow will handle any issues
    }
    
    setAuthFlowMode(mode);
    setAuthFlowOpen(true);
  };

  const closeAuthFlow = () => {
    setAuthFlowOpen(false);
    // Mark as just authenticated when closing auth flow
    justAuthenticatedRef.current = true;
    setTimeout(() => {
      justAuthenticatedRef.current = false;
    }, 1000);
  };

  return (
    <AuthRequiredContext.Provider
      value={{
        showAuthRequired,
        requireAuth,
        isModalOpen,
        closeModal,
        openAuthFlow,
        authFlowOpen,
        authFlowMode,
        closeAuthFlow,
      }}
    >
      {children}
    </AuthRequiredContext.Provider>
  );
}

export function useAuthRequired() {
  const context = useContext(AuthRequiredContext);
  if (context === undefined) {
    throw new Error('useAuthRequired must be used within an AuthRequiredProvider');
  }
  return context;
}
