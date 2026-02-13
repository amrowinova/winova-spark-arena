
-- Support Agent Ratings table
CREATE TABLE public.support_agent_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.p2p_orders(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL,
  rater_id UUID NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('up', 'down')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_locked BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(order_id, rater_id)
);

ALTER TABLE public.support_agent_ratings ENABLE ROW LEVEL SECURITY;

-- Only dispute participants can insert their own rating
CREATE POLICY "Users can rate their own disputes"
ON public.support_agent_ratings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = rater_id
  AND EXISTS (
    SELECT 1 FROM public.p2p_orders o
    WHERE o.id = order_id
    AND (o.creator_id = auth.uid() OR o.executor_id = auth.uid())
    AND o.status IN ('completed', 'cancelled')
  )
);

-- Users can read their own ratings
CREATE POLICY "Users can view own ratings"
ON public.support_agent_ratings
FOR SELECT
TO authenticated
USING (
  rater_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'support')
);

-- Users can update their own rating within 30 minutes (before lock)
CREATE POLICY "Users can update own unlocked ratings"
ON public.support_agent_ratings
FOR UPDATE
TO authenticated
USING (
  rater_id = auth.uid()
  AND is_locked = false
);

-- No deletes
-- No DELETE policy

-- Auto-lock ratings after 30 minutes via trigger
CREATE OR REPLACE FUNCTION public.lock_old_agent_ratings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_locked = false AND OLD.created_at < (now() - interval '30 minutes') THEN
    NEW.is_locked := true;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lock_agent_ratings
BEFORE UPDATE ON public.support_agent_ratings
FOR EACH ROW
EXECUTE FUNCTION public.lock_old_agent_ratings();

-- RPC: Submit or update a rating
CREATE OR REPLACE FUNCTION public.submit_support_agent_rating(
  p_order_id UUID,
  p_rating TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_order RECORD;
  v_staff_id UUID;
  v_existing RECORD;
BEGIN
  -- Validate caller is participant
  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id;
  IF v_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;
  IF v_caller != v_order.creator_id AND v_caller != v_order.executor_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a participant');
  END IF;
  IF v_order.status NOT IN ('completed', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not resolved');
  END IF;
  IF p_rating NOT IN ('up', 'down') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid rating');
  END IF;

  -- Get staff who resolved the dispute
  v_staff_id := v_order.assigned_to;
  IF v_staff_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No staff assigned');
  END IF;

  -- Check existing
  SELECT * INTO v_existing FROM support_agent_ratings
  WHERE order_id = p_order_id AND rater_id = v_caller;

  IF v_existing IS NOT NULL THEN
    IF v_existing.is_locked THEN
      RETURN jsonb_build_object('success', false, 'error', 'Rating is locked');
    END IF;
    IF v_existing.created_at < (now() - interval '30 minutes') THEN
      UPDATE support_agent_ratings SET is_locked = true WHERE id = v_existing.id;
      RETURN jsonb_build_object('success', false, 'error', 'Rating window expired');
    END IF;
    UPDATE support_agent_ratings
    SET rating = p_rating, note = p_note, updated_at = now()
    WHERE id = v_existing.id;
    RETURN jsonb_build_object('success', true, 'action', 'updated');
  END IF;

  INSERT INTO support_agent_ratings (order_id, staff_id, rater_id, rating, note)
  VALUES (p_order_id, v_staff_id, v_caller, p_rating, p_note);

  RETURN jsonb_build_object('success', true, 'action', 'created');
END;
$$;

-- View: Staff performance metrics
CREATE OR REPLACE VIEW public.support_staff_metrics AS
SELECT
  s.staff_id,
  p.name AS staff_name,
  COUNT(DISTINCT s.order_id) AS total_ratings,
  COUNT(*) FILTER (WHERE s.rating = 'up') AS positive_ratings,
  COUNT(*) FILTER (WHERE s.rating = 'down') AS negative_ratings,
  ROUND(
    COUNT(*) FILTER (WHERE s.rating = 'up') * 100.0 / NULLIF(COUNT(*), 0), 1
  ) AS positive_pct,
  (SELECT COUNT(DISTINCT da.order_id) FROM p2p_dispute_actions da WHERE da.staff_id = s.staff_id AND da.action_type IN ('release_to_buyer', 'refund_seller')) AS cases_handled,
  (SELECT COUNT(DISTINCT da.order_id) FROM p2p_dispute_actions da WHERE da.staff_id = s.staff_id AND da.action_type = 'escalate') AS escalations,
  (SELECT COUNT(DISTINCT da.order_id) FROM p2p_dispute_actions da WHERE da.staff_id = s.staff_id AND da.action_type = 'mark_fraud') AS fraud_flags
FROM support_agent_ratings s
LEFT JOIN profiles p ON p.user_id = s.staff_id
GROUP BY s.staff_id, p.name;

-- Enable realtime for ratings
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_agent_ratings;
