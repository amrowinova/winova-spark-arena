
-- Add assignment columns to p2p_orders
ALTER TABLE public.p2p_orders 
  ADD COLUMN IF NOT EXISTS assigned_to UUID,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- RPC to claim a dispute case (atomic, first-come-first-served)
CREATE OR REPLACE FUNCTION public.support_claim_dispute(p_order_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id UUID := auth.uid();
  v_current_status TEXT;
  v_current_assigned UUID;
  v_is_support BOOLEAN;
BEGIN
  -- Verify caller is support/admin/risk
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_staff_id
      AND role IN ('support', 'admin', 'risk')
  ) INTO v_is_support;

  IF NOT v_is_support THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Lock and check the order
  SELECT status, assigned_to INTO v_current_status, v_current_assigned
  FROM public.p2p_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_current_status IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_current_assigned IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Already claimed');
  END IF;

  -- Assign
  UPDATE public.p2p_orders
  SET assigned_to = v_staff_id, assigned_at = now()
  WHERE id = p_order_id;

  -- Log in audit
  INSERT INTO public.p2p_dispute_actions (order_id, staff_id, action_type, note)
  VALUES (p_order_id, v_staff_id, 'claim_case', 'Case claimed by staff');

  RETURN json_build_object('success', true);
END;
$$;
