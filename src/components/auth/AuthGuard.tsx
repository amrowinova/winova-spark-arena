import { useAuth } from '@/contexts/AuthContext';
import { useAuthRequired } from '@/contexts/AuthRequiredContext';
import { useEffect, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const { showAuthRequired } = useAuthRequired();

  useEffect(() => {
    if (!isLoading && requireAuth && !user) {
      // Show auth modal instead of redirecting
      showAuthRequired();
    }
  }, [user, isLoading, requireAuth, showAuthRequired]);

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

  if (requireAuth && !user) {
    // Return null - modal will be shown by useEffect
    return null;
  }

  return <>{children}</>;
}
