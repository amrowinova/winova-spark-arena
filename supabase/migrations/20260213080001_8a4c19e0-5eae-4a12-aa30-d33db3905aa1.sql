
-- =====================================================
-- P2P Dispute Arbitration Audit Log
-- Records every support action on disputes for immutable audit trail
-- =====================================================
CREATE TABLE IF NOT EXISTS public.p2p_dispute_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.p2p_orders(id),
  staff_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- 'release_to_buyer', 'refund_seller', 'mark_fraud', 'request_proof', 'escalate', 'assign', 'note'
  previous_status TEXT,
  new_status TEXT,
  note TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.p2p_dispute_actions ENABLE ROW LEVEL SECURITY;

-- Only support/admin can read/write
CREATE POLICY "Support staff can view dispute actions"
  ON public.p2p_dispute_actions FOR SELECT
  USING (public.is_support_staff(auth.uid()));

CREATE POLICY "Support staff can insert dispute actions"
  ON public.p2p_dispute_actions FOR INSERT
  WITH CHECK (public.is_support_staff(auth.uid()));

-- No UPDATE or DELETE policies — immutable audit trail

-- =====================================================
-- RPC: Get full dispute case data for support panel
-- Returns order, both party profiles, wallet snapshots, message count
-- =====================================================
CREATE OR REPLACE FUNCTION public.support_get_dispute_case(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order p2p_orders%ROWTYPE;
  v_seller_id UUID;
  v_buyer_id UUID;
  v_seller_profile JSONB;
  v_buyer_profile JSONB;
  v_seller_wallet JSONB;
  v_buyer_wallet JSONB;
  v_message_count INT;
  v_dispute_files_count INT;
BEGIN
  -- Verify caller is support staff
  IF NOT is_support_staff(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Determine buyer/seller
  IF v_order.order_type = 'sell' THEN
    v_seller_id := v_order.creator_id;
    v_buyer_id := v_order.executor_id;
  ELSE
    v_seller_id := v_order.executor_id;
    v_buyer_id := v_order.creator_id;
  END IF;

  -- Profiles
  SELECT jsonb_build_object(
    'user_id', p.user_id, 'name', p.name, 'username', p.username,
    'avatar_url', p.avatar_url, 'country', p.country
  ) INTO v_seller_profile FROM profiles p WHERE p.user_id = v_seller_id;

  SELECT jsonb_build_object(
    'user_id', p.user_id, 'name', p.name, 'username', p.username,
    'avatar_url', p.avatar_url, 'country', p.country
  ) INTO v_buyer_profile FROM profiles p WHERE p.user_id = v_buyer_id;

  -- Wallet snapshots
  SELECT jsonb_build_object(
    'nova_balance', w.nova_balance, 'locked_nova_balance', w.locked_nova_balance,
    'aura_balance', w.aura_balance, 'is_frozen', w.is_frozen
  ) INTO v_seller_wallet FROM wallets w WHERE w.user_id = v_seller_id;

  SELECT jsonb_build_object(
    'nova_balance', w.nova_balance, 'locked_nova_balance', w.locked_nova_balance,
    'aura_balance', w.aura_balance, 'is_frozen', w.is_frozen
  ) INTO v_buyer_wallet FROM wallets w WHERE w.user_id = v_buyer_id;

  -- Message count
  SELECT COUNT(*) INTO v_message_count FROM p2p_messages WHERE order_id = p_order_id;

  -- Dispute files count
  SELECT COUNT(*) INTO v_dispute_files_count FROM p2p_dispute_files WHERE order_id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order', jsonb_build_object(
      'id', v_order.id,
      'order_type', v_order.order_type,
      'status', v_order.status,
      'nova_amount', v_order.nova_amount,
      'local_amount', v_order.local_amount,
      'exchange_rate', v_order.exchange_rate,
      'country', v_order.country,
      'payment_method_id', v_order.payment_method_id,
      'time_limit_minutes', v_order.time_limit_minutes,
      'cancellation_reason', v_order.cancellation_reason,
      'created_at', v_order.created_at,
      'matched_at', v_order.matched_at,
      'completed_at', v_order.completed_at,
      'updated_at', v_order.updated_at
    ),
    'buyer', v_buyer_profile,
    'seller', v_seller_profile,
    'buyer_wallet', v_buyer_wallet,
    'seller_wallet', v_seller_wallet,
    'message_count', v_message_count,
    'dispute_files_count', v_dispute_files_count
  );
END;
$$;

-- =====================================================
-- RPC: Log a dispute arbitration action (audit)
-- =====================================================
CREATE OR REPLACE FUNCTION public.support_log_dispute_action(
  p_order_id UUID,
  p_action_type TEXT,
  p_previous_status TEXT DEFAULT NULL,
  p_new_status TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_support_staff(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  INSERT INTO p2p_dispute_actions (order_id, staff_id, action_type, previous_status, new_status, note, metadata)
  VALUES (p_order_id, auth.uid(), p_action_type, p_previous_status, p_new_status, p_note, p_metadata);

  -- Also log to main audit_logs for cross-system visibility
  INSERT INTO audit_logs (performed_by, action_type, target_type, target_id, details)
  VALUES (auth.uid(), 'p2p_dispute_' || p_action_type, 'p2p_order', p_order_id,
    jsonb_build_object('previous_status', p_previous_status, 'new_status', p_new_status, 'note', p_note));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================
-- RLS: Allow support staff to read p2p_messages for disputed orders
-- (They already have access via is_support_staff in existing policies,
--  but let's add an explicit policy for disputed order messages)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Support can read disputed order messages' AND tablename = 'p2p_messages'
  ) THEN
    CREATE POLICY "Support can read disputed order messages"
      ON public.p2p_messages FOR SELECT
      USING (
        public.is_support_staff(auth.uid())
        AND EXISTS (
          SELECT 1 FROM p2p_orders WHERE id = p2p_messages.order_id AND status = 'disputed'
        )
      );
  END IF;
END $$;

-- Allow support to read dispute files for disputed orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Support can read dispute files' AND tablename = 'p2p_dispute_files'
  ) THEN
    CREATE POLICY "Support can read dispute files"
      ON public.p2p_dispute_files FOR SELECT
      USING (public.is_support_staff(auth.uid()));
  END IF;
END $$;

-- Allow support to send system messages into disputed order chats
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Support can send messages to disputed orders' AND tablename = 'p2p_messages'
  ) THEN
    CREATE POLICY "Support can send messages to disputed orders"
      ON public.p2p_messages FOR INSERT
      WITH CHECK (
        public.is_support_staff(auth.uid())
        AND sender_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM p2p_orders WHERE id = p2p_messages.order_id AND status = 'disputed'
        )
      );
  END IF;
END $$;
