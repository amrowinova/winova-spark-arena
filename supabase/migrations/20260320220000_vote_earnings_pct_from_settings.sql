-- ─────────────────────────────────────────────────────────────────────────────
-- grant_vote_earnings: read voteEarningsPct from app_settings.contest_config
-- instead of a hardcoded value, so admins can adjust it without code changes.
-- ─────────────────────────────────────────────────────────────────────────────

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
  v_rebate_pct      NUMERIC := 0.20;  -- default fallback
  v_processed       INTEGER := 0;
  v_skipped         INTEGER := 0;
  v_contestant      RECORD;
  v_wallet          public.wallets%ROWTYPE;
  v_rebate_amount   NUMERIC;
  v_already_granted BOOLEAN;
  v_config_raw      JSONB;
BEGIN
  PERFORM set_config('app.bypass_wallet_guard', 'true', true);

  -- Read voteEarningsPct from app_settings (contest_config key)
  SELECT value INTO v_config_raw
    FROM public.app_settings
   WHERE key = 'contest_config'
   LIMIT 1;

  IF v_config_raw IS NOT NULL
     AND (v_config_raw->>'voteEarningsPct') IS NOT NULL
  THEN
    v_rebate_pct := (v_config_raw->>'voteEarningsPct')::NUMERIC;
    -- Safety bounds: must be between 0 and 1
    IF v_rebate_pct < 0 OR v_rebate_pct > 1 THEN
      v_rebate_pct := 0.20;
    END IF;
  END IF;

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
       WHERE user_id      = v_contestant.user_id
         AND type         = 'aura_vote_earnings'
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
       'Vote earnings ' || ROUND(v_rebate_pct * 100) || '% – ' || p_stage,
       'مكافأة أصوات ' || ROUND(v_rebate_pct * 100) || '% – ' || p_stage,
       false);

    -- Transaction record (visible in wallet history)
    INSERT INTO public.transactions
      (user_id, type, currency, amount, description, description_ar, reference_id)
    VALUES
      (v_contestant.user_id, 'aura_vote_earnings', 'aura', v_rebate_amount,
       'Vote earnings ' || ROUND(v_rebate_pct * 100) || '% – ' || p_stage,
       'مكافأة أصوات ' || ROUND(v_rebate_pct * 100) || '% – ' || p_stage,
       p_contest_id);

    v_processed := v_processed + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success',      true,
    'stage',        p_stage,
    'rebate_pct',   v_rebate_pct,
    'processed',    v_processed,
    'skipped',      v_skipped
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_vote_earnings(UUID, TEXT) TO service_role;
