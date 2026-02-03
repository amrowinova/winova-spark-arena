-- Ensure referral code stored in auth user metadata is honored at profile creation
CREATE OR REPLACE FUNCTION public.trigger_assign_upline_on_profile_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result json;
  v_referral_code text;
BEGIN
  -- If an upline is already set, do nothing
  IF NEW.referred_by IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Read referral_code from the auth user metadata (set during signup)
  BEGIN
    SELECT au.raw_user_meta_data->>'referral_code'
      INTO v_referral_code
    FROM auth.users au
    WHERE au.id = NEW.user_id;
  EXCEPTION WHEN OTHERS THEN
    v_referral_code := NULL;
  END;

  -- Best-effort assignment (MUST NOT block signup)
  BEGIN
    v_result := public.assign_upline_auto(
      NEW.user_id,
      COALESCE(NEW.country, 'Saudi Arabia'),
      COALESCE(NEW.city, ''),
      NEW.district,
      NULLIF(TRIM(v_referral_code), '')
    );

    -- If assignment failed, log (non-blocking)
    IF (v_result->>'success') = 'false' THEN
      BEGIN
        INSERT INTO public.audit_logs (entity_type, action, performed_by, entity_id, metadata)
        VALUES (
          'referral',
          'upline_assign_failed',
          NEW.user_id,
          NEW.user_id,
          jsonb_build_object(
            'source', 'trigger_assign_upline_on_profile_create',
            'error', v_result->>'error',
            'referral_code', v_referral_code,
            'country', NEW.country,
            'city', NEW.city,
            'district', NEW.district
          )
        );
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$function$;

-- Unify legacy wrapper with the main unified function
CREATE OR REPLACE FUNCTION public.process_referral_signup(p_new_user_id uuid, p_referral_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_country text;
  v_city text;
  v_district text;
  v_result json;
BEGIN
  SELECT
    COALESCE(country, 'Saudi Arabia'),
    COALESCE(city, ''),
    district
  INTO v_country, v_city, v_district
  FROM public.profiles
  WHERE user_id = p_new_user_id
  LIMIT 1;

  v_result := public.assign_upline_auto(
    p_new_user_id,
    COALESCE(v_country, 'Saudi Arabia'),
    COALESCE(v_city, ''),
    v_district,
    p_referral_code
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$function$;

-- Guarantee: no referred_by without a level=1 team_members link
CREATE OR REPLACE FUNCTION public.assign_upline_auto(
  p_new_user_id uuid,
  p_country text,
  p_city text,
  p_district text DEFAULT NULL::text,
  p_referral_code text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_upline_user_id uuid;
  v_upline_profile_id uuid;
  v_assignment_reason text;
  v_referrer_record RECORD;
  v_system_root_id uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  -- Check if user already has an upline assigned
  SELECT referred_by INTO v_upline_profile_id
  FROM public.profiles
  WHERE user_id = p_new_user_id;

  IF v_upline_profile_id IS NOT NULL THEN
    -- Already assigned, get the user_id for team_members check
    SELECT user_id INTO v_upline_user_id
    FROM public.profiles
    WHERE id = v_upline_profile_id;

    IF v_upline_user_id IS NOT NULL THEN
      BEGIN
        INSERT INTO public.team_members (leader_id, member_id, level)
        VALUES (v_upline_user_id, p_new_user_id, 1)
        ON CONFLICT (leader_id, member_id) DO NOTHING;

        IF NOT EXISTS (
          SELECT 1 FROM public.team_members tm
          WHERE tm.leader_id = v_upline_user_id
            AND tm.member_id = p_new_user_id
            AND tm.level = 1
        ) THEN
          BEGIN
            INSERT INTO public.audit_logs (entity_type, action, performed_by, entity_id, metadata)
            VALUES (
              'referral',
              'team_link_missing',
              p_new_user_id,
              p_new_user_id,
              jsonb_build_object(
                'stage', 'already_assigned',
                'upline_user_id', v_upline_user_id,
                'upline_profile_id', v_upline_profile_id
              )
            );
          EXCEPTION WHEN OTHERS THEN NULL; END;

          RETURN json_build_object('success', false, 'error', 'team_members_missing');
        END IF;
      EXCEPTION WHEN OTHERS THEN
        BEGIN
          INSERT INTO public.audit_logs (entity_type, action, performed_by, entity_id, metadata)
          VALUES (
            'referral',
            'team_link_insert_failed',
            p_new_user_id,
            p_new_user_id,
            jsonb_build_object(
              'stage', 'already_assigned',
              'sqlerrm', SQLERRM,
              'upline_user_id', v_upline_user_id,
              'upline_profile_id', v_upline_profile_id
            )
          );
        EXCEPTION WHEN OTHERS THEN NULL; END;

        RETURN json_build_object('success', false, 'error', SQLERRM);
      END;
    END IF;

    RETURN json_build_object(
      'success', true,
      'already_assigned', true,
      'upline_user_id', v_upline_user_id,
      'upline_profile_id', v_upline_profile_id
    );
  END IF;

  -- PRIORITY 1: Referral Code
  IF p_referral_code IS NOT NULL AND TRIM(p_referral_code) != '' THEN
    SELECT id, user_id INTO v_referrer_record
    FROM public.profiles
    WHERE referral_code = UPPER(TRIM(p_referral_code))
      AND user_id != p_new_user_id
    LIMIT 1;

    IF v_referrer_record.id IS NOT NULL THEN
      v_upline_profile_id := v_referrer_record.id;
      v_upline_user_id := v_referrer_record.user_id;
      v_assignment_reason := 'referral_code';
    END IF;
  END IF;

  -- PRIORITY 2: Same District
  IF v_upline_user_id IS NULL AND p_district IS NOT NULL AND TRIM(p_district) != '' THEN
    SELECT id, user_id INTO v_referrer_record
    FROM public.profiles
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
    FROM public.profiles
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
    FROM public.profiles
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

  -- PRIORITY 5: Global active
  IF v_upline_user_id IS NULL THEN
    SELECT id, user_id INTO v_referrer_record
    FROM public.profiles
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

  -- PRIORITY 6: Any user
  IF v_upline_user_id IS NULL THEN
    SELECT id, user_id INTO v_referrer_record
    FROM public.profiles
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

  -- Enforce level=1 link BEFORE setting referred_by
  IF v_upline_user_id IS NOT NULL
     AND v_upline_user_id != v_system_root_id
     AND v_upline_profile_id IS NOT NULL THEN

    BEGIN
      INSERT INTO public.team_members (leader_id, member_id, level)
      VALUES (v_upline_user_id, p_new_user_id, 1)
      ON CONFLICT (leader_id, member_id) DO NOTHING;

      IF NOT EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.leader_id = v_upline_user_id
          AND tm.member_id = p_new_user_id
          AND tm.level = 1
      ) THEN
        BEGIN
          INSERT INTO public.audit_logs (entity_type, action, performed_by, entity_id, metadata)
          VALUES (
            'referral',
            'team_link_missing',
            p_new_user_id,
            p_new_user_id,
            jsonb_build_object(
              'stage', 'new_assignment',
              'upline_user_id', v_upline_user_id,
              'upline_profile_id', v_upline_profile_id,
              'reason', v_assignment_reason,
              'referral_code', p_referral_code
            )
          );
        EXCEPTION WHEN OTHERS THEN NULL; END;

        RETURN json_build_object('success', false, 'error', 'team_members_missing');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        INSERT INTO public.audit_logs (entity_type, action, performed_by, entity_id, metadata)
        VALUES (
          'referral',
          'team_link_insert_failed',
          p_new_user_id,
          p_new_user_id,
          jsonb_build_object(
            'stage', 'new_assignment',
            'sqlerrm', SQLERRM,
            'upline_user_id', v_upline_user_id,
            'upline_profile_id', v_upline_profile_id,
            'reason', v_assignment_reason,
            'referral_code', p_referral_code
          )
        );
      EXCEPTION WHEN OTHERS THEN NULL; END;

      RETURN json_build_object('success', false, 'error', SQLERRM);
    END;
  END IF;

  -- Update profile with referred_by ONLY after enforcing team_members link
  IF v_upline_profile_id IS NOT NULL THEN
    UPDATE public.profiles
    SET referred_by = v_upline_profile_id
    WHERE user_id = p_new_user_id
      AND referred_by IS NULL;
  END IF;

  -- Log the assignment (non-blocking)
  BEGIN
    INSERT INTO public.audit_logs (
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
  BEGIN
    INSERT INTO public.audit_logs (entity_type, action, performed_by, entity_id, metadata)
    VALUES (
      'referral',
      'assign_upline_auto_failed',
      p_new_user_id,
      p_new_user_id,
      jsonb_build_object(
        'sqlerrm', SQLERRM,
        'country', p_country,
        'city', p_city,
        'district', p_district,
        'referral_code', p_referral_code
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$function$;