-- =====================================================
-- ATOMIC JOIN CONTEST FUNCTION
-- Handles: Deduct Nova, Create Entry, Update Participants, Prize Pool, Ledger
-- =====================================================

CREATE OR REPLACE FUNCTION public.join_contest(
  p_user_id UUID,
  p_contest_id UUID,
  p_entry_fee NUMERIC DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_contest contests%ROWTYPE;
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
  v_entry_id UUID;
  v_ledger_id UUID;
  v_new_prize_pool NUMERIC;
  v_new_participants INTEGER;
BEGIN
  -- 1. Lock and validate contest
  SELECT * INTO v_contest
  FROM contests
  WHERE id = p_contest_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contest not found');
  END IF;

  -- Check if contest is active (status check)
  IF v_contest.status NOT IN ('active', 'upcoming', 'stage1', 'final') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contest is not active');
  END IF;

  -- Check max participants limit
  IF v_contest.max_participants IS NOT NULL AND v_contest.current_participants >= v_contest.max_participants THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contest is full');
  END IF;

  -- 2. Check if user already joined
  IF EXISTS (
    SELECT 1 FROM contest_entries 
    WHERE contest_id = p_contest_id AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already joined this contest');
  END IF;

  -- 3. Lock user wallet
  SELECT * INTO v_wallet
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF v_wallet.is_frozen THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet is frozen');
  END IF;

  -- 4. Check balance (use Nova)
  v_balance_before := v_wallet.nova_balance;
  
  IF v_balance_before < p_entry_fee THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient Nova balance');
  END IF;

  v_balance_after := v_balance_before - p_entry_fee;

  -- 5. Deduct from wallet
  UPDATE wallets 
  SET nova_balance = v_balance_after, updated_at = now()
  WHERE id = v_wallet.id;

  -- 6. Create contest entry
  INSERT INTO contest_entries (contest_id, user_id, votes_received)
  VALUES (p_contest_id, p_user_id, 0)
  RETURNING id INTO v_entry_id;

  -- 7. Update contest participants and prize pool
  -- Prize pool = participants × 6 Nova (after fee deduction)
  v_new_participants := v_contest.current_participants + 1;
  v_new_prize_pool := v_new_participants * 6;

  UPDATE contests
  SET 
    current_participants = v_new_participants,
    prize_pool = v_new_prize_pool
  WHERE id = p_contest_id;

  -- 8. Create ledger entry
  INSERT INTO wallet_ledger (
    user_id, wallet_id, entry_type, currency, amount,
    balance_before, balance_after, reference_type, reference_id,
    description, description_ar
  ) VALUES (
    p_user_id, v_wallet.id, 'contest_entry', 'nova', -p_entry_fee,
    v_balance_before, v_balance_after, 'contest', p_contest_id,
    'Contest entry fee', 'رسوم دخول المسابقة'
  ) RETURNING id INTO v_ledger_id;

  -- 9. Create transaction record
  INSERT INTO transactions (user_id, type, currency, amount, reference_id, description, description_ar)
  VALUES (p_user_id, 'contest_entry', 'nova', -p_entry_fee, v_entry_id, 'Contest entry fee', 'رسوم دخول المسابقة');

  RETURN jsonb_build_object(
    'success', true,
    'entry_id', v_entry_id,
    'ledger_id', v_ledger_id,
    'balance_after', v_balance_after,
    'new_participants', v_new_participants,
    'new_prize_pool', v_new_prize_pool
  );
END;
$$;

-- =====================================================
-- ATOMIC CAST VOTE FUNCTION
-- Handles: Deduct Aura/Nova, Update Votes, Create Ledger
-- =====================================================

CREATE OR REPLACE FUNCTION public.cast_vote(
  p_voter_id UUID,
  p_contestant_id UUID,
  p_contest_id UUID,
  p_vote_count INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_aura_cost NUMERIC;
  v_aura_balance NUMERIC;
  v_nova_balance NUMERIC;
  v_aura_to_use NUMERIC;
  v_nova_to_use NUMERIC;
  v_vote_id UUID;
BEGIN
  -- Validate vote count
  IF p_vote_count < 1 OR p_vote_count > 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vote count must be between 1 and 100');
  END IF;

  -- Cannot vote for yourself
  IF p_voter_id = p_contestant_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot vote for yourself');
  END IF;

  -- Validate contestant exists in contest
  IF NOT EXISTS (
    SELECT 1 FROM contest_entries 
    WHERE contest_id = p_contest_id AND user_id = p_contestant_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contestant not found in this contest');
  END IF;

  -- Calculate cost: 1 vote = 1 Aura = 0.5 Nova
  v_aura_cost := p_vote_count;

  -- Lock wallet
  SELECT * INTO v_wallet
  FROM wallets
  WHERE user_id = p_voter_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF v_wallet.is_frozen THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet is frozen');
  END IF;

  v_aura_balance := v_wallet.aura_balance;
  v_nova_balance := v_wallet.nova_balance;

  -- Priority: Use Aura first, then Nova for deficit
  IF v_aura_balance >= v_aura_cost THEN
    v_aura_to_use := v_aura_cost;
    v_nova_to_use := 0;
  ELSE
    v_aura_to_use := v_aura_balance;
    -- Remaining votes need Nova: 1 vote = 0.5 Nova
    v_nova_to_use := (v_aura_cost - v_aura_to_use) * 0.5;
    
    IF v_nova_balance < v_nova_to_use THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance for voting');
    END IF;
  END IF;

  -- Deduct from wallet
  UPDATE wallets 
  SET 
    aura_balance = aura_balance - v_aura_to_use,
    nova_balance = nova_balance - v_nova_to_use,
    updated_at = now()
  WHERE id = v_wallet.id;

  -- Record vote
  INSERT INTO votes (voter_id, contestant_id, contest_id, aura_spent)
  VALUES (p_voter_id, p_contestant_id, p_contest_id, v_aura_cost)
  RETURNING id INTO v_vote_id;

  -- Update contestant votes
  UPDATE contest_entries
  SET votes_received = votes_received + p_vote_count
  WHERE contest_id = p_contest_id AND user_id = p_contestant_id;

  -- Create ledger entries
  IF v_aura_to_use > 0 THEN
    INSERT INTO wallet_ledger (
      user_id, wallet_id, entry_type, currency, amount,
      balance_before, balance_after, reference_type, reference_id,
      counterparty_id, description, description_ar
    ) VALUES (
      p_voter_id, v_wallet.id, 'vote_spend', 'aura', -v_aura_to_use,
      v_aura_balance, v_aura_balance - v_aura_to_use, 'vote', v_vote_id,
      p_contestant_id, 'Voting for contestant', 'تصويت للمتسابق'
    );
  END IF;

  IF v_nova_to_use > 0 THEN
    INSERT INTO wallet_ledger (
      user_id, wallet_id, entry_type, currency, amount,
      balance_before, balance_after, reference_type, reference_id,
      counterparty_id, description, description_ar
    ) VALUES (
      p_voter_id, v_wallet.id, 'vote_spend', 'nova', -v_nova_to_use,
      v_nova_balance, v_nova_balance - v_nova_to_use, 'vote', v_vote_id,
      p_contestant_id, 'Voting for contestant (Nova)', 'تصويت للمتسابق (نوفا)'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'vote_id', v_vote_id,
    'votes_cast', p_vote_count,
    'aura_spent', v_aura_to_use,
    'nova_spent', v_nova_to_use
  );
END;
$$;