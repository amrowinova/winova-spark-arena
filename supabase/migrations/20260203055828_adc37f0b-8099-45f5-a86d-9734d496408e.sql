
-- Fix the signup trigger to be NON-BLOCKING
-- Referral failures must NEVER block user creation

-- Drop the existing problematic trigger function
DROP FUNCTION IF EXISTS handle_referral_on_profile_insert CASCADE;

-- Create a new SAFE version that catches all errors
CREATE OR REPLACE FUNCTION handle_referral_on_profile_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_profile_id UUID;
  v_referrer_user_id UUID;
  v_current_leader UUID;
  v_level INT;
BEGIN
  -- CRITICAL: This function must NEVER fail
  -- All errors are caught and logged, signup continues regardless
  
  BEGIN
    -- Only process if referred_by is set
    IF NEW.referred_by IS NOT NULL THEN
      -- Get the referrer's user_id from their profile id
      SELECT user_id INTO v_referrer_user_id
      FROM profiles
      WHERE id = NEW.referred_by;
      
      IF v_referrer_user_id IS NOT NULL AND v_referrer_user_id != NEW.user_id THEN
        -- Try to insert direct team member (level 1)
        -- Use ON CONFLICT to handle duplicates gracefully
        INSERT INTO team_members (leader_id, member_id, level)
        VALUES (v_referrer_user_id, NEW.user_id, 1)
        ON CONFLICT (leader_id, member_id) DO NOTHING;
        
        -- Build indirect hierarchy (levels 2-5)
        v_current_leader := v_referrer_user_id;
        v_level := 2;
        
        WHILE v_level <= 5 LOOP
          -- Find the parent of current leader
          SELECT tm.leader_id INTO v_current_leader
          FROM team_members tm
          WHERE tm.member_id = v_current_leader AND tm.level = 1
          LIMIT 1;
          
          EXIT WHEN v_current_leader IS NULL;
          EXIT WHEN v_current_leader = NEW.user_id; -- Prevent cycles
          
          -- Insert with ON CONFLICT to handle duplicates
          INSERT INTO team_members (leader_id, member_id, level)
          VALUES (v_current_leader, NEW.user_id, v_level)
          ON CONFLICT (leader_id, member_id) DO NOTHING;
          
          v_level := v_level + 1;
        END LOOP;
        
        -- Log successful referral assignment
        INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, metadata)
        VALUES (
          'referral',
          NEW.id,
          'referral_assigned',
          NEW.user_id,
          jsonb_build_object(
            'source', 'trigger',
            'referrer_profile_id', NEW.referred_by,
            'referrer_user_id', v_referrer_user_id
          )
        );
      END IF;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but DO NOT fail the transaction
    BEGIN
      INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, metadata)
      VALUES (
        'referral_error',
        NEW.id,
        'referral_assignment_failed',
        NEW.user_id,
        jsonb_build_object(
          'error', SQLERRM,
          'error_detail', SQLSTATE,
          'referred_by', NEW.referred_by
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- Even if logging fails, continue silently
      NULL;
    END;
  END;
  
  -- ALWAYS return NEW to allow the profile insert to succeed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger (AFTER INSERT so profile exists first)
DROP TRIGGER IF EXISTS on_profile_insert_handle_referral ON profiles;
CREATE TRIGGER on_profile_insert_handle_referral
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_referral_on_profile_insert();

-- Also fix the RPC functions to be non-blocking

-- Safe version of process_referral_signup
CREATE OR REPLACE FUNCTION process_referral_signup(
  p_new_user_id UUID,
  p_referral_code TEXT
)
RETURNS JSON AS $$
DECLARE
  v_referrer_profile RECORD;
  v_result JSON;
BEGIN
  -- Find the referrer by code
  SELECT id, user_id, name, username INTO v_referrer_profile
  FROM profiles
  WHERE referral_code = UPPER(TRIM(p_referral_code))
  LIMIT 1;
  
  IF v_referrer_profile.id IS NULL THEN
    -- Invalid code - return success anyway (non-blocking)
    RETURN json_build_object(
      'success', true,
      'assigned', false,
      'reason', 'invalid_code'
    );
  END IF;
  
  -- Prevent self-referral
  IF v_referrer_profile.user_id = p_new_user_id THEN
    RETURN json_build_object(
      'success', true,
      'assigned', false,
      'reason', 'self_referral'
    );
  END IF;
  
  -- Update the profile with the referrer (trigger will handle team_members)
  BEGIN
    UPDATE profiles
    SET referred_by = v_referrer_profile.id
    WHERE user_id = p_new_user_id
      AND referred_by IS NULL;
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't fail
    RETURN json_build_object(
      'success', true,
      'assigned', false,
      'reason', 'update_failed',
      'error', SQLERRM
    );
  END;
  
  RETURN json_build_object(
    'success', true,
    'assigned', true,
    'referrer_id', v_referrer_profile.id,
    'referrer_name', v_referrer_profile.name
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Never fail - always return success for signup purposes
  RETURN json_build_object(
    'success', true,
    'assigned', false,
    'reason', 'exception',
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Safe version of assign_referral_auto
CREATE OR REPLACE FUNCTION assign_referral_auto(
  p_new_user_id UUID,
  p_country TEXT,
  p_city TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_leader_id UUID;
  v_leader_profile_id UUID;
  v_assignment_reason TEXT;
BEGIN
  -- Try to find the best leader (city -> country -> global)
  BEGIN
    -- Priority 1: Same city (if provided)
    IF p_city IS NOT NULL THEN
      SELECT p.id, p.user_id INTO v_leader_profile_id, v_leader_id
      FROM profiles p
      WHERE p.city = p_city
        AND p.country = p_country
        AND p.user_id != p_new_user_id
        AND p.weekly_active = true
        AND p.rank IN ('marketer', 'leader', 'manager', 'president')
      ORDER BY p.spotlight_points DESC
      LIMIT 1;
      
      IF v_leader_id IS NOT NULL THEN
        v_assignment_reason := 'same_city';
      END IF;
    END IF;
    
    -- Priority 2: Same country
    IF v_leader_id IS NULL THEN
      SELECT p.id, p.user_id INTO v_leader_profile_id, v_leader_id
      FROM profiles p
      WHERE p.country = p_country
        AND p.user_id != p_new_user_id
        AND p.weekly_active = true
        AND p.rank IN ('marketer', 'leader', 'manager', 'president')
      ORDER BY p.spotlight_points DESC
      LIMIT 1;
      
      IF v_leader_id IS NOT NULL THEN
        v_assignment_reason := 'same_country';
      END IF;
    END IF;
    
    -- Priority 3: Any active leader globally
    IF v_leader_id IS NULL THEN
      SELECT p.id, p.user_id INTO v_leader_profile_id, v_leader_id
      FROM profiles p
      WHERE p.user_id != p_new_user_id
        AND p.weekly_active = true
        AND p.rank IN ('leader', 'manager', 'president')
      ORDER BY p.spotlight_points DESC
      LIMIT 1;
      
      IF v_leader_id IS NOT NULL THEN
        v_assignment_reason := 'global_leader';
      END IF;
    END IF;
    
    -- Priority 4: Any active user
    IF v_leader_id IS NULL THEN
      SELECT p.id, p.user_id INTO v_leader_profile_id, v_leader_id
      FROM profiles p
      WHERE p.user_id != p_new_user_id
        AND p.weekly_active = true
      ORDER BY p.spotlight_points DESC
      LIMIT 1;
      
      IF v_leader_id IS NOT NULL THEN
        v_assignment_reason := 'any_active_user';
      END IF;
    END IF;
    
    -- If we found a leader, update the profile
    IF v_leader_id IS NOT NULL THEN
      UPDATE profiles
      SET referred_by = v_leader_profile_id
      WHERE user_id = p_new_user_id
        AND referred_by IS NULL;
      
      -- Log the auto-assignment
      INSERT INTO audit_logs (entity_type, action, performed_by, metadata)
      VALUES (
        'referral',
        'auto_assigned',
        p_new_user_id,
        jsonb_build_object(
          'leader_id', v_leader_id,
          'reason', v_assignment_reason,
          'country', p_country,
          'city', p_city
        )
      );
      
      RETURN json_build_object(
        'success', true,
        'assigned', true,
        'leader_id', v_leader_id,
        'reason', v_assignment_reason
      );
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't fail
    NULL;
  END;
  
  -- No leader found or error - still success for signup
  RETURN json_build_object(
    'success', true,
    'assigned', false,
    'reason', COALESCE(v_assignment_reason, 'no_leader_found')
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Never block signup
  RETURN json_build_object(
    'success', true,
    'assigned', false,
    'reason', 'exception',
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
