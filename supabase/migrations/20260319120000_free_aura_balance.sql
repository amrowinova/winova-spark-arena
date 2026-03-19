-- ══════════════════════════════════════════════════════════════════════════════
-- FREE AURA BALANCE SYSTEM
-- Two-type Aura:
--   aura_balance      → paid Aura (converted from Nova) — earns commission, transferable
--   free_aura_balance → free Aura (granted by platform) — qualification only, no commission
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Add free_aura_balance column to wallets
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS free_aura_balance NUMERIC NOT NULL DEFAULT 0;

-- 2. Add is_free_aura flag to wallet_ledger
ALTER TABLE public.wallet_ledger
  ADD COLUMN IF NOT EXISTS is_free_aura BOOLEAN NOT NULL DEFAULT false;

-- 3. grant_free_aura — admin-only RPC to credit free Aura to a user
CREATE OR REPLACE FUNCTION public.grant_free_aura(
  p_admin_id   UUID,
  p_target_id  UUID,
  p_amount     NUMERIC,
  p_reason     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wallet         public.wallets%ROWTYPE;
  v_balance_before NUMERIC;
  v_balance_after  NUMERIC;
BEGIN
  -- Auth check
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin role required');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  -- Lock target wallet
  PERFORM set_config('app.bypass_wallet_guard', 'true', true);
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_target_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target wallet not found');
  END IF;

  v_balance_before := v_wallet.free_aura_balance;
  v_balance_after  := v_balance_before + p_amount;

  -- Credit free_aura_balance
  UPDATE public.wallets
    SET free_aura_balance = v_balance_after,
        updated_at        = now()
  WHERE id = v_wallet.id;

  -- Ledger entry (is_free_aura = true)
  INSERT INTO public.wallet_ledger
    (user_id, wallet_id, entry_type, currency, amount,
     balance_before, balance_after, reference_type,
     description, description_ar, is_free_aura)
  VALUES
    (p_target_id, v_wallet.id, 'admin_credit', 'aura', p_amount,
     v_balance_before, v_balance_after, 'free_aura_grant',
     COALESCE(p_reason, 'Free Aura grant'),
     COALESCE(p_reason, 'منح Aura مجانية'),
     true);

  -- Audit log
  INSERT INTO public.audit_logs
    (action, entity_type, entity_id, performed_by, metadata)
  VALUES
    ('grant_free_aura', 'wallet', v_wallet.id, auth.uid(),
     jsonb_build_object(
       'target_user_id', p_target_id,
       'amount', p_amount,
       'reason', p_reason,
       'balance_before', v_balance_before,
       'balance_after', v_balance_after
     ));

  -- Notify user
  INSERT INTO public.notifications
    (user_id, title, title_ar, message, message_ar, type)
  VALUES
    (p_target_id,
     'Free Aura Credited',
     'تم منح Aura مجانية',
     format('You received %s free Aura from the platform.', p_amount),
     format('حصلت على %s Aura مجانية من المنصة.', p_amount),
     'earnings');

  RETURN jsonb_build_object(
    'success', true,
    'free_aura_balance_after', v_balance_after
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 4. cast_vote — updated to prefer paid Aura, skip commission for free Aura votes
--    Deduction order: paid aura_balance first → free_aura_balance second
--    Commission chain is skipped when free aura is used
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
    -- Enough paid Aura → use paid only
    v_paid_to_deduct := p_aura_amount;
    v_used_free_aura := false;

  ELSIF v_aura_before > 0 THEN
    -- Partial paid + rest from free
    v_paid_to_deduct := v_aura_before;
    v_free_to_deduct := p_aura_amount - v_aura_before;
    v_used_free_aura := true;

    IF v_free_before < v_free_to_deduct THEN
      -- Not enough even with free — try Nova fallback (0.5 Nova per Aura needed)
      v_nova_cost := p_aura_amount * 0.5;
      IF v_voter_wallet.nova_balance < v_nova_cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient Aura or Nova balance');
      END IF;
      -- Use Nova instead
      v_paid_to_deduct := 0;
      v_free_to_deduct := 0;
      v_used_free_aura := false;
    END IF;

  ELSIF v_free_before >= p_aura_amount THEN
    -- No paid Aura, use free only
    v_free_to_deduct := p_aura_amount;
    v_used_free_aura := true;

  ELSE
    -- No Aura at all — try Nova fallback
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
    -- Nova path: deduct Nova
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
    -- Aura path: deduct paid and/or free
    UPDATE public.wallets
      SET aura_balance      = v_aura_after,
          free_aura_balance = v_free_after,
          updated_at        = now()
    WHERE id = v_voter_wallet.id;

    -- Ledger for paid Aura deducted (if any)
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

    -- Ledger for free Aura deducted (if any)
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
  --    Free Aura votes increment vote count but generate NO Aura credit and NO commission
  IF NOT v_used_free_aura OR v_paid_to_deduct > 0 OR v_nova_cost > 0 THEN
    DECLARE
      v_contestant_wallet public.wallets%ROWTYPE;
      v_credit_amount     NUMERIC;
    BEGIN
      -- Credit amount = only the paid portion
      v_credit_amount := CASE
        WHEN v_nova_cost > 0 THEN p_aura_amount  -- Nova path → full Aura credit
        ELSE v_paid_to_deduct                     -- paid Aura only
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

  -- ── Increment vote count for contestant (always, paid or free) ────────────
  UPDATE public.contest_entries
    SET votes_received = votes_received + 1
  WHERE contest_id = p_contest_id AND user_id = p_contestant_id;

  -- Record in votes table
  INSERT INTO public.votes (contest_id, voter_id, contestant_id, aura_spent)
  VALUES (p_contest_id, p_voter_id, p_contestant_id, p_aura_amount);

  RETURN jsonb_build_object(
    'success', true,
    'used_free_aura', v_used_free_aura,
    'paid_aura_spent', v_paid_to_deduct,
    'free_aura_spent', v_free_to_deduct,
    'nova_spent', v_nova_cost
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 5. Update guard_wallet_balance_mutation trigger to protect free_aura_balance too
CREATE OR REPLACE FUNCTION public.guard_wallet_balance_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.bypass_wallet_guard', true)::boolean IS NOT TRUE THEN
    IF (NEW.nova_balance        IS DISTINCT FROM OLD.nova_balance        OR
        NEW.locked_nova_balance IS DISTINCT FROM OLD.locked_nova_balance OR
        NEW.aura_balance        IS DISTINCT FROM OLD.aura_balance        OR
        NEW.free_aura_balance   IS DISTINCT FROM OLD.free_aura_balance)
    THEN
      RAISE EXCEPTION 'Direct wallet balance updates are forbidden. Use the provided RPC functions.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
