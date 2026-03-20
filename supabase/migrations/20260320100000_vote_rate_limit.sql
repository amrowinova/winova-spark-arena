-- ══════════════════════════════════════════════════════════════════════════════
-- VOTE RATE LIMITING
-- Prevents bot abuse: max 10 vote calls per user per 60-second window.
-- Enforced inside cast_vote() SECURITY DEFINER RPC — cannot be bypassed from client.
-- ══════════════════════════════════════════════════════════════════════════════

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
  v_recent_votes      INTEGER;
BEGIN
  PERFORM set_config('app.bypass_wallet_guard', 'true', true);

  -- Auth
  IF auth.uid() IS NULL OR auth.uid() <> p_voter_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- ── Rate limit: max 10 vote calls per 60 seconds ─────────────────────────
  SELECT COUNT(*) INTO v_recent_votes
  FROM public.votes
  WHERE voter_id = p_voter_id
    AND created_at > NOW() - INTERVAL '60 seconds';

  IF v_recent_votes >= 10 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'rate_limited',
      'message', 'Maximum 10 votes per minute allowed. Please wait before voting again.'
    );
  END IF;
  -- ─────────────────────────────────────────────────────────────────────────

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

  -- ── Credit vote_receive to contestant — only for PAID Aura/Nova votes ────
  IF NOT v_used_free_aura OR v_paid_to_deduct > 0 OR v_nova_cost > 0 THEN
    DECLARE
      v_contestant_wallet public.wallets%ROWTYPE;
      v_credit_amount     NUMERIC;
    BEGIN
      v_credit_amount := CASE
        WHEN v_nova_cost > 0 THEN p_aura_amount
        ELSE v_paid_to_deduct
      END;

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
           v_contestant_wallet.aura_balance, v_contestant_wallet.aura_balance + v_credit_amount,
           'vote', p_contest_id, p_voter_id,
           'Vote received', 'صوت مستلم', false);

        -- Commission chain (upline leaders) — only on paid votes
        PERFORM public.distribute_vote_commission(p_contestant_id, v_credit_amount, p_contest_id);
      END IF;
    END;
  END IF;

  -- ── Record the vote ───────────────────────────────────────────────────────
  INSERT INTO public.votes (contest_id, voter_id, contestant_id, aura_spent)
  VALUES (p_contest_id, p_voter_id, p_contestant_id, p_aura_amount);

  -- Update contestant vote count
  UPDATE public.contest_entries
    SET votes = votes + p_aura_amount
  WHERE contest_id = p_contest_id AND user_id = p_contestant_id;

  RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Index to make the rate-limit COUNT fast (voter_id + created_at)
CREATE INDEX IF NOT EXISTS idx_votes_voter_created
  ON public.votes (voter_id, created_at DESC);
