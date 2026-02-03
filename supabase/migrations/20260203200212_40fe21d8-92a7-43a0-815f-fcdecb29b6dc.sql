-- Drop existing function first to change return type
DROP FUNCTION IF EXISTS public.process_referral_signup(uuid, text);

-- Recreate with jsonb return type and ancestor propagation
CREATE OR REPLACE FUNCTION public.process_referral_signup(
  p_new_user_id uuid,
  p_referral_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_user_id uuid;
  v_referrer_profile_id uuid;
  v_referrer_name text;
  v_referrer_username text;
  v_referrer_rank text;
  v_referrer_avatar_url text;
  v_team_link_created boolean := false;
  v_ancestor_count int := 0;
BEGIN
  -- Check if user already has an upline
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = p_new_user_id AND referred_by IS NOT NULL) THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_assigned', true,
      'reason', 'User already has an assigned upline'
    );
  END IF;

  -- Find the referrer by code
  SELECT p.user_id, p.id, p.name, p.username, p.rank::text, p.avatar_url
  INTO v_referrer_user_id, v_referrer_profile_id, v_referrer_name, v_referrer_username, v_referrer_rank, v_referrer_avatar_url
  FROM profiles p
  WHERE p.referral_code = UPPER(TRIM(p_referral_code))
    AND p.user_id <> p_new_user_id
  LIMIT 1;

  IF v_referrer_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid referral code'
    );
  END IF;

  -- Step 1: Insert direct (level=1) relationship
  INSERT INTO team_members (leader_id, member_id, level)
  VALUES (v_referrer_user_id, p_new_user_id, 1)
  ON CONFLICT DO NOTHING;

  IF FOUND THEN
    v_team_link_created := true;
  END IF;

  -- Step 2: Propagate to all ancestors (closure table pattern)
  INSERT INTO team_members (leader_id, member_id, level)
  SELECT tm.leader_id, p_new_user_id, tm.level + 1
  FROM team_members tm
  WHERE tm.member_id = v_referrer_user_id
    AND tm.level < 10
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_ancestor_count = ROW_COUNT;

  -- Step 3: Update profile with referred_by
  UPDATE profiles
  SET referred_by = v_referrer_profile_id
  WHERE user_id = p_new_user_id
    AND referred_by IS NULL;

  -- Step 4: Log to audit_logs
  INSERT INTO audit_logs (action, entity_type, entity_id, performed_by, metadata)
  VALUES (
    'referral_assignment',
    'team_members',
    p_new_user_id,
    p_new_user_id,
    jsonb_build_object(
      'upline_user_id', v_referrer_user_id,
      'upline_profile_id', v_referrer_profile_id,
      'upline_name', v_referrer_name,
      'assignment_reason', 'referral_code',
      'referral_code_used', p_referral_code,
      'team_link_created', v_team_link_created,
      'ancestor_links_created', v_ancestor_count
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'upline_user_id', v_referrer_user_id,
    'upline_profile_id', v_referrer_profile_id,
    'upline_name', v_referrer_name,
    'upline_username', v_referrer_username,
    'upline_rank', v_referrer_rank,
    'upline_avatar_url', v_referrer_avatar_url,
    'reason', 'referral_code',
    'team_link_created', v_team_link_created,
    'ancestor_links_created', v_ancestor_count
  );
END;
$$;

-- Add unique constraint to prevent duplicate team_members entries
ALTER TABLE team_members 
DROP CONSTRAINT IF EXISTS team_members_leader_member_unique;

ALTER TABLE team_members 
ADD CONSTRAINT team_members_leader_member_unique 
UNIQUE (leader_id, member_id);