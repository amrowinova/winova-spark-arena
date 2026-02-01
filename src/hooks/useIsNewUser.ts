import { useUser } from '@/contexts/UserContext';

/**
 * FTUX (First-Time User Experience) detection hook
 * 
 * A user is considered a "New User" if ALL of the following are true:
 * - rank = subscriber
 * - novaBalance = 0
 * - auraBalance = 0
 * - teamSize = 0
 * 
 * New users see a locked "Get Started" screen on all protected pages.
 * The app unlocks automatically after first contest participation or receiving Nova/Aura.
 */
export function useIsNewUser(): { isNewUser: boolean; isLoading: boolean } {
  const { user, isLoading, isAuthenticated } = useUser();
  
  // Not authenticated = not a "new user" in FTUX sense (they need to login first)
  if (!isAuthenticated) {
    return { isNewUser: false, isLoading };
  }
  
  const isNewUser = 
    user.rank === 'subscriber' &&
    user.novaBalance === 0 &&
    user.auraBalance === 0 &&
    user.teamSize === 0;
  
  return { isNewUser, isLoading };
}
