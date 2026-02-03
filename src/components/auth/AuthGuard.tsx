import { useAuth } from '@/contexts/AuthContext';
import { useAuthRequired } from '@/contexts/AuthRequiredContext';
import { useEffect, ReactNode, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const { user, isLoading, lastAuthEvent } = useAuth();
  const { showAuthRequired, isAuthTransitioning, authFlowOpen } = useAuthRequired();
  const navigate = useNavigate();
  const location = useLocation();
  const hasShownModalRef = useRef(false);
  const mountedRef = useRef(false);
  const initialLoadCompletedRef = useRef(false);

  // Track mount state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Handle sign out - redirect to home immediately
  useEffect(() => {
    if (lastAuthEvent === 'SIGNED_OUT' && requireAuth) {
      // User just signed out from a protected route - redirect to home
      navigate('/', { replace: true });
    }
  }, [lastAuthEvent, requireAuth, navigate]);

  // Mark initial load as complete after first auth check
  useEffect(() => {
    if (!isLoading && !initialLoadCompletedRef.current) {
      // Reduced delay for faster response
      const timer = setTimeout(() => {
        initialLoadCompletedRef.current = true;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Reset modal shown flag when user changes
  useEffect(() => {
    if (user) {
      hasShownModalRef.current = false;
    }
  }, [user]);

  const checkAndShowModal = useCallback(() => {
    const shouldShowModal = 
      mountedRef.current &&
      !isLoading && 
      requireAuth && 
      !user && 
      !isAuthTransitioning && 
      !authFlowOpen &&
      !hasShownModalRef.current &&
      initialLoadCompletedRef.current;

    if (shouldShowModal) {
      hasShownModalRef.current = true;
      showAuthRequired();
    }
  }, [user, isLoading, requireAuth, showAuthRequired, isAuthTransitioning, authFlowOpen]);

  useEffect(() => {
    if (!isLoading && !user && !isAuthTransitioning && !authFlowOpen && initialLoadCompletedRef.current) {
      // Reduced delay
      const timer = setTimeout(checkAndShowModal, 200);
      return () => clearTimeout(timer);
    }
  }, [user, isLoading, isAuthTransitioning, authFlowOpen, checkAndShowModal]);

  // Show loading during initial auth check (short period)
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  // If user exists, render children
  if (user) {
    return <>{children}</>;
  }

  // No user and auth required - redirect happening or modal showing
  if (requireAuth && !user) {
    // Don't show blocking loader if transitioning - the redirect will handle it
    if (isAuthTransitioning) {
      return null;
    }
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جارٍ التحقق...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
