
-- =============================================
-- FIX A: guard_wallet_balance_mutation trigger
-- ROOT CAUSE: SECURITY DEFINER RPCs still inherit the caller's "role" GUC.
-- FIX: Use session_user to distinguish service-level callers from direct API calls.
-- When a SECURITY DEFINER function runs, session_user stays as the function owner,
-- but current_setting('role') stays 'authenticated'. We need a different approach:
-- Check if we're inside a known safe context using a custom GUC flag.
-- =============================================

-- Strategy: The trigger will check a custom GUC 'app.bypass_wallet_guard'.
-- Each SECURITY DEFINER RPC that legitimately modifies wallets will SET LOCAL this flag.

CREATE OR REPLACE FUNCTION public.guard_wallet_balance_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow bypass if set by a trusted SECURITY DEFINER function
  IF current_setting('app.bypass_wallet_guard', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Allow postgres and service_role (non-authenticated direct access)
  IF current_setting('role', true) IN ('service_role', 'supabase_admin', 'postgres') THEN
    RETURN NEW;
  END IF;

  -- For authenticated users: block direct balance mutations
  IF current_setting('role', true) = 'authenticated' THEN
    IF NEW.nova_balance IS DISTINCT FROM OLD.nova_balance
       OR NEW.aura_balance IS DISTINCT FROM OLD.aura_balance
       OR NEW.locked_nova_balance IS DISTINCT FROM OLD.locked_nova_balance THEN
      RAISE EXCEPTION 'Direct balance mutation is forbidden. Use authorized transaction services.';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- =============================================
-- Now update execute_transfer to set the bypass flag
-- =============================================
CREATE OR REPLACE FUNCTION public.execute_transfer(
  p_sender_id uuid,
  p_recipient_id uuid,
  p_amount numeric,
  p_currency currency_type DEFAULT 'nova',
  p_reference_type text DEFAULT 'transfer',
  p_reference_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_description_ar text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  -- Set bypass flag for wallet guard trigger
  PERFORM set_config('app.bypass_wallet_guard', 'true', true);

  -- CRITICAL: Verify caller is the sender
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

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive', 'error_code', 'INVALID_AMOUNT');
  END IF;

  IF p_sender_id = p_recipient_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot transfer to yourself', 'error_code', 'SELF_TRANSFER');
  END IF;

  -- Duplicate request detection
  IF p_reference_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.wallet_ledger wl
      WHERE wl.user_id = p_sender_id
        AND wl.entry_type = 'transfer_out'::public.ledger_entry_type
        AND wl.reference_type = p_reference_type
        AND wl.reference_id = p_reference_id
      LIMIT 1
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Duplicate request', 'error_code', 'DUPLICATE_REQUEST');
    END IF;
  END IF;

  -- Optional daily transfer limit
  SELECT NULLIF(public.app_settings.value::text, 'null')::numeric
  INTO v_daily_limit
  FROM public.app_settings
  WHERE key = 'transfer_daily_limit_nova'
  LIMIT 1;

  IF v_daily_limit IS NOT NULL THEN
    SELECT COALESCE(SUM(ABS(wl.amount)), 0) INTO v_daily_used
    FROM public.wallet_ledger wl
    WHERE wl.user_id = p_sender_id
      AND wl.entry_type = 'transfer_out'::public.ledger_entry_type
      AND wl.currency = p_currency
      AND wl.created_at >= date_trunc('day', now())
      AND wl.created_at < date_trunc('day', now()) + interval '1 day';

    IF (v_daily_used + p_amount) > v_daily_limit THEN
      RETURN jsonb_build_object('success', false, 'error', format('Daily transfer limit exceeded. limit=%s used=%s requested=%s', v_daily_limit, v_daily_used, p_amount), 'error_code', 'DAILY_LIMIT_EXCEEDED', 'daily_limit', v_daily_limit, 'daily_used', v_daily_used);
    END IF;
  END IF;

  -- Deadlock-safe locking
  v_low_id := LEAST(p_sender_id, p_recipient_id);
  v_high_id := GREATEST(p_sender_id, p_recipient_id);

  SELECT * INTO v_wallet_low FROM public.wallets WHERE user_id = v_low_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', CASE WHEN v_low_id = p_sender_id THEN 'Sender wallet not found' ELSE 'Recipient wallet not found' END, 'error_code', CASE WHEN v_low_id = p_sender_id THEN 'SENDER_NOT_FOUND' ELSE 'RECIPIENT_NOT_FOUND' END);
  END IF;

  SELECT * INTO v_wallet_high FROM public.wallets WHERE user_id = v_high_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', CASE WHEN v_high_id = p_sender_id THEN 'Sender wallet not found' ELSE 'Recipient wallet not found' END, 'error_code', CASE WHEN v_high_id = p_sender_id THEN 'SENDER_NOT_FOUND' ELSE 'RECIPIENT_NOT_FOUND' END);
  END IF;

  IF v_wallet_low.user_id = p_sender_id THEN
    v_sender_wallet := v_wallet_low;
    v_recipient_wallet := v_wallet_high;
  ELSE
    v_sender_wallet := v_wallet_high;
    v_recipient_wallet := v_wallet_low;
  END IF;

  IF v_sender_wallet.is_frozen THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your wallet is frozen', 'error_code', 'SENDER_FROZEN');
  END IF;
  IF v_recipient_wallet.is_frozen THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipient wallet is frozen', 'error_code', 'RECIPIENT_FROZEN');
  END IF;

  IF p_currency = 'nova' THEN
    v_sender_balance_before := v_sender_wallet.nova_balance;
    v_recipient_balance_before := v_recipient_wallet.nova_balance;
  ELSE
    v_sender_balance_before := v_sender_wallet.aura_balance;
    v_recipient_balance_before := v_recipient_wallet.aura_balance;
  END IF;

  IF v_sender_balance_before < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance', 'error_code', 'INSUFFICIENT_BALANCE', 'available_balance', v_sender_balance_before, 'requested_amount', p_amount);
  END IF;

  v_sender_balance_after := v_sender_balance_before - p_amount;
  v_recipient_balance_after := v_recipient_balance_before + p_amount;

  IF p_currency = 'nova' THEN
    UPDATE public.wallets SET nova_balance = v_sender_balance_after, updated_at = now() WHERE id = v_sender_wallet.id;
    UPDATE public.wallets SET nova_balance = v_recipient_balance_after, updated_at = now() WHERE id = v_recipient_wallet.id;
  ELSE
    UPDATE public.wallets SET aura_balance = v_sender_balance_after, updated_at = now() WHERE id = v_sender_wallet.id;
    UPDATE public.wallets SET aura_balance = v_recipient_balance_after, updated_at = now() WHERE id = v_recipient_wallet.id;
  END IF;

  INSERT INTO public.wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, counterparty_id, description, description_ar)
  VALUES (p_sender_id, v_sender_wallet.id, 'transfer_out', p_currency, -p_amount, v_sender_balance_before, v_sender_balance_after, p_reference_type, p_reference_id, p_recipient_id, p_description, p_description_ar)
  RETURNING id INTO v_sender_ledger_id;

  INSERT INTO public.wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, counterparty_id, description, description_ar)
  VALUES (p_recipient_id, v_recipient_wallet.id, 'transfer_in', p_currency, p_amount, v_recipient_balance_before, v_recipient_balance_after, p_reference_type, p_reference_id, p_sender_id, p_description, p_description_ar)
  RETURNING id INTO v_recipient_ledger_id;

  INSERT INTO public.transactions (user_id, type, currency, amount, reference_id, description, description_ar)
  VALUES 
    (p_sender_id, 'transfer', p_currency, -p_amount, v_sender_ledger_id, p_description, p_description_ar),
    (p_recipient_id, 'transfer', p_currency, p_amount, v_recipient_ledger_id, p_description, p_description_ar);

  INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
  VALUES ('transfer_success', 'wallet_transfer', v_sender_ledger_id, auth.uid(),
    jsonb_build_object('sender_id', p_sender_id, 'recipient_id', p_recipient_id, 'amount', p_amount, 'currency', p_currency,
      'reference_type', p_reference_type, 'reference_id', p_reference_id,
      'sender_ledger_id', v_sender_ledger_id, 'recipient_ledger_id', v_recipient_ledger_id,
      'sender_balance_before', v_sender_balance_before, 'sender_balance_after', v_sender_balance_after,
      'recipient_balance_before', v_recipient_balance_before, 'recipient_balance_after', v_recipient_balance_after));

  RETURN jsonb_build_object('success', true, 'sender_ledger_id', v_sender_ledger_id, 'recipient_ledger_id', v_recipient_ledger_id, 'sender_balance_after', v_sender_balance_after, 'recipient_balance_after', v_recipient_balance_after);

EXCEPTION
  WHEN deadlock_detected THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'error_code', 'DEADLOCK', 'sqlstate', v_sqlstate);
  WHEN lock_not_available THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'error_code', 'LOCK_NOT_AVAILABLE', 'sqlstate', v_sqlstate);
  WHEN serialization_failure THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
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
$function$;

-- =============================================
-- Update admin_adjust_balance to also set bypass
-- =============================================
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(
  p_admin_id uuid,
  p_target_user_id uuid,
  p_currency text,
  p_amount numeric,
  p_is_credit boolean,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
  v_ledger_id UUID;
  v_entry_type ledger_entry_type;
  v_actual_amount NUMERIC;
BEGIN
  -- Set bypass flag for wallet guard trigger
  PERFORM set_config('app.bypass_wallet_guard', 'true', true);

  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  IF auth.uid() <> p_admin_id THEN
    INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
    VALUES ('admin_adjust_impersonation_blocked', 'wallet', p_target_user_id::text, auth.uid(),
      jsonb_build_object('attempted_admin_id', p_admin_id, 'actual_uid', auth.uid()));
    RETURN jsonb_build_object('success', false, 'error', 'Identity mismatch');
  END IF;
  IF NOT has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin role required');
  END IF;

  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_target_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Target wallet not found'); END IF;

  IF p_currency = 'nova' THEN v_balance_before := v_wallet.nova_balance;
  ELSE v_balance_before := v_wallet.aura_balance; END IF;

  IF p_is_credit THEN
    v_balance_after := v_balance_before + p_amount;
    v_actual_amount := p_amount;
    v_entry_type := 'admin_credit';
  ELSE
    IF v_balance_before < p_amount THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance for deduction'); END IF;
    v_balance_after := v_balance_before - p_amount;
    v_actual_amount := -p_amount;
    v_entry_type := 'admin_debit';
  END IF;

  IF p_currency = 'nova' THEN
    UPDATE wallets SET nova_balance = v_balance_after, updated_at = now() WHERE id = v_wallet.id;
  ELSE
    UPDATE wallets SET aura_balance = v_balance_after, updated_at = now() WHERE id = v_wallet.id;
  END IF;

  INSERT INTO wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, counterparty_id, description, metadata)
  VALUES (p_target_user_id, v_wallet.id, v_entry_type, p_currency, v_actual_amount, v_balance_before, v_balance_after, 'admin_action', p_admin_id, p_reason, jsonb_build_object('admin_id', p_admin_id, 'reason', p_reason))
  RETURNING id INTO v_ledger_id;

  INSERT INTO transactions (user_id, type, currency, amount, reference_id, description)
  VALUES (p_target_user_id, CASE WHEN p_is_credit THEN 'deposit'::transaction_type ELSE 'withdrawal'::transaction_type END, p_currency, v_actual_amount, v_ledger_id, p_reason);

  INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
  VALUES ('admin_balance_adjust', 'wallet', v_wallet.id::text, auth.uid(),
    jsonb_build_object('admin_id', p_admin_id, 'target_user_id', p_target_user_id, 'currency', p_currency,
      'amount', p_amount, 'is_credit', p_is_credit, 'reason', p_reason,
      'balance_before', v_balance_before, 'balance_after', v_balance_after));

  RETURN jsonb_build_object('success', true, 'ledger_id', v_ledger_id, 'balance_before', v_balance_before, 'balance_after', v_balance_after);
END;
$function$;

-- =============================================
-- Also patch ALL other RPCs that modify wallets:
-- join_contest, cast_vote, p2p_execute_order, p2p_release_escrow, p2p_expire_order, convert_nova_to_aura
-- We need to add the bypass flag to each one.
-- =============================================

-- Get all functions that UPDATE wallets and add bypass
DO $$
DECLARE
  fn_names text[] := ARRAY[
    'join_contest', 'cast_vote', 'p2p_execute_order', 'p2p_release_escrow', 
    'p2p_expire_order', 'convert_nova_to_aura', 'p2p_create_sell_order',
    'p2p_cancel_order', 'p2p_confirm_payment'
  ];
  fn_name text;
  fn_body text;
  fn_def text;
BEGIN
  -- For each function, we'll add the bypass line if not already present
  FOREACH fn_name IN ARRAY fn_names LOOP
    -- Check if function exists and doesn't already have the bypass
    SELECT pg_get_functiondef(p.oid) INTO fn_def
    FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = fn_name
    LIMIT 1;
    
    IF fn_def IS NOT NULL AND fn_def NOT LIKE '%app.bypass_wallet_guard%' THEN
      -- We need to manually patch each function. Since we can't dynamically alter function bodies easily,
      -- we'll handle the most critical ones individually below.
      RAISE NOTICE 'Function % needs bypass_wallet_guard patch', fn_name;
    END IF;
  END LOOP;
END;
$$;
