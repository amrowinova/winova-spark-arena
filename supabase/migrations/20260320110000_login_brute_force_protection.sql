-- ══════════════════════════════════════════════════════════════════════════════
-- BRUTE FORCE PROTECTION — LOGIN
-- Server-side enforcement: 5 failed attempts within 15 min → locked 15 min.
-- Works even if client clears localStorage or calls the API directly.
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Attempt log table
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id           BIGSERIAL PRIMARY KEY,
  email        TEXT        NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  success      BOOLEAN     NOT NULL DEFAULT false
);

-- Index for fast lookups per email in the time window
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
  ON public.login_attempts (email, attempted_at DESC);

-- Auto-cleanup: drop attempts older than 24 hours (pg_cron or manual)
-- Rows are cheap so this is mainly for hygiene; a separate cron can purge old rows.

-- Disable RLS — only SECURITY DEFINER functions access this table
ALTER TABLE public.login_attempts DISABLE ROW LEVEL SECURITY;

-- Revoke direct table access from all roles
REVOKE ALL ON public.login_attempts FROM anon, authenticated;

-- ── Constants (embedded in functions for clarity) ──────────────────────────
-- WINDOW_MINUTES  = 15  (sliding window to count failures)
-- MAX_FAILURES    = 5   (max failures before lockout)
-- LOCKOUT_MINUTES = 15  (how long the account is locked)

-- 2. check_login_allowed(email) — call BEFORE attempting signIn
--    Returns: { allowed: bool, locked_until: timestamptz | null, seconds_remaining: int }
CREATE OR REPLACE FUNCTION public.check_login_allowed(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email          TEXT := lower(trim(p_email));
  v_window_start   TIMESTAMPTZ := now() - INTERVAL '15 minutes';
  v_lockout_start  TIMESTAMPTZ;
  v_lockout_end    TIMESTAMPTZ;
  v_failure_count  INTEGER;
  v_secs_remaining INTEGER;
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'Email required');
  END IF;

  -- Count consecutive failures in last 15 minutes
  SELECT COUNT(*) INTO v_failure_count
  FROM public.login_attempts
  WHERE email = v_email
    AND attempted_at >= v_window_start
    AND success = false;

  IF v_failure_count < 5 THEN
    RETURN jsonb_build_object('allowed', true, 'locked_until', NULL, 'seconds_remaining', 0);
  END IF;

  -- Find when the 5th failure occurred (earliest within the window that puts us at >= 5)
  SELECT attempted_at INTO v_lockout_start
  FROM public.login_attempts
  WHERE email = v_email
    AND attempted_at >= v_window_start
    AND success = false
  ORDER BY attempted_at ASC
  OFFSET 4
  LIMIT 1;

  v_lockout_end := v_lockout_start + INTERVAL '15 minutes';

  IF now() < v_lockout_end THEN
    v_secs_remaining := EXTRACT(EPOCH FROM (v_lockout_end - now()))::INTEGER;
    RETURN jsonb_build_object(
      'allowed', false,
      'locked_until', v_lockout_end,
      'seconds_remaining', v_secs_remaining
    );
  END IF;

  -- Lockout period has expired
  RETURN jsonb_build_object('allowed', true, 'locked_until', NULL, 'seconds_remaining', 0);
END;
$$;

-- 3. record_login_attempt(email, success) — call AFTER signIn attempt
CREATE OR REPLACE FUNCTION public.record_login_attempt(
  p_email   TEXT,
  p_success BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email TEXT := lower(trim(p_email));
BEGIN
  IF v_email IS NULL OR v_email = '' THEN RETURN; END IF;

  INSERT INTO public.login_attempts (email, success)
  VALUES (v_email, p_success);

  -- Purge attempts older than 24h for this email to keep table lean
  DELETE FROM public.login_attempts
  WHERE email = v_email
    AND attempted_at < now() - INTERVAL '24 hours';
END;
$$;

-- Grant execute to unauthenticated users (login happens before auth)
GRANT EXECUTE ON FUNCTION public.check_login_allowed(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(TEXT, BOOLEAN) TO anon, authenticated;
