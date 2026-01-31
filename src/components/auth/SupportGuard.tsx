import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface SupportGuardProps {
  children: ReactNode;
}

export function SupportGuard({ children }: SupportGuardProps) {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setIsChecking(false);
        return;
      }

      const { data, error } = await supabase
        .rpc('is_support_staff', { _user_id: user.id });

      if (error) {
        console.error('Error checking support access:', error);
        setIsStaff(false);
      } else {
        setIsStaff(data);
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

  // Show access denied if not support staff
  if (!isStaff) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <span className="text-3xl">🚫</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground text-sm max-w-xs">
            You don't have permission to access the Support Panel. 
            This area is restricted to support staff only.
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
