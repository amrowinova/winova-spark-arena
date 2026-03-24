-- ============================================================
-- FRIDAY FREE CONTEST: 3-Layer Protection + Auto Scheduler
-- ============================================================

-- ── 1. Extend contests table ─────────────────────────────────
ALTER TABLE public.contests
  ADD COLUMN IF NOT EXISTS is_free         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS entry_type      TEXT    NOT NULL DEFAULT 'regular'
    CHECK (entry_type IN ('regular','friday_free')),
  ADD COLUMN IF NOT EXISTS contest_date    DATE;

-- Fill contest_date for existing rows from start_time
UPDATE public.contests
SET contest_date = (timezone('Asia/Riyadh', start_time))::DATE
WHERE contest_date IS NULL;

ALTER TABLE public.contests
  ALTER COLUMN contest_date SET NOT NULL,
  ADD COLUMN IF NOT EXISTS max_free_joins  INTEGER DEFAULT NULL;

-- ── 2. Device fingerprint tracking ───────────────────────────
-- Tracks which device fingerprint joined which free contest
-- Prevents multi-account abuse from same device
CREATE TABLE IF NOT EXISTS public.contest_device_joins (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id   UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  device_id    TEXT NOT NULL,       -- browser fingerprint hash
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contest_id, device_id)   -- one device per contest
);

CREATE INDEX IF NOT EXISTS idx_device_joins_contest ON public.contest_device_joins(contest_id);
CREATE INDEX IF NOT EXISTS idx_device_joins_device  ON public.contest_device_joins(device_id);

ALTER TABLE public.contest_device_joins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only on device_joins"
  ON public.contest_device_joins FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── 3. kyc_status on profiles (if not exists) ────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (kyc_status IN ('pending','submitted','verified','rejected'));

-- ── 4. join_friday_contest RPC ───────────────────────────────
-- Replaces join_contest logic for is_free=true contests.
-- 3-layer protection:
--   Layer 1: KYC must be verified
--   Layer 2: Account age >= 7 days
--   Layer 3: Device fingerprint not used in this contest
CREATE OR REPLACE FUNCTION public.join_friday_contest(
  p_contest_id    UUID,
  p_device_id     TEXT  -- SHA-256 fingerprint from browser
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          UUID := auth.uid();
  v_contest      public.contests%ROWTYPE;
  v_profile      public.profiles%ROWTYPE;
  v_ksa_now      TIMESTAMP;
  v_ksa_today    DATE;
  v_join_open    TIMESTAMP;
  v_join_close   TIMESTAMP;
  v_entry_id     UUID;
  v_account_age  INTERVAL;
BEGIN
  -- Auth check
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required', 'error_code', 'AUTH_REQUIRED');
  END IF;

  -- Load profile
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = v_uid LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found', 'error_code', 'NO_PROFILE');
  END IF;

  -- ── LAYER 1: KYC ─────────────────────────────────────────
  IF v_profile.kyc_status <> 'verified' THEN
    RETURN jsonb_build_object('success', false, 'error', 'kyc_required', 'error_code', 'KYC_REQUIRED');
  END IF;

  -- ── LAYER 2: Account age >= 7 days ───────────────────────
  v_account_age := now() - v_profile.created_at;
  IF v_account_age < INTERVAL '7 days' THEN
    RETURN jsonb_build_object('success', false, 'error', 'account_too_new', 'error_code', 'ACCOUNT_TOO_NEW',
      'days_remaining', EXTRACT(DAY FROM (INTERVAL '7 days' - v_account_age))::INT + 1);
  END IF;

  -- ── LAYER 3: Device fingerprint ──────────────────────────
  IF p_device_id IS NULL OR length(trim(p_device_id)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Device fingerprint required', 'error_code', 'NO_DEVICE_ID');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.contest_device_joins
    WHERE contest_id = p_contest_id AND device_id = p_device_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'device_already_used', 'error_code', 'DEVICE_USED');
  END IF;

  -- ── Contest validity ──────────────────────────────────────
  v_ksa_now   := timezone('Asia/Riyadh', now());
  v_ksa_today := v_ksa_now::DATE;
  v_join_open  := date_trunc('day', v_ksa_now) + INTERVAL '10 hours';
  v_join_close := date_trunc('day', v_ksa_now) + INTERVAL '19 hours';

  IF v_ksa_now < v_join_open OR v_ksa_now >= v_join_close THEN
    RETURN jsonb_build_object('success', false, 'error', 'Joining is closed', 'error_code', 'CLOSED');
  END IF;

  SELECT * INTO v_contest FROM public.contests WHERE id = p_contest_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contest not found', 'error_code', 'NOT_FOUND');
  END IF;
  IF NOT v_contest.is_free THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a free contest', 'error_code', 'NOT_FREE');
  END IF;
  IF v_contest.contest_date <> v_ksa_today THEN
    RETURN jsonb_build_object('success', false, 'error', 'No free contest today', 'error_code', 'WRONG_DATE');
  END IF;
  IF v_contest.max_participants IS NOT NULL AND v_contest.current_participants >= v_contest.max_participants THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contest is full', 'error_code', 'FULL');
  END IF;
  IF EXISTS (SELECT 1 FROM public.contest_entries WHERE contest_id = p_contest_id AND user_id = v_uid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already joined', 'error_code', 'ALREADY_JOINED');
  END IF;

  -- ── All checks passed — insert ────────────────────────────
  INSERT INTO public.contest_entries (contest_id, user_id, votes_received)
  VALUES (p_contest_id, v_uid, 0) RETURNING id INTO v_entry_id;

  UPDATE public.contests
  SET current_participants = current_participants + 1
  WHERE id = p_contest_id;

  -- Record device
  INSERT INTO public.contest_device_joins (contest_id, device_id, user_id)
  VALUES (p_contest_id, p_device_id, v_uid)
  ON CONFLICT (contest_id, device_id) DO NOTHING;

  -- Ledger entry (free = 0 cost)
  INSERT INTO public.wallet_ledger (
    user_id, wallet_id, entry_type, currency, amount,
    balance_before, balance_after, reference_type, reference_id, description, description_ar
  )
  SELECT v_uid, w.id, 'contest_entry', 'nova', 0,
         w.nova_balance, w.nova_balance, 'contest', p_contest_id,
         'Friday free contest entry', 'دخول مسابقة الجمعة المجانية'
  FROM public.wallets w WHERE w.user_id = v_uid;

  RETURN jsonb_build_object('success', true, 'entry_id', v_entry_id, 'is_free', true);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_friday_contest TO authenticated;

-- ── 5. create_friday_contest function ────────────────────────
-- Called manually OR by pg_cron every Friday at 00:01 KSA (= 21:01 UTC Thursday)
CREATE OR REPLACE FUNCTION public.create_friday_contest()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ksa_now     TIMESTAMP;
  v_friday_date DATE;
  v_start_time  TIMESTAMPTZ;
  v_end_time    TIMESTAMPTZ;
  v_contest_id  UUID;
  v_day_of_week INT;
BEGIN
  v_ksa_now     := timezone('Asia/Riyadh', now());
  v_day_of_week := EXTRACT(DOW FROM v_ksa_now);  -- 0=Sun ... 5=Fri ... 6=Sat

  -- Accept call on Thursday evening (setup) or Friday itself
  -- Use today's date if Friday (5), else next Friday
  IF v_day_of_week = 5 THEN
    v_friday_date := v_ksa_now::DATE;
  ELSE
    v_friday_date := (v_ksa_now + ((5 - v_day_of_week + 7) % 7 || ' days')::INTERVAL)::DATE;
  END IF;

  -- Check if already exists
  IF EXISTS (SELECT 1 FROM public.contests WHERE contest_date = v_friday_date AND is_free = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Friday contest already exists for ' || v_friday_date);
  END IF;

  -- start = Friday 10:00 AM KSA = 07:00 UTC
  v_start_time := (v_friday_date::TEXT || ' 07:00:00+00')::TIMESTAMPTZ;
  -- end   = Friday 10:00 PM KSA = 19:00 UTC
  v_end_time   := (v_friday_date::TEXT || ' 19:00:00+00')::TIMESTAMPTZ;

  INSERT INTO public.contests (
    title, title_ar, description, description_ar,
    entry_fee, prize_pool, status, is_free, entry_type, contest_date,
    start_time, end_time, max_participants
  ) VALUES (
    'Friday Free Contest', 'مسابقة الجمعة المجانية',
    'Join for free every Friday — no Nova required!',
    'انضم مجاناً كل جمعة — بدون Nova!',
    0, 0, 'upcoming', true, 'friday_free', v_friday_date,
    v_start_time, v_end_time, 1000
  ) RETURNING id INTO v_contest_id;

  RETURN jsonb_build_object('success', true, 'contest_id', v_contest_id, 'date', v_friday_date);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_friday_contest TO authenticated;

-- ── 6. pg_cron schedule (run in Supabase SQL Editor once) ────
-- Enable pg_cron extension first: CREATE EXTENSION IF NOT EXISTS pg_cron;
-- Then run:
--
--   SELECT cron.schedule(
--     'create-friday-contest',
--     '1 21 * * 4',           -- 21:01 UTC every Thursday = 00:01 KSA Friday
--     $$ SELECT public.create_friday_contest(); $$
--   );
--
-- To verify: SELECT * FROM cron.job;
-- This comment serves as documentation. The actual cron must be set manually.

-- ── 7. get_friday_contest RPC ─────────────────────────────────
-- Returns today's (or upcoming) Friday contest info + user's join status
CREATE OR REPLACE FUNCTION public.get_friday_contest()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      UUID := auth.uid();
  v_ksa_now  TIMESTAMP;
  v_ksa_date DATE;
  v_contest  public.contests%ROWTYPE;
  v_joined   BOOLEAN := false;
  v_kyc_ok   BOOLEAN := false;
  v_age_ok   BOOLEAN := false;
  v_days_left INT := 0;
BEGIN
  v_ksa_now  := timezone('Asia/Riyadh', now());
  v_ksa_date := v_ksa_now::DATE;

  -- Find today's OR upcoming Friday contest
  SELECT * INTO v_contest
  FROM public.contests
  WHERE is_free = true AND contest_date >= v_ksa_date
  ORDER BY contest_date ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false, 'message', 'No upcoming Friday contest');
  END IF;

  -- User eligibility
  IF v_uid IS NOT NULL THEN
    SELECT (kyc_status = 'verified') INTO v_kyc_ok FROM public.profiles WHERE user_id = v_uid LIMIT 1;
    SELECT (now() - created_at >= INTERVAL '7 days') INTO v_age_ok FROM public.profiles WHERE user_id = v_uid LIMIT 1;
    IF NOT v_age_ok THEN
      SELECT GREATEST(0, 7 - EXTRACT(DAY FROM (now() - created_at))::INT)
      INTO v_days_left FROM public.profiles WHERE user_id = v_uid LIMIT 1;
    END IF;
    SELECT EXISTS (SELECT 1 FROM public.contest_entries
      WHERE contest_id = v_contest.id AND user_id = v_uid) INTO v_joined;
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'id', v_contest.id,
    'title', v_contest.title,
    'title_ar', v_contest.title_ar,
    'contest_date', v_contest.contest_date,
    'start_time', v_contest.start_time,
    'end_time', v_contest.end_time,
    'status', v_contest.status,
    'current_participants', v_contest.current_participants,
    'max_participants', v_contest.max_participants,
    'is_free', v_contest.is_free,
    'user_joined', v_joined,
    'kyc_verified', COALESCE(v_kyc_ok, false),
    'account_age_ok', COALESCE(v_age_ok, false),
    'days_until_eligible', v_days_left
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_friday_contest TO authenticated, anon;

-- ── 8. Notify users about upcoming Friday contest ────────────
-- Run this every Thursday at 20:00 KSA = 17:00 UTC to send notifications
CREATE OR REPLACE FUNCTION public.notify_friday_contest()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ksa_now     TIMESTAMP;
  v_friday_date DATE;
  v_contest_id  UUID;
  v_user        RECORD;
BEGIN
  v_ksa_now     := timezone('Asia/Riyadh', now());
  -- Next Friday
  v_friday_date := (v_ksa_now + ((5 - EXTRACT(DOW FROM v_ksa_now)::INT + 7) % 7 || ' days')::INTERVAL)::DATE;

  SELECT id INTO v_contest_id FROM public.contests
  WHERE contest_date = v_friday_date AND is_free = true LIMIT 1;

  IF v_contest_id IS NULL THEN RETURN; END IF;

  -- Insert notification for all verified users who haven't joined yet
  FOR v_user IN
    SELECT p.user_id FROM public.profiles p
    WHERE p.kyc_status = 'verified'
      AND now() - p.created_at >= INTERVAL '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.contest_entries ce
        WHERE ce.contest_id = v_contest_id AND ce.user_id = p.user_id
      )
  LOOP
    INSERT INTO public.notifications (user_id, title, title_ar, message, message_ar, type, reference_id)
    VALUES (
      v_user.user_id,
      'Friday Free Contest Tomorrow!', 'مسابقة الجمعة المجانية غداً!',
      'Join for free tomorrow — no Nova required!', 'انضم مجاناً غداً — بدون Nova!',
      'friday_contest', v_contest_id
    ) ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- pg_cron for Thursday reminder (run manually in Supabase SQL Editor):
--   SELECT cron.schedule(
--     'friday-contest-reminder',
--     '0 17 * * 4',    -- 17:00 UTC Thursday = 20:00 KSA
--     $$ SELECT public.notify_friday_contest(); $$
--   );
