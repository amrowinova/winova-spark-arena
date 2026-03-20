-- ══════════════════════════════════════════════════════════════════════════════
-- PAYMENT METHODS ENCRYPTION
-- Encrypts IBAN, account_number, phone_number using pgcrypto symmetric encryption.
-- Key is stored as a PostgreSQL GUC: app.payment_encryption_key
--
-- REQUIRED MANUAL STEP (run once in Supabase SQL editor BEFORE this migration):
--   ALTER DATABASE postgres
--     SET app.payment_encryption_key = '<your_random_32+_char_secret>';
--
-- After migration, run to encrypt existing plaintext rows:
--   SELECT public.encrypt_existing_payment_methods();
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Helper: get encryption key safely ────────────────────────────────────────
-- Returns NULL if key is not configured (graceful degradation)
CREATE OR REPLACE FUNCTION public._payment_enc_key()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT NULLIF(current_setting('app.payment_encryption_key', true), '');
$$;

-- ── Encrypt a single field (returns NULL if input is NULL or key missing) ─────
CREATE OR REPLACE FUNCTION public._enc(p_value TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_key TEXT;
BEGIN
  IF p_value IS NULL THEN RETURN NULL; END IF;
  v_key := public._payment_enc_key();
  IF v_key IS NULL THEN RETURN p_value; END IF; -- no key → store as-is (safe fallback)
  RETURN encode(pgp_sym_encrypt(p_value, v_key), 'base64');
END;
$$;

-- ── Decrypt a single field ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._dec(p_value TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_key TEXT;
BEGIN
  IF p_value IS NULL THEN RETURN NULL; END IF;
  v_key := public._payment_enc_key();
  IF v_key IS NULL THEN RETURN p_value; END IF;
  BEGIN
    RETURN pgp_sym_decrypt(decode(p_value, 'base64'), v_key);
  EXCEPTION WHEN OTHERS THEN
    -- Value might be unencrypted plaintext (legacy row)
    RETURN p_value;
  END;
END;
$$;

-- 2. get_my_payment_methods — returns decrypted methods for current user only
CREATE OR REPLACE FUNCTION public.get_my_payment_methods()
RETURNS TABLE (
  id              UUID,
  country         TEXT,
  type            TEXT,
  provider_name   TEXT,
  provider_name_ar TEXT,
  full_name       TEXT,
  account_number  TEXT,
  iban            TEXT,
  phone_number    TEXT,
  notes           TEXT,
  is_default      BOOLEAN,
  created_at      TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT
    pm.id,
    pm.country,
    pm.type,
    pm.provider_name,
    pm.provider_name_ar,
    pm.full_name,
    public._dec(pm.account_number),
    public._dec(pm.iban),
    public._dec(pm.phone_number),
    pm.notes,
    pm.is_default,
    pm.created_at
  FROM public.payment_methods pm
  WHERE pm.user_id = auth.uid()
  ORDER BY pm.is_default DESC, pm.created_at ASC;
END;
$$;

-- 3. get_payment_methods_by_ids — decrypts methods visible to current user
--    Caller must be participant (creator or executor) of an order linked to the method
CREATE OR REPLACE FUNCTION public.get_payment_methods_by_ids(p_ids UUID[])
RETURNS TABLE (
  id              UUID,
  provider_name   TEXT,
  account_number  TEXT,
  iban            TEXT,
  phone_number    TEXT,
  full_name       TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    pm.id,
    pm.provider_name,
    public._dec(pm.account_number),
    public._dec(pm.iban),
    public._dec(pm.phone_number),
    pm.full_name
  FROM public.payment_methods pm
  WHERE pm.id = ANY(p_ids)
    AND (
      -- Own methods
      pm.user_id = auth.uid()
      OR
      -- Methods linked to orders where caller is participant
      EXISTS (
        SELECT 1 FROM public.p2p_orders o
        WHERE o.payment_method_id = pm.id
          AND (o.creator_id = auth.uid() OR o.executor_id = auth.uid())
      )
    );
END;
$$;

-- 4. upsert_payment_method — creates or updates with encryption
CREATE OR REPLACE FUNCTION public.upsert_payment_method(
  p_id             UUID DEFAULT NULL,   -- NULL = insert, non-NULL = update
  p_country        TEXT DEFAULT NULL,
  p_type           TEXT DEFAULT 'bank',
  p_provider_name  TEXT DEFAULT NULL,
  p_provider_name_ar TEXT DEFAULT NULL,
  p_full_name      TEXT DEFAULT NULL,
  p_account_number TEXT DEFAULT NULL,
  p_iban           TEXT DEFAULT NULL,
  p_phone_number   TEXT DEFAULT NULL,
  p_notes          TEXT DEFAULT NULL,
  p_is_default     BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_method_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF p_id IS NULL THEN
    -- INSERT
    INSERT INTO public.payment_methods (
      user_id, country, type, provider_name, provider_name_ar,
      full_name, account_number, iban, phone_number, notes, is_default
    ) VALUES (
      auth.uid(),
      p_country,
      p_type,
      p_provider_name,
      p_provider_name_ar,
      p_full_name,
      public._enc(p_account_number),
      public._enc(p_iban),
      public._enc(p_phone_number),
      p_notes,
      p_is_default
    )
    RETURNING id INTO v_method_id;

  ELSE
    -- UPDATE — verify ownership
    IF NOT EXISTS (
      SELECT 1 FROM public.payment_methods
      WHERE id = p_id AND user_id = auth.uid()
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Payment method not found');
    END IF;

    UPDATE public.payment_methods SET
      full_name      = COALESCE(p_full_name, full_name),
      account_number = CASE WHEN p_account_number IS NOT NULL THEN public._enc(p_account_number) ELSE account_number END,
      iban           = CASE WHEN p_iban IS NOT NULL THEN public._enc(p_iban) ELSE iban END,
      phone_number   = CASE WHEN p_phone_number IS NOT NULL THEN public._enc(p_phone_number) ELSE phone_number END,
      notes          = COALESCE(p_notes, notes),
      is_default     = COALESCE(p_is_default, is_default)
    WHERE id = p_id AND user_id = auth.uid();

    v_method_id := p_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'id', v_method_id);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 5. delete_payment_method — owner-only delete
CREATE OR REPLACE FUNCTION public.delete_payment_method(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  DELETE FROM public.payment_methods
  WHERE id = p_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment method not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 6. set_default_payment_method — owner-only default switch
CREATE OR REPLACE FUNCTION public.set_default_payment_method(p_id UUID, p_country TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Verify ownership of target method
  IF NOT EXISTS (
    SELECT 1 FROM public.payment_methods WHERE id = p_id AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment method not found');
  END IF;

  -- Unset all defaults for this user + country
  UPDATE public.payment_methods
    SET is_default = (id = p_id)
  WHERE user_id = auth.uid() AND country = p_country;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. encrypt_existing_payment_methods — one-time helper to encrypt legacy plaintext rows
--    Run manually after setting app.payment_encryption_key:
--    SELECT public.encrypt_existing_payment_methods();
CREATE OR REPLACE FUNCTION public.encrypt_existing_payment_methods()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_key    TEXT;
  v_count  INTEGER := 0;
  v_row    RECORD;
BEGIN
  -- Only callable by admins
  IF NOT public.has_role(auth.uid(), 'admin') AND auth.uid() IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin role required');
  END IF;

  v_key := public._payment_enc_key();
  IF v_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'app.payment_encryption_key is not set');
  END IF;

  -- Encrypt rows where values don't look like base64-encoded pgp blobs
  FOR v_row IN
    SELECT id, account_number, iban, phone_number
    FROM public.payment_methods
    WHERE
      (account_number IS NOT NULL AND account_number NOT LIKE 'jA0E%' AND account_number NOT LIKE 'wcB%') OR
      (iban IS NOT NULL AND iban NOT LIKE 'jA0E%' AND iban NOT LIKE 'wcB%') OR
      (phone_number IS NOT NULL AND phone_number NOT LIKE 'jA0E%' AND phone_number NOT LIKE 'wcB%')
  LOOP
    UPDATE public.payment_methods SET
      account_number = CASE WHEN v_row.account_number IS NOT NULL THEN encode(pgp_sym_encrypt(v_row.account_number, v_key), 'base64') ELSE NULL END,
      iban           = CASE WHEN v_row.iban IS NOT NULL THEN encode(pgp_sym_encrypt(v_row.iban, v_key), 'base64') ELSE NULL END,
      phone_number   = CASE WHEN v_row.phone_number IS NOT NULL THEN encode(pgp_sym_encrypt(v_row.phone_number, v_key), 'base64') ELSE NULL END
    WHERE id = v_row.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'encrypted_count', v_count);
END;
$$;
