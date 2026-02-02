import { useAuth } from '@/contexts/AuthContext';
import { useAuthRequired } from '@/contexts/AuthRequiredContext';
import { useEffect, ReactNode, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const { showAuthRequired, isAuthTransitioning, authFlowOpen } = useAuthRequired();
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

  // Mark initial load as complete after first auth check
  useEffect(() => {
    if (!isLoading && !initialLoadCompletedRef.current) {
      // Add a small delay before allowing modal to show
      const timer = setTimeout(() => {
        initialLoadCompletedRef.current = true;
      }, 1000);
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
    // Only show modal if ALL these conditions are true:
    // 1. Component is mounted
    // 2. Not loading
    // 3. Auth is required
    // 4. No user
    // 5. Not in auth transition
    // 6. Auth flow is not open
    // 7. Haven't shown modal yet in this session
    // 8. Initial load has completed
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
      // Add a delay to ensure auth state is fully propagated
      const timer = setTimeout(checkAndShowModal, 500);
      return () => clearTimeout(timer);
    }
  }, [user, isLoading, isAuthTransitioning, authFlowOpen, checkAndShowModal]);

  // Show loading during initial auth check or during transition
  if (isLoading || isAuthTransitioning) {
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

  // No user and auth required - show loading while modal appears
  if (requireAuth && !user) {
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
