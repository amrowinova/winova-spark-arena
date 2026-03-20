-- ─────────────────────────────────────────────────────────────────────────────
-- Vote Earnings (20% Aura Rebate)
-- ─────────────────────────────────────────────────────────────────────────────
-- After each contest stage ends, every contestant receives 20% of the total
-- PAID Aura votes they collected during that stage.
-- Free-Aura votes are excluded from the calculation.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Track paid-Aura portion per vote row
ALTER TABLE public.votes
  ADD COLUMN IF NOT EXISTS paid_aura_spent DECIMAL(18, 2) NOT NULL DEFAULT 0;

-- 2. Extend transaction_type enum with aura_vote_earnings
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'aura_vote_earnings';

-- 3. Update cast_vote to populate paid_aura_spent
CREATE OR REPLACE FUNCTION public.cast_vote(
  p_voter_id      UUID,
  p_contestant_id UUID,
  p_contest_id    UUID,
  p_aura_amount   NUMERIC DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_voter_wallet      public.wallets%ROWTYPE;
  v_contestant_entry  public.contest_entries%ROWTYPE;
  v_contest           public.contests%ROWTYPE;
  v_paid_to_deduct    NUMERIC := 0;
  v_free_to_deduct    NUMERIC := 0;
  v_aura_before       NUMERIC;
  v_aura_after        NUMERIC;
  v_free_before       NUMERIC;
  v_free_after        NUMERIC;
  v_used_free_aura    BOOLEAN := false;
  v_nova_cost         NUMERIC := 0;
  v_paid_aura_spent   NUMERIC := 0;  -- paid portion stored in votes row
BEGIN
  PERFORM set_config('app.bypass_wallet_guard', 'true', true);

  -- Auth
  IF auth.uid() IS NULL OR auth.uid() <> p_voter_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Validate contest is active
  SELECT * INTO v_contest FROM public.contests WHERE id = p_contest_id;
  IF NOT FOUND OR v_contest.status NOT IN ('active', 'stage1', 'final') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contest is not active');
  END IF;

  -- Cannot vote for yourself
  IF p_voter_id = p_contestant_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot vote for yourself');
  END IF;

  -- Check contestant entry exists
  SELECT * INTO v_contestant_entry
    FROM public.contest_entries
   WHERE contest_id = p_contest_id AND user_id = p_contestant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contestant not found in this contest');
  END IF;

  -- Lock voter wallet
  SELECT * INTO v_voter_wallet FROM public.wallets WHERE user_id = p_voter_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voter wallet not found');
  END IF;

  IF v_voter_wallet.is_frozen THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your wallet is frozen');
  END IF;

  v_aura_before := v_voter_wallet.aura_balance;
  v_free_before := v_voter_wallet.free_aura_balance;

  -- ── Determine deduction source ──────────────────────────────────────────
  IF v_aura_before >= p_aura_amount THEN
    v_paid_to_deduct := p_aura_amount;
    v_used_free_aura := false;

  ELSIF v_aura_before > 0 THEN
    v_paid_to_deduct := v_aura_before;
    v_free_to_deduct := p_aura_amount - v_aura_before;
    v_used_free_aura := true;

    IF v_free_before < v_free_to_deduct THEN
      v_nova_cost := p_aura_amount * 0.5;
      IF v_voter_wallet.nova_balance < v_nova_cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient Aura or Nova balance');
      END IF;
      v_paid_to_deduct := 0;
      v_free_to_deduct := 0;
      v_used_free_aura := false;
    END IF;

  ELSIF v_free_before >= p_aura_amount THEN
    v_free_to_deduct := p_aura_amount;
    v_used_free_aura := true;

  ELSE
    v_nova_cost := p_aura_amount * 0.5;
    IF v_voter_wallet.nova_balance < v_nova_cost THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient Aura or Nova balance');
    END IF;
    v_used_free_aura := false;
  END IF;

  -- ── Apply deductions ─────────────────────────────────────────────────────
  v_aura_after := v_aura_before - v_paid_to_deduct;
  v_free_after := v_free_before - v_free_to_deduct;

  IF v_nova_cost > 0 THEN
    v_paid_aura_spent := p_aura_amount;  -- Nova → full amount counts as paid

    UPDATE public.wallets
      SET nova_balance = nova_balance - v_nova_cost,
          updated_at   = now()
    WHERE id = v_voter_wallet.id;

    INSERT INTO public.wallet_ledger
      (user_id, wallet_id, entry_type, currency, amount,
       balance_before, balance_after, reference_type, reference_id,
       counterparty_id, description, description_ar, is_free_aura)
    VALUES
      (p_voter_id, v_voter_wallet.id, 'vote_spend', 'nova', -v_nova_cost,
       v_voter_wallet.nova_balance, v_voter_wallet.nova_balance - v_nova_cost,
       'vote', p_contest_id, p_contestant_id,
       'Vote using Nova', 'تصويت باستخدام Nova', false);

  ELSE
    v_paid_aura_spent := v_paid_to_deduct;  -- only paid portion

    UPDATE public.wallets
      SET aura_balance      = v_aura_after,
          free_aura_balance = v_free_after,
          updated_at        = now()
    WHERE id = v_voter_wallet.id;

    IF v_paid_to_deduct > 0 THEN
      INSERT INTO public.wallet_ledger
        (user_id, wallet_id, entry_type, currency, amount,
         balance_before, balance_after, reference_type, reference_id,
         counterparty_id, description, description_ar, is_free_aura)
      VALUES
        (p_voter_id, v_voter_wallet.id, 'vote_spend', 'aura', -v_paid_to_deduct,
         v_aura_before, v_aura_after, 'vote', p_contest_id,
         p_contestant_id, 'Vote (paid Aura)', 'تصويت (Aura مدفوعة)', false);
    END IF;

    IF v_free_to_deduct > 0 THEN
      INSERT INTO public.wallet_ledger
        (user_id, wallet_id, entry_type, currency, amount,
         balance_before, balance_after, reference_type, reference_id,
         counterparty_id, description, description_ar, is_free_aura)
      VALUES
        (p_voter_id, v_voter_wallet.id, 'vote_spend', 'aura', -v_free_to_deduct,
         v_free_before, v_free_after, 'vote', p_contest_id,
         p_contestant_id, 'Vote (free Aura)', 'تصويت (Aura مجانية)', true);
    END IF;
  END IF;

  -- ── Credit vote_receive to contestant (paid portion only) ────────────────
  IF NOT v_used_free_aura OR v_paid_to_deduct > 0 OR v_nova_cost > 0 THEN
    DECLARE
      v_contestant_wallet public.wallets%ROWTYPE;
      v_credit_amount     NUMERIC;
    BEGIN
      v_credit_amount := CASE
        WHEN v_nova_cost > 0 THEN p_aura_amount
        ELSE v_paid_to_deduct
      END;

      IF v_credit_amount > 0 THEN
        SELECT * INTO v_contestant_wallet
          FROM public.wallets WHERE user_id = p_contestant_id FOR UPDATE;

        IF FOUND THEN
          UPDATE public.wallets
            SET aura_balance = aura_balance + v_credit_amount,
                updated_at   = now()
          WHERE id = v_contestant_wallet.id;

          INSERT INTO public.wallet_ledger
            (user_id, wallet_id, entry_type, currency, amount,
             balance_before, balance_after, reference_type, reference_id,
             counterparty_id, description, description_ar, is_free_aura)
          VALUES
            (p_contestant_id, v_contestant_wallet.id, 'vote_receive', 'aura', v_credit_amount,
             v_contestant_wallet.aura_balance,
             v_contestant_wallet.aura_balance + v_credit_amount,
             'vote', p_contest_id, p_voter_id,
             'Vote received (paid)', 'تصويت مستلم (مدفوع)', false);
        END IF;
      END IF;
    END;
  END IF;

  -- ── Increment vote count (always) ─────────────────────────────────────────
  UPDATE public.contest_entries
    SET votes_received = votes_received + 1
  WHERE contest_id = p_contest_id AND user_id = p_contestant_id;

  -- ── Record vote with paid_aura_spent ──────────────────────────────────────
  INSERT INTO public.votes (contest_id, voter_id, contestant_id, aura_spent, paid_aura_spent)
  VALUES (p_contest_id, p_voter_id, p_contestant_id, p_aura_amount, v_paid_aura_spent);

  RETURN jsonb_build_object(
    'success',          true,
    'used_free_aura',   v_used_free_aura,
    'paid_aura_spent',  v_paid_to_deduct,
    'free_aura_spent',  v_free_to_deduct,
    'nova_spent',       v_nova_cost
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 4. grant_vote_earnings — credits 20% of paid votes received to each contestant
--    Idempotent: skips contestants that already received earnings for this stage.
CREATE OR REPLACE FUNCTION public.grant_vote_earnings(
  p_contest_id UUID,
  p_stage      TEXT   -- 'stage1' or 'final'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rebate_pct      NUMERIC := 0.20;
  v_processed       INTEGER := 0;
  v_skipped         INTEGER := 0;
  v_contestant      RECORD;
  v_wallet          public.wallets%ROWTYPE;
  v_rebate_amount   NUMERIC;
  v_already_granted BOOLEAN;
BEGIN
  PERFORM set_config('app.bypass_wallet_guard', 'true', true);

  FOR v_contestant IN
    SELECT
      ce.user_id,
      COALESCE(SUM(v.paid_aura_spent), 0) AS total_paid_received
    FROM public.contest_entries ce
    LEFT JOIN public.votes v
      ON v.contest_id = ce.contest_id
     AND v.contestant_id = ce.user_id
    WHERE ce.contest_id = p_contest_id
    GROUP BY ce.user_id
    HAVING COALESCE(SUM(v.paid_aura_spent), 0) > 0
  LOOP
    -- Idempotency: skip if already granted for this contest + stage
    SELECT EXISTS (
      SELECT 1 FROM public.transactions
       WHERE user_id     = v_contestant.user_id
         AND type        = 'aura_vote_earnings'
         AND reference_id = p_contest_id
         AND description LIKE '%' || p_stage || '%'
    ) INTO v_already_granted;

    IF v_already_granted THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    v_rebate_amount := ROUND(v_contestant.total_paid_received * v_rebate_pct, 2);
    IF v_rebate_amount <= 0 THEN CONTINUE; END IF;

    -- Lock and credit wallet
    SELECT * INTO v_wallet
      FROM public.wallets WHERE user_id = v_contestant.user_id FOR UPDATE;

    IF NOT FOUND THEN CONTINUE; END IF;

    UPDATE public.wallets
      SET aura_balance = aura_balance + v_rebate_amount,
          updated_at   = now()
    WHERE id = v_wallet.id;

    -- Ledger entry
    INSERT INTO public.wallet_ledger
      (user_id, wallet_id, entry_type, currency, amount,
       balance_before, balance_after, reference_type, reference_id,
       description, description_ar, is_free_aura)
    VALUES
      (v_contestant.user_id, v_wallet.id,
       'vote_earnings', 'aura', v_rebate_amount,
       v_wallet.aura_balance, v_wallet.aura_balance + v_rebate_amount,
       'contest', p_contest_id,
       'Vote earnings 20% – ' || p_stage,
       'مكافأة أصوات 20% – ' || p_stage,
       false);

    -- Transaction record (visible in wallet history)
    INSERT INTO public.transactions
      (user_id, type, currency, amount, description, description_ar, reference_id)
    VALUES
      (v_contestant.user_id, 'aura_vote_earnings', 'aura', v_rebate_amount,
       'Vote earnings 20% – ' || p_stage,
       'مكافأة أصوات 20% – ' || p_stage,
       p_contest_id);

    v_processed := v_processed + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success',   true,
    'stage',     p_stage,
    'processed', v_processed,
    'skipped',   v_skipped
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 5. Grant service-role permission to call grant_vote_earnings
GRANT EXECUTE ON FUNCTION public.grant_vote_earnings(UUID, TEXT) TO service_role;
