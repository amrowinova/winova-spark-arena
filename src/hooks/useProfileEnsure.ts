/**
 * Profile Ensure Hook
 * 
 * Fallback mechanism to ensure a profile, wallet, and user role exist
 * for every authenticated user, even if the DB trigger failed.
 * 
 * This runs automatically on app load for authenticated users.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface EnsureResult {
  isEnsured: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Ensures that the authenticated user has:
 * - A profile in public.profiles
 * - A wallet in public.wallets
 * - A user role in public.user_roles
 * 
 * This is a fallback for when the DB trigger fails.
 */
export function useProfileEnsure(): EnsureResult {
  const { user, isLoading: authLoading } = useAuth();
  const [isEnsured, setIsEnsured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setIsLoading(false);
      setIsEnsured(true); // No user = nothing to ensure
      return;
    }

    ensureUserRecords();
  }, [user, authLoading]);

  async function ensureUserRecords() {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Check if profile exists
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileCheckError) {
        console.error('Error checking profile:', profileCheckError);
      }

      // If no profile, create one (fallback for trigger failure)
      if (!existingProfile) {

        
        const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
        const username = user.user_metadata?.username || `user_${user.id.substring(0, 8)}`;
        const userCountry = user.user_metadata?.country || 'Saudi Arabia';
        
        // Generate referral code in format WINOVA-{USERNAME}-{COUNTRY_CODE}
        const countryCode = getCountryCode(userCountry);
        const referralCode = `WINOVA-${username.toUpperCase()}-${countryCode}`;

        const { error: profileInsertError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            name: userName,
            username: username,
            referral_code: referralCode,
            country: userCountry,
            wallet_country: userCountry,
          });

        if (profileInsertError) {
          // Might fail if another process already created it - that's fine
          console.warn('Failed to create fallback profile:', profileInsertError);
        } else {

        }
      }

      // Check if wallet exists
      const { data: existingWallet, error: walletCheckError } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletCheckError) {
        console.error('Error checking wallet:', walletCheckError);
      }

      // If no wallet, create one (fallback for trigger failure)
      if (!existingWallet) {

        
        const { error: walletInsertError } = await supabase
          .from('wallets')
          .insert({
            user_id: user.id,
            nova_balance: 0,
            aura_balance: 0,
            locked_nova_balance: 0,
          });

        if (walletInsertError) {
          console.warn('Failed to create fallback wallet:', walletInsertError);
        } else {

        }
      }

      // Check if user role exists (user can have multiple roles, so we check for any)
      const { data: existingRoles, error: roleCheckError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id);

      if (roleCheckError) {
        console.error('Error checking user role:', roleCheckError);
      }

      // If no role, we can't create one (admin-only insert policy)
      // But we log it for debugging
      if (!existingRoles || existingRoles.length === 0) {
        console.warn('User role not found - trigger may have failed. User:', user.id);
        // Note: We can't insert user_roles from client side due to RLS
        // This would need to be handled by the trigger or admin
      }

      setIsEnsured(true);
    } catch (err) {
      console.error('Error ensuring user records:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }

  return { isEnsured, isLoading, error };
}

/**
 * Map country name to 2-letter ISO code
 */
function getCountryCode(country: string): string {
  const countryMap: Record<string, string> = {
    'Saudi Arabia': 'SA',
    'Egypt': 'EG',
    'UAE': 'AE',
    'United Arab Emirates': 'AE',
    'Kuwait': 'KW',
    'Qatar': 'QA',
    'Bahrain': 'BH',
    'Oman': 'OM',
    'Jordan': 'JO',
    'Iraq': 'IQ',
    'Lebanon': 'LB',
    'Syria': 'SY',
    'Morocco': 'MA',
    'Tunisia': 'TN',
    'Algeria': 'DZ',
    'Libya': 'LY',
    'Sudan': 'SD',
    'Yemen': 'YE',
    'Pakistan': 'PK',
    'Turkey': 'TR',
    'Iran': 'IR',
    'United States': 'US',
    'USA': 'US',
    'United Kingdom': 'GB',
    'UK': 'GB',
    'Germany': 'DE',
    'France': 'FR',
    'Netherlands': 'NL',
    'Italy': 'IT',
    'Spain': 'ES',
  };
  
  return countryMap[country] || 'XX';
}
