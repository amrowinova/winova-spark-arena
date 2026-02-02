import { useAuth } from '@/contexts/AuthContext';
import { useAuthRequired } from '@/contexts/AuthRequiredContext';
import { useEffect, ReactNode, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const { showAuthRequired, isAuthTransitioning, authFlowOpen } = useAuthRequired();
  const hasShownModalRef = useRef(false);

  useEffect(() => {
    // Reset when user logs out
    if (!user && !isLoading) {
      hasShownModalRef.current = false;
    }
  }, [user, isLoading]);

  useEffect(() => {
    // Only show modal once per session, and only when:
    // 1. Not loading
    // 2. Auth is required
    // 3. No user
    // 4. Not in auth transition (just signed up/in)
    // 5. Auth flow is not open
    // 6. Haven't shown modal yet
    if (
      !isLoading && 
      requireAuth && 
      !user && 
      !isAuthTransitioning && 
      !authFlowOpen &&
      !hasShownModalRef.current
    ) {
      console.log('[AuthGuard] Showing auth required modal');
      hasShownModalRef.current = true;
      showAuthRequired();
    }
  }, [user, isLoading, requireAuth, showAuthRequired, isAuthTransitioning, authFlowOpen]);

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

  if (requireAuth && !user) {
    // Return loading state instead of null - modal will be shown by useEffect
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
