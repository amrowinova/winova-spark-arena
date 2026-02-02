import { supabase } from '@/integrations/supabase/client';

interface ReferralResult {
  success: boolean;
  error?: string;
  referrer_id?: string;
  assigned?: boolean;
  leader_id?: string;
}

/**
 * Process referral code signup
 * Called when user signs up with a referral code
 */
export async function processReferralSignup(
  userId: string,
  referralCode: string
): Promise<ReferralResult> {
  try {
    const { data, error } = await supabase.rpc('process_referral_signup', {
      p_new_user_id: userId,
      p_referral_code: referralCode
    });

    if (error) throw error;
    return data as unknown as ReferralResult;
  } catch (err) {
    console.error('Error processing referral:', err);
    return {
      success: false,
      error: (err as Error).message
    };
  }
}

/**
 * Auto-assign referral when no code is provided
 * Called when user signs up without a referral code
 */
export async function autoAssignReferral(
  userId: string,
  country: string,
  city?: string
): Promise<ReferralResult> {
  try {
    const { data, error } = await supabase.rpc('assign_referral_auto', {
      p_new_user_id: userId,
      p_country: country,
      p_city: city || null
    });

    if (error) throw error;
    return data as unknown as ReferralResult;
  } catch (err) {
    console.error('Error auto-assigning referral:', err);
    return {
      success: false,
      error: (err as Error).message
    };
  }
}

/**
 * Hook-style function to handle referral during signup
 */
export async function handleReferralOnSignup(
  userId: string,
  referralCode: string | null,
  country: string,
  city?: string
): Promise<ReferralResult> {
  if (referralCode && referralCode.trim()) {
    // User provided a referral code
    return processReferralSignup(userId, referralCode);
  } else {
    // No referral code - auto-assign to most active leader
    return autoAssignReferral(userId, country, city);
  }
}
