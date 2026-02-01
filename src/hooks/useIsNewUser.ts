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
export function useIsNewUser(): boolean {
  const { user } = useUser();
  
  const isNewUser = 
    user.rank === 'subscriber' &&
    user.novaBalance === 0 &&
    user.auraBalance === 0 &&
    user.teamSize === 0;
  
  return isNewUser;
}
