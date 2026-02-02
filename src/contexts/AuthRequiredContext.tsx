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
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      justAuthenticatedRef.current = true;
      setIsAuthTransitioning(true);
      
      // Close any open modals immediately
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
      }, 2000); // Extended to 2 seconds for safety
    }
  }, [user, isLoading]);

  const showAuthRequired = useCallback(() => {
    // Don't show modal if:
    // 1. User is already authenticated
    // 2. Auth is still loading
    // 3. We just completed authentication (grace period)
    // 4. Auth flow is currently open
    if (user || isLoading || justAuthenticatedRef.current || authFlowOpen || isAuthTransitioning) {
      console.log('[AuthRequired] Skipping modal:', { 
        hasUser: !!user, 
        isLoading, 
        justAuthenticated: justAuthenticatedRef.current,
        authFlowOpen,
        isAuthTransitioning
      });
      return;
    }
    setIsModalOpen(true);
  }, [user, isLoading, authFlowOpen, isAuthTransitioning]);

  const requireAuth = useCallback((action: () => void) => {
    if (user) {
      action();
    } else if (!isLoading && !justAuthenticatedRef.current && !isAuthTransitioning) {
      setIsModalOpen(true);
    }
  }, [user, isLoading, isAuthTransitioning]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  /**
   * Opens the auth flow with session isolation.
   * Signs out any existing session to prevent conflicts between devices.
   */
  const openAuthFlow = useCallback(async (mode: 'login' | 'signup') => {
    setIsModalOpen(false);
    setIsAuthTransitioning(true);
    
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
  }, []);

  const closeAuthFlow = useCallback(() => {
    setAuthFlowOpen(false);
    // Mark as just authenticated when closing auth flow
    justAuthenticatedRef.current = true;
    setIsAuthTransitioning(true);
    
    // Clear previous timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    
    transitionTimeoutRef.current = setTimeout(() => {
      justAuthenticatedRef.current = false;
      setIsAuthTransitioning(false);
    }, 2000);
  }, []);

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
