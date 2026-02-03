-- Drop existing functions first
DROP FUNCTION IF EXISTS public.assign_upline_auto(uuid, text, text, text, text);
DROP FUNCTION IF EXISTS public.process_referral_signup(uuid, text);

-- Fix assign_upline_auto to ALWAYS insert into team_members table
CREATE FUNCTION public.assign_upline_auto(
  p_new_user_id uuid,
  p_country text,
  p_city text,
  p_district text DEFAULT NULL,
  p_referral_code text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upline_user_id uuid;
  v_upline_profile_id uuid;
  v_assignment_reason text;
  v_referrer_record RECORD;
  v_system_root_id uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  -- Check if user already has an upline assigned
  SELECT referred_by INTO v_upline_profile_id
  FROM profiles
  WHERE user_id = p_new_user_id;
  
  IF v_upline_profile_id IS NOT NULL THEN
    -- Already assigned, get the user_id for team_members check
    SELECT user_id INTO v_upline_user_id FROM profiles WHERE id = v_upline_profile_id;
    
    -- Ensure team_members row exists (in case it was missing)
    IF v_upline_user_id IS NOT NULL THEN
      INSERT INTO team_members (leader_id, member_id, level)
      VALUES (v_upline_user_id, p_new_user_id, 1)
      ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN json_build_object(
      'success', true,
      'already_assigned', true,
      'upline_user_id', v_upline_user_id,
      'upline_profile_id', v_upline_profile_id
    );
  END IF;

  -- PRIORITY 1: Referral Code
  IF p_referral_code IS NOT NULL AND p_referral_code != '' THEN
    SELECT id, user_id INTO v_referrer_record
    FROM profiles
    WHERE referral_code = UPPER(TRIM(p_referral_code))
      AND user_id != p_new_user_id
    LIMIT 1;
    
    IF v_referrer_record.id IS NOT NULL THEN
      v_upline_profile_id := v_referrer_record.id;
      v_upline_user_id := v_referrer_record.user_id;
      v_assignment_reason := 'referral_code';
    END IF;
  END IF;

  -- PRIORITY 2: Same District (if no referral code match)
  IF v_upline_user_id IS NULL AND p_district IS NOT NULL AND p_district != '' THEN
    SELECT id, user_id INTO v_referrer_record
    FROM profiles
    WHERE country = p_country
      AND city = p_city
      AND district = p_district
      AND user_id != p_new_user_id
      AND weekly_active = true
    ORDER BY spotlight_points DESC
    LIMIT 1;
    
    IF v_referrer_record.id IS NOT NULL THEN
      v_upline_profile_id := v_referrer_record.id;
      v_upline_user_id := v_referrer_record.user_id;
      v_assignment_reason := 'same_district';
    END IF;
  END IF;

  -- PRIORITY 3: Same City
  IF v_upline_user_id IS NULL THEN
    SELECT id, user_id INTO v_referrer_record
    FROM profiles
    WHERE country = p_country
      AND city = p_city
      AND user_id != p_new_user_id
      AND weekly_active = true
    ORDER BY spotlight_points DESC
    LIMIT 1;
    
    IF v_referrer_record.id IS NOT NULL THEN
      v_upline_profile_id := v_referrer_record.id;
      v_upline_user_id := v_referrer_record.user_id;
      v_assignment_reason := 'same_city';
    END IF;
  END IF;

  -- PRIORITY 4: Same Country
  IF v_upline_user_id IS NULL THEN
    SELECT id, user_id INTO v_referrer_record
    FROM profiles
    WHERE country = p_country
      AND user_id != p_new_user_id
      AND weekly_active = true
    ORDER BY spotlight_points DESC
    LIMIT 1;
    
    IF v_referrer_record.id IS NOT NULL THEN
      v_upline_profile_id := v_referrer_record.id;
      v_upline_user_id := v_referrer_record.user_id;
      v_assignment_reason := 'same_country';
    END IF;
  END IF;

  -- PRIORITY 5: Global (any active user)
  IF v_upline_user_id IS NULL THEN
    SELECT id, user_id INTO v_referrer_record
    FROM profiles
    WHERE user_id != p_new_user_id
      AND weekly_active = true
    ORDER BY spotlight_points DESC
    LIMIT 1;
    
    IF v_referrer_record.id IS NOT NULL THEN
      v_upline_profile_id := v_referrer_record.id;
      v_upline_user_id := v_referrer_record.user_id;
      v_assignment_reason := 'global_active';
    END IF;
  END IF;

  -- PRIORITY 6: Any user at all
  IF v_upline_user_id IS NULL THEN
    SELECT id, user_id INTO v_referrer_record
    FROM profiles
    WHERE user_id != p_new_user_id
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF v_referrer_record.id IS NOT NULL THEN
      v_upline_profile_id := v_referrer_record.id;
      v_upline_user_id := v_referrer_record.user_id;
      v_assignment_reason := 'any_user';
    END IF;
  END IF;

  -- PRIORITY 7: System root fallback
  IF v_upline_user_id IS NULL THEN
    v_upline_user_id := v_system_root_id;
    v_assignment_reason := 'system_root';
  END IF;

  -- ========================================
  -- CRITICAL: Insert into team_members FIRST
  -- ========================================
  IF v_upline_user_id IS NOT NULL AND v_upline_user_id != v_system_root_id THEN
    INSERT INTO team_members (leader_id, member_id, level)
    VALUES (v_upline_user_id, p_new_user_id, 1)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Update profile with referred_by
  IF v_upline_profile_id IS NOT NULL THEN
    UPDATE profiles
    SET referred_by = v_upline_profile_id
    WHERE user_id = p_new_user_id
      AND referred_by IS NULL;
  END IF;

  -- Log the assignment (non-blocking)
  BEGIN
    INSERT INTO audit_logs (
      entity_type,
      action,
      performed_by,
      entity_id,
      metadata
    ) VALUES (
      'referral',
      'auto_assigned',
      p_new_user_id,
      p_new_user_id,
      jsonb_build_object(
        'upline_user_id', v_upline_user_id,
        'upline_profile_id', v_upline_profile_id,
        'reason', v_assignment_reason,
        'country', p_country,
        'city', p_city,
        'district', p_district,
        'referral_code', p_referral_code
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN json_build_object(
    'success', true,
    'upline_user_id', v_upline_user_id,
    'upline_profile_id', v_upline_profile_id,
    'reason', v_assignment_reason
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Also fix process_referral_signup to insert into team_members
CREATE FUNCTION public.process_referral_signup(
  p_new_user_id uuid,
  p_referral_code text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_record RECORD;
BEGIN
  -- Find referrer by code
  SELECT id, user_id INTO v_referrer_record
  FROM profiles
  WHERE referral_code = UPPER(TRIM(p_referral_code))
    AND user_id != p_new_user_id
  LIMIT 1;
  
  IF v_referrer_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid referral code'
    );
  END IF;

  -- CRITICAL: Insert into team_members FIRST
  INSERT INTO team_members (leader_id, member_id, level)
  VALUES (v_referrer_record.user_id, p_new_user_id, 1)
  ON CONFLICT DO NOTHING;

  -- Update profile
  UPDATE profiles
  SET referred_by = v_referrer_record.id
  WHERE user_id = p_new_user_id
    AND referred_by IS NULL;

  RETURN json_build_object(
    'success', true,
    'upline_user_id', v_referrer_record.user_id,
    'upline_profile_id', v_referrer_record.id,
    'reason', 'referral_code'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;