-- Fix #1: Add UNIQUE constraint to prevent race-condition double-entry
-- (RPC EXISTS check alone is not safe under concurrent requests)
ALTER TABLE public.contest_entries
  ADD CONSTRAINT unique_user_per_contest UNIQUE (contest_id, user_id);

-- Fix #2: Enforce cast_free_vote only in stage1 (server-side)
-- Previously only client-side guard existed; direct RPC calls bypassed it.
CREATE OR REPLACE FUNCTION public.cast_free_vote(
  p_voter_id      UUID,
  p_contestant_id UUID,
  p_contest_id    UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_vote_id      UUID;
  v_voter_entry  contest_entries%ROWTYPE;
  v_contest_status TEXT;
BEGIN
  -- Cannot vote for yourself
  IF p_voter_id = p_contestant_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot vote for yourself');
  END IF;

  -- ✅ NEW: Enforce phase — free vote only allowed during stage1
  SELECT status INTO v_contest_status
  FROM public.contests
  WHERE id = p_contest_id;

  IF v_contest_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contest not found');
  END IF;

  IF v_contest_status NOT IN ('active', 'stage1') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Free vote is only allowed during Stage 1',
      'error_code', 'WRONG_PHASE'
    );
  END IF;

  -- Check if voter has an entry and hasn't used free vote
  SELECT * INTO v_voter_entry
  FROM contest_entries
  WHERE contest_id = p_contest_id AND user_id = p_voter_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'You must join the contest first');
  END IF;

  IF v_voter_entry.free_vote_used THEN
    RETURN jsonb_build_object('success', false, 'error', 'Free vote already used');
  END IF;

  -- Validate contestant exists in contest
  IF NOT EXISTS (
    SELECT 1 FROM contest_entries
    WHERE contest_id = p_contest_id AND user_id = p_contestant_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contestant not found in this contest');
  END IF;

  -- Mark free vote as used
  UPDATE contest_entries
  SET free_vote_used = TRUE
  WHERE id = v_voter_entry.id;

  -- Record vote (0 aura spent = free vote)
  INSERT INTO votes (voter_id, contestant_id, contest_id, aura_spent)
  VALUES (p_voter_id, p_contestant_id, p_contest_id, 0)
  RETURNING id INTO v_vote_id;

  -- Update contestant votes
  UPDATE contest_entries
  SET votes_received = votes_received + 1
  WHERE contest_id = p_contest_id AND user_id = p_contestant_id;

  RETURN jsonb_build_object(
    'success', true,
    'vote_id', v_vote_id,
    'is_free_vote', true
  );
END;
$$;
