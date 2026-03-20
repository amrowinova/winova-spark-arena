-- ============================================================
-- SPOTLIGHT DAILY AUTO-DRAW SYSTEM
-- Automatically selects two daily winners from active users:
--   1st place (65%): highest cumulative cycle points
--   2nd place (35%): weighted random by cumulative cycle points
-- Triggered by contest-scheduler when daily contest completes.
-- ============================================================

-- ── 1. Add spotlight_prize to ledger entry types ────────────
ALTER TYPE public.ledger_entry_type ADD VALUE IF NOT EXISTS 'spotlight_prize';

-- ── 2. Insert default draw config into app_settings ─────────
INSERT INTO public.app_settings (key, value, description)
VALUES (
  'spotlight_draw_config',
  '{"daily_pool": 0}'::jsonb,
  'إعدادات السحب اليومي للمحظوظين. daily_pool = إجمالي Nova الموزَّعة يومياً (0 = إعلان بدون جائزة مالية)'
)
ON CONFLICT (key) DO NOTHING;

-- ── 3. Internal prize-awarding helper ───────────────────────
-- SECURITY DEFINER: bypasses wallet guard, works without auth.uid().
-- Not exposed to authenticated clients directly.
CREATE OR REPLACE FUNCTION public._award_spotlight_prize(
  p_user_id  UUID,
  p_amount   NUMERIC,
  p_draw_id  UUID,
  p_place    INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet         wallets%ROWTYPE;
  v_balance_before NUMERIC;
  v_balance_after  NUMERIC;
  v_ledger_id      UUID;
BEGIN
  -- Bypass the wallet guard trigger (this function IS the trusted context)
  PERFORM set_config('app.bypass_wallet_guard', 'true', true);

  -- Lock wallet row to prevent concurrent updates
  SELECT * INTO v_wallet
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE WARNING '_award_spotlight_prize: wallet not found for user %', p_user_id;
    RETURN;
  END IF;

  v_balance_before := v_wallet.nova_balance;
  v_balance_after  := v_balance_before + p_amount;

  -- Credit Nova
  UPDATE wallets
  SET nova_balance = v_balance_after,
      updated_at   = now()
  WHERE id = v_wallet.id;

  -- Full audit trail in wallet_ledger
  INSERT INTO wallet_ledger (
    user_id, wallet_id, entry_type, currency, amount,
    balance_before, balance_after,
    reference_type, reference_id,
    description, description_ar, metadata
  ) VALUES (
    p_user_id, v_wallet.id, 'spotlight_prize', 'nova', p_amount,
    v_balance_before, v_balance_after,
    'spotlight_draw', p_draw_id,
    format('Spotlight daily draw – place %s', p_place),
    format('سحب المحظوظين اليومي – المركز %s', p_place),
    jsonb_build_object('draw_id', p_draw_id, 'place', p_place, 'amount', p_amount)
  ) RETURNING id INTO v_ledger_id;

  -- transactions table for backward-compatibility
  INSERT INTO transactions (
    user_id, type, currency, amount,
    reference_id, description, description_ar
  ) VALUES (
    p_user_id, 'deposit', 'nova', p_amount,
    v_ledger_id,
    format('Spotlight daily draw prize – place %s', p_place),
    format('جائزة سحب المحظوظين – المركز %s', p_place)
  );
END;
$$;

-- ── 4. Main draw function ────────────────────────────────────
-- Parameters:
--   p_draw_date  – defaults to CURRENT_DATE (KSA caller passes today's date)
--   p_total_pool – override pool; NULL = read from app_settings.spotlight_draw_config.daily_pool
--
-- Returns JSONB:
--   {success, draw_id, draw_date, total_pool,
--    first_place_user_id, first_place_prize,
--    second_place_user_id, second_place_prize}
CREATE OR REPLACE FUNCTION public.run_daily_spotlight_draw(
  p_draw_date  DATE    DEFAULT CURRENT_DATE,
  p_total_pool NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle_id           UUID;
  v_week_number        INTEGER;
  v_existing_draw_id   UUID;
  v_draw_id            UUID;
  v_first_user_id      UUID;
  v_second_user_id     UUID;
  v_pool               NUMERIC;
  v_first_prize        NUMERIC;
  v_second_prize       NUMERIC;
BEGIN
  -- ── Step 1: Get active spotlight cycle ───────────────────
  SELECT cycle_id, week_number
  INTO v_cycle_id, v_week_number
  FROM get_active_cycle_info();

  IF v_cycle_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason',  'no_active_cycle'
    );
  END IF;

  -- ── Step 2: Idempotency check ────────────────────────────
  SELECT id INTO v_existing_draw_id
  FROM spotlight_daily_draws
  WHERE cycle_id  = v_cycle_id
    AND draw_date = p_draw_date;

  IF v_existing_draw_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason',  'draw_already_exists',
      'draw_id', v_existing_draw_id
    );
  END IF;

  -- ── Step 3: Resolve prize pool ───────────────────────────
  IF p_total_pool IS NOT NULL THEN
    v_pool := p_total_pool;
  ELSE
    SELECT COALESCE((value->>'daily_pool')::NUMERIC, 0)
    INTO v_pool
    FROM app_settings
    WHERE key = 'spotlight_draw_config';

    -- key missing entirely
    IF NOT FOUND THEN
      v_pool := 0;
    END IF;
  END IF;

  -- ── Step 4: First place — highest cumulative cycle points ─
  SELECT user_id
  INTO v_first_user_id
  FROM (
    SELECT   user_id, SUM(daily_points) AS total_pts
    FROM     spotlight_user_points
    WHERE    cycle_id    = v_cycle_id
      AND    points_date <= p_draw_date
    GROUP BY user_id
    HAVING   SUM(daily_points) > 0
    ORDER BY total_pts DESC
    LIMIT 1
  ) ranked;

  IF v_first_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason',  'no_eligible_users'
    );
  END IF;

  -- ── Step 5: Second place — weighted random ───────────────
  -- ORDER BY random() * total_pts DESC gives a probability
  -- proportional to cumulative points (weighted reservoir sample).
  SELECT user_id
  INTO v_second_user_id
  FROM (
    SELECT   user_id, SUM(daily_points) AS total_pts
    FROM     spotlight_user_points
    WHERE    cycle_id    = v_cycle_id
      AND    points_date <= p_draw_date
      AND    user_id    <> v_first_user_id
    GROUP BY user_id
    HAVING   SUM(daily_points) > 0
  ) eligible
  ORDER BY random() * total_pts DESC
  LIMIT 1;

  -- ── Step 6: Calculate prize split ────────────────────────
  -- 65 / 35 split; second_prize absorbs any rounding remainder.
  v_first_prize  := ROUND(v_pool * 0.65, 2);
  v_second_prize := v_pool - v_first_prize;

  -- ── Step 7: Insert draw record ───────────────────────────
  INSERT INTO spotlight_daily_draws (
    cycle_id, draw_date, total_pool,
    first_place_user_id,  first_place_prize,  first_place_percentage,
    second_place_user_id, second_place_prize, second_place_percentage,
    is_announced, announced_at
  ) VALUES (
    v_cycle_id, p_draw_date, v_pool,
    v_first_user_id,  v_first_prize,  65,
    v_second_user_id, v_second_prize, 35,
    true, now()
  )
  RETURNING id INTO v_draw_id;

  -- ── Step 8: Award prizes (only when pool > 0) ────────────
  IF v_pool > 0 THEN
    PERFORM _award_spotlight_prize(v_first_user_id, v_first_prize, v_draw_id, 1);

    IF v_second_user_id IS NOT NULL AND v_second_prize > 0 THEN
      PERFORM _award_spotlight_prize(v_second_user_id, v_second_prize, v_draw_id, 2);
    END IF;
  END IF;

  -- ── Done ─────────────────────────────────────────────────
  RETURN jsonb_build_object(
    'success',               true,
    'draw_id',               v_draw_id,
    'draw_date',             p_draw_date,
    'total_pool',            v_pool,
    'first_place_user_id',   v_first_user_id,
    'first_place_prize',     v_first_prize,
    'second_place_user_id',  v_second_user_id,
    'second_place_prize',    v_second_prize
  );
END;
$$;

-- Expose to service-role callers (edge functions use service-role key)
GRANT EXECUTE ON FUNCTION public.run_daily_spotlight_draw(DATE, NUMERIC) TO service_role;
-- Internal helper: not needed by clients
REVOKE ALL ON FUNCTION public._award_spotlight_prize(UUID, NUMERIC, UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._award_spotlight_prize(UUID, NUMERIC, UUID, INTEGER) TO service_role;
