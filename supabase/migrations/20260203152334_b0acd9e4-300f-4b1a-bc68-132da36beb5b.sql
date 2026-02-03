-- ============================================================
-- FIX: Decouple points system from financial transfers
-- Any points failure should NEVER block transfers
-- ============================================================

-- 1. Update the source check constraint to include transfer sources
ALTER TABLE public.spotlight_user_points 
DROP CONSTRAINT IF EXISTS spotlight_user_points_source_check;

ALTER TABLE public.spotlight_user_points 
ADD CONSTRAINT spotlight_user_points_source_check 
CHECK (source = ANY (ARRAY[
  'activity'::text, 
  'contest'::text, 
  'contest_join'::text,
  'contest_entry'::text,
  'vote'::text, 
  'vote_cast'::text,
  'vote_received'::text,
  'p2p'::text, 
  'p2p_completed'::text,
  'referral'::text,
  'referral_signup'::text,
  'bonus'::text,
  'transfer'::text,
  'nova_transfer'::text,
  'transfer_sent'::text,
  'transfer_received'::text
]));

-- 2. Drop existing transfer points triggers (will recreate as non-blocking)
DROP TRIGGER IF EXISTS on_transfer_points ON public.wallet_ledger;
DROP TRIGGER IF EXISTS trg_transfer_points ON public.wallet_ledger;
DROP FUNCTION IF EXISTS trigger_transfer_points();
DROP FUNCTION IF EXISTS trigger_record_transfer_points();

-- 3. Create NON-BLOCKING record_spotlight_points function
-- This version catches ALL errors and logs them instead of failing
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
  BEGIN
    SELECT cycle_id, week_number INTO v_cycle_id, v_week_number
    FROM get_active_cycle_info();
  EXCEPTION WHEN OTHERS THEN
    -- If we can't get cycle info, just skip silently
    RETURN;
  END;
  
  -- If no cycle, skip
  IF v_cycle_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Try to insert points
  BEGIN
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
    )
    ON CONFLICT (user_id, cycle_id, points_date, source) 
    DO UPDATE SET daily_points = spotlight_user_points.daily_points + EXCLUDED.daily_points;
    
    -- Update profile spotlight_points
    UPDATE profiles 
    SET spotlight_points = spotlight_points + p_points
    WHERE user_id = p_user_id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail
    BEGIN
      INSERT INTO audit_logs (
        action,
        entity_type,
        entity_id,
        performed_by,
        metadata
      ) VALUES (
        'points_recording_error',
        'spotlight',
        p_user_id,
        p_user_id,
        jsonb_build_object(
          'points', p_points,
          'source', p_source,
          'error', SQLERRM
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- Even audit logging failed, but we don't care
      NULL;
    END;
  END;
END;
$$;

-- 4. Create NON-BLOCKING transfer points trigger function
CREATE OR REPLACE FUNCTION public.trigger_transfer_points_safe()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process Nova transfers
  IF NEW.currency != 'nova' THEN
    RETURN NEW;
  END IF;
  
  -- Non-blocking points recording
  BEGIN
    IF NEW.entry_type = 'transfer_out' THEN
      PERFORM record_spotlight_points(NEW.user_id, 2, 'transfer');
    ELSIF NEW.entry_type = 'transfer_in' THEN
      PERFORM record_spotlight_points(NEW.user_id, 2, 'transfer');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't block
    BEGIN
      INSERT INTO audit_logs (
        action,
        entity_type,
        entity_id,
        performed_by,
        metadata
      ) VALUES (
        'transfer_points_error',
        'wallet_ledger',
        NEW.id,
        NEW.user_id,
        jsonb_build_object(
          'entry_type', NEW.entry_type::text,
          'error', SQLERRM
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END;
  
  RETURN NEW;
END;
$$;

-- 5. Create the safe trigger
CREATE TRIGGER trg_transfer_points_safe
  AFTER INSERT ON public.wallet_ledger
  FOR EACH ROW
  WHEN (NEW.entry_type IN ('transfer_out', 'transfer_in'))
  EXECUTE FUNCTION trigger_transfer_points_safe();

-- 6. Also fix contest_entries trigger to be non-blocking
CREATE OR REPLACE FUNCTION public.trigger_contest_points_safe()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM record_spotlight_points(NEW.user_id, 5, 'contest_join');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_contest_entry_points ON public.contest_entries;
DROP TRIGGER IF EXISTS trg_contest_entry_points ON public.contest_entries;
DROP FUNCTION IF EXISTS trigger_contest_entry_points();

CREATE TRIGGER trg_contest_entry_points_safe
  AFTER INSERT ON public.contest_entries
  FOR EACH ROW
  EXECUTE FUNCTION trigger_contest_points_safe();

-- 7. Fix votes trigger to be non-blocking
CREATE OR REPLACE FUNCTION public.trigger_vote_points_safe()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM record_spotlight_points(NEW.voter_id, 1, 'vote_cast');
    PERFORM record_spotlight_points(NEW.contestant_id, 1, 'vote_received');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_vote_points ON public.votes;
DROP TRIGGER IF EXISTS trg_vote_points ON public.votes;
DROP FUNCTION IF EXISTS trigger_vote_points();

CREATE TRIGGER trg_vote_points_safe
  AFTER INSERT ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_vote_points_safe();

-- 8. Fix p2p_orders trigger to be non-blocking
CREATE OR REPLACE FUNCTION public.trigger_p2p_points_safe()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    BEGIN
      PERFORM record_spotlight_points(NEW.creator_id, 3, 'p2p_completed');
      IF NEW.executor_id IS NOT NULL THEN
        PERFORM record_spotlight_points(NEW.executor_id, 3, 'p2p_completed');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_p2p_complete_points ON public.p2p_orders;
DROP TRIGGER IF EXISTS trg_p2p_complete_points ON public.p2p_orders;
DROP FUNCTION IF EXISTS trigger_p2p_complete_points();

CREATE TRIGGER trg_p2p_complete_points_safe
  AFTER UPDATE ON public.p2p_orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_p2p_points_safe();