-- ══════════════════════════════════════════════════════════════════════════════
-- Account Security: 6-Digit PIN
-- ══════════════════════════════════════════════════════════════════════════════

-- Requires pgcrypto for bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add pin_hash column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pin_hash TEXT DEFAULT NULL;

-- ── Function: set PIN ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_user_pin(p_pin TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Enforce 6-digit numeric PIN
  IF p_pin !~ '^[0-9]{6}$' THEN
    RAISE EXCEPTION 'PIN must be exactly 6 numeric digits';
  END IF;

  UPDATE public.profiles
  SET
    pin_hash   = crypt(p_pin, gen_salt('bf', 10)),
    updated_at = NOW()
  WHERE user_id = auth.uid();
END;
$$;

-- ── Function: verify PIN ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verify_user_pin(p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;

  SELECT pin_hash INTO v_hash
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF v_hash IS NULL THEN RETURN FALSE; END IF;

  RETURN crypt(p_pin, v_hash) = v_hash;
END;
$$;

-- ── Function: check if PIN is set ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.has_user_pin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pin_hash IS NOT NULL
  FROM public.profiles
  WHERE user_id = auth.uid();
$$;
