-- ==========================================================
-- PART 3: IMPROVED RPCs FOR TEAM AND REFERRAL
-- ==========================================================

-- 1. IMPROVED get_team_stats with more accurate data
CREATE OR REPLACE FUNCTION public.get_team_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_direct_count INT;
  v_indirect_count INT;
  v_active_direct INT;
  v_active_indirect INT;
  v_team_points BIGINT;
  v_cycle_id UUID;
  v_current_week INT;
  v_user_profile RECORD;
BEGIN
  -- Get user profile
  SELECT * INTO v_user_profile FROM profiles WHERE user_id = p_user_id;
  
  -- Get active cycle
  SELECT cycle_id, week_number INTO v_cycle_id, v_current_week FROM get_active_cycle_info();
  
  -- Count direct team (level = 1)
  SELECT COUNT(*) INTO v_direct_count
  FROM team_members
  WHERE leader_id = p_user_id AND level = 1;
  
  -- Count indirect team (level > 1)
  SELECT COUNT(*) INTO v_indirect_count
  FROM team_members
  WHERE leader_id = p_user_id AND level > 1;
  
  -- Count active direct members
  SELECT COUNT(*) INTO v_active_direct
  FROM team_members tm
  JOIN profiles p ON p.user_id = tm.member_id
  WHERE tm.leader_id = p_user_id AND tm.level = 1 AND p.weekly_active = true;
  
  -- Count active indirect members
  SELECT COUNT(*) INTO v_active_indirect
  FROM team_members tm
  JOIN profiles p ON p.user_id = tm.member_id
  WHERE tm.leader_id = p_user_id AND tm.level > 1 AND p.weekly_active = true;
  
  -- Calculate team points from spotlight
  SELECT COALESCE(SUM(daily_points), 0) INTO v_team_points
  FROM spotlight_user_points sup
  JOIN team_members tm ON tm.member_id = sup.user_id
  WHERE tm.leader_id = p_user_id
    AND (v_cycle_id IS NULL OR sup.cycle_id = v_cycle_id);
  
  -- Build result
  v_result := json_build_object(
    'direct_count', COALESCE(v_direct_count, 0),
    'indirect_count', COALESCE(v_indirect_count, 0),
    'total_count', COALESCE(v_direct_count, 0) + COALESCE(v_indirect_count, 0),
    'active_direct', COALESCE(v_active_direct, 0),
    'active_indirect', COALESCE(v_active_indirect, 0),
    'total_active', COALESCE(v_active_direct, 0) + COALESCE(v_active_indirect, 0),
    'direct_activity_rate', CASE WHEN v_direct_count > 0 THEN ROUND((v_active_direct::NUMERIC / v_direct_count) * 100, 1) ELSE 0 END,
    'total_activity_rate', CASE WHEN (v_direct_count + v_indirect_count) > 0 THEN ROUND(((v_active_direct + v_active_indirect)::NUMERIC / (v_direct_count + v_indirect_count)) * 100, 1) ELSE 0 END,
    'team_points', COALESCE(v_team_points, 0),
    'current_week', COALESCE(v_current_week, 1),
    'total_weeks', 14,
    'user_active_weeks', COALESCE(v_user_profile.active_weeks, 0),
    'user_activity_percentage', COALESCE(v_user_profile.activity_percentage, 0),
    'user_spotlight_points', COALESCE(v_user_profile.spotlight_points, 0),
    'user_rank', COALESCE(v_user_profile.rank::TEXT, 'subscriber')
  );
  
  RETURN v_result;
END;
$$;

-- 2. IMPROVED get_referral_stats with real data
CREATE OR REPLACE FUNCTION public.get_referral_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_referral_code TEXT;
  v_total_invited INT;
  v_active_invited INT;
  v_conversion_rate NUMERIC;
BEGIN
  -- Get user's referral code
  SELECT referral_code INTO v_referral_code
  FROM profiles WHERE user_id = p_user_id;
  
  -- Count direct referrals (level 1)
  SELECT COUNT(*) INTO v_total_invited
  FROM team_members
  WHERE leader_id = p_user_id AND level = 1;
  
  -- Count active referrals
  SELECT COUNT(*) INTO v_active_invited
  FROM team_members tm
  JOIN profiles p ON p.user_id = tm.member_id
  WHERE tm.leader_id = p_user_id AND tm.level = 1 AND p.weekly_active = true;
  
  -- Calculate conversion rate
  v_conversion_rate := CASE 
    WHEN v_total_invited > 0 THEN ROUND((v_active_invited::NUMERIC / v_total_invited) * 100, 1)
    ELSE 0
  END;
  
  v_result := json_build_object(
    'referral_code', v_referral_code,
    'total_invited', COALESCE(v_total_invited, 0),
    'active_invited', COALESCE(v_active_invited, 0),
    'conversion_rate', v_conversion_rate
  );
  
  RETURN v_result;
END;
$$;

-- 3. IMPROVED get_team_hierarchy with proper data
CREATE OR REPLACE FUNCTION public.get_team_hierarchy(
  p_leader_id UUID,
  p_max_depth INT DEFAULT 5
)
RETURNS TABLE(
  member_id UUID,
  level INT,
  name TEXT,
  username TEXT,
  avatar_url TEXT,
  rank TEXT,
  weekly_active BOOLEAN,
  active_weeks INT,
  direct_count BIGINT,
  parent_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH member_direct_counts AS (
    SELECT tm2.leader_id as member_user_id, COUNT(*) as cnt
    FROM team_members tm2
    WHERE tm2.level = 1
    GROUP BY tm2.leader_id
  )
  SELECT 
    tm.member_id,
    tm.level,
    p.name,
    p.username,
    p.avatar_url,
    p.rank::TEXT,
    p.weekly_active,
    p.active_weeks,
    COALESCE(mdc.cnt, 0) as direct_count,
    CASE 
      WHEN tm.level = 1 THEN p_leader_id
      ELSE (
        SELECT tm2.leader_id 
        FROM team_members tm2 
        WHERE tm2.member_id = tm.member_id AND tm2.level = 1
        LIMIT 1
      )
    END as parent_id
  FROM team_members tm
  JOIN profiles p ON p.user_id = tm.member_id
  LEFT JOIN member_direct_counts mdc ON mdc.member_user_id = tm.member_id
  WHERE tm.leader_id = p_leader_id AND tm.level <= p_max_depth
  ORDER BY tm.level, p.name;
END;
$$;

-- 4. IMPROVED get_team_level_breakdown
CREATE OR REPLACE FUNCTION public.get_team_level_breakdown(
  p_user_id UUID,
  p_max_level INT DEFAULT 5
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(row_to_json(breakdown))
  INTO v_result
  FROM (
    SELECT 
      tm.level,
      COUNT(*) as total_count,
      COUNT(*) FILTER (WHERE p.weekly_active = true) as active_count
    FROM team_members tm
    JOIN profiles p ON p.user_id = tm.member_id
    WHERE tm.leader_id = p_user_id AND tm.level <= p_max_level
    GROUP BY tm.level
    ORDER BY tm.level
  ) breakdown;
  
  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;

-- 5. IMPROVED get_team_ranking
CREATE OR REPLACE FUNCTION public.get_team_ranking(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_country TEXT;
  v_spotlight_points INT;
  v_country_rank INT;
  v_global_rank INT;
BEGIN
  -- Get user's country and points
  SELECT country, spotlight_points 
  INTO v_country, v_spotlight_points
  FROM profiles WHERE user_id = p_user_id;
  
  -- Calculate country rank
  SELECT COUNT(*) + 1 INTO v_country_rank
  FROM profiles
  WHERE country = v_country
    AND spotlight_points > COALESCE(v_spotlight_points, 0);
  
  -- Calculate global rank
  SELECT COUNT(*) + 1 INTO v_global_rank
  FROM profiles
  WHERE spotlight_points > COALESCE(v_spotlight_points, 0);
  
  v_result := json_build_object(
    'country_rank', COALESCE(v_country_rank, 1),
    'global_rank', COALESCE(v_global_rank, 1),
    'country', v_country,
    'spotlight_points', COALESCE(v_spotlight_points, 0)
  );
  
  RETURN v_result;
END;
$$;

-- 6. IMPROVED process_referral_signup
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
  v_result JSON;
BEGIN
  -- Find the referrer by code
  SELECT * INTO v_referrer_profile
  FROM profiles
  WHERE referral_code = UPPER(TRIM(p_referral_code));
  
  IF v_referrer_profile IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid referral code'
    );
  END IF;
  
  -- Prevent self-referral
  IF v_referrer_profile.user_id = p_new_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot refer yourself'
    );
  END IF;
  
  -- Update new user's profile with referrer
  UPDATE profiles
  SET referred_by = v_referrer_profile.id
  WHERE user_id = p_new_user_id;
  
  -- Log the referral
  INSERT INTO audit_logs (
    action,
    entity_type,
    entity_id,
    performed_by,
    metadata
  ) VALUES (
    'referral_assigned',
    'profile',
    p_new_user_id,
    p_new_user_id,
    json_build_object(
      'source', 'code',
      'referrer_id', v_referrer_profile.user_id,
      'referral_code', p_referral_code
    )
  );
  
  RETURN json_build_object(
    'success', true,
    'referrer_id', v_referrer_profile.user_id,
    'assigned', true
  );
END;
$$;

-- 7. IMPROVED assign_referral_auto with priority logic
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
  v_result JSON;
BEGIN
  -- Find the best leader using priority logic
  v_leader_id := find_active_leader_for_assignment(p_country, p_city);
  
  IF v_leader_id IS NULL THEN
    RETURN json_build_object(
      'success', true,
      'assigned', false,
      'reason', 'No suitable leader found'
    );
  END IF;
  
  -- Prevent self-assignment
  IF v_leader_id = p_new_user_id THEN
    RETURN json_build_object(
      'success', true,
      'assigned', false,
      'reason', 'Cannot assign to self'
    );
  END IF;
  
  -- Get leader's profile id
  SELECT id INTO v_leader_profile_id
  FROM profiles WHERE user_id = v_leader_id;
  
  -- Update new user's profile with referrer
  UPDATE profiles
  SET referred_by = v_leader_profile_id
  WHERE user_id = p_new_user_id;
  
  -- Log the auto-assignment
  INSERT INTO audit_logs (
    action,
    entity_type,
    entity_id,
    performed_by,
    metadata
  ) VALUES (
    'referral_assigned',
    'profile',
    p_new_user_id,
    p_new_user_id,
    json_build_object(
      'source', 'auto',
      'leader_id', v_leader_id,
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

-- 8. IMPROVED find_active_leader_for_assignment with priority
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
  -- Priority 1: Same city (if provided)
  IF p_city IS NOT NULL THEN
    SELECT p.user_id INTO v_leader_id
    FROM profiles p
    WHERE p.city = p_city 
      AND p.country = p_country
      AND p.weekly_active = true
      AND p.rank IN ('marketer', 'leader', 'manager', 'president')
    ORDER BY p.spotlight_points DESC, p.created_at ASC
    LIMIT 1;
    
    IF v_leader_id IS NOT NULL THEN
      RETURN v_leader_id;
    END IF;
  END IF;
  
  -- Priority 2: Same country
  SELECT p.user_id INTO v_leader_id
  FROM profiles p
  WHERE p.country = p_country
    AND p.weekly_active = true
    AND p.rank IN ('marketer', 'leader', 'manager', 'president')
  ORDER BY p.spotlight_points DESC, p.created_at ASC
  LIMIT 1;
  
  IF v_leader_id IS NOT NULL THEN
    RETURN v_leader_id;
  END IF;
  
  -- Priority 3: Global (any active leader)
  SELECT p.user_id INTO v_leader_id
  FROM profiles p
  WHERE p.weekly_active = true
    AND p.rank IN ('marketer', 'leader', 'manager', 'president')
  ORDER BY p.spotlight_points DESC, p.created_at ASC
  LIMIT 1;
  
  IF v_leader_id IS NOT NULL THEN
    RETURN v_leader_id;
  END IF;
  
  -- Priority 4: Any active user with most points
  SELECT p.user_id INTO v_leader_id
  FROM profiles p
  WHERE p.weekly_active = true
  ORDER BY p.spotlight_points DESC, p.created_at ASC
  LIMIT 1;
  
  RETURN v_leader_id;
END;
$$;

-- 9. get_active_cycle_info
CREATE OR REPLACE FUNCTION public.get_active_cycle_info()
RETURNS TABLE(cycle_id UUID, week_number INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle RECORD;
  v_today DATE := CURRENT_DATE;
  v_current_day INT;
  v_current_week INT;
BEGIN
  SELECT * INTO v_cycle FROM spotlight_cycles sc WHERE sc.status = 'active' LIMIT 1;
  
  IF v_cycle IS NULL THEN
    -- Create default cycle
    INSERT INTO spotlight_cycles (
      cycle_number,
      start_date,
      end_date,
      total_days,
      total_weeks,
      status
    )
    VALUES (
      1,
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '98 days',
      98,
      14,
      'active'
    )
    RETURNING * INTO v_cycle;
  END IF;
  
  v_current_day := GREATEST(1, LEAST(v_cycle.total_days, 
    (v_today - v_cycle.start_date)::INT + 1));
  v_current_week := GREATEST(1, CEIL(v_current_day::NUMERIC / 7));
  
  RETURN QUERY SELECT v_cycle.id, v_current_week;
END;
$$;

-- 10. generate_referral_code_v2 with country code
CREATE OR REPLACE FUNCTION public.generate_referral_code_v2(
  p_username TEXT,
  p_country TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_country_code TEXT;
  v_attempts INT := 0;
BEGIN
  -- Get country code (first 2 letters, uppercase)
  v_country_code := UPPER(LEFT(REGEXP_REPLACE(p_country, '[^a-zA-Z]', '', 'g'), 2));
  
  -- Default to 'XX' if no valid country
  IF LENGTH(v_country_code) < 2 THEN
    v_country_code := 'XX';
  END IF;
  
  LOOP
    v_code := 'WINOVA-' || UPPER(p_username) || '-' || v_country_code;
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = v_code) THEN
      RETURN v_code;
    END IF;
    
    -- Add random suffix if duplicate
    v_attempts := v_attempts + 1;
    v_code := 'WINOVA-' || UPPER(p_username) || v_attempts::TEXT || '-' || v_country_code;
    
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = v_code) THEN
      RETURN v_code;
    END IF;
    
    EXIT WHEN v_attempts > 100;
  END LOOP;
  
  -- Fallback with random
  RETURN 'WINOVA-' || UPPER(LEFT(p_username, 4)) || '-' || UPPER(LEFT(MD5(RANDOM()::TEXT), 4));
END;
$$;

-- 11. Ensure record_spotlight_points works correctly
CREATE OR REPLACE FUNCTION public.record_spotlight_points(
  p_user_id UUID,
  p_points INT,
  p_source TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle_id UUID;
  v_week_number INT;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Get active cycle info
  SELECT cycle_id, week_number INTO v_cycle_id, v_week_number
  FROM get_active_cycle_info();
  
  -- If still no cycle, skip
  IF v_cycle_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Insert points for today
  INSERT INTO spotlight_user_points (
    user_id,
    cycle_id,
    points_date,
    week_number,
    daily_points,
    source
  )
  VALUES (
    p_user_id,
    v_cycle_id,
    v_today,
    v_week_number,
    p_points,
    p_source
  );
  
  -- Also update profile spotlight_points for quick access
  UPDATE profiles 
  SET spotlight_points = spotlight_points + p_points
  WHERE user_id = p_user_id;
END;
$$;