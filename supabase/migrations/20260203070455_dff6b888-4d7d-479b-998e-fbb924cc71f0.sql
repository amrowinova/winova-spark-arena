-- Update atomic transfer RPC to:
-- 1) avoid deadlocks via deterministic wallet locking order
-- 2) enforce optional daily limit (if app_settings key exists)
-- 3) detect duplicate requests (if reference_id is provided)
-- 4) return structured, user-visible error codes/messages
-- 5) log success/failure into audit_logs (admin-visible)

CREATE OR REPLACE FUNCTION public.execute_transfer(
  p_sender_id uuid,
  p_recipient_id uuid,
  p_amount numeric,
  p_currency public.currency_type DEFAULT 'nova'::public.currency_type,
  p_reference_type text DEFAULT 'transfer'::text,
  p_reference_id uuid DEFAULT NULL::uuid,
  p_description text DEFAULT NULL::text,
  p_description_ar text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sender_wallet public.wallets%ROWTYPE;
  v_recipient_wallet public.wallets%ROWTYPE;

  v_wallet_low public.wallets%ROWTYPE;
  v_wallet_high public.wallets%ROWTYPE;
  v_low_id uuid;
  v_high_id uuid;

  v_sender_balance_before numeric;
  v_sender_balance_after numeric;
  v_recipient_balance_before numeric;
  v_recipient_balance_after numeric;

  v_sender_ledger_id uuid;
  v_recipient_ledger_id uuid;

  v_daily_limit numeric;
  v_daily_used numeric;

  v_sqlstate text;
BEGIN
  -- CRITICAL: Verify caller is the sender (prevent impersonation)
  IF auth.uid() IS NULL THEN
    INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
    VALUES ('transfer_failed', 'wallet_transfer', NULL, coalesce(auth.uid(), p_sender_id),
      jsonb_build_object('sender_id', p_sender_id, 'recipient_id', p_recipient_id, 'amount', p_amount, 'currency', p_currency,
                         'error_code', 'AUTH_REQUIRED', 'error', 'Authentication required', 'reference_type', p_reference_type, 'reference_id', p_reference_id));
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required', 'error_code', 'AUTH_REQUIRED');
  END IF;

  IF auth.uid() <> p_sender_id THEN
    INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
    VALUES ('transfer_failed', 'wallet_transfer', NULL, auth.uid(),
      jsonb_build_object('sender_id', p_sender_id, 'recipient_id', p_recipient_id, 'amount', p_amount, 'currency', p_currency,
                         'error_code', 'UNAUTHORIZED', 'error', 'You can only transfer from your own wallet', 'reference_type', p_reference_type, 'reference_id', p_reference_id));
    RETURN jsonb_build_object('success', false, 'error', 'You can only transfer from your own wallet', 'error_code', 'UNAUTHORIZED');
  END IF;

  -- Validate amount (exact numeric, no rounding)
  IF p_amount IS NULL OR p_amount <= 0 THEN
    INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
    VALUES ('transfer_failed', 'wallet_transfer', NULL, auth.uid(),
      jsonb_build_object('sender_id', p_sender_id, 'recipient_id', p_recipient_id, 'amount', p_amount, 'currency', p_currency,
                         'error_code', 'INVALID_AMOUNT', 'error', 'Amount must be positive', 'reference_type', p_reference_type, 'reference_id', p_reference_id));
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive', 'error_code', 'INVALID_AMOUNT');
  END IF;

  -- Prevent self-transfer
  IF p_sender_id = p_recipient_id THEN
    INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
    VALUES ('transfer_failed', 'wallet_transfer', NULL, auth.uid(),
      jsonb_build_object('sender_id', p_sender_id, 'recipient_id', p_recipient_id, 'amount', p_amount, 'currency', p_currency,
                         'error_code', 'SELF_TRANSFER', 'error', 'Cannot transfer to yourself', 'reference_type', p_reference_type, 'reference_id', p_reference_id));
    RETURN jsonb_build_object('success', false, 'error', 'Cannot transfer to yourself', 'error_code', 'SELF_TRANSFER');
  END IF;

  -- Duplicate request detection (only if caller provides reference_id)
  IF p_reference_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.wallet_ledger wl
      WHERE wl.user_id = p_sender_id
        AND wl.entry_type = 'transfer_out'::public.ledger_entry_type
        AND wl.reference_type = p_reference_type
        AND wl.reference_id = p_reference_id
      LIMIT 1
    ) THEN
      INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
      VALUES ('transfer_failed', 'wallet_transfer', NULL, auth.uid(),
        jsonb_build_object('sender_id', p_sender_id, 'recipient_id', p_recipient_id, 'amount', p_amount, 'currency', p_currency,
                           'error_code', 'DUPLICATE_REQUEST', 'error', 'Duplicate request', 'reference_type', p_reference_type, 'reference_id', p_reference_id));
      RETURN jsonb_build_object('success', false, 'error', 'Duplicate request', 'error_code', 'DUPLICATE_REQUEST');
    END IF;
  END IF;

  -- Optional daily transfer limit (configured via app_settings)
  -- If key doesn't exist or value is null, transfers are unlimited.
  SELECT NULLIF(public.app_settings.value::text, 'null')::numeric
  INTO v_daily_limit
  FROM public.app_settings
  WHERE key = 'transfer_daily_limit_nova'
  LIMIT 1;

  IF v_daily_limit IS NOT NULL THEN
    SELECT COALESCE(SUM(ABS(wl.amount)), 0)
    INTO v_daily_used
    FROM public.wallet_ledger wl
    WHERE wl.user_id = p_sender_id
      AND wl.entry_type = 'transfer_out'::public.ledger_entry_type
      AND wl.currency = p_currency
      AND wl.created_at >= date_trunc('day', now())
      AND wl.created_at < date_trunc('day', now()) + interval '1 day';

    IF (v_daily_used + p_amount) > v_daily_limit THEN
      INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
      VALUES ('transfer_failed', 'wallet_transfer', NULL, auth.uid(),
        jsonb_build_object('sender_id', p_sender_id, 'recipient_id', p_recipient_id, 'amount', p_amount, 'currency', p_currency,
                           'error_code', 'DAILY_LIMIT_EXCEEDED',
                           'error', format('Daily transfer limit exceeded. limit=%s used=%s requested=%s', v_daily_limit, v_daily_used, p_amount),
                           'daily_limit', v_daily_limit, 'daily_used', v_daily_used,
                           'reference_type', p_reference_type, 'reference_id', p_reference_id));
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Daily transfer limit exceeded. limit=%s used=%s requested=%s', v_daily_limit, v_daily_used, p_amount),
        'error_code', 'DAILY_LIMIT_EXCEEDED',
        'daily_limit', v_daily_limit,
        'daily_used', v_daily_used
      );
    END IF;
  END IF;

  -- Deadlock-safe locking: lock both wallets in a deterministic order
  v_low_id := LEAST(p_sender_id, p_recipient_id);
  v_high_id := GREATEST(p_sender_id, p_recipient_id);

  SELECT * INTO v_wallet_low
  FROM public.wallets
  WHERE user_id = v_low_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
    VALUES ('transfer_failed', 'wallet_transfer', NULL, auth.uid(),
      jsonb_build_object('sender_id', p_sender_id, 'recipient_id', p_recipient_id, 'amount', p_amount, 'currency', p_currency,
                         'error_code', CASE WHEN v_low_id = p_sender_id THEN 'SENDER_NOT_FOUND' ELSE 'RECIPIENT_NOT_FOUND' END,
                         'error', 'Wallet not found', 'missing_user_id', v_low_id,
                         'reference_type', p_reference_type, 'reference_id', p_reference_id));
    RETURN jsonb_build_object(
      'success', false,
      'error', CASE WHEN v_low_id = p_sender_id THEN 'Sender wallet not found' ELSE 'Recipient wallet not found' END,
      'error_code', CASE WHEN v_low_id = p_sender_id THEN 'SENDER_NOT_FOUND' ELSE 'RECIPIENT_NOT_FOUND' END
    );
  END IF;

  SELECT * INTO v_wallet_high
  FROM public.wallets
  WHERE user_id = v_high_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
    VALUES ('transfer_failed', 'wallet_transfer', NULL, auth.uid(),
      jsonb_build_object('sender_id', p_sender_id, 'recipient_id', p_recipient_id, 'amount', p_amount, 'currency', p_currency,
                         'error_code', CASE WHEN v_high_id = p_sender_id THEN 'SENDER_NOT_FOUND' ELSE 'RECIPIENT_NOT_FOUND' END,
                         'error', 'Wallet not found', 'missing_user_id', v_high_id,
                         'reference_type', p_reference_type, 'reference_id', p_reference_id));
    RETURN jsonb_build_object(
      'success', false,
      'error', CASE WHEN v_high_id = p_sender_id THEN 'Sender wallet not found' ELSE 'Recipient wallet not found' END,
      'error_code', CASE WHEN v_high_id = p_sender_id THEN 'SENDER_NOT_FOUND' ELSE 'RECIPIENT_NOT_FOUND' END
    );
  END IF;

  -- Assign locked rows to sender/recipient
  IF v_wallet_low.user_id = p_sender_id THEN
    v_sender_wallet := v_wallet_low;
    v_recipient_wallet := v_wallet_high;
  ELSE
    v_sender_wallet := v_wallet_high;
    v_recipient_wallet := v_wallet_low;
  END IF;

  -- Check frozen wallets
  IF v_sender_wallet.is_frozen THEN
    INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
    VALUES ('transfer_failed', 'wallet_transfer', NULL, auth.uid(),
      jsonb_build_object('sender_id', p_sender_id, 'recipient_id', p_recipient_id, 'amount', p_amount, 'currency', p_currency,
                         'error_code', 'SENDER_FROZEN', 'error', 'Your wallet is frozen',
                         'reference_type', p_reference_type, 'reference_id', p_reference_id));
    RETURN jsonb_build_object('success', false, 'error', 'Your wallet is frozen', 'error_code', 'SENDER_FROZEN');
  END IF;

  IF v_recipient_wallet.is_frozen THEN
    INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
    VALUES ('transfer_failed', 'wallet_transfer', NULL, auth.uid(),
      jsonb_build_object('sender_id', p_sender_id, 'recipient_id', p_recipient_id, 'amount', p_amount, 'currency', p_currency,
                         'error_code', 'RECIPIENT_FROZEN', 'error', 'Recipient wallet is frozen',
                         'reference_type', p_reference_type, 'reference_id', p_reference_id));
    RETURN jsonb_build_object('success', false, 'error', 'Recipient wallet is frozen', 'error_code', 'RECIPIENT_FROZEN');
  END IF;

  -- Get current balances based on currency
  IF p_currency = 'nova' THEN
    v_sender_balance_before := v_sender_wallet.nova_balance;
    v_recipient_balance_before := v_recipient_wallet.nova_balance;
  ELSE
    v_sender_balance_before := v_sender_wallet.aura_balance;
    v_recipient_balance_before := v_recipient_wallet.aura_balance;
  END IF;

  -- Check sufficient balance
  IF v_sender_balance_before < p_amount THEN
    INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
    VALUES ('transfer_failed', 'wallet_transfer', NULL, auth.uid(),
      jsonb_build_object('sender_id', p_sender_id, 'recipient_id', p_recipient_id, 'amount', p_amount, 'currency', p_currency,
                         'error_code', 'INSUFFICIENT_BALANCE', 'error', 'Insufficient balance',
                         'available_balance', v_sender_balance_before, 'requested_amount', p_amount,
                         'reference_type', p_reference_type, 'reference_id', p_reference_id));
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient balance',
      'error_code', 'INSUFFICIENT_BALANCE',
      'available_balance', v_sender_balance_before,
      'requested_amount', p_amount
    );
  END IF;

  -- Calculate new balances (exact arithmetic)
  v_sender_balance_after := v_sender_balance_before - p_amount;
  v_recipient_balance_after := v_recipient_balance_before + p_amount;

  -- Update sender wallet
  IF p_currency = 'nova' THEN
    UPDATE public.wallets SET nova_balance = v_sender_balance_after, updated_at = now()
    WHERE id = v_sender_wallet.id;
  ELSE
    UPDATE public.wallets SET aura_balance = v_sender_balance_after, updated_at = now()
    WHERE id = v_sender_wallet.id;
  END IF;

  -- Update recipient wallet
  IF p_currency = 'nova' THEN
    UPDATE public.wallets SET nova_balance = v_recipient_balance_after, updated_at = now()
    WHERE id = v_recipient_wallet.id;
  ELSE
    UPDATE public.wallets SET aura_balance = v_recipient_balance_after, updated_at = now()
    WHERE id = v_recipient_wallet.id;
  END IF;

  -- Create ledger entry for sender (debit)
  INSERT INTO public.wallet_ledger (
    user_id, wallet_id, entry_type, currency, amount,
    balance_before, balance_after, reference_type, reference_id,
    counterparty_id, description, description_ar
  ) VALUES (
    p_sender_id, v_sender_wallet.id, 'transfer_out', p_currency, -p_amount,
    v_sender_balance_before, v_sender_balance_after, p_reference_type, p_reference_id,
    p_recipient_id, p_description, p_description_ar
  ) RETURNING id INTO v_sender_ledger_id;

  -- Create ledger entry for recipient (credit)
  INSERT INTO public.wallet_ledger (
    user_id, wallet_id, entry_type, currency, amount,
    balance_before, balance_after, reference_type, reference_id,
    counterparty_id, description, description_ar
  ) VALUES (
    p_recipient_id, v_recipient_wallet.id, 'transfer_in', p_currency, p_amount,
    v_recipient_balance_before, v_recipient_balance_after, p_reference_type, p_reference_id,
    p_sender_id, p_description, p_description_ar
  ) RETURNING id INTO v_recipient_ledger_id;

  -- Also insert into transactions table for backward compatibility
  INSERT INTO public.transactions (user_id, type, currency, amount, reference_id, description, description_ar)
  VALUES 
    (p_sender_id, 'transfer', p_currency, -p_amount, v_sender_ledger_id, p_description, p_description_ar),
    (p_recipient_id, 'transfer', p_currency, p_amount, v_recipient_ledger_id, p_description, p_description_ar);

  -- Audit success
  INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
  VALUES (
    'transfer_success',
    'wallet_transfer',
    v_sender_ledger_id,
    auth.uid(),
    jsonb_build_object(
      'sender_id', p_sender_id,
      'recipient_id', p_recipient_id,
      'amount', p_amount,
      'currency', p_currency,
      'reference_type', p_reference_type,
      'reference_id', p_reference_id,
      'sender_ledger_id', v_sender_ledger_id,
      'recipient_ledger_id', v_recipient_ledger_id,
      'sender_balance_before', v_sender_balance_before,
      'sender_balance_after', v_sender_balance_after,
      'recipient_balance_before', v_recipient_balance_before,
      'recipient_balance_after', v_recipient_balance_after
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'sender_ledger_id', v_sender_ledger_id,
    'recipient_ledger_id', v_recipient_ledger_id,
    'sender_balance_after', v_sender_balance_after,
    'recipient_balance_after', v_recipient_balance_after
  );

EXCEPTION
  WHEN deadlock_detected THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
    VALUES ('transfer_failed', 'wallet_transfer', NULL, auth.uid(),
      jsonb_build_object('sender_id', p_sender_id, 'recipient_id', p_recipient_id, 'amount', p_amount, 'currency', p_currency,
                         'error_code', 'DEADLOCK', 'error', SQLERRM, 'sqlstate', v_sqlstate,
                         'reference_type', p_reference_type, 'reference_id', p_reference_id));
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'error_code', 'DEADLOCK', 'sqlstate', v_sqlstate);

  WHEN lock_not_available THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
    VALUES ('transfer_failed', 'wallet_transfer', NULL, auth.uid(),
      jsonb_build_object('sender_id', p_sender_id, 'recipient_id', p_recipient_id, 'amount', p_amount, 'currency', p_currency,
                         'error_code', 'LOCK_NOT_AVAILABLE', 'error', SQLERRM, 'sqlstate', v_sqlstate,
                         'reference_type', p_reference_type, 'reference_id', p_reference_id));
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'error_code', 'LOCK_NOT_AVAILABLE', 'sqlstate', v_sqlstate);

  WHEN serialization_failure THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
    VALUES ('transfer_failed', 'wallet_transfer', NULL, auth.uid(),
      jsonb_build_object('sender_id', p_sender_id, 'recipient_id', p_recipient_id, 'amount', p_amount, 'currency', p_currency,
                         'error_code', 'SERIALIZATION_FAILURE', 'error', SQLERRM, 'sqlstate', v_sqlstate,
                         'reference_type', p_reference_type, 'reference_id', p_reference_id));
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'error_code', 'SERIALIZATION_FAILURE', 'sqlstate', v_sqlstate);

  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
    VALUES ('transfer_failed', 'wallet_transfer', NULL, auth.uid(),
      jsonb_build_object('sender_id', p_sender_id, 'recipient_id', p_recipient_id, 'amount', p_amount, 'currency', p_currency,
                         'error_code', 'UNEXPECTED_ERROR', 'error', SQLERRM, 'sqlstate', v_sqlstate,
                         'reference_type', p_reference_type, 'reference_id', p_reference_id));
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'error_code', 'UNEXPECTED_ERROR', 'sqlstate', v_sqlstate);
END;
$$;

-- Ensure authenticated users can call the RPC
GRANT EXECUTE ON FUNCTION public.execute_transfer(uuid, uuid, numeric, public.currency_type, text, uuid, text, text) TO authenticated;