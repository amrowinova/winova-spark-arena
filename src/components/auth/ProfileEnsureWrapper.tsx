import { useProfileEnsure } from '@/hooks/useProfileEnsure';

/**
 * ProfileEnsureWrapper - Runs on app load to ensure user records exist
 * 
 * This is a fallback mechanism that creates profile/wallet if the
 * database trigger failed during signup.
 */
export function ProfileEnsureWrapper() {
  // This hook runs automatically and ensures user records exist
  useProfileEnsure();
  
  return null;
}
