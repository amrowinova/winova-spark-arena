
-- ============================================================
-- SECURITY HARDENING: Fix RPCs with auth.uid() binding
-- ============================================================

-- FIX #2: Drop and recreate join_contest
DROP FUNCTION IF EXISTS public.join_contest(UUID, UUID, NUMERIC);

CREATE FUNCTION public.join_contest(
  p_contest_id UUID,
  p_user_id UUID,
  p_entry_fee NUMERIC
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_wallet wallets%rowtype;
  v_contest contests%rowtype;
  v_balance_before numeric;
  v_balance_after numeric;
  v_entry_id uuid;
  v_ledger_id uuid;
  v_new_prize_pool numeric;
  v_new_participants integer;
  v_ksa_now timestamp;
  v_ksa_today date;
  v_join_open timestamp;
  v_join_close timestamp;
begin
  -- SECURITY: Verify caller is the user
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required', 'error_code', 'AUTH_REQUIRED');
  END IF;

  IF auth.uid() <> p_user_id THEN
    INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
    VALUES ('contest_join_impersonation_blocked', 'contest', p_contest_id::text, auth.uid(),
      jsonb_build_object('attempted_user_id', p_user_id, 'actual_uid', auth.uid()));
    RETURN jsonb_build_object('success', false, 'error', 'You can only join contests as yourself', 'error_code', 'UNAUTHORIZED');
  END IF;

  v_ksa_now := timezone('Asia/Riyadh', now());
  v_ksa_today := (v_ksa_now)::date;
  v_join_open := date_trunc('day', v_ksa_now) + interval '10 hours';
  v_join_close := date_trunc('day', v_ksa_now) + interval '20 hours';

  if v_ksa_now < v_join_open or v_ksa_now >= v_join_close then
    return jsonb_build_object('success', false, 'error', 'Joining is closed');
  end if;

  select * into v_contest from contests where id = p_contest_id for update;
  if not found then return jsonb_build_object('success', false, 'error', 'Contest not found'); end if;
  if v_contest.contest_date <> v_ksa_today then return jsonb_build_object('success', false, 'error', 'No contest for today'); end if;
  if v_contest.max_participants is not null and v_contest.current_participants >= v_contest.max_participants then
    return jsonb_build_object('success', false, 'error', 'Contest is full');
  end if;
  if exists (select 1 from contest_entries where contest_id = p_contest_id and user_id = p_user_id) then
    return jsonb_build_object('success', false, 'error', 'Already joined this contest');
  end if;

  select * into v_wallet from wallets where user_id = p_user_id for update;
  if not found then return jsonb_build_object('success', false, 'error', 'Wallet not found'); end if;
  if v_wallet.is_frozen then return jsonb_build_object('success', false, 'error', 'Wallet is frozen'); end if;

  v_balance_before := v_wallet.nova_balance;
  if v_balance_before < p_entry_fee then
    return jsonb_build_object('success', false, 'error', 'Insufficient Nova balance');
  end if;
  v_balance_after := v_balance_before - p_entry_fee;

  update wallets set nova_balance = v_balance_after, updated_at = now() where id = v_wallet.id;

  insert into contest_entries (contest_id, user_id, votes_received)
  values (p_contest_id, p_user_id, 0) returning id into v_entry_id;

  v_new_participants := v_contest.current_participants + 1;
  v_new_prize_pool := v_new_participants * 6;
  update contests set current_participants = v_new_participants, prize_pool = v_new_prize_pool where id = p_contest_id;

  insert into wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, description, description_ar)
  values (p_user_id, v_wallet.id, 'contest_entry', 'nova', -p_entry_fee, v_balance_before, v_balance_after, 'contest', p_contest_id, 'Contest entry fee', 'رسوم دخول المسابقة')
  returning id into v_ledger_id;

  insert into transactions (user_id, type, currency, amount, reference_id, description, description_ar)
  values (p_user_id, 'contest_entry', 'nova', -p_entry_fee, v_entry_id, 'Contest entry fee', 'رسوم دخول المسابقة');

  return jsonb_build_object('success', true, 'entry_id', v_entry_id, 'ledger_id', v_ledger_id, 'balance_after', v_balance_after, 'new_participants', v_new_participants, 'new_prize_pool', v_new_prize_pool);
end;
$$;

-- FIX #3: Drop and recreate p2p_release_escrow
DROP FUNCTION IF EXISTS public.p2p_release_escrow(UUID, UUID);

CREATE FUNCTION public.p2p_release_escrow(
  p_order_id UUID,
  p_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order p2p_orders%ROWTYPE;
  v_seller_id UUID;
  v_buyer_id UUID;
  v_seller_wallet wallets%ROWTYPE;
  v_buyer_wallet wallets%ROWTYPE;
  v_seller_locked_before NUMERIC;
  v_seller_locked_after NUMERIC;
  v_buyer_balance_before NUMERIC;
  v_buyer_balance_after NUMERIC;
  v_seller_ledger_id UUID;
  v_buyer_ledger_id UUID;
BEGIN
  -- SECURITY: Verify caller identity
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required', 'error_code', 'AUTH_REQUIRED');
  END IF;

  IF auth.uid() <> p_user_id THEN
    INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
    VALUES ('escrow_release_impersonation_blocked', 'p2p_order', p_order_id::text, auth.uid(),
      jsonb_build_object('attempted_user_id', p_user_id, 'actual_uid', auth.uid()));
    RETURN jsonb_build_object('success', false, 'error', 'Identity mismatch', 'error_code', 'UNAUTHORIZED');
  END IF;

  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;
  IF v_order.status != 'payment_sent' THEN RETURN jsonb_build_object('success', false, 'error', 'Order is not ready for release'); END IF;

  IF v_order.order_type = 'sell' THEN v_seller_id := v_order.creator_id; v_buyer_id := v_order.executor_id;
  ELSE v_seller_id := v_order.executor_id; v_buyer_id := v_order.creator_id; END IF;

  IF auth.uid() != v_seller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only seller can release escrow');
  END IF;

  SELECT * INTO v_seller_wallet FROM wallets WHERE user_id = v_seller_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Seller wallet not found'); END IF;
  IF v_seller_wallet.locked_nova_balance < v_order.nova_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient locked balance');
  END IF;

  SELECT * INTO v_buyer_wallet FROM wallets WHERE user_id = v_buyer_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Buyer wallet not found'); END IF;

  v_seller_locked_before := v_seller_wallet.locked_nova_balance;
  v_seller_locked_after := v_seller_locked_before - v_order.nova_amount;
  v_buyer_balance_before := v_buyer_wallet.nova_balance;
  v_buyer_balance_after := v_buyer_balance_before + v_order.nova_amount;

  UPDATE wallets SET locked_nova_balance = v_seller_locked_after, updated_at = NOW() WHERE id = v_seller_wallet.id;
  UPDATE wallets SET nova_balance = v_buyer_balance_after, updated_at = NOW() WHERE id = v_buyer_wallet.id;
  UPDATE p2p_orders SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = p_order_id;

  INSERT INTO wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, counterparty_id, description, description_ar, metadata)
  VALUES (v_seller_id, v_seller_wallet.id, 'p2p_escrow_release', 'nova', -v_order.nova_amount, v_seller_locked_before, v_seller_locked_after, 'p2p_order', p_order_id, v_buyer_id, 'Nova released to buyer', 'تم تحرير Nova للمشتري', jsonb_build_object('is_locked_balance', true, 'buyer_id', v_buyer_id))
  RETURNING id INTO v_seller_ledger_id;

  INSERT INTO wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, counterparty_id, description, description_ar, metadata)
  VALUES (v_buyer_id, v_buyer_wallet.id, 'p2p_buy', 'nova', v_order.nova_amount, v_buyer_balance_before, v_buyer_balance_after, 'p2p_order', p_order_id, v_seller_id, 'Nova received from P2P purchase', 'تم استلام Nova من شراء P2P', jsonb_build_object('seller_id', v_seller_id, 'local_amount', v_order.local_amount, 'exchange_rate', v_order.exchange_rate))
  RETURNING id INTO v_buyer_ledger_id;

  INSERT INTO p2p_messages (order_id, sender_id, content, content_ar, message_type, is_system_message)
  VALUES (p_order_id, v_seller_id, 'Nova has been released. Transaction completed successfully!', 'تم تحرير Nova. اكتملت المعاملة بنجاح!', 'system', true);

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'seller_ledger_id', v_seller_ledger_id, 'buyer_ledger_id', v_buyer_ledger_id, 'buyer_new_balance', v_buyer_balance_after);
END;
$$;

-- FIX #8: Drop and recreate admin_adjust_balance with auth.uid() binding
DROP FUNCTION IF EXISTS public.admin_adjust_balance(UUID, UUID, TEXT, NUMERIC, BOOLEAN, TEXT);

CREATE FUNCTION public.admin_adjust_balance(
  p_admin_id UUID,
  p_target_user_id UUID,
  p_currency TEXT,
  p_amount NUMERIC,
  p_is_credit BOOLEAN,
  p_reason TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
  v_ledger_id UUID;
  v_entry_type ledger_entry_type;
  v_actual_amount NUMERIC;
BEGIN
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

  RETURN jsonb_build_object('success', true, 'ledger_id', v_ledger_id, 'balance_before', v_balance_before, 'balance_after', v_balance_after);
END;
$$;
