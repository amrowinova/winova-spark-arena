
CREATE OR REPLACE FUNCTION public.p2p_open_dispute(p_order_id uuid, p_user_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- Identity enforcement
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    INSERT INTO audit_logs(action, entity_type, entity_id, user_id, details)
    VALUES('identity_mismatch', 'p2p_order', p_order_id::text, auth.uid(), jsonb_build_object('claimed', p_user_id));
    RETURN jsonb_build_object('success', false, 'error', 'Identity mismatch');
  END IF;

  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id FOR UPDATE;

  IF v_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Only allow disputes after payment has been sent
  IF v_order.status != 'payment_sent' THEN
    RETURN jsonb_build_object('success', false, 'error', 'You must confirm payment before opening a dispute');
  END IF;

  -- Only buyer or seller can open dispute
  IF p_user_id != v_order.creator_id AND p_user_id != v_order.executor_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a participant');
  END IF;

  UPDATE p2p_orders
  SET status = 'disputed',
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
