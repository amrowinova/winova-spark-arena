import { supabase } from '@/integrations/supabase/client';

interface ReferralResult {
  success: boolean;
  error?: string;
  referrer_id?: string;
  assigned?: boolean;
  leader_id?: string;
  reason?: string;
}

/**
 * Process referral code signup
 * Called when user signs up with a referral code
 * Uses atomic RPC - no direct table updates
 */
export async function processReferralSignup(
  userId: string,
  referralCode: string
): Promise<ReferralResult> {
  try {
    const { data, error } = await supabase.rpc('process_referral_signup', {
      p_new_user_id: userId,
      p_referral_code: referralCode.toUpperCase().trim()
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
 * Uses priority: City → Country → Global → Any Active User
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
 * Main handler for referral during signup
 * Automatically chooses between code-based and auto-assignment
 * 
 * Flow:
 * 1. If referral code provided → use process_referral_signup RPC
 * 2. If no code → use assign_referral_auto RPC with priority logic:
 *    - Same city (if provided)
 *    - Same country
 *    - Global active leaders
 *    - Any active user
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

/**
 * Validate referral code before signup
 * Returns the referrer info if valid
 */
export async function validateReferralCode(
  referralCode: string
): Promise<{ valid: boolean; referrer_name?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('name, username')
      .eq('referral_code', referralCode.toUpperCase().trim())
      .single();

    if (error || !data) {
      return { valid: false, error: 'Invalid referral code' };
    }

    return { valid: true, referrer_name: data.name || data.username };
  } catch (err) {
    return { valid: false, error: 'Failed to validate code' };
  }
}
