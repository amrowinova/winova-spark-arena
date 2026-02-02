-- =============================================
-- P2P RATINGS SYSTEM - Production Ready
-- =============================================

-- 1. Create p2p_ratings table
CREATE TABLE public.p2p_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.p2p_orders(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL,
  rated_id UUID NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating IN (1, -1)),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_rating_per_order_user UNIQUE(order_id, rater_id),
  CONSTRAINT no_self_rating CHECK (rater_id != rated_id)
);

-- 2. Enable RLS
ALTER TABLE public.p2p_ratings ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Users can view all ratings"
ON public.p2p_ratings FOR SELECT
USING (true);

CREATE POLICY "Users can rate in their completed orders"
ON public.p2p_ratings FOR INSERT
WITH CHECK (
  auth.uid() = rater_id
  AND EXISTS (
    SELECT 1 FROM p2p_orders o
    WHERE o.id = order_id
    AND o.status = 'completed'
    AND (o.creator_id = auth.uid() OR o.executor_id = auth.uid())
  )
);

-- 4. Create reputation view
CREATE OR REPLACE VIEW public.p2p_user_reputation AS
SELECT 
  u.user_id,
  COUNT(DISTINCT o.id) AS total_trades,
  COALESCE(SUM(CASE WHEN r.rating = 1 THEN 1 ELSE 0 END), 0) AS positive_ratings,
  COALESCE(SUM(CASE WHEN r.rating = -1 THEN 1 ELSE 0 END), 0) AS negative_ratings,
  CASE 
    WHEN COUNT(r.id) = 0 THEN 100
    ELSE ROUND((SUM(CASE WHEN r.rating = 1 THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(r.id), 0)) * 100, 1)
  END AS reputation_score
FROM profiles u
LEFT JOIN p2p_orders o ON (o.creator_id = u.user_id OR o.executor_id = u.user_id) AND o.status = 'completed'
LEFT JOIN p2p_ratings r ON r.rated_id = u.user_id
GROUP BY u.user_id;

-- 5. RPC to submit rating
CREATE OR REPLACE FUNCTION public.p2p_submit_rating(
  p_order_id UUID,
  p_rated_id UUID,
  p_rating SMALLINT,
  p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order p2p_orders%ROWTYPE;
  v_rating_id UUID;
BEGIN
  -- Validate rating value
  IF p_rating NOT IN (1, -1) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rating must be 1 (positive) or -1 (negative)');
  END IF;

  -- Cannot rate yourself
  IF auth.uid() = p_rated_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot rate yourself');
  END IF;

  -- Get order
  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Must be completed
  IF v_order.status != 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order must be completed to rate');
  END IF;

  -- Must be participant
  IF auth.uid() NOT IN (v_order.creator_id, v_order.executor_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not a participant in this order');
  END IF;

  -- Rated user must be the other participant
  IF p_rated_id NOT IN (v_order.creator_id, v_order.executor_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rated user is not a participant');
  END IF;

  -- Check if already rated
  IF EXISTS (SELECT 1 FROM p2p_ratings WHERE order_id = p_order_id AND rater_id = auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already rated this order');
  END IF;

  -- Insert rating
  INSERT INTO p2p_ratings (order_id, rater_id, rated_id, rating, comment)
  VALUES (p_order_id, auth.uid(), p_rated_id, p_rating, p_comment)
  RETURNING id INTO v_rating_id;

  -- Insert system message
  INSERT INTO p2p_messages (order_id, sender_id, content, content_ar, message_type, is_system_message)
  VALUES (
    p_order_id,
    auth.uid(),
    CASE WHEN p_rating = 1 THEN 'User left a positive rating' ELSE 'User left a negative rating' END,
    CASE WHEN p_rating = 1 THEN 'ترك المستخدم تقييمًا إيجابيًا' ELSE 'ترك المستخدم تقييمًا سلبيًا' END,
    'system',
    true
  );

  RETURN jsonb_build_object(
    'success', true,
    'rating_id', v_rating_id
  );
END;
$$;

-- =============================================
-- P2P DISPUTE FILES SYSTEM
-- =============================================

-- 1. Create storage bucket for dispute files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'p2p-disputes',
  'p2p-disputes',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- 2. Storage policies
CREATE POLICY "Participants can upload dispute files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'p2p-disputes'
  AND EXISTS (
    SELECT 1 FROM p2p_orders o
    WHERE o.id::text = (storage.foldername(name))[1]
    AND o.status = 'disputed'
    AND (o.creator_id = auth.uid() OR o.executor_id = auth.uid())
  )
);

CREATE POLICY "Participants and support can view dispute files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'p2p-disputes'
  AND (
    EXISTS (
      SELECT 1 FROM p2p_orders o
      WHERE o.id::text = (storage.foldername(name))[1]
      AND (o.creator_id = auth.uid() OR o.executor_id = auth.uid())
    )
    OR is_support_staff(auth.uid())
  )
);

-- 3. Create dispute files table
CREATE TABLE public.p2p_dispute_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.p2p_orders(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.p2p_dispute_files ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Participants can view dispute files"
ON public.p2p_dispute_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM p2p_orders o
    WHERE o.id = order_id
    AND (o.creator_id = auth.uid() OR o.executor_id = auth.uid())
  )
  OR is_support_staff(auth.uid())
);

CREATE POLICY "Participants can upload files in disputed orders"
ON public.p2p_dispute_files FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by
  AND EXISTS (
    SELECT 1 FROM p2p_orders o
    WHERE o.id = order_id
    AND o.status = 'disputed'
    AND (o.creator_id = auth.uid() OR o.executor_id = auth.uid())
  )
);

-- =============================================
-- P2P EXTEND TIME SYSTEM
-- =============================================

-- 1. Add columns to track extensions
ALTER TABLE public.p2p_orders 
ADD COLUMN IF NOT EXISTS extension_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- 2. Create RPC for extending time
CREATE OR REPLACE FUNCTION public.p2p_extend_time(
  p_order_id UUID,
  p_minutes INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order p2p_orders%ROWTYPE;
  v_seller_id UUID;
  v_new_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Validate minutes
  IF p_minutes < 5 OR p_minutes > 30 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Extension must be between 5 and 30 minutes');
  END IF;

  -- Lock order
  SELECT * INTO v_order
  FROM p2p_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Determine seller
  IF v_order.order_type = 'sell' THEN
    v_seller_id := v_order.creator_id;
  ELSE
    v_seller_id := v_order.executor_id;
  END IF;

  -- Only seller can extend
  IF auth.uid() != v_seller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only seller can extend time');
  END IF;

  -- Must be in payment_sent status
  IF v_order.status != 'payment_sent' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only extend time after payment confirmation');
  END IF;

  -- Only allow one extension
  IF v_order.extension_count >= 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Time can only be extended once');
  END IF;

  -- Calculate new expiry
  v_new_expires_at := COALESCE(v_order.expires_at, v_order.matched_at + (v_order.time_limit_minutes * interval '1 minute')) + (p_minutes * interval '1 minute');

  -- Update order
  UPDATE p2p_orders
  SET 
    extension_count = extension_count + 1,
    expires_at = v_new_expires_at,
    time_limit_minutes = time_limit_minutes + p_minutes,
    updated_at = now()
  WHERE id = p_order_id;

  -- Insert system message
  INSERT INTO p2p_messages (order_id, sender_id, content, content_ar, message_type, is_system_message)
  VALUES (
    p_order_id,
    auth.uid(),
    'Seller extended the wait time by ' || p_minutes || ' minutes.',
    'قام البائع بتمديد وقت الانتظار ' || p_minutes || ' دقائق.',
    'system',
    true
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_expires_at', v_new_expires_at,
    'extension_count', v_order.extension_count + 1
  );
END;
$$;

-- =============================================
-- P2P RELIST ORDER (Real Implementation)
-- =============================================

CREATE OR REPLACE FUNCTION public.p2p_relist_order(
  p_order_id UUID,
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
BEGIN
  -- Lock order
  SELECT * INTO v_order
  FROM p2p_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Must be in awaiting_payment status
  IF v_order.status != 'awaiting_payment' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order can only be relisted when awaiting payment');
  END IF;

  -- Check if user is participant
  IF auth.uid() NOT IN (v_order.creator_id, v_order.executor_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Determine seller for buy orders (executor is seller)
  IF v_order.order_type = 'buy' THEN
    v_seller_id := v_order.executor_id;
    
    -- Refund locked Nova to seller (executor)
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

    -- Ledger entry for refund
    INSERT INTO wallet_ledger (
      user_id, wallet_id, entry_type, currency, amount,
      balance_before, balance_after, reference_type, reference_id,
      description, description_ar,
      metadata
    ) VALUES (
      v_seller_id, v_seller_wallet.id, 'p2p_escrow_release', 'nova', v_order.nova_amount,
      v_balance_before, v_balance_after, 'p2p_order', p_order_id,
      'Nova refunded - order relisted',
      'استرداد Nova - إعادة عرض الطلب',
      jsonb_build_object('action', 'relist_refund', 'reason', p_reason)
    );
  END IF;

  -- Reset order to open
  UPDATE p2p_orders
  SET 
    status = 'open',
    executor_id = NULL,
    matched_at = NULL,
    expires_at = NULL,
    extension_count = 0,
    updated_at = NOW()
  WHERE id = p_order_id;

  -- Insert system message
  INSERT INTO p2p_messages (order_id, sender_id, content, content_ar, message_type, is_system_message)
  VALUES (
    p_order_id,
    auth.uid(),
    'Order has been relisted.' || COALESCE(' Reason: ' || p_reason, ''),
    'تم إعادة عرض الطلب.' || COALESCE(' السبب: ' || p_reason, ''),
    'system',
    true
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', 'open'
  );
END;
$$;

-- =============================================
-- DELETE ORDER RPC (with escrow refund)
-- =============================================

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
  -- Lock order
  SELECT * INTO v_order
  FROM p2p_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Only creator can delete
  IF v_order.creator_id != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only order creator can delete');
  END IF;

  -- Only open orders can be deleted
  IF v_order.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only open orders can be deleted');
  END IF;

  -- For sell orders, refund locked Nova
  IF v_order.order_type = 'sell' THEN
    SELECT * INTO v_wallet
    FROM wallets
    WHERE user_id = v_order.creator_id
    FOR UPDATE;

    v_balance_before := v_wallet.nova_balance;
    v_locked_before := v_wallet.locked_nova_balance;
    v_balance_after := v_balance_before + v_order.nova_amount;
    v_locked_after := v_locked_before - v_order.nova_amount;

    UPDATE wallets
    SET 
      nova_balance = v_balance_after,
      locked_nova_balance = v_locked_after,
      updated_at = NOW()
    WHERE id = v_wallet.id;

    -- Ledger entry
    INSERT INTO wallet_ledger (
      user_id, wallet_id, entry_type, currency, amount,
      balance_before, balance_after, reference_type, reference_id,
      description, description_ar,
      metadata
    ) VALUES (
      v_order.creator_id, v_wallet.id, 'p2p_escrow_release', 'nova', v_order.nova_amount,
      v_balance_before, v_balance_after, 'p2p_order', p_order_id,
      'Nova refunded - order deleted',
      'استرداد Nova - حذف الطلب',
      jsonb_build_object('action', 'delete_refund')
    );
  END IF;

  -- Delete the order
  DELETE FROM p2p_orders WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'refunded', v_order.order_type = 'sell',
    'amount', v_order.nova_amount
  );
END;
$$;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_p2p_ratings_order_id ON public.p2p_ratings(order_id);
CREATE INDEX IF NOT EXISTS idx_p2p_ratings_rated_id ON public.p2p_ratings(rated_id);
CREATE INDEX IF NOT EXISTS idx_p2p_ratings_rater_id ON public.p2p_ratings(rater_id);
CREATE INDEX IF NOT EXISTS idx_p2p_dispute_files_order_id ON public.p2p_dispute_files(order_id);
CREATE INDEX IF NOT EXISTS idx_p2p_orders_expires_at ON public.p2p_orders(expires_at) WHERE expires_at IS NOT NULL;