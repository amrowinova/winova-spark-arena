
-- ============================================================
-- 1) p2p_expire_order RPC — atomic server-side order expiration
-- ============================================================
CREATE OR REPLACE FUNCTION public.p2p_expire_order(p_order_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_order p2p_orders%ROWTYPE;
  v_wallet wallets%ROWTYPE;
BEGIN
  -- Lock the order row
  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Must be called by a participant or service role
  IF auth.uid() IS NOT NULL
     AND auth.uid() <> v_order.creator_id
     AND (v_order.executor_id IS NULL OR auth.uid() <> v_order.executor_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a participant');
  END IF;

  -- CASE 1: awaiting_payment → revert to open (return to market)
  IF v_order.status = 'awaiting_payment' THEN
    UPDATE p2p_orders
    SET status = 'open',
        executor_id = NULL,
        matched_at = NULL,
        updated_at = now()
    WHERE id = p_order_id;

    -- System message
    INSERT INTO p2p_messages (order_id, sender_id, content, content_ar, is_system_message, message_type)
    VALUES (
      p_order_id,
      v_order.creator_id,
      '⏰ Time expired – Order has been returned to the marketplace',
      '⏰ انتهى الوقت – تم إعادة الطلب إلى السوق',
      true,
      'order_expired'
    );

    RETURN jsonb_build_object('success', true, 'action', 'returned_to_market');
  END IF;

  -- CASE 2: payment_sent → auto-dispute
  IF v_order.status = 'payment_sent' THEN
    UPDATE p2p_orders
    SET status = 'disputed',
        cancellation_reason = 'Timer expired during payment confirmation',
        updated_at = now()
    WHERE id = p_order_id;

    INSERT INTO p2p_messages (order_id, sender_id, content, content_ar, is_system_message, message_type)
    VALUES (
      p_order_id,
      v_order.creator_id,
      '⚖️ Dispute opened: Timer expired during payment confirmation',
      '⚖️ تم فتح نزاع: انتهى الوقت أثناء تأكيد الدفع',
      true,
      'dispute_opened'
    );

    RETURN jsonb_build_object('success', true, 'action', 'auto_disputed');
  END IF;

  -- Not eligible
  RETURN jsonb_build_object('success', false, 'error', 'Order not eligible for expiration (status: ' || v_order.status || ')');
END;
$function$;

-- ============================================================
-- 2) get_dm_conversations RPC — single query for all DM data
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_dm_conversations()
RETURNS TABLE (
  conversation_id UUID,
  partner_id UUID,
  partner_name TEXT,
  partner_username TEXT,
  partner_avatar TEXT,
  partner_country TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count BIGINT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id AS conversation_id,
    CASE WHEN c.participant1_id = v_uid THEN c.participant2_id ELSE c.participant1_id END AS partner_id,
    COALESCE(p.name, 'Unknown') AS partner_name,
    COALESCE(p.username, 'user') AS partner_username,
    p.avatar_url AS partner_avatar,
    COALESCE(p.country, '') AS partner_country,
    lm.content AS last_message,
    lm.created_at AS last_message_at,
    COALESCE(ur.cnt, 0) AS unread_count,
    c.created_at
  FROM conversations c
  LEFT JOIN profiles p ON p.user_id = (
    CASE WHEN c.participant1_id = v_uid THEN c.participant2_id ELSE c.participant1_id END
  )
  LEFT JOIN LATERAL (
    SELECT dm.content, dm.created_at
    FROM direct_messages dm
    WHERE dm.conversation_id = c.id
    ORDER BY dm.created_at DESC
    LIMIT 1
  ) lm ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt
    FROM direct_messages dm2
    WHERE dm2.conversation_id = c.id
      AND dm2.is_read = false
      AND dm2.sender_id <> v_uid
  ) ur ON true
  WHERE c.participant1_id = v_uid OR c.participant2_id = v_uid
  ORDER BY COALESCE(lm.created_at, c.created_at) DESC;
END;
$function$;

-- ============================================================
-- 4) Fix search_path on flagged SECURITY DEFINER functions
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin_user(check_user_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = check_user_id AND role = 'admin'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_ai_alert_to_admins(p_content TEXT, p_content_ar TEXT, p_agent_id UUID, p_metadata JSONB DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin RECORD;
BEGIN
  FOR v_admin IN SELECT user_id FROM user_roles WHERE role = 'admin' LOOP
    INSERT INTO ai_chat_room (agent_id, content, content_ar, message_type, human_sender_id, metadata)
    VALUES (p_agent_id, p_content, p_content_ar, 'alert', v_admin.user_id, p_metadata);
  END LOOP;
END;
$function$;
