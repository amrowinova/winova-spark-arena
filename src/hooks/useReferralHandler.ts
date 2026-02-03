import { supabase } from '@/integrations/supabase/client';

interface ReferralResult {
  success: boolean;
  error?: string;
  upline_user_id?: string;
  upline_profile_id?: string;
  upline_name?: string;
  upline_username?: string;
  upline_rank?: string;
  upline_avatar_url?: string | null;
  reason?: string;
  already_assigned?: boolean;
  team_link_created?: boolean;
}

/**
 * Main unified function for auto-assigning upline during signup
 * Uses priority: Referral Code → District → City → Country → Global → System Root
 * 
 * IMPORTANT: This function is NON-BLOCKING and will NEVER fail signup
 * Returns full leader info for display in UI
 */
export async function assignUplineOnSignup(
  userId: string,
  country: string,
  city: string,
  district?: string | null,
  referralCode?: string | null
): Promise<ReferralResult> {
  try {
    const { data, error } = await supabase.rpc('assign_upline_auto', {
      p_new_user_id: userId,
      p_country: country,
      p_city: city,
      p_district: district || null,
      p_referral_code: referralCode?.toUpperCase().trim() || null
    });

    if (error) {
      console.error('Error in assign_upline_auto RPC:', error);
      // Don't fail - just log
      return { success: false, error: error.message };
    }
    
    return data as unknown as ReferralResult;
  } catch (err) {
    console.error('Error assigning upline:', err);
    // NEVER fail signup due to referral logic
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Legacy wrapper - calls the new unified function
 * Kept for backward compatibility
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

    if (error) {
      console.error('Error processing referral:', error);
      return { success: false, error: error.message };
    }
    
    return data as unknown as ReferralResult;
  } catch (err) {
    console.error('Error processing referral:', err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Legacy wrapper - kept for backward compatibility
 * @deprecated Use assignUplineOnSignup instead
 */
export async function autoAssignReferral(
  userId: string,
  country: string,
  city?: string
): Promise<ReferralResult> {
  return assignUplineOnSignup(userId, country, city || '', null, null);
}

/**
 * Main handler for referral during signup
 * Automatically uses the new unified assign_upline_auto function
 * 
 * Flow:
 * 1. If referral code provided → Priority 1
 * 2. If no code → Auto-assign using geographic priority:
 *    - Same district (if provided)
 *    - Same city
 *    - Same country
 *    - Global active leaders
 *    - Any user
 *    - System root (fallback)
 */
export async function handleReferralOnSignup(
  userId: string,
  referralCode: string | null,
  country: string,
  city?: string,
  district?: string
): Promise<ReferralResult> {
  return assignUplineOnSignup(
    userId,
    country,
    city || '',
    district || null,
    referralCode || null
  );
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
