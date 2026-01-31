import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authFlowOpen, setAuthFlowOpen] = useState(false);
  const [authFlowMode, setAuthFlowMode] = useState<'login' | 'signup'>('login');

  const showAuthRequired = () => {
    if (!user) {
      setIsModalOpen(true);
    }
  };

  const requireAuth = (action: () => void) => {
    if (user) {
      action();
    } else {
      setIsModalOpen(true);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const openAuthFlow = (mode: 'login' | 'signup') => {
    setIsModalOpen(false);
    setAuthFlowMode(mode);
    setAuthFlowOpen(true);
  };

  const closeAuthFlow = () => {
    setAuthFlowOpen(false);
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
