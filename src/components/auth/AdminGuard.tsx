import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setIsChecking(false);
        return;
      }

      // Check if user has admin role
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (error || !data) {
        setIsAdmin(false);
      } else {
        setIsAdmin(true);
      }
      setIsChecking(false);
    };

    if (!authLoading && user) {
      checkAccess();
    } else if (!authLoading && !user) {
      setIsChecking(false);
    }
  }, [user, authLoading]);

  // Show loading while checking auth and role
  if (authLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    navigate('/', { replace: true });
    return null;
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Admin Access Required</h1>
          <p className="text-muted-foreground text-sm max-w-xs">
            You don't have permission to access the Admin Dashboard. 
            This area is restricted to administrators only.
          </p>
          <button
            onClick={() => navigate('/')}
            className="text-primary font-medium hover:underline"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
