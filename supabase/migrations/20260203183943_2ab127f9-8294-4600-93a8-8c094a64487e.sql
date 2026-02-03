-- Drop existing function first
DROP FUNCTION IF EXISTS public.assign_upline_auto(uuid, text, text, text, text);

-- Function to get user's direct leader info
CREATE OR REPLACE FUNCTION public.get_my_direct_leader(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_leader_record RECORD;
  v_result jsonb;
BEGIN
  -- Find the leader from team_members where member_id = current user AND level = 1
  SELECT 
    p.user_id,
    p.id AS profile_id,
    p.name,
    p.username,
    p.avatar_url,
    p.rank,
    p.country
  INTO v_leader_record
  FROM public.team_members tm
  JOIN public.profiles p ON p.user_id = tm.leader_id
  WHERE tm.member_id = p_user_id
    AND tm.level = 1
  LIMIT 1;

  IF v_leader_record IS NULL THEN
    RETURN jsonb_build_object(
      'found', false,
      'leader', null
    );
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'leader', jsonb_build_object(
      'user_id', v_leader_record.user_id,
      'profile_id', v_leader_record.profile_id,
      'name', v_leader_record.name,
      'username', v_leader_record.username,
      'avatar_url', v_leader_record.avatar_url,
      'rank', v_leader_record.rank,
      'country', v_leader_record.country
    )
  );
END;
$$;

-- Recreate assign_upline_auto to return leader info after assignment
CREATE OR REPLACE FUNCTION public.assign_upline_auto(
  p_new_user_id uuid,
  p_country text,
  p_city text,
  p_district text DEFAULT NULL,
  p_referral_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upline_user_id uuid;
  v_upline_profile_id uuid;
  v_upline_name text;
  v_upline_username text;
  v_upline_rank text;
  v_upline_avatar_url text;
  v_assignment_reason text := 'none';
  v_team_link_created boolean := false;
BEGIN
  -- Check if already assigned
  IF EXISTS (SELECT 1 FROM public.team_members WHERE member_id = p_new_user_id AND level = 1) THEN
    -- Already has a leader, get their info
    SELECT p.user_id, p.id, p.name, p.username, p.rank, p.avatar_url
    INTO v_upline_user_id, v_upline_profile_id, v_upline_name, v_upline_username, v_upline_rank, v_upline_avatar_url
    FROM public.team_members tm
    JOIN public.profiles p ON p.user_id = tm.leader_id
    WHERE tm.member_id = p_new_user_id AND tm.level = 1
    LIMIT 1;
    
    RETURN jsonb_build_object(
      'success', true,
      'already_assigned', true,
      'upline_user_id', v_upline_user_id,
      'upline_profile_id', v_upline_profile_id,
      'upline_name', v_upline_name,
      'upline_username', v_upline_username,
      'upline_rank', v_upline_rank,
      'upline_avatar_url', v_upline_avatar_url,
      'reason', 'already_assigned'
    );
  END IF;

  -- Priority 1: Referral code
  IF p_referral_code IS NOT NULL AND p_referral_code <> '' THEN
    SELECT p.user_id, p.id, p.name, p.username, p.rank, p.avatar_url
    INTO v_upline_user_id, v_upline_profile_id, v_upline_name, v_upline_username, v_upline_rank, v_upline_avatar_url
    FROM public.profiles p
    WHERE p.referral_code = UPPER(TRIM(p_referral_code))
      AND p.user_id <> p_new_user_id
    LIMIT 1;
    
    IF v_upline_user_id IS NOT NULL THEN
      v_assignment_reason := 'referral_code';
    END IF;
  END IF;

  -- Priority 2: Same district (if provided and no referral match)
  IF v_upline_user_id IS NULL AND p_district IS NOT NULL AND p_district <> '' THEN
    SELECT p.user_id, p.id, p.name, p.username, p.rank, p.avatar_url
    INTO v_upline_user_id, v_upline_profile_id, v_upline_name, v_upline_username, v_upline_rank, v_upline_avatar_url
    FROM public.profiles p
    WHERE p.district = p_district
      AND p.city = p_city
      AND p.country = p_country
      AND p.rank IN ('marketer', 'leader', 'manager', 'president')
      AND p.weekly_active = true
      AND p.user_id <> p_new_user_id
    ORDER BY p.spotlight_points DESC, p.active_weeks DESC
    LIMIT 1;
    
    IF v_upline_user_id IS NOT NULL THEN
      v_assignment_reason := 'same_district';
    END IF;
  END IF;

  -- Priority 3: Same city
  IF v_upline_user_id IS NULL AND p_city IS NOT NULL AND p_city <> '' THEN
    SELECT p.user_id, p.id, p.name, p.username, p.rank, p.avatar_url
    INTO v_upline_user_id, v_upline_profile_id, v_upline_name, v_upline_username, v_upline_rank, v_upline_avatar_url
    FROM public.profiles p
    WHERE p.city = p_city
      AND p.country = p_country
      AND p.rank IN ('marketer', 'leader', 'manager', 'president')
      AND p.weekly_active = true
      AND p.user_id <> p_new_user_id
    ORDER BY p.spotlight_points DESC, p.active_weeks DESC
    LIMIT 1;
    
    IF v_upline_user_id IS NOT NULL THEN
      v_assignment_reason := 'same_city';
    END IF;
  END IF;

  -- Priority 4: Same country
  IF v_upline_user_id IS NULL AND p_country IS NOT NULL AND p_country <> '' THEN
    SELECT p.user_id, p.id, p.name, p.username, p.rank, p.avatar_url
    INTO v_upline_user_id, v_upline_profile_id, v_upline_name, v_upline_username, v_upline_rank, v_upline_avatar_url
    FROM public.profiles p
    WHERE p.country = p_country
      AND p.rank IN ('marketer', 'leader', 'manager', 'president')
      AND p.weekly_active = true
      AND p.user_id <> p_new_user_id
    ORDER BY p.spotlight_points DESC, p.active_weeks DESC
    LIMIT 1;
    
    IF v_upline_user_id IS NOT NULL THEN
      v_assignment_reason := 'same_country';
    END IF;
  END IF;

  -- Priority 5: Global top active user
  IF v_upline_user_id IS NULL THEN
    SELECT p.user_id, p.id, p.name, p.username, p.rank, p.avatar_url
    INTO v_upline_user_id, v_upline_profile_id, v_upline_name, v_upline_username, v_upline_rank, v_upline_avatar_url
    FROM public.profiles p
    WHERE p.rank IN ('marketer', 'leader', 'manager', 'president')
      AND p.weekly_active = true
      AND p.user_id <> p_new_user_id
    ORDER BY p.spotlight_points DESC, p.active_weeks DESC
    LIMIT 1;
    
    IF v_upline_user_id IS NOT NULL THEN
      v_assignment_reason := 'global_active';
    END IF;
  END IF;

  -- Priority 6: Any user with referrals (fallback)
  IF v_upline_user_id IS NULL THEN
    SELECT p.user_id, p.id, p.name, p.username, p.rank, p.avatar_url
    INTO v_upline_user_id, v_upline_profile_id, v_upline_name, v_upline_username, v_upline_rank, v_upline_avatar_url
    FROM public.profiles p
    WHERE p.user_id <> p_new_user_id
      AND p.referral_code IS NOT NULL
    ORDER BY p.created_at ASC
    LIMIT 1;
    
    IF v_upline_user_id IS NOT NULL THEN
      v_assignment_reason := 'fallback_any_user';
    END IF;
  END IF;

  -- If no upline found at all, return failure
  IF v_upline_user_id IS NULL THEN
    -- Log the failure
    INSERT INTO public.audit_logs (
      performed_by,
      action,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      p_new_user_id,
      'referral_assignment_failed',
      'profile',
      p_new_user_id,
      jsonb_build_object(
        'reason', 'no_eligible_leader',
        'country', p_country,
        'city', p_city,
        'district', p_district,
        'referral_code', p_referral_code
      )
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No eligible leader found',
      'reason', 'no_eligible_leader'
    );
  END IF;

  -- CRITICAL: Create team_members entry FIRST
  BEGIN
    INSERT INTO public.team_members (leader_id, member_id, level)
    VALUES (v_upline_user_id, p_new_user_id, 1)
    ON CONFLICT (leader_id, member_id) DO NOTHING;
    
    -- Verify the insert worked
    IF EXISTS (SELECT 1 FROM public.team_members WHERE leader_id = v_upline_user_id AND member_id = p_new_user_id AND level = 1) THEN
      v_team_link_created := true;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_team_link_created := false;
  END;

  -- Only update profiles.referred_by if team link was created
  IF v_team_link_created THEN
    UPDATE public.profiles
    SET referred_by = v_upline_profile_id
    WHERE user_id = p_new_user_id
      AND referred_by IS NULL;
  ELSE
    -- Log failure to create team link
    INSERT INTO public.audit_logs (
      performed_by,
      action,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      p_new_user_id,
      'team_link_creation_failed',
      'team_members',
      p_new_user_id,
      jsonb_build_object(
        'intended_leader', v_upline_user_id,
        'assignment_reason', v_assignment_reason
      )
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to create team link',
      'reason', 'team_link_failed'
    );
  END IF;

  -- Log successful assignment
  INSERT INTO public.audit_logs (
    performed_by,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    p_new_user_id,
    'referral_assigned',
    'profile',
    p_new_user_id,
    jsonb_build_object(
      'assigned_to', v_upline_user_id,
      'assignment_reason', v_assignment_reason,
      'country', p_country,
      'city', p_city,
      'district', p_district,
      'referral_code', p_referral_code
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'already_assigned', false,
    'upline_user_id', v_upline_user_id,
    'upline_profile_id', v_upline_profile_id,
    'upline_name', v_upline_name,
    'upline_username', v_upline_username,
    'upline_rank', v_upline_rank,
    'upline_avatar_url', v_upline_avatar_url,
    'reason', v_assignment_reason,
    'team_link_created', v_team_link_created
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_my_direct_leader(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_upline_auto(uuid, text, text, text, text) TO authenticated;