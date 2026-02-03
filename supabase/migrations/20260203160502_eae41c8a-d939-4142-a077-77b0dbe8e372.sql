-- ============================================
-- WINOVA: MANDATORY TEAM & REFERRAL AUTO-PLACEMENT (FIXED)
-- ============================================

-- 1. First, add district column to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'district'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN district TEXT;
  END IF;
END $$;

-- 2. Create app setting for SYSTEM_ROOT_USER_ID if not exists
INSERT INTO public.app_settings (key, value, description)
VALUES (
  'system_root_user_id',
  '"00000000-0000-0000-0000-000000000000"'::jsonb,
  'Fallback upline for users when no other leader is found'
)
ON CONFLICT (key) DO NOTHING;

-- 3. Drop existing process_referral_signup function first
DROP FUNCTION IF EXISTS public.process_referral_signup(UUID, TEXT);

-- 4. Create the main auto-assignment function
CREATE OR REPLACE FUNCTION public.assign_upline_auto(
  p_new_user_id UUID,
  p_country TEXT,
  p_city TEXT,
  p_district TEXT DEFAULT NULL,
  p_referral_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upline_user_id UUID;
  v_upline_profile_id UUID;
  v_assignment_reason TEXT;
  v_referrer_profile RECORD;
  v_system_root_id UUID;
  v_new_user_profile_id UUID;
BEGIN
  -- Get new user's profile id
  SELECT id INTO v_new_user_profile_id
  FROM profiles
  WHERE user_id = p_new_user_id;

  -- Check if already has upline (idempotent)
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = p_new_user_id 
    AND referred_by IS NOT NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'User already has upline',
      'already_assigned', true
    );
  END IF;

  -- Get system root user ID from settings
  SELECT (value #>> '{}')::UUID INTO v_system_root_id
  FROM app_settings
  WHERE key = 'system_root_user_id';

  -- 🥇 Priority 1: Referral Code
  IF p_referral_code IS NOT NULL AND p_referral_code != '' THEN
    SELECT id, user_id INTO v_referrer_profile
    FROM profiles
    WHERE referral_code = UPPER(TRIM(p_referral_code))
    AND user_id != p_new_user_id
    LIMIT 1;
    
    IF v_referrer_profile.id IS NOT NULL THEN
      v_upline_profile_id := v_referrer_profile.id;
      v_upline_user_id := v_referrer_profile.user_id;
      v_assignment_reason := 'referral_code';
    END IF;
  END IF;

  -- 🥈 Priority 2: Same District
  IF v_upline_user_id IS NULL AND p_district IS NOT NULL AND p_district != '' THEN
    SELECT id, user_id INTO v_referrer_profile
    FROM profiles
    WHERE country = p_country
    AND city = p_city
    AND district = p_district
    AND user_id != p_new_user_id
    AND weekly_active = true
    ORDER BY spotlight_points DESC
    LIMIT 1;
    
    IF v_referrer_profile.id IS NOT NULL THEN
      v_upline_profile_id := v_referrer_profile.id;
      v_upline_user_id := v_referrer_profile.user_id;
      v_assignment_reason := 'same_district';
    END IF;
  END IF;

  -- 🥉 Priority 3: Same City
  IF v_upline_user_id IS NULL AND p_city IS NOT NULL AND p_city != '' THEN
    SELECT id, user_id INTO v_referrer_profile
    FROM profiles
    WHERE country = p_country
    AND city = p_city
    AND user_id != p_new_user_id
    AND weekly_active = true
    ORDER BY spotlight_points DESC
    LIMIT 1;
    
    IF v_referrer_profile.id IS NOT NULL THEN
      v_upline_profile_id := v_referrer_profile.id;
      v_upline_user_id := v_referrer_profile.user_id;
      v_assignment_reason := 'same_city';
    END IF;
  END IF;

  -- 🏅 Priority 4: Same Country
  IF v_upline_user_id IS NULL AND p_country IS NOT NULL AND p_country != '' THEN
    SELECT id, user_id INTO v_referrer_profile
    FROM profiles
    WHERE country = p_country
    AND user_id != p_new_user_id
    AND weekly_active = true
    ORDER BY spotlight_points DESC
    LIMIT 1;
    
    IF v_referrer_profile.id IS NOT NULL THEN
      v_upline_profile_id := v_referrer_profile.id;
      v_upline_user_id := v_referrer_profile.user_id;
      v_assignment_reason := 'same_country';
    END IF;
  END IF;

  -- 🌍 Priority 5: Global (any active user)
  IF v_upline_user_id IS NULL THEN
    SELECT id, user_id INTO v_referrer_profile
    FROM profiles
    WHERE user_id != p_new_user_id
    AND weekly_active = true
    ORDER BY spotlight_points DESC
    LIMIT 1;
    
    IF v_referrer_profile.id IS NOT NULL THEN
      v_upline_profile_id := v_referrer_profile.id;
      v_upline_user_id := v_referrer_profile.user_id;
      v_assignment_reason := 'global_active';
    END IF;
  END IF;

  -- 🌍 Priority 5b: Global (any user if no active found)
  IF v_upline_user_id IS NULL THEN
    SELECT id, user_id INTO v_referrer_profile
    FROM profiles
    WHERE user_id != p_new_user_id
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF v_referrer_profile.id IS NOT NULL THEN
      v_upline_profile_id := v_referrer_profile.id;
      v_upline_user_id := v_referrer_profile.user_id;
      v_assignment_reason := 'global_fallback';
    END IF;
  END IF;

  -- 🧱 Priority 6: System Root (absolute fallback)
  IF v_upline_user_id IS NULL THEN
    SELECT id, user_id INTO v_referrer_profile
    FROM profiles
    WHERE user_id = v_system_root_id
    LIMIT 1;
    
    IF v_referrer_profile.id IS NOT NULL THEN
      v_upline_profile_id := v_referrer_profile.id;
      v_upline_user_id := v_referrer_profile.user_id;
      v_assignment_reason := 'root_fallback';
    ELSE
      -- First user ever - they become root
      v_upline_profile_id := NULL;
      v_upline_user_id := NULL;
      v_assignment_reason := 'first_user';
    END IF;
  END IF;

  -- Update profile with referred_by (NON-BLOCKING)
  BEGIN
    IF v_upline_profile_id IS NOT NULL THEN
      UPDATE profiles
      SET referred_by = v_upline_profile_id,
          district = COALESCE(p_district, district)
      WHERE user_id = p_new_user_id
      AND referred_by IS NULL;
    ELSE
      UPDATE profiles
      SET district = COALESCE(p_district, district)
      WHERE user_id = p_new_user_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Insert into team_members (NON-BLOCKING)
  BEGIN
    IF v_upline_user_id IS NOT NULL THEN
      INSERT INTO team_members (leader_id, member_id, level)
      VALUES (v_upline_user_id, p_new_user_id, 1)
      ON CONFLICT DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Log to audit (NON-BLOCKING)
  BEGIN
    INSERT INTO audit_logs (
      entity_type,
      action,
      performed_by,
      entity_id,
      metadata
    )
    VALUES (
      'referral',
      'auto_assigned',
      p_new_user_id,
      v_upline_user_id,
      jsonb_build_object(
        'upline_user_id', v_upline_user_id,
        'upline_profile_id', v_upline_profile_id,
        'reason', v_assignment_reason,
        'country', p_country,
        'city', p_city,
        'district', p_district,
        'referral_code_used', p_referral_code
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'upline_user_id', v_upline_user_id,
    'upline_profile_id', v_upline_profile_id,
    'reason', v_assignment_reason
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'reason', 'exception_caught'
  );
END;
$$;

-- 5. Recreate process_referral_signup with JSONB return
CREATE OR REPLACE FUNCTION public.process_referral_signup(
  p_new_user_id UUID,
  p_referral_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_result JSONB;
BEGIN
  SELECT * INTO v_profile
  FROM profiles
  WHERE user_id = p_new_user_id;

  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  v_result := assign_upline_auto(
    p_new_user_id,
    COALESCE(v_profile.country, 'Saudi Arabia'),
    COALESCE(v_profile.city, ''),
    v_profile.district,
    p_referral_code
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 6. Create trigger function
CREATE OR REPLACE FUNCTION public.trigger_assign_upline_on_profile_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NEW.referred_by IS NULL THEN
    BEGIN
      v_result := assign_upline_auto(
        NEW.user_id,
        COALESCE(NEW.country, 'Saudi Arabia'),
        COALESCE(NEW.city, ''),
        NEW.district,
        NULL
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 7. Recreate trigger
DROP TRIGGER IF EXISTS trg_assign_upline_on_profile_create ON profiles;

CREATE TRIGGER trg_assign_upline_on_profile_create
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_assign_upline_on_profile_create();

-- 8. Add unique constraint for team_members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'team_members_leader_member_unique'
  ) THEN
    ALTER TABLE team_members 
    ADD CONSTRAINT team_members_leader_member_unique 
    UNIQUE (leader_id, member_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 9. Grant permissions
GRANT EXECUTE ON FUNCTION public.assign_upline_auto TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_referral_signup TO authenticated;