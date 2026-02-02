import React, { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback } from 'react';
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
  isAuthTransitioning: boolean;
  markAuthComplete: () => void;
}

const AuthRequiredContext = createContext<AuthRequiredContextType | undefined>(undefined);

export function AuthRequiredProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authFlowOpen, setAuthFlowOpen] = useState(false);
  const [authFlowMode, setAuthFlowMode] = useState<'login' | 'signup'>('login');
  const [isAuthTransitioning, setIsAuthTransitioning] = useState(false);
  
  // Track if we just completed auth to prevent modal from showing during transition
  const justAuthenticatedRef = useRef(false);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  // When user becomes authenticated, mark that we just authenticated
  useEffect(() => {
    if (user && !isLoading) {
      // User is authenticated - close everything and mark transition
      justAuthenticatedRef.current = true;
      setIsAuthTransitioning(true);
      setIsModalOpen(false);
      setAuthFlowOpen(false);
      
      // Clear previous timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      
      // Reset after a delay to allow state to propagate
      transitionTimeoutRef.current = setTimeout(() => {
        justAuthenticatedRef.current = false;
        setIsAuthTransitioning(false);
      }, 3000); // 3 seconds grace period
    }
  }, [user, isLoading]);

  // Mark auth as complete - call this after successful login/signup
  const markAuthComplete = useCallback(() => {
    justAuthenticatedRef.current = true;
    setIsAuthTransitioning(true);
    setIsModalOpen(false);
    setAuthFlowOpen(false);
    
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    
    transitionTimeoutRef.current = setTimeout(() => {
      justAuthenticatedRef.current = false;
      setIsAuthTransitioning(false);
    }, 3000);
  }, []);

  const showAuthRequired = useCallback(() => {
    // Don't show modal if:
    // 1. User is already authenticated
    // 2. Auth is still loading
    // 3. We just completed authentication (grace period)
    // 4. Auth flow is currently open
    // 5. We're in auth transition
    if (user || isLoading || justAuthenticatedRef.current || authFlowOpen || isAuthTransitioning) {
      return;
    }
    setIsModalOpen(true);
  }, [user, isLoading, authFlowOpen, isAuthTransitioning]);

  const requireAuth = useCallback((action: () => void) => {
    if (user) {
      action();
    } else if (!isLoading && !justAuthenticatedRef.current && !isAuthTransitioning && !authFlowOpen) {
      setIsModalOpen(true);
    }
  }, [user, isLoading, isAuthTransitioning, authFlowOpen]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  /**
   * Opens the auth flow with session isolation.
   */
  const openAuthFlow = useCallback(async (mode: 'login' | 'signup') => {
    setIsModalOpen(false);
    setIsAuthTransitioning(true);
    
    // Session isolation: sign out any existing session before starting auth
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Session cleanup failed:', error);
    }
    
    setAuthFlowMode(mode);
    setAuthFlowOpen(true);
    setIsAuthTransitioning(false);
  }, []);

  const closeAuthFlow = useCallback(() => {
    setAuthFlowOpen(false);
    markAuthComplete();
  }, [markAuthComplete]);

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
        isAuthTransitioning,
        markAuthComplete,
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
