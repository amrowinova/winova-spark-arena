-- ============================================
-- SPOTLIGHT POINTS AUTO-RECORDING TRIGGERS
-- Points are written automatically on events:
-- 1. Contest join = 5 points
-- 2. Paid votes = 1 point per vote
-- 3. Free votes = 1 point
-- 4. Nova transfers = 2 points
-- 5. P2P completed orders = 3 points
-- ============================================

-- Helper function to get active cycle info
CREATE OR REPLACE FUNCTION get_active_cycle_info()
RETURNS TABLE (
  cycle_id UUID,
  week_number INTEGER
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cycle spotlight_cycles%ROWTYPE;
  v_week INT;
BEGIN
  SELECT * INTO v_cycle
  FROM spotlight_cycles
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_cycle.id IS NULL THEN
    RETURN;
  END IF;
  
  v_week := GREATEST(1, CEIL((CURRENT_DATE - v_cycle.start_date + 1)::NUMERIC / 7));
  
  RETURN QUERY SELECT v_cycle.id, v_week;
END;
$$;

-- Core function to record spotlight points
CREATE OR REPLACE FUNCTION record_spotlight_points(
  p_user_id UUID,
  p_points INTEGER,
  p_source TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cycle_id UUID;
  v_week_number INTEGER;
BEGIN
  -- Get active cycle
  SELECT cycle_id, week_number INTO v_cycle_id, v_week_number
  FROM get_active_cycle_info();
  
  -- No active cycle = no points
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
  ) VALUES (
    p_user_id,
    v_cycle_id,
    CURRENT_DATE,
    v_week_number,
    p_points,
    p_source
  );
END;
$$;

-- ============================================
-- TRIGGER 1: Contest Entry = 5 points
-- ============================================
CREATE OR REPLACE FUNCTION trigger_contest_entry_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM record_spotlight_points(NEW.user_id, 5, 'contest_entry');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_contest_entry_points ON contest_entries;
CREATE TRIGGER on_contest_entry_points
AFTER INSERT ON contest_entries
FOR EACH ROW
EXECUTE FUNCTION trigger_contest_entry_points();

-- ============================================
-- TRIGGER 2: Votes = 1 point per vote
-- ============================================
CREATE OR REPLACE FUNCTION trigger_vote_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Voter gets 1 point per vote cast
  PERFORM record_spotlight_points(NEW.voter_id, 1, 'vote_cast');
  -- Contestant gets 1 point per vote received
  PERFORM record_spotlight_points(NEW.contestant_id, 1, 'vote_received');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_vote_points ON votes;
CREATE TRIGGER on_vote_points
AFTER INSERT ON votes
FOR EACH ROW
EXECUTE FUNCTION trigger_vote_points();

-- ============================================
-- TRIGGER 3: Nova Transfers = 2 points each
-- ============================================
CREATE OR REPLACE FUNCTION trigger_transfer_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only for Nova transfers
  IF NEW.currency = 'nova' AND NEW.entry_type = 'transfer_out' THEN
    -- Sender gets 2 points
    PERFORM record_spotlight_points(NEW.user_id, 2, 'transfer_sent');
  ELSIF NEW.currency = 'nova' AND NEW.entry_type = 'transfer_in' THEN
    -- Receiver gets 2 points
    PERFORM record_spotlight_points(NEW.user_id, 2, 'transfer_received');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_transfer_points ON wallet_ledger;
CREATE TRIGGER on_transfer_points
AFTER INSERT ON wallet_ledger
FOR EACH ROW
EXECUTE FUNCTION trigger_transfer_points();

-- ============================================
-- TRIGGER 4: P2P Completed Orders = 3 points each
-- ============================================
CREATE OR REPLACE FUNCTION trigger_p2p_complete_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    -- Creator gets 3 points
    PERFORM record_spotlight_points(NEW.creator_id, 3, 'p2p_completed');
    -- Executor gets 3 points (if exists)
    IF NEW.executor_id IS NOT NULL THEN
      PERFORM record_spotlight_points(NEW.executor_id, 3, 'p2p_completed');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_p2p_complete_points ON p2p_orders;
CREATE TRIGGER on_p2p_complete_points
AFTER UPDATE ON p2p_orders
FOR EACH ROW
EXECUTE FUNCTION trigger_p2p_complete_points();