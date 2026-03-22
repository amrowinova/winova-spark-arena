-- ============================================================
-- تصحيح وقت إغلاق التسجيل: 20 hours → 19 hours
-- ============================================================
-- التسجيل يغلق 19:00 KSA (ساعة قبل نهاية المرحلة الأولى 20:00)
-- ============================================================

CREATE OR REPLACE FUNCTION public.join_contest(
  p_user_id            UUID,
  p_contest_id         UUID,
  p_entry_fee          NUMERIC DEFAULT 10,
  p_device_fingerprint TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet          wallets%ROWTYPE;
  v_contest         contests%ROWTYPE;
  v_balance_before  NUMERIC;
  v_balance_after   NUMERIC;
  v_entry_id        UUID;
  v_ledger_id       UUID;
  v_new_prize_pool  NUMERIC;
  v_new_participants INTEGER;
  v_ksa_now         TIMESTAMP;
  v_ksa_today       DATE;
  v_join_close      TIMESTAMP;
  v_kyc_status      TEXT;
  v_account_created TIMESTAMPTZ;
BEGIN

  -- ① Auth check
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required',
      'error_code', 'AUTH_REQUIRED'
    );
  END IF;

  IF auth.uid() <> p_user_id THEN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, performed_by, metadata)
    VALUES (
      'contest_join_impersonation_blocked', 'contest', p_contest_id::text,
      auth.uid(), jsonb_build_object('attempted_user_id', p_user_id, 'actual_uid', auth.uid())
    );
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You can only join contests as yourself',
      'error_code', 'UNAUTHORIZED'
    );
  END IF;

  -- ② وقت الانضمام: 00:00 – 19:00 KSA
  --    التسجيل يغلق ساعة قبل نهاية المرحلة الأولى (20:00)
  v_ksa_now   := timezone('Asia/Riyadh', now());
  v_ksa_today := v_ksa_now::date;
  v_join_close := date_trunc('day', v_ksa_now) + interval '19 hours';

  IF v_ksa_now >= v_join_close THEN
    RETURN jsonb_build_object('success', false, 'error', 'Joining is closed', 'error_code', 'JOIN_CLOSED');
  END IF;

  -- ③ جلب المسابقة
  SELECT * INTO v_contest FROM contests WHERE id = p_contest_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contest not found', 'error_code', 'NOT_FOUND');
  END IF;
  IF v_contest.contest_date <> v_ksa_today THEN
    RETURN jsonb_build_object('success', false, 'error', 'No contest for today', 'error_code', 'WRONG_DATE');
  END IF;
  IF v_contest.max_participants IS NOT NULL
     AND v_contest.current_participants >= v_contest.max_participants THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contest is full', 'error_code', 'FULL');
  END IF;

  -- ④ منع الانضمام المكرر
  IF EXISTS (
    SELECT 1 FROM contest_entries
    WHERE contest_id = p_contest_id AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already joined this contest', 'error_code', 'ALREADY_JOINED');
  END IF;

  -- ============================================================
  -- ⑤ فروع: مجاني أم مدفوع؟
  -- ============================================================

  IF v_contest.is_free THEN
    -- الطبقة الأولى: KYC إجباري
    SELECT kyc_status INTO v_kyc_status
    FROM public.profiles
    WHERE user_id = p_user_id;

    IF v_kyc_status IS DISTINCT FROM 'verified' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'KYC verification required to join free contests',
        'error_code', 'KYC_REQUIRED'
      );
    END IF;

    -- الطبقة الثانية: عمر الحساب 7 أيام على الأقل
    SELECT created_at INTO v_account_created
    FROM auth.users
    WHERE id = p_user_id;

    IF v_account_created > now() - INTERVAL '7 days' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Account must be at least 7 days old to join free contests',
        'error_code', 'ACCOUNT_TOO_NEW'
      );
    END IF;

    -- الطبقة الثالثة: Device Fingerprint
    IF p_device_fingerprint IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM contest_entries
        WHERE contest_id       = p_contest_id
          AND device_fingerprint = p_device_fingerprint
          AND user_id          <> p_user_id
      ) THEN
        INSERT INTO public.audit_logs (action, entity_type, entity_id, performed_by, metadata)
        VALUES (
          'free_contest_device_blocked', 'contest', p_contest_id::text,
          auth.uid(), jsonb_build_object('fingerprint', p_device_fingerprint)
        );
        RETURN jsonb_build_object(
          'success', false,
          'error', 'This device has already been used to join this contest',
          'error_code', 'DEVICE_ALREADY_USED'
        );
      END IF;
    END IF;

    INSERT INTO contest_entries (contest_id, user_id, votes_received, device_fingerprint)
    VALUES (p_contest_id, p_user_id, 0, p_device_fingerprint)
    RETURNING id INTO v_entry_id;

    UPDATE contests
    SET current_participants = current_participants + 1
    WHERE id = p_contest_id;

    RETURN jsonb_build_object(
      'success',          true,
      'entry_id',         v_entry_id,
      'is_free',          true,
      'prize_pool',       v_contest.admin_prize,
      'new_participants', v_contest.current_participants + 1
    );

  ELSE
    SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Wallet not found', 'error_code', 'NO_WALLET');
    END IF;
    IF v_wallet.is_frozen THEN
      RETURN jsonb_build_object('success', false, 'error', 'Wallet is frozen', 'error_code', 'FROZEN');
    END IF;

    v_balance_before := v_wallet.nova_balance;
    IF v_balance_before < p_entry_fee THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient Nova balance', 'error_code', 'INSUFFICIENT');
    END IF;
    v_balance_after := v_balance_before - p_entry_fee;

    UPDATE wallets
    SET nova_balance = v_balance_after, updated_at = now()
    WHERE id = v_wallet.id;

    INSERT INTO contest_entries (contest_id, user_id, votes_received)
    VALUES (p_contest_id, p_user_id, 0)
    RETURNING id INTO v_entry_id;

    v_new_participants := v_contest.current_participants + 1;
    v_new_prize_pool   := v_new_participants * 6;
    UPDATE contests
    SET current_participants = v_new_participants,
        prize_pool           = v_new_prize_pool
    WHERE id = p_contest_id;

    INSERT INTO wallet_ledger (
      user_id, wallet_id, entry_type, currency,
      amount, balance_before, balance_after,
      reference_type, reference_id, description, description_ar
    ) VALUES (
      p_user_id, v_wallet.id, 'contest_entry', 'nova',
      -p_entry_fee, v_balance_before, v_balance_after,
      'contest', p_contest_id,
      'Contest entry fee', 'رسوم دخول المسابقة'
    ) RETURNING id INTO v_ledger_id;

    INSERT INTO transactions (user_id, type, currency, amount, reference_id, description, description_ar)
    VALUES (p_user_id, 'contest_entry', 'nova', -p_entry_fee, v_entry_id, 'Contest entry fee', 'رسوم دخول المسابقة');

    RETURN jsonb_build_object(
      'success',          true,
      'entry_id',         v_entry_id,
      'ledger_id',        v_ledger_id,
      'is_free',          false,
      'balance_after',    v_balance_after,
      'new_participants', v_new_participants,
      'new_prize_pool',   v_new_prize_pool
    );

  END IF;

END;
$$;

GRANT EXECUTE ON FUNCTION public.join_contest(uuid, uuid, numeric, text) TO authenticated;
