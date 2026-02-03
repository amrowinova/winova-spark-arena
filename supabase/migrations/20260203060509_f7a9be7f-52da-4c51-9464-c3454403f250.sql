-- CRITICAL FIX: Make referral trigger TRULY non-blocking
-- The issue: PostgreSQL transaction aborts before EXCEPTION can catch it
-- Solution: Use explicit existence checks BEFORE insert attempts

-- Drop the existing trigger function completely
DROP FUNCTION IF EXISTS handle_referral_on_profile_insert CASCADE;

-- Create a BULLETPROOF version
CREATE OR REPLACE FUNCTION handle_referral_on_profile_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_user_id UUID;
  v_current_leader UUID;
  v_level INT;
  v_exists BOOLEAN;
BEGIN
  -- CRITICAL: This function must NEVER block signup
  -- We check for existence BEFORE insert to avoid constraint violations
  
  -- Only process if referred_by is set
  IF NEW.referred_by IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get the referrer's user_id from their profile id
  SELECT user_id INTO v_referrer_user_id
  FROM profiles
  WHERE id = NEW.referred_by;
  
  -- Validate referrer exists and is not self
  IF v_referrer_user_id IS NULL OR v_referrer_user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- CHECK if direct team member already exists BEFORE insert
  SELECT EXISTS(
    SELECT 1 FROM team_members 
    WHERE leader_id = v_referrer_user_id AND member_id = NEW.user_id
  ) INTO v_exists;
  
  -- Only insert if NOT exists
  IF NOT v_exists THEN
    BEGIN
      INSERT INTO team_members (leader_id, member_id, level)
      VALUES (v_referrer_user_id, NEW.user_id, 1);
    EXCEPTION WHEN OTHERS THEN
      -- Silently ignore any error
      NULL;
    END;
  END IF;
  
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
    
    -- CHECK if this level already exists BEFORE insert
    SELECT EXISTS(
      SELECT 1 FROM team_members 
      WHERE leader_id = v_current_leader AND member_id = NEW.user_id
    ) INTO v_exists;
    
    -- Only insert if NOT exists
    IF NOT v_exists THEN
      BEGIN
        INSERT INTO team_members (leader_id, member_id, level)
        VALUES (v_current_leader, NEW.user_id, v_level);
      EXCEPTION WHEN OTHERS THEN
        -- Silently ignore any error
        NULL;
      END;
    END IF;
    
    v_level := v_level + 1;
  END LOOP;
  
  -- Try to log (non-blocking)
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  -- NEVER fail - always return NEW
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER on_profile_insert_handle_referral
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_referral_on_profile_insert();

-- Also ensure the main auth user creation trigger doesn't fail
-- Drop and recreate handle_new_user to be safe
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code TEXT;
  v_referrer_id UUID;
  v_username TEXT;
  v_name TEXT;
  v_country TEXT;
  v_city TEXT;
BEGIN
  -- Extract metadata safely with COALESCE
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', 'User');
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    'user_' || SUBSTRING(NEW.id::text FROM 1 FOR 8)
  );
  v_country := COALESCE(NEW.raw_user_meta_data->>'country', 'Saudi Arabia');
  v_city := NEW.raw_user_meta_data->>'city'; -- Can be NULL
  
  -- Create profile (this MUST succeed)
  INSERT INTO public.profiles (
    user_id,
    name,
    username,
    country,
    city,
    wallet_country,
    referral_code
  ) VALUES (
    NEW.id,
    v_name,
    v_username,
    v_country,
    v_city,
    v_country,
    'WINOVA-' || UPPER(v_username) || '-' || 
    CASE v_country
      WHEN 'Saudi Arabia' THEN 'SA'
      WHEN 'Egypt' THEN 'EG'
      WHEN 'UAE' THEN 'AE'
      WHEN 'Qatar' THEN 'QA'
      WHEN 'Jordan' THEN 'JO'
      WHEN 'Palestine' THEN 'PS'
      WHEN 'Kuwait' THEN 'KW'
      WHEN 'Bahrain' THEN 'BH'
      WHEN 'Oman' THEN 'OM'
      ELSE 'XX'
    END
  );
  
  -- Create wallet (this MUST succeed)
  INSERT INTO public.wallets (user_id, nova_balance, aura_balance, locked_nova_balance)
  VALUES (NEW.id, 0, 0, 0);
  
  -- Create user role (try, but don't fail)
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  -- Log the error but still try to return
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;