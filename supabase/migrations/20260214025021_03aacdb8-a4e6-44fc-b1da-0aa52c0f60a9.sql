
-- ============================================================
-- P2P SECURITY HARDENING PATCH
-- 1) auth.uid() enforcement on all RPCs
-- 2) Escrow reconciliation in p2p_expire_order
-- 3) Country validation in p2p_execute_order
-- ============================================================

-- ============================================================
-- 1A) p2p_confirm_payment — add auth.uid() check
-- ============================================================
CREATE OR REPLACE FUNCTION public.p2p_confirm_payment(p_order_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order p2p_orders%ROWTYPE;
  v_buyer_id UUID;
BEGIN
  -- SECURITY: Verify caller identity
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  IF auth.uid() <> p_user_id THEN
    INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
    VALUES ('confirm_payment_impersonation_blocked', 'p2p_order', p_order_id::text, auth.uid(),
      jsonb_build_object('attempted_user_id', p_user_id, 'actual_uid', auth.uid()));
    RETURN jsonb_build_object('success', false, 'error', 'Identity mismatch');
  END IF;

  -- Lock order
  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.status != 'awaiting_payment' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order is not awaiting payment');
  END IF;

  -- Determine buyer
  IF v_order.order_type = 'buy' THEN
    v_buyer_id := v_order.creator_id;
  ELSE
    v_buyer_id := v_order.executor_id;
  END IF;

  IF p_user_id != v_buyer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only buyer can confirm payment');
  END IF;

  UPDATE p2p_orders SET status = 'payment_sent', updated_at = NOW() WHERE id = p_order_id;

  INSERT INTO p2p_messages (order_id, sender_id, content, content_ar, message_type, is_system_message)
  VALUES (p_order_id, p_user_id,
    'Buyer has confirmed payment. Seller should verify and release Nova.',
    'المشتري أكد الدفع. يجب على البائع التحقق وتحرير Nova.',
    'system', true);

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'status', 'payment_sent');
END;
$function$;

-- ============================================================
-- 1B) p2p_cancel_order — add auth.uid() check
-- ============================================================
CREATE OR REPLACE FUNCTION public.p2p_cancel_order(p_order_id uuid, p_user_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order p2p_orders%ROWTYPE;
  v_seller_id UUID;
  v_seller_wallet wallets%ROWTYPE;
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
  v_locked_before NUMERIC;
  v_locked_after NUMERIC;
  v_ledger_id UUID;
  v_is_participant BOOLEAN;
BEGIN
  -- SECURITY: Verify caller identity
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  IF auth.uid() <> p_user_id THEN
    INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
    VALUES ('cancel_order_impersonation_blocked', 'p2p_order', p_order_id::text, auth.uid(),
      jsonb_build_object('attempted_user_id', p_user_id, 'actual_uid', auth.uid()));
    RETURN jsonb_build_object('success', false, 'error', 'Identity mismatch');
  END IF;

  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  v_is_participant := (v_order.creator_id = p_user_id OR v_order.executor_id = p_user_id);
  IF NOT v_is_participant THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to cancel this order');
  END IF;

  -- Determine seller
  IF v_order.order_type = 'sell' THEN
    v_seller_id := v_order.creator_id;
  ELSE
    v_seller_id := v_order.executor_id;
  END IF;

  CASE v_order.status
    WHEN 'open' THEN
      IF v_order.order_type = 'sell' THEN
        SELECT * INTO v_seller_wallet FROM wallets WHERE user_id = v_seller_id FOR UPDATE;
        v_balance_before := v_seller_wallet.nova_balance;
        v_locked_before := v_seller_wallet.locked_nova_balance;
        v_balance_after := v_balance_before + v_order.nova_amount;
        v_locked_after := v_locked_before - v_order.nova_amount;

        UPDATE wallets SET nova_balance = v_balance_after, locked_nova_balance = v_locked_after, updated_at = NOW()
        WHERE id = v_seller_wallet.id;

        INSERT INTO wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, description, description_ar, metadata)
        VALUES (v_seller_id, v_seller_wallet.id, 'p2p_escrow_release', 'nova', v_order.nova_amount, v_balance_before, v_balance_after, 'p2p_order', p_order_id,
          'Nova refunded - order cancelled', 'استرداد Nova - تم إلغاء الطلب',
          jsonb_build_object('action', 'cancel_refund', 'cancelled_by', p_user_id, 'reason', p_reason))
        RETURNING id INTO v_ledger_id;
      END IF;

      UPDATE p2p_orders SET status = 'cancelled', cancelled_by = p_user_id, cancellation_reason = p_reason, updated_at = NOW()
      WHERE id = p_order_id;

    WHEN 'awaiting_payment' THEN
      IF v_seller_id IS NOT NULL THEN
        SELECT * INTO v_seller_wallet FROM wallets WHERE user_id = v_seller_id FOR UPDATE;
        v_balance_before := v_seller_wallet.nova_balance;
        v_locked_before := v_seller_wallet.locked_nova_balance;
        v_balance_after := v_balance_before + v_order.nova_amount;
        v_locked_after := v_locked_before - v_order.nova_amount;

        UPDATE wallets SET nova_balance = v_balance_after, locked_nova_balance = v_locked_after, updated_at = NOW()
        WHERE id = v_seller_wallet.id;

        INSERT INTO wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, description, description_ar, metadata)
        VALUES (v_seller_id, v_seller_wallet.id, 'p2p_escrow_release', 'nova', v_order.nova_amount, v_balance_before, v_balance_after, 'p2p_order', p_order_id,
          'Nova refunded - order cancelled during payment', 'استرداد Nova - إلغاء أثناء الدفع',
          jsonb_build_object('action', 'cancel_refund_awaiting', 'cancelled_by', p_user_id, 'reason', p_reason))
        RETURNING id INTO v_ledger_id;
      END IF;

      UPDATE p2p_orders SET status = 'cancelled', cancelled_by = p_user_id, cancellation_reason = p_reason, updated_at = NOW()
      WHERE id = p_order_id;

    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Cannot cancel in current status: ' || v_order.status);
  END CASE;

  INSERT INTO p2p_messages (order_id, sender_id, content, content_ar, message_type, is_system_message)
  VALUES (p_order_id, p_user_id,
    'Order cancelled' || COALESCE(': ' || p_reason, ''),
    'تم إلغاء الطلب' || COALESCE(': ' || p_reason, ''),
    'system', true);

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'status', 'cancelled', 'ledger_id', v_ledger_id);
END;
$function$;

-- ============================================================
-- 1C) p2p_execute_order — add auth.uid() + country validation
-- ============================================================
CREATE OR REPLACE FUNCTION public.p2p_execute_order(p_order_id uuid, p_executor_id uuid, p_payment_method_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order p2p_orders%ROWTYPE;
  v_executor_wallet wallets%ROWTYPE;
  v_seller_id UUID;
  v_ledger_id UUID;
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
  v_locked_before NUMERIC;
  v_locked_after NUMERIC;
  v_executor_country TEXT;
BEGIN
  -- SECURITY: Verify caller identity
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  IF auth.uid() <> p_executor_id THEN
    INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
    VALUES ('execute_order_impersonation_blocked', 'p2p_order', p_order_id::text, auth.uid(),
      jsonb_build_object('attempted_executor_id', p_executor_id, 'actual_uid', auth.uid()));
    RETURN jsonb_build_object('success', false, 'error', 'Identity mismatch');
  END IF;

  -- Lock order
  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.creator_id = p_executor_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot execute your own order');
  END IF;

  IF v_order.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order is not available');
  END IF;

  -- COUNTRY VALIDATION: executor must be in same country as order
  SELECT country INTO v_executor_country FROM profiles WHERE user_id = p_executor_id;
  IF v_executor_country IS DISTINCT FROM v_order.country THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Country mismatch: order requires ' || v_order.country || ' but your profile is ' || COALESCE(v_executor_country, 'not set'));
  END IF;

  -- Check executor wallet
  SELECT * INTO v_executor_wallet FROM wallets WHERE user_id = p_executor_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Executor wallet not found');
  END IF;
  IF v_executor_wallet.is_frozen THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your wallet is frozen');
  END IF;

  -- For BUY orders: executor is seller, needs to lock Nova
  IF v_order.order_type = 'buy' THEN
    IF v_executor_wallet.nova_balance < v_order.nova_amount THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient Nova balance to sell');
    END IF;

    v_balance_before := v_executor_wallet.nova_balance;
    v_locked_before := v_executor_wallet.locked_nova_balance;
    v_balance_after := v_balance_before - v_order.nova_amount;
    v_locked_after := v_locked_before + v_order.nova_amount;

    UPDATE wallets SET nova_balance = v_balance_after, locked_nova_balance = v_locked_after, updated_at = NOW()
    WHERE id = v_executor_wallet.id;

    INSERT INTO wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, description, description_ar, metadata)
    VALUES (p_executor_id, v_executor_wallet.id, 'p2p_escrow_lock', 'nova', -v_order.nova_amount, v_balance_before, v_balance_after, 'p2p_order', p_order_id,
      'Nova locked for P2P order execution', 'حجز Nova لتنفيذ طلب P2P',
      jsonb_build_object('locked_balance_before', v_locked_before, 'locked_balance_after', v_locked_after, 'order_type', v_order.order_type, 'role', 'seller'))
    RETURNING id INTO v_ledger_id;
  END IF;

  -- Update order
  UPDATE p2p_orders
  SET executor_id = p_executor_id, status = 'awaiting_payment', matched_at = NOW(),
    payment_method_id = COALESCE(p_payment_method_id, v_order.payment_method_id), updated_at = NOW()
  WHERE id = p_order_id;

  INSERT INTO p2p_messages (order_id, sender_id, content, content_ar, message_type, is_system_message)
  VALUES (p_order_id, p_executor_id,
    'Order matched. Buyer should send payment within ' || v_order.time_limit_minutes || ' minutes.',
    'تم مطابقة الطلب. يجب على المشتري إرسال الدفع خلال ' || v_order.time_limit_minutes || ' دقيقة.',
    'system', true);

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'matched_at', NOW(), 'ledger_id', v_ledger_id);
END;
$function$;

-- ============================================================
-- 1D) p2p_open_dispute — add auth.uid() check
-- ============================================================
CREATE OR REPLACE FUNCTION public.p2p_open_dispute(p_order_id uuid, p_user_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order p2p_orders%ROWTYPE;
  v_is_participant BOOLEAN;
BEGIN
  -- SECURITY: Verify caller identity
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  IF auth.uid() <> p_user_id THEN
    INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
    VALUES ('open_dispute_impersonation_blocked', 'p2p_order', p_order_id::text, auth.uid(),
      jsonb_build_object('attempted_user_id', p_user_id, 'actual_uid', auth.uid()));
    RETURN jsonb_build_object('success', false, 'error', 'Identity mismatch');
  END IF;

  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  v_is_participant := (v_order.creator_id = p_user_id OR v_order.executor_id = p_user_id);
  IF NOT v_is_participant THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_order.status NOT IN ('payment_sent', 'awaiting_payment') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot dispute in current status');
  END IF;

  UPDATE p2p_orders SET status = 'disputed', updated_at = NOW() WHERE id = p_order_id;

  INSERT INTO p2p_messages (order_id, sender_id, content, content_ar, message_type, is_system_message)
  VALUES (p_order_id, p_user_id,
    'Dispute opened: ' || p_reason,
    'تم فتح نزاع: ' || p_reason,
    'system', true);

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'status', 'disputed');
END;
$function$;

-- ============================================================
-- 1E) p2p_resolve_dispute — add auth.uid() = p_staff_id check
-- ============================================================
CREATE OR REPLACE FUNCTION public.p2p_resolve_dispute(p_order_id uuid, p_staff_id uuid, p_resolution text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order p2p_orders%ROWTYPE;
  v_seller_id UUID;
  v_buyer_id UUID;
  v_seller_wallet wallets%ROWTYPE;
  v_buyer_wallet wallets%ROWTYPE;
  v_seller_balance_before NUMERIC;
  v_seller_balance_after NUMERIC;
  v_seller_locked_before NUMERIC;
  v_seller_locked_after NUMERIC;
  v_buyer_balance_before NUMERIC;
  v_buyer_balance_after NUMERIC;
  v_ledger_id UUID;
BEGIN
  -- SECURITY: Verify caller identity
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  IF auth.uid() <> p_staff_id THEN
    INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
    VALUES ('resolve_dispute_impersonation_blocked', 'p2p_order', p_order_id::text, auth.uid(),
      jsonb_build_object('attempted_staff_id', p_staff_id, 'actual_uid', auth.uid()));
    RETURN jsonb_build_object('success', false, 'error', 'Identity mismatch');
  END IF;

  -- Verify staff role
  IF NOT is_support_staff(p_staff_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized - Support staff only');
  END IF;

  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;
  IF v_order.status != 'disputed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order is not disputed');
  END IF;

  IF v_order.order_type = 'sell' THEN
    v_seller_id := v_order.creator_id; v_buyer_id := v_order.executor_id;
  ELSE
    v_seller_id := v_order.executor_id; v_buyer_id := v_order.creator_id;
  END IF;

  IF p_resolution = 'release_to_buyer' THEN
    SELECT * INTO v_seller_wallet FROM wallets WHERE user_id = v_seller_id FOR UPDATE;
    SELECT * INTO v_buyer_wallet FROM wallets WHERE user_id = v_buyer_id FOR UPDATE;

    v_seller_locked_before := v_seller_wallet.locked_nova_balance;
    v_seller_locked_after := v_seller_locked_before - v_order.nova_amount;
    v_buyer_balance_before := v_buyer_wallet.nova_balance;
    v_buyer_balance_after := v_buyer_balance_before + v_order.nova_amount;

    UPDATE wallets SET locked_nova_balance = v_seller_locked_after, updated_at = NOW() WHERE id = v_seller_wallet.id;
    UPDATE wallets SET nova_balance = v_buyer_balance_after, updated_at = NOW() WHERE id = v_buyer_wallet.id;
    UPDATE p2p_orders SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = p_order_id;

    INSERT INTO wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, counterparty_id, description, description_ar)
    VALUES (v_seller_id, v_seller_wallet.id, 'p2p_escrow_release', 'nova', -v_order.nova_amount, v_seller_locked_before, v_seller_locked_after, 'p2p_order', p_order_id, v_buyer_id, 'Dispute resolved - Nova released to buyer', 'حل النزاع - تحرير Nova للمشتري');

    INSERT INTO wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, counterparty_id, description, description_ar)
    VALUES (v_buyer_id, v_buyer_wallet.id, 'p2p_buy', 'nova', v_order.nova_amount, v_buyer_balance_before, v_buyer_balance_after, 'p2p_order', p_order_id, v_seller_id, 'Dispute resolved - Nova received', 'حل النزاع - استلام Nova');

  ELSIF p_resolution = 'return_to_seller' THEN
    SELECT * INTO v_seller_wallet FROM wallets WHERE user_id = v_seller_id FOR UPDATE;
    v_seller_balance_before := v_seller_wallet.nova_balance;
    v_seller_locked_before := v_seller_wallet.locked_nova_balance;
    v_seller_balance_after := v_seller_balance_before + v_order.nova_amount;
    v_seller_locked_after := v_seller_locked_before - v_order.nova_amount;

    UPDATE wallets SET nova_balance = v_seller_balance_after, locked_nova_balance = v_seller_locked_after, updated_at = NOW() WHERE id = v_seller_wallet.id;
    UPDATE p2p_orders SET status = 'cancelled', cancelled_by = p_staff_id, cancellation_reason = 'Dispute resolved in seller favor', updated_at = NOW() WHERE id = p_order_id;

    INSERT INTO wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, description, description_ar)
    VALUES (v_seller_id, v_seller_wallet.id, 'p2p_escrow_release', 'nova', v_order.nova_amount, v_seller_balance_before, v_seller_balance_after, 'p2p_order', p_order_id, 'Dispute resolved - Nova returned', 'حل النزاع - استرداد Nova');
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid resolution type');
  END IF;

  INSERT INTO p2p_messages (order_id, sender_id, content, content_ar, message_type, is_system_message)
  VALUES (p_order_id, p_staff_id,
    'Dispute resolved by support: ' || p_resolution,
    'تم حل النزاع بواسطة الدعم: ' || p_resolution,
    'system', true);

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'resolution', p_resolution);
END;
$function$;

-- ============================================================
-- 2) p2p_expire_order — FIX: unlock escrow for buy orders
-- ============================================================
CREATE OR REPLACE FUNCTION public.p2p_expire_order(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order p2p_orders%ROWTYPE;
  v_seller_id UUID;
  v_seller_wallet wallets%ROWTYPE;
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
  v_locked_before NUMERIC;
  v_locked_after NUMERIC;
BEGIN
  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Allow service-role (auth.uid() IS NULL) or participants
  IF auth.uid() IS NOT NULL
     AND auth.uid() <> v_order.creator_id
     AND (v_order.executor_id IS NULL OR auth.uid() <> v_order.executor_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a participant');
  END IF;

  -- CASE 1: awaiting_payment → revert to open + UNLOCK ESCROW for buy orders
  IF v_order.status = 'awaiting_payment' THEN

    -- For BUY orders the executor locked Nova as seller; unlock it
    IF v_order.order_type = 'buy' AND v_order.executor_id IS NOT NULL THEN
      v_seller_id := v_order.executor_id;

      SELECT * INTO v_seller_wallet FROM wallets WHERE user_id = v_seller_id FOR UPDATE;

      IF FOUND THEN
        v_balance_before := v_seller_wallet.nova_balance;
        v_locked_before := v_seller_wallet.locked_nova_balance;
        v_balance_after := v_balance_before + v_order.nova_amount;
        v_locked_after := v_locked_before - v_order.nova_amount;

        UPDATE wallets
        SET nova_balance = v_balance_after,
            locked_nova_balance = v_locked_after,
            updated_at = NOW()
        WHERE id = v_seller_wallet.id;

        INSERT INTO wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, description, description_ar, metadata)
        VALUES (v_seller_id, v_seller_wallet.id, 'p2p_escrow_release', 'nova', v_order.nova_amount, v_balance_before, v_balance_after, 'p2p_order', p_order_id,
          'Nova unlocked - order expired (buyer did not pay)', 'تم فك حجز Nova - انتهى الطلب (المشتري لم يدفع)',
          jsonb_build_object('action', 'expire_escrow_unlock', 'order_type', 'buy', 'executor_was_seller', true));
      END IF;
    END IF;

    -- Note: For SELL orders, Nova stays locked with the creator since the order returns to market
    -- The creator's escrow remains until order is cancelled or completed

    UPDATE p2p_orders
    SET status = 'open', executor_id = NULL, matched_at = NULL, updated_at = NOW()
    WHERE id = p_order_id;

    INSERT INTO p2p_messages (order_id, sender_id, content, content_ar, is_system_message, message_type)
    VALUES (p_order_id, v_order.creator_id,
      '⏰ Time expired – Order has been returned to the marketplace',
      '⏰ انتهى الوقت – تم إعادة الطلب إلى السوق',
      true, 'order_expired');

    RETURN jsonb_build_object('success', true, 'action', 'returned_to_market', 'escrow_unlocked', (v_order.order_type = 'buy'));
  END IF;

  -- CASE 2: payment_sent → auto-dispute (escrow stays locked for support resolution)
  IF v_order.status = 'payment_sent' THEN
    UPDATE p2p_orders
    SET status = 'disputed', cancellation_reason = 'Timer expired during payment confirmation', updated_at = NOW()
    WHERE id = p_order_id;

    INSERT INTO p2p_messages (order_id, sender_id, content, content_ar, is_system_message, message_type)
    VALUES (p_order_id, v_order.creator_id,
      '⚖️ Dispute opened: Timer expired during payment confirmation',
      '⚖️ تم فتح نزاع: انتهى الوقت أثناء تأكيد الدفع',
      true, 'dispute_opened');

    RETURN jsonb_build_object('success', true, 'action', 'auto_disputed');
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'Order not eligible for expiration (status: ' || v_order.status || ')');
END;
$function$;

-- ============================================================
-- 3) Auto-cancel stale unmatched buy orders (>72h)
--    Buy orders don't lock escrow, so safe to cancel directly
-- ============================================================
CREATE OR REPLACE FUNCTION public.p2p_cleanup_stale_orders()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count INT := 0;
  v_order RECORD;
BEGIN
  -- Cancel unmatched buy orders older than 72 hours
  FOR v_order IN
    SELECT id, creator_id FROM p2p_orders
    WHERE status = 'open'
      AND order_type = 'buy'
      AND matched_at IS NULL
      AND created_at < NOW() - INTERVAL '72 hours'
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE p2p_orders
    SET status = 'cancelled',
        cancellation_reason = 'Auto-cancelled: no match within 72 hours',
        updated_at = NOW()
    WHERE id = v_order.id;

    INSERT INTO p2p_messages (order_id, sender_id, content, content_ar, is_system_message, message_type)
    VALUES (v_order.id, v_order.creator_id,
      '🕐 Order auto-cancelled: No match found within 72 hours',
      '🕐 تم إلغاء الطلب تلقائياً: لم يتم العثور على مطابقة خلال 72 ساعة',
      true, 'order_expired');

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'cancelled_count', v_count);
END;
$function$;
