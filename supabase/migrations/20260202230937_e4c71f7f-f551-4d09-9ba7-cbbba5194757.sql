-- =====================================================
-- P2P ESCROW SYSTEM - COMPLETE ATOMIC IMPLEMENTATION
-- =====================================================

-- 1. Add new ledger entry type for refund if not exists
-- (p2p_escrow_lock, p2p_escrow_release, p2p_buy, p2p_sell already exist)

-- =====================================================
-- 2. CREATE SELL ORDER WITH ESCROW LOCK
-- =====================================================
CREATE OR REPLACE FUNCTION public.p2p_create_sell_order(
  p_creator_id UUID,
  p_nova_amount NUMERIC,
  p_local_amount NUMERIC,
  p_exchange_rate NUMERIC,
  p_country TEXT,
  p_time_limit_minutes INTEGER DEFAULT 15,
  p_payment_method_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_order_id UUID;
  v_ledger_id UUID;
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
  v_locked_before NUMERIC;
  v_locked_after NUMERIC;
BEGIN
  -- Validate amount
  IF p_nova_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  -- Lock wallet to prevent race conditions
  SELECT * INTO v_wallet
  FROM wallets
  WHERE user_id = p_creator_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  -- Check if wallet is frozen
  IF v_wallet.is_frozen THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet is frozen');
  END IF;

  -- Check sufficient balance
  IF v_wallet.nova_balance < p_nova_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient Nova balance');
  END IF;

  -- Record balances before
  v_balance_before := v_wallet.nova_balance;
  v_locked_before := v_wallet.locked_nova_balance;

  -- Calculate new balances
  v_balance_after := v_balance_before - p_nova_amount;
  v_locked_after := v_locked_before + p_nova_amount;

  -- Update wallet: move from nova_balance to locked_nova_balance
  UPDATE wallets
  SET 
    nova_balance = v_balance_after,
    locked_nova_balance = v_locked_after,
    updated_at = NOW()
  WHERE id = v_wallet.id;

  -- Create the order
  INSERT INTO p2p_orders (
    creator_id,
    order_type,
    nova_amount,
    local_amount,
    exchange_rate,
    country,
    time_limit_minutes,
    payment_method_id,
    status
  ) VALUES (
    p_creator_id,
    'sell',
    p_nova_amount,
    p_local_amount,
    p_exchange_rate,
    p_country,
    p_time_limit_minutes,
    p_payment_method_id,
    'open'
  ) RETURNING id INTO v_order_id;

  -- Create ledger entry for escrow lock
  INSERT INTO wallet_ledger (
    user_id,
    wallet_id,
    entry_type,
    currency,
    amount,
    balance_before,
    balance_after,
    reference_type,
    reference_id,
    description,
    description_ar,
    metadata
  ) VALUES (
    p_creator_id,
    v_wallet.id,
    'p2p_escrow_lock',
    'nova',
    -p_nova_amount,
    v_balance_before,
    v_balance_after,
    'p2p_order',
    v_order_id,
    'Nova locked for P2P sell order',
    'حجز Nova لطلب بيع P2P',
    jsonb_build_object(
      'locked_balance_before', v_locked_before,
      'locked_balance_after', v_locked_after,
      'order_type', 'sell'
    )
  ) RETURNING id INTO v_ledger_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'ledger_id', v_ledger_id,
    'nova_balance', v_balance_after,
    'locked_balance', v_locked_after
  );
END;
$$;

-- =====================================================
-- 3. CREATE BUY ORDER (No escrow needed for buyer)
-- =====================================================
CREATE OR REPLACE FUNCTION public.p2p_create_buy_order(
  p_creator_id UUID,
  p_nova_amount NUMERIC,
  p_local_amount NUMERIC,
  p_exchange_rate NUMERIC,
  p_country TEXT,
  p_time_limit_minutes INTEGER DEFAULT 15,
  p_payment_method_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_order_id UUID;
BEGIN
  -- Validate amount
  IF p_nova_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  -- Verify wallet exists and is not frozen
  SELECT * INTO v_wallet
  FROM wallets
  WHERE user_id = p_creator_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF v_wallet.is_frozen THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet is frozen');
  END IF;

  -- Create the buy order (no escrow lock for buyer)
  INSERT INTO p2p_orders (
    creator_id,
    order_type,
    nova_amount,
    local_amount,
    exchange_rate,
    country,
    time_limit_minutes,
    payment_method_id,
    status
  ) VALUES (
    p_creator_id,
    'buy',
    p_nova_amount,
    p_local_amount,
    p_exchange_rate,
    p_country,
    p_time_limit_minutes,
    p_payment_method_id,
    'open'
  ) RETURNING id INTO v_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id
  );
END;
$$;

-- =====================================================
-- 4. EXECUTE ORDER (Match buyer/seller)
-- =====================================================
CREATE OR REPLACE FUNCTION public.p2p_execute_order(
  p_order_id UUID,
  p_executor_id UUID,
  p_payment_method_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order p2p_orders%ROWTYPE;
  v_executor_wallet wallets%ROWTYPE;
  v_seller_id UUID;
  v_ledger_id UUID;
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
  v_locked_before NUMERIC;
  v_locked_after NUMERIC;
BEGIN
  -- Lock order for update
  SELECT * INTO v_order
  FROM p2p_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Cannot execute own order
  IF v_order.creator_id = p_executor_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot execute your own order');
  END IF;

  -- Order must be open
  IF v_order.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order is not available');
  END IF;

  -- Check executor wallet
  SELECT * INTO v_executor_wallet
  FROM wallets
  WHERE user_id = p_executor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Executor wallet not found');
  END IF;

  IF v_executor_wallet.is_frozen THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your wallet is frozen');
  END IF;

  -- For BUY orders: executor is seller, needs to lock Nova
  IF v_order.order_type = 'buy' THEN
    -- Check seller (executor) has enough balance
    IF v_executor_wallet.nova_balance < v_order.nova_amount THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient Nova balance to sell');
    END IF;

    v_balance_before := v_executor_wallet.nova_balance;
    v_locked_before := v_executor_wallet.locked_nova_balance;
    v_balance_after := v_balance_before - v_order.nova_amount;
    v_locked_after := v_locked_before + v_order.nova_amount;

    -- Lock seller's Nova
    UPDATE wallets
    SET 
      nova_balance = v_balance_after,
      locked_nova_balance = v_locked_after,
      updated_at = NOW()
    WHERE id = v_executor_wallet.id;

    -- Create ledger entry for escrow lock
    INSERT INTO wallet_ledger (
      user_id,
      wallet_id,
      entry_type,
      currency,
      amount,
      balance_before,
      balance_after,
      reference_type,
      reference_id,
      description,
      description_ar,
      metadata
    ) VALUES (
      p_executor_id,
      v_executor_wallet.id,
      'p2p_escrow_lock',
      'nova',
      -v_order.nova_amount,
      v_balance_before,
      v_balance_after,
      'p2p_order',
      p_order_id,
      'Nova locked for P2P order execution',
      'حجز Nova لتنفيذ طلب P2P',
      jsonb_build_object(
        'locked_balance_before', v_locked_before,
        'locked_balance_after', v_locked_after,
        'order_type', v_order.order_type,
        'role', 'seller'
      )
    ) RETURNING id INTO v_ledger_id;
  END IF;

  -- Update order status
  UPDATE p2p_orders
  SET 
    executor_id = p_executor_id,
    status = 'awaiting_payment',
    matched_at = NOW(),
    payment_method_id = COALESCE(p_payment_method_id, v_order.payment_method_id),
    updated_at = NOW()
  WHERE id = p_order_id;

  -- Insert system message
  INSERT INTO p2p_messages (
    order_id,
    sender_id,
    content,
    content_ar,
    message_type,
    is_system_message
  ) VALUES (
    p_order_id,
    p_executor_id,
    'Order matched. Buyer should send payment within ' || v_order.time_limit_minutes || ' minutes.',
    'تم مطابقة الطلب. يجب على المشتري إرسال الدفع خلال ' || v_order.time_limit_minutes || ' دقيقة.',
    'system',
    true
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'matched_at', NOW(),
    'ledger_id', v_ledger_id
  );
END;
$$;

-- =====================================================
-- 5. CONFIRM PAYMENT (Buyer marks as paid)
-- =====================================================
CREATE OR REPLACE FUNCTION public.p2p_confirm_payment(
  p_order_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order p2p_orders%ROWTYPE;
  v_buyer_id UUID;
BEGIN
  -- Lock order
  SELECT * INTO v_order
  FROM p2p_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Must be awaiting_payment
  IF v_order.status != 'awaiting_payment' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order is not awaiting payment');
  END IF;

  -- Determine buyer
  IF v_order.order_type = 'buy' THEN
    v_buyer_id := v_order.creator_id;
  ELSE
    v_buyer_id := v_order.executor_id;
  END IF;

  -- Only buyer can confirm payment
  IF p_user_id != v_buyer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only buyer can confirm payment');
  END IF;

  -- Update status
  UPDATE p2p_orders
  SET 
    status = 'payment_sent',
    updated_at = NOW()
  WHERE id = p_order_id;

  -- Insert system message
  INSERT INTO p2p_messages (
    order_id,
    sender_id,
    content,
    content_ar,
    message_type,
    is_system_message
  ) VALUES (
    p_order_id,
    p_user_id,
    'Buyer has confirmed payment. Seller should verify and release Nova.',
    'المشتري أكد الدفع. يجب على البائع التحقق وتحرير Nova.',
    'system',
    true
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', 'payment_sent'
  );
END;
$$;

-- =====================================================
-- 6. RELEASE ESCROW (Transfer Nova to buyer)
-- =====================================================
CREATE OR REPLACE FUNCTION public.p2p_release_escrow(
  p_order_id UUID,
  p_user_id UUID
)
RETURNS JSONB
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
  -- Lock order
  SELECT * INTO v_order
  FROM p2p_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Must be payment_sent
  IF v_order.status != 'payment_sent' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order is not ready for release');
  END IF;

  -- Determine seller and buyer
  IF v_order.order_type = 'sell' THEN
    v_seller_id := v_order.creator_id;
    v_buyer_id := v_order.executor_id;
  ELSE
    v_seller_id := v_order.executor_id;
    v_buyer_id := v_order.creator_id;
  END IF;

  -- Only seller can release
  IF p_user_id != v_seller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only seller can release escrow');
  END IF;

  -- Lock seller wallet
  SELECT * INTO v_seller_wallet
  FROM wallets
  WHERE user_id = v_seller_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Seller wallet not found');
  END IF;

  -- Verify locked balance
  IF v_seller_wallet.locked_nova_balance < v_order.nova_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient locked balance');
  END IF;

  -- Lock buyer wallet
  SELECT * INTO v_buyer_wallet
  FROM wallets
  WHERE user_id = v_buyer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Buyer wallet not found');
  END IF;

  -- Record balances
  v_seller_locked_before := v_seller_wallet.locked_nova_balance;
  v_seller_locked_after := v_seller_locked_before - v_order.nova_amount;
  v_buyer_balance_before := v_buyer_wallet.nova_balance;
  v_buyer_balance_after := v_buyer_balance_before + v_order.nova_amount;

  -- Deduct from seller's locked balance
  UPDATE wallets
  SET 
    locked_nova_balance = v_seller_locked_after,
    updated_at = NOW()
  WHERE id = v_seller_wallet.id;

  -- Add to buyer's balance
  UPDATE wallets
  SET 
    nova_balance = v_buyer_balance_after,
    updated_at = NOW()
  WHERE id = v_buyer_wallet.id;

  -- Update order status
  UPDATE p2p_orders
  SET 
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_order_id;

  -- Create ledger entry for seller (escrow release)
  INSERT INTO wallet_ledger (
    user_id,
    wallet_id,
    entry_type,
    currency,
    amount,
    balance_before,
    balance_after,
    reference_type,
    reference_id,
    counterparty_id,
    description,
    description_ar,
    metadata
  ) VALUES (
    v_seller_id,
    v_seller_wallet.id,
    'p2p_escrow_release',
    'nova',
    -v_order.nova_amount,
    v_seller_locked_before,
    v_seller_locked_after,
    'p2p_order',
    p_order_id,
    v_buyer_id,
    'Nova released to buyer',
    'تم تحرير Nova للمشتري',
    jsonb_build_object(
      'is_locked_balance', true,
      'buyer_id', v_buyer_id
    )
  ) RETURNING id INTO v_seller_ledger_id;

  -- Create ledger entry for buyer (p2p_buy)
  INSERT INTO wallet_ledger (
    user_id,
    wallet_id,
    entry_type,
    currency,
    amount,
    balance_before,
    balance_after,
    reference_type,
    reference_id,
    counterparty_id,
    description,
    description_ar,
    metadata
  ) VALUES (
    v_buyer_id,
    v_buyer_wallet.id,
    'p2p_buy',
    'nova',
    v_order.nova_amount,
    v_buyer_balance_before,
    v_buyer_balance_after,
    'p2p_order',
    p_order_id,
    v_seller_id,
    'Nova received from P2P purchase',
    'تم استلام Nova من شراء P2P',
    jsonb_build_object(
      'seller_id', v_seller_id,
      'local_amount', v_order.local_amount,
      'exchange_rate', v_order.exchange_rate
    )
  ) RETURNING id INTO v_buyer_ledger_id;

  -- Insert system message
  INSERT INTO p2p_messages (
    order_id,
    sender_id,
    content,
    content_ar,
    message_type,
    is_system_message
  ) VALUES (
    p_order_id,
    v_seller_id,
    'Nova has been released. Transaction completed successfully!',
    'تم تحرير Nova. اكتملت المعاملة بنجاح!',
    'system',
    true
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'seller_ledger_id', v_seller_ledger_id,
    'buyer_ledger_id', v_buyer_ledger_id,
    'buyer_new_balance', v_buyer_balance_after
  );
END;
$$;

-- =====================================================
-- 7. CANCEL ORDER (With escrow refund)
-- =====================================================
CREATE OR REPLACE FUNCTION public.p2p_cancel_order(
  p_order_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  -- Lock order
  SELECT * INTO v_order
  FROM p2p_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Check if user is participant
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

  -- Handle based on status
  CASE v_order.status
    WHEN 'open' THEN
      -- For sell orders, refund locked Nova to seller
      IF v_order.order_type = 'sell' THEN
        SELECT * INTO v_seller_wallet
        FROM wallets
        WHERE user_id = v_seller_id
        FOR UPDATE;

        v_balance_before := v_seller_wallet.nova_balance;
        v_locked_before := v_seller_wallet.locked_nova_balance;
        v_balance_after := v_balance_before + v_order.nova_amount;
        v_locked_after := v_locked_before - v_order.nova_amount;

        UPDATE wallets
        SET 
          nova_balance = v_balance_after,
          locked_nova_balance = v_locked_after,
          updated_at = NOW()
        WHERE id = v_seller_wallet.id;

        -- Create ledger entry
        INSERT INTO wallet_ledger (
          user_id,
          wallet_id,
          entry_type,
          currency,
          amount,
          balance_before,
          balance_after,
          reference_type,
          reference_id,
          description,
          description_ar,
          metadata
        ) VALUES (
          v_seller_id,
          v_seller_wallet.id,
          'p2p_escrow_release',
          'nova',
          v_order.nova_amount,
          v_balance_before,
          v_balance_after,
          'p2p_order',
          p_order_id,
          'Nova refunded - order cancelled',
          'استرداد Nova - تم إلغاء الطلب',
          jsonb_build_object(
            'action', 'cancel_refund',
            'cancelled_by', p_user_id,
            'reason', p_reason
          )
        ) RETURNING id INTO v_ledger_id;
      END IF;

      -- Update order
      UPDATE p2p_orders
      SET 
        status = 'cancelled',
        cancelled_by = p_user_id,
        cancellation_reason = p_reason,
        updated_at = NOW()
      WHERE id = p_order_id;

    WHEN 'awaiting_payment' THEN
      -- Refund locked Nova to seller
      IF v_seller_id IS NOT NULL THEN
        SELECT * INTO v_seller_wallet
        FROM wallets
        WHERE user_id = v_seller_id
        FOR UPDATE;

        v_balance_before := v_seller_wallet.nova_balance;
        v_locked_before := v_seller_wallet.locked_nova_balance;
        v_balance_after := v_balance_before + v_order.nova_amount;
        v_locked_after := v_locked_before - v_order.nova_amount;

        UPDATE wallets
        SET 
          nova_balance = v_balance_after,
          locked_nova_balance = v_locked_after,
          updated_at = NOW()
        WHERE id = v_seller_wallet.id;

        -- Create ledger entry
        INSERT INTO wallet_ledger (
          user_id,
          wallet_id,
          entry_type,
          currency,
          amount,
          balance_before,
          balance_after,
          reference_type,
          reference_id,
          description,
          description_ar,
          metadata
        ) VALUES (
          v_seller_id,
          v_seller_wallet.id,
          'p2p_escrow_release',
          'nova',
          v_order.nova_amount,
          v_balance_before,
          v_balance_after,
          'p2p_order',
          p_order_id,
          'Nova refunded - order cancelled before payment',
          'استرداد Nova - إلغاء قبل الدفع',
          jsonb_build_object(
            'action', 'cancel_refund',
            'cancelled_by', p_user_id,
            'reason', p_reason
          )
        ) RETURNING id INTO v_ledger_id;
      END IF;

      -- Update order to open (relist) or cancelled
      UPDATE p2p_orders
      SET 
        status = 'cancelled',
        cancelled_by = p_user_id,
        cancellation_reason = p_reason,
        executor_id = NULL,
        matched_at = NULL,
        updated_at = NOW()
      WHERE id = p_order_id;

    WHEN 'payment_sent' THEN
      -- Cannot cancel after payment - must dispute
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Cannot cancel after payment confirmation. Please open a dispute.'
      );

    WHEN 'disputed' THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Order is under dispute. Wait for support resolution.'
      );

    ELSE
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Order cannot be cancelled in current status'
      );
  END CASE;

  -- Insert system message
  INSERT INTO p2p_messages (
    order_id,
    sender_id,
    content,
    content_ar,
    message_type,
    is_system_message
  ) VALUES (
    p_order_id,
    p_user_id,
    'Order has been cancelled.' || COALESCE(' Reason: ' || p_reason, ''),
    'تم إلغاء الطلب.' || COALESCE(' السبب: ' || p_reason, ''),
    'system',
    true
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', 'cancelled',
    'ledger_id', v_ledger_id,
    'nova_refunded', v_order.nova_amount
  );
END;
$$;

-- =====================================================
-- 8. OPEN DISPUTE
-- =====================================================
CREATE OR REPLACE FUNCTION public.p2p_open_dispute(
  p_order_id UUID,
  p_user_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order p2p_orders%ROWTYPE;
  v_is_participant BOOLEAN;
BEGIN
  -- Lock order
  SELECT * INTO v_order
  FROM p2p_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Check if user is participant
  v_is_participant := (v_order.creator_id = p_user_id OR v_order.executor_id = p_user_id);
  
  IF NOT v_is_participant THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Can only dispute after payment_sent
  IF v_order.status NOT IN ('payment_sent', 'awaiting_payment') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot dispute in current status');
  END IF;

  -- Update to disputed
  UPDATE p2p_orders
  SET 
    status = 'disputed',
    updated_at = NOW()
  WHERE id = p_order_id;

  -- Insert system message
  INSERT INTO p2p_messages (
    order_id,
    sender_id,
    content,
    content_ar,
    message_type,
    is_system_message
  ) VALUES (
    p_order_id,
    p_user_id,
    'Dispute opened: ' || p_reason,
    'تم فتح نزاع: ' || p_reason,
    'system',
    true
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', 'disputed'
  );
END;
$$;

-- =====================================================
-- 9. RESOLVE DISPUTE (Support only)
-- =====================================================
CREATE OR REPLACE FUNCTION public.p2p_resolve_dispute(
  p_order_id UUID,
  p_staff_id UUID,
  p_resolution TEXT -- 'release_to_buyer' or 'return_to_seller'
)
RETURNS JSONB
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
  v_seller_balance_before NUMERIC;
  v_seller_balance_after NUMERIC;
  v_seller_locked_before NUMERIC;
  v_seller_locked_after NUMERIC;
  v_buyer_balance_before NUMERIC;
  v_buyer_balance_after NUMERIC;
  v_ledger_id UUID;
BEGIN
  -- Verify staff role
  IF NOT is_support_staff(p_staff_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized - Support staff only');
  END IF;

  -- Lock order
  SELECT * INTO v_order
  FROM p2p_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.status != 'disputed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order is not disputed');
  END IF;

  -- Determine seller and buyer
  IF v_order.order_type = 'sell' THEN
    v_seller_id := v_order.creator_id;
    v_buyer_id := v_order.executor_id;
  ELSE
    v_seller_id := v_order.executor_id;
    v_buyer_id := v_order.creator_id;
  END IF;

  IF p_resolution = 'release_to_buyer' THEN
    -- Release Nova to buyer
    SELECT * INTO v_seller_wallet FROM wallets WHERE user_id = v_seller_id FOR UPDATE;
    SELECT * INTO v_buyer_wallet FROM wallets WHERE user_id = v_buyer_id FOR UPDATE;

    v_seller_locked_before := v_seller_wallet.locked_nova_balance;
    v_seller_locked_after := v_seller_locked_before - v_order.nova_amount;
    v_buyer_balance_before := v_buyer_wallet.nova_balance;
    v_buyer_balance_after := v_buyer_balance_before + v_order.nova_amount;

    UPDATE wallets SET locked_nova_balance = v_seller_locked_after, updated_at = NOW()
    WHERE id = v_seller_wallet.id;

    UPDATE wallets SET nova_balance = v_buyer_balance_after, updated_at = NOW()
    WHERE id = v_buyer_wallet.id;

    UPDATE p2p_orders SET status = 'completed', completed_at = NOW(), updated_at = NOW()
    WHERE id = p_order_id;

    -- Ledger entries
    INSERT INTO wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, counterparty_id, description, description_ar)
    VALUES (v_seller_id, v_seller_wallet.id, 'p2p_escrow_release', 'nova', -v_order.nova_amount, v_seller_locked_before, v_seller_locked_after, 'p2p_order', p_order_id, v_buyer_id, 'Dispute resolved - Nova released to buyer', 'حل النزاع - تحرير Nova للمشتري');

    INSERT INTO wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, counterparty_id, description, description_ar)
    VALUES (v_buyer_id, v_buyer_wallet.id, 'p2p_buy', 'nova', v_order.nova_amount, v_buyer_balance_before, v_buyer_balance_after, 'p2p_order', p_order_id, v_seller_id, 'Dispute resolved - Nova received', 'حل النزاع - استلام Nova');

  ELSIF p_resolution = 'return_to_seller' THEN
    -- Return Nova to seller
    SELECT * INTO v_seller_wallet FROM wallets WHERE user_id = v_seller_id FOR UPDATE;

    v_seller_balance_before := v_seller_wallet.nova_balance;
    v_seller_locked_before := v_seller_wallet.locked_nova_balance;
    v_seller_balance_after := v_seller_balance_before + v_order.nova_amount;
    v_seller_locked_after := v_seller_locked_before - v_order.nova_amount;

    UPDATE wallets 
    SET nova_balance = v_seller_balance_after, locked_nova_balance = v_seller_locked_after, updated_at = NOW()
    WHERE id = v_seller_wallet.id;

    UPDATE p2p_orders SET status = 'cancelled', cancelled_by = p_staff_id, cancellation_reason = 'Dispute resolved in seller favor', updated_at = NOW()
    WHERE id = p_order_id;

    -- Ledger entry
    INSERT INTO wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, description, description_ar)
    VALUES (v_seller_id, v_seller_wallet.id, 'p2p_escrow_release', 'nova', v_order.nova_amount, v_seller_balance_before, v_seller_balance_after, 'p2p_order', p_order_id, 'Dispute resolved - Nova returned', 'حل النزاع - استرداد Nova');

  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid resolution type');
  END IF;

  -- System message
  INSERT INTO p2p_messages (order_id, sender_id, content, content_ar, message_type, is_system_message)
  VALUES (p_order_id, p_staff_id, 'Dispute resolved by support: ' || p_resolution, 'تم حل النزاع بواسطة الدعم: ' || p_resolution, 'system', true);

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'resolution', p_resolution
  );
END;
$$;

-- =====================================================
-- 10. DELETE OPEN ORDER (Creator only, refund escrow)
-- =====================================================
CREATE OR REPLACE FUNCTION public.p2p_delete_order(
  p_order_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order p2p_orders%ROWTYPE;
  v_wallet wallets%ROWTYPE;
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
  v_locked_before NUMERIC;
  v_locked_after NUMERIC;
BEGIN
  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.creator_id != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only creator can delete order');
  END IF;

  IF v_order.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only delete open orders');
  END IF;

  -- Refund escrow for sell orders
  IF v_order.order_type = 'sell' THEN
    SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;

    v_balance_before := v_wallet.nova_balance;
    v_locked_before := v_wallet.locked_nova_balance;
    v_balance_after := v_balance_before + v_order.nova_amount;
    v_locked_after := v_locked_before - v_order.nova_amount;

    UPDATE wallets SET nova_balance = v_balance_after, locked_nova_balance = v_locked_after, updated_at = NOW()
    WHERE id = v_wallet.id;

    INSERT INTO wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, description, description_ar)
    VALUES (p_user_id, v_wallet.id, 'p2p_escrow_release', 'nova', v_order.nova_amount, v_balance_before, v_balance_after, 'p2p_order', p_order_id, 'Order deleted - escrow refunded', 'حذف الطلب - استرداد الحجز');
  END IF;

  -- Delete the order
  DELETE FROM p2p_orders WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted', true,
    'nova_refunded', CASE WHEN v_order.order_type = 'sell' THEN v_order.nova_amount ELSE 0 END
  );
END;
$$;

-- =====================================================
-- 11. RELIST ORDER (Return to marketplace)
-- =====================================================
CREATE OR REPLACE FUNCTION public.p2p_relist_order(
  p_order_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order p2p_orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.status != 'awaiting_payment' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only relist awaiting_payment orders');
  END IF;

  IF v_order.creator_id != p_user_id AND v_order.executor_id != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Reset to open
  UPDATE p2p_orders
  SET 
    status = 'open',
    executor_id = NULL,
    matched_at = NULL,
    cancellation_reason = p_reason,
    cancelled_by = p_user_id,
    updated_at = NOW()
  WHERE id = p_order_id;

  -- Note: Escrow remains locked for sell orders - no refund on relist

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', 'open'
  );
END;
$$;

-- =====================================================
-- 12. REMOVE USER UPDATE POLICY ON WALLETS (Security)
-- =====================================================
DROP POLICY IF EXISTS "Users can update their own wallet" ON wallets;

-- Only allow RPC-based updates through security definer functions
-- No direct user updates allowed