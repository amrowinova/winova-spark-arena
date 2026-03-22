DROP FUNCTION IF EXISTS public.admin_adjust_balance(uuid, uuid, text, numeric, boolean, text);

CREATE FUNCTION public.admin_adjust_balance(
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
  v_currency currency_type;
BEGIN
  PERFORM set_config('app.bypass_wallet_guard', 'true', true);

  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF auth.uid() <> p_admin_id THEN
    INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
    VALUES (
      'admin_adjust_impersonation_blocked',
      'wallet',
      p_target_user_id::text,
      auth.uid(),
      jsonb_build_object('attempted_admin_id', p_admin_id, 'actual_uid', auth.uid())
    );
    RETURN jsonb_build_object('success', false, 'error', 'Identity mismatch');
  END IF;

  IF NOT has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin role required');
  END IF;

  BEGIN
    v_currency := p_currency::currency_type;
  EXCEPTION
    WHEN others THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid currency');
  END;

  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE user_id = p_target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target wallet not found');
  END IF;

  IF v_currency = 'nova'::currency_type THEN
    v_balance_before := v_wallet.nova_balance;
  ELSE
    v_balance_before := v_wallet.aura_balance;
  END IF;

  IF p_is_credit THEN
    v_balance_after := v_balance_before + p_amount;
    v_actual_amount := p_amount;
    v_entry_type := 'admin_credit';
  ELSE
    IF v_balance_before < p_amount THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance for deduction');
    END IF;
    v_balance_after := v_balance_before - p_amount;
    v_actual_amount := -p_amount;
    v_entry_type := 'admin_debit';
  END IF;

  IF v_currency = 'nova'::currency_type THEN
    UPDATE public.wallets
    SET nova_balance = v_balance_after, updated_at = now()
    WHERE id = v_wallet.id;
  ELSE
    UPDATE public.wallets
    SET aura_balance = v_balance_after, updated_at = now()
    WHERE id = v_wallet.id;
  END IF;

  INSERT INTO public.wallet_ledger (
    user_id,
    wallet_id,
    entry_type,
    currency,
    amount,
    balance_before,
    balance_after,
    reference_type,
    counterparty_id,
    description,
    metadata
  )
  VALUES (
    p_target_user_id,
    v_wallet.id,
    v_entry_type,
    v_currency,
    v_actual_amount,
    v_balance_before,
    v_balance_after,
    'admin_action',
    p_admin_id,
    p_reason,
    jsonb_build_object('admin_id', p_admin_id, 'reason', p_reason)
  )
  RETURNING id INTO v_ledger_id;

  INSERT INTO public.transactions (user_id, type, currency, amount, reference_id, description)
  VALUES (
    p_target_user_id,
    CASE WHEN p_is_credit THEN 'deposit'::transaction_type ELSE 'withdrawal'::transaction_type END,
    v_currency,
    v_actual_amount,
    v_ledger_id,
    p_reason
  );

  INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
  VALUES (
    'admin_balance_adjust',
    'wallet',
    v_wallet.id::text,
    auth.uid(),
    jsonb_build_object(
      'admin_id', p_admin_id,
      'target_user_id', p_target_user_id,
      'currency', v_currency,
      'amount', p_amount,
      'is_credit', p_is_credit,
      'reason', p_reason,
      'balance_before', v_balance_before,
      'balance_after', v_balance_after
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'ledger_id', v_ledger_id,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after
  );
END;
$function$;