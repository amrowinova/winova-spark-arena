-- ==========================================================
-- PART 2: TRIGGERS FOR AUTOMATIC POINT RECORDING
-- ==========================================================

-- 1. TRIGGER: Record points when user joins a contest (+5 points)
CREATE OR REPLACE FUNCTION trigger_record_contest_join_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Award 5 points for joining a contest
  PERFORM record_spotlight_points(NEW.user_id, 5, 'contest_join');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contest_entry_points ON contest_entries;
CREATE TRIGGER trg_contest_entry_points
  AFTER INSERT ON contest_entries
  FOR EACH ROW
  EXECUTE FUNCTION trigger_record_contest_join_points();

-- 2. TRIGGER: Record points when user casts a vote (+1 point)
CREATE OR REPLACE FUNCTION trigger_record_vote_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Award 1 point to the voter
  PERFORM record_spotlight_points(NEW.voter_id, 1, 'vote_cast');
  
  -- Award 1 point to the contestant who received the vote
  PERFORM record_spotlight_points(NEW.contestant_id, 1, 'vote_received');
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vote_points ON votes;
CREATE TRIGGER trg_vote_points
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_record_vote_points();

-- 3. TRIGGER: Record points when P2P order is completed (+3 points each)
CREATE OR REPLACE FUNCTION trigger_record_p2p_complete_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Award 3 points to creator
    PERFORM record_spotlight_points(NEW.creator_id, 3, 'p2p_completed');
    
    -- Award 3 points to executor
    IF NEW.executor_id IS NOT NULL THEN
      PERFORM record_spotlight_points(NEW.executor_id, 3, 'p2p_completed');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_p2p_complete_points ON p2p_orders;
CREATE TRIGGER trg_p2p_complete_points
  AFTER UPDATE ON p2p_orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_record_p2p_complete_points();

-- 4. TRIGGER: Record points for Nova transfers (+2 points each)
CREATE OR REPLACE FUNCTION trigger_record_transfer_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only for transfer entries
  IF NEW.entry_type = 'transfer_out' THEN
    -- Award 2 points to sender
    PERFORM record_spotlight_points(NEW.user_id, 2, 'nova_transfer');
  ELSIF NEW.entry_type = 'transfer_in' THEN
    -- Award 2 points to receiver
    PERFORM record_spotlight_points(NEW.user_id, 2, 'nova_transfer');
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transfer_points ON wallet_ledger;
CREATE TRIGGER trg_transfer_points
  AFTER INSERT ON wallet_ledger
  FOR EACH ROW
  WHEN (NEW.entry_type IN ('transfer_out', 'transfer_in'))
  EXECUTE FUNCTION trigger_record_transfer_points();

-- 5. TRIGGER: Build team hierarchy when referral is assigned (UPDATE)
CREATE OR REPLACE FUNCTION trigger_build_team_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_user_id UUID;
  v_current_leader UUID;
  v_level INT := 1;
BEGIN
  -- When referred_by is set
  IF NEW.referred_by IS NOT NULL AND (OLD.referred_by IS NULL OR OLD.referred_by != NEW.referred_by) THEN
    -- Get the referrer's user_id from their profile
    SELECT user_id INTO v_referrer_user_id
    FROM profiles
    WHERE id = NEW.referred_by;
    
    IF v_referrer_user_id IS NOT NULL THEN
      -- Insert direct relationship (level 1)
      INSERT INTO team_members (leader_id, member_id, level)
      VALUES (v_referrer_user_id, NEW.user_id, 1)
      ON CONFLICT (leader_id, member_id) DO NOTHING;
      
      -- Also record point for referral (+2 points to referrer)
      PERFORM record_spotlight_points(v_referrer_user_id, 2, 'referral_signup');
      
      -- Build indirect relationships by traversing up the chain
      v_current_leader := v_referrer_user_id;
      v_level := 2;
      
      WHILE v_level <= 5 LOOP
        -- Find the leader of current leader
        SELECT tm.leader_id INTO v_current_leader
        FROM team_members tm
        WHERE tm.member_id = v_current_leader AND tm.level = 1
        LIMIT 1;
        
        EXIT WHEN v_current_leader IS NULL;
        
        -- Insert indirect relationship
        INSERT INTO team_members (leader_id, member_id, level)
        VALUES (v_current_leader, NEW.user_id, v_level)
        ON CONFLICT (leader_id, member_id) DO NOTHING;
        
        v_level := v_level + 1;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_build_team_hierarchy ON profiles;
CREATE TRIGGER trg_build_team_hierarchy
  AFTER UPDATE OF referred_by ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_build_team_hierarchy();

-- 6. TRIGGER: Build team hierarchy on INSERT when referred_by is set
CREATE OR REPLACE FUNCTION trigger_build_team_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_user_id UUID;
  v_current_leader UUID;
  v_level INT := 1;
BEGIN
  IF NEW.referred_by IS NOT NULL THEN
    -- Get the referrer's user_id from their profile
    SELECT user_id INTO v_referrer_user_id
    FROM profiles
    WHERE id = NEW.referred_by;
    
    IF v_referrer_user_id IS NOT NULL THEN
      -- Insert direct relationship (level 1)
      INSERT INTO team_members (leader_id, member_id, level)
      VALUES (v_referrer_user_id, NEW.user_id, 1)
      ON CONFLICT (leader_id, member_id) DO NOTHING;
      
      -- Build indirect relationships
      v_current_leader := v_referrer_user_id;
      v_level := 2;
      
      WHILE v_level <= 5 LOOP
        SELECT tm.leader_id INTO v_current_leader
        FROM team_members tm
        WHERE tm.member_id = v_current_leader AND tm.level = 1
        LIMIT 1;
        
        EXIT WHEN v_current_leader IS NULL;
        
        INSERT INTO team_members (leader_id, member_id, level)
        VALUES (v_current_leader, NEW.user_id, v_level)
        ON CONFLICT (leader_id, member_id) DO NOTHING;
        
        v_level := v_level + 1;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_build_team_on_insert ON profiles;
CREATE TRIGGER trg_build_team_on_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.referred_by IS NOT NULL)
  EXECUTE FUNCTION trigger_build_team_on_insert();