-- ═══════════════════════════════════════════════════════════════════════════
-- TEAM SYSTEM ENHANCEMENT - PRODUCTION-READY RPCs
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add city column to profiles if not exists (for auto-assignment)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'profiles' 
                 AND column_name = 'city') THEN
    ALTER TABLE public.profiles ADD COLUMN city TEXT;
  END IF;
END $$;

-- 2. Create function to find most active leader for auto-assignment
CREATE OR REPLACE FUNCTION public.find_active_leader_for_assignment(
  p_country TEXT,
  p_city TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_leader_id UUID;
BEGIN
  -- Priority 1: Same city with highest activity
  IF p_city IS NOT NULL THEN
    SELECT p.user_id INTO v_leader_id
    FROM profiles p
    WHERE p.city = p_city
      AND p.country = p_country
      AND p.weekly_active = true
      AND p.rank IN ('marketer', 'leader', 'manager', 'president')
    ORDER BY p.spotlight_points DESC, p.activity_percentage DESC
    LIMIT 1;
    
    IF v_leader_id IS NOT NULL THEN
      RETURN v_leader_id;
    END IF;
  END IF;
  
  -- Priority 2: Same country with highest activity
  SELECT p.user_id INTO v_leader_id
  FROM profiles p
  WHERE p.country = p_country
    AND p.weekly_active = true
    AND p.rank IN ('marketer', 'leader', 'manager', 'president')
  ORDER BY p.spotlight_points DESC, p.activity_percentage DESC
  LIMIT 1;
  
  IF v_leader_id IS NOT NULL THEN
    RETURN v_leader_id;
  END IF;
  
  -- Priority 3: Global fallback - any active marketer+
  SELECT p.user_id INTO v_leader_id
  FROM profiles p
  WHERE p.weekly_active = true
    AND p.rank IN ('marketer', 'leader', 'manager', 'president')
  ORDER BY p.spotlight_points DESC, p.activity_percentage DESC
  LIMIT 1;
  
  RETURN v_leader_id;
END;
$$;

-- 3. Create function to assign referral automatically
CREATE OR REPLACE FUNCTION public.assign_referral_auto(
  p_new_user_id UUID,
  p_country TEXT,
  p_city TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_leader_id UUID;
  v_leader_profile_id UUID;
BEGIN
  -- Find the most active leader
  v_leader_id := find_active_leader_for_assignment(p_country, p_city);
  
  IF v_leader_id IS NULL THEN
    RETURN json_build_object(
      'success', true,
      'assigned', false,
      'message', 'No active leader found for auto-assignment'
    );
  END IF;
  
  -- Get leader's profile ID
  SELECT id INTO v_leader_profile_id FROM profiles WHERE user_id = v_leader_id;
  
  -- Update the new user's referred_by
  UPDATE profiles
  SET referred_by = v_leader_profile_id
  WHERE user_id = p_new_user_id;
  
  -- Create team_members entry
  INSERT INTO team_members (leader_id, member_id, level)
  VALUES (v_leader_id, p_new_user_id, 1)
  ON CONFLICT DO NOTHING;
  
  -- Log the auto-assignment
  INSERT INTO audit_logs (
    action,
    entity_type,
    entity_id,
    performed_by,
    metadata
  ) VALUES (
    'referral_auto_assigned',
    'profile',
    p_new_user_id,
    p_new_user_id,
    json_build_object(
      'assigned_to', v_leader_id,
      'source', 'auto',
      'reason', 'No referral code provided - auto-assigned to most active leader',
      'country', p_country,
      'city', p_city
    )
  );
  
  RETURN json_build_object(
    'success', true,
    'assigned', true,
    'leader_id', v_leader_id
  );
END;
$$;

-- 4. Create function to process referral code signup
CREATE OR REPLACE FUNCTION public.process_referral_signup(
  p_new_user_id UUID,
  p_referral_code TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_profile RECORD;
BEGIN
  -- Find the referrer by code
  SELECT id, user_id INTO v_referrer_profile
  FROM profiles
  WHERE referral_code = UPPER(TRIM(p_referral_code));
  
  IF v_referrer_profile IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid referral code'
    );
  END IF;
  
  -- Update the new user's referred_by
  UPDATE profiles
  SET referred_by = v_referrer_profile.id
  WHERE user_id = p_new_user_id;
  
  -- Create team_members entry (direct = level 1)
  INSERT INTO team_members (leader_id, member_id, level)
  VALUES (v_referrer_profile.user_id, p_new_user_id, 1)
  ON CONFLICT DO NOTHING;
  
  -- Log the referral
  INSERT INTO audit_logs (
    action,
    entity_type,
    entity_id,
    performed_by,
    metadata
  ) VALUES (
    'referral_code_used',
    'profile',
    p_new_user_id,
    p_new_user_id,
    json_build_object(
      'referrer_id', v_referrer_profile.user_id,
      'referral_code', p_referral_code,
      'source', 'code'
    )
  );
  
  RETURN json_build_object(
    'success', true,
    'referrer_id', v_referrer_profile.user_id
  );
END;
$$;

-- 5. Create comprehensive team stats function
CREATE OR REPLACE FUNCTION public.get_team_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_direct_count INTEGER;
  v_indirect_count INTEGER;
  v_active_direct INTEGER;
  v_active_indirect INTEGER;
  v_total_points INTEGER;
  v_user_profile RECORD;
  v_cycle_id UUID;
  v_current_week INTEGER;
BEGIN
  -- Get user's profile
  SELECT * INTO v_user_profile FROM profiles WHERE user_id = p_user_id;
  
  -- Get current cycle info
  SELECT id, 
         EXTRACT(WEEK FROM CURRENT_DATE) - EXTRACT(WEEK FROM start_date) + 1
  INTO v_cycle_id, v_current_week
  FROM spotlight_cycles
  WHERE status = 'active'
  LIMIT 1;
  
  -- Count direct team members (level = 1)
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE p.weekly_active = true)
  INTO v_direct_count, v_active_direct
  FROM team_members tm
  JOIN profiles p ON p.user_id = tm.member_id
  WHERE tm.leader_id = p_user_id AND tm.level = 1;
  
  -- Count indirect team members (level > 1)
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE p.weekly_active = true)
  INTO v_indirect_count, v_active_indirect
  FROM team_members tm
  JOIN profiles p ON p.user_id = tm.member_id
  WHERE tm.leader_id = p_user_id AND tm.level > 1;
  
  -- Calculate total team points
  SELECT COALESCE(SUM(sup.daily_points), 0) INTO v_total_points
  FROM team_members tm
  JOIN spotlight_user_points sup ON sup.user_id = tm.member_id
  WHERE tm.leader_id = p_user_id
    AND (v_cycle_id IS NULL OR sup.cycle_id = v_cycle_id);
  
  RETURN json_build_object(
    'direct_count', v_direct_count,
    'indirect_count', v_indirect_count,
    'total_count', v_direct_count + v_indirect_count,
    'active_direct', v_active_direct,
    'active_indirect', v_active_indirect,
    'total_active', v_active_direct + v_active_indirect,
    'direct_activity_rate', CASE WHEN v_direct_count > 0 
      THEN ROUND((v_active_direct::NUMERIC / v_direct_count) * 100) 
      ELSE 0 END,
    'total_activity_rate', CASE WHEN (v_direct_count + v_indirect_count) > 0 
      THEN ROUND(((v_active_direct + v_active_indirect)::NUMERIC / (v_direct_count + v_indirect_count)) * 100) 
      ELSE 0 END,
    'team_points', v_total_points,
    'current_week', COALESCE(v_current_week, 1),
    'total_weeks', 14,
    'user_active_weeks', v_user_profile.active_weeks,
    'user_activity_percentage', v_user_profile.activity_percentage,
    'user_spotlight_points', v_user_profile.spotlight_points,
    'user_rank', v_user_profile.rank
  );
END;
$$;

-- 6. Create referral stats function
CREATE OR REPLACE FUNCTION public.get_referral_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_invited INTEGER;
  v_active_invited INTEGER;
  v_conversion_rate NUMERIC;
  v_referral_code TEXT;
BEGIN
  -- Get referral code
  SELECT referral_code INTO v_referral_code FROM profiles WHERE user_id = p_user_id;
  
  -- Count total and active invites
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE p.weekly_active = true)
  INTO v_total_invited, v_active_invited
  FROM team_members tm
  JOIN profiles p ON p.user_id = tm.member_id
  WHERE tm.leader_id = p_user_id AND tm.level = 1;
  
  -- Calculate conversion rate
  v_conversion_rate := CASE WHEN v_total_invited > 0 
    THEN ROUND((v_active_invited::NUMERIC / v_total_invited) * 100) 
    ELSE 0 END;
  
  RETURN json_build_object(
    'referral_code', v_referral_code,
    'total_invited', v_total_invited,
    'active_invited', v_active_invited,
    'conversion_rate', v_conversion_rate
  );
END;
$$;

-- 7. Create team ranking function
CREATE OR REPLACE FUNCTION public.get_team_ranking(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_profile RECORD;
  v_country_rank INTEGER;
  v_global_rank INTEGER;
BEGIN
  -- Get user profile
  SELECT * INTO v_user_profile FROM profiles WHERE user_id = p_user_id;
  
  -- Calculate country ranking by spotlight points
  SELECT rank INTO v_country_rank
  FROM (
    SELECT user_id, 
           ROW_NUMBER() OVER (ORDER BY spotlight_points DESC) as rank
    FROM profiles
    WHERE country = v_user_profile.country
  ) ranked
  WHERE user_id = p_user_id;
  
  -- Calculate global ranking
  SELECT rank INTO v_global_rank
  FROM (
    SELECT user_id,
           ROW_NUMBER() OVER (ORDER BY spotlight_points DESC) as rank
    FROM profiles
  ) ranked
  WHERE user_id = p_user_id;
  
  RETURN json_build_object(
    'country_rank', COALESCE(v_country_rank, 0),
    'global_rank', COALESCE(v_global_rank, 0),
    'country', v_user_profile.country,
    'spotlight_points', v_user_profile.spotlight_points
  );
END;
$$;

-- 8. Create level breakdown function
CREATE OR REPLACE FUNCTION public.get_team_level_breakdown(p_user_id UUID, p_max_level INTEGER DEFAULT 5)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_breakdown JSON;
BEGIN
  SELECT json_agg(level_data ORDER BY level)
  INTO v_breakdown
  FROM (
    SELECT 
      tm.level,
      COUNT(*) as total_count,
      COUNT(*) FILTER (WHERE p.weekly_active = true) as active_count
    FROM team_members tm
    JOIN profiles p ON p.user_id = tm.member_id
    WHERE tm.leader_id = p_user_id
      AND tm.level <= p_max_level
    GROUP BY tm.level
  ) level_data;
  
  RETURN COALESCE(v_breakdown, '[]'::JSON);
END;
$$;

-- 9. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.find_active_leader_for_assignment TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_referral_auto TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_referral_signup TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_referral_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_ranking TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_level_breakdown TO authenticated;