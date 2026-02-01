import { ReactNode } from 'react';
import { useIsNewUser } from '@/hooks/useIsNewUser';
import { FTUXScreen } from './FTUXScreen';
import { Skeleton } from '@/components/ui/skeleton';

interface FTUXGuardProps {
  children: ReactNode;
  /** Page title to show in the FTUX screen header */
  pageTitle: string;
  /** Skip FTUX check (for Contests page which should be accessible) */
  skipFTUX?: boolean;
}

/**
 * Wraps protected pages and shows the FTUX "Get Started" screen for new users.
 * 
 * New users (rank=subscriber, nova=0, aura=0, teamSize=0) see a locked state
 * with a single CTA to join their first contest.
 * 
 * The app unlocks automatically after first contest participation or receiving Nova/Aura.
 */
export function FTUXGuard({ children, pageTitle, skipFTUX = false }: FTUXGuardProps) {
  const { isNewUser, isLoading } = useIsNewUser();
  
  // Show loading state while fetching user data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  
  // If skipFTUX is true or user is not new, show the actual content
  if (skipFTUX || !isNewUser) {
    return <>{children}</>;
  }
  
  // New user - show the FTUX locked screen
  return <FTUXScreen pageTitle={pageTitle} />;
}
