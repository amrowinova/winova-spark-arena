-- Add column to track free vote usage per contest
ALTER TABLE contest_entries 
ADD COLUMN IF NOT EXISTS free_vote_used BOOLEAN DEFAULT FALSE;

-- Create function for free vote (no cost, limited to once per user per contest)
CREATE OR REPLACE FUNCTION public.cast_free_vote(
  p_voter_id UUID,
  p_contestant_id UUID,
  p_contest_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_vote_id UUID;
  v_voter_entry contest_entries%ROWTYPE;
BEGIN
  -- Cannot vote for yourself
  IF p_voter_id = p_contestant_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot vote for yourself');
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