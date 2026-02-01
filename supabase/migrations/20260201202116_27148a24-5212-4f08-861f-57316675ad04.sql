-- Fix P2P order UPDATE permissions so cancel/delete buttons can work
-- (and so participants can progress order states safely)

ALTER TABLE public.p2p_orders ENABLE ROW LEVEL SECURITY;

-- Remove overly-restrictive policy that blocks moving to terminal states
DROP POLICY IF EXISTS "Participants can update active orders" ON public.p2p_orders;

-- Creators can cancel their own OPEN orders (remove from market, no match)
CREATE POLICY "Creators can cancel open orders"
ON public.p2p_orders
FOR UPDATE
USING (
  auth.uid() = creator_id
  AND status = 'open'::p2p_order_status
)
WITH CHECK (
  status = 'cancelled'::p2p_order_status
  AND cancelled_by = auth.uid()
);

-- Buyer can confirm payment (awaiting_payment -> payment_sent)
CREATE POLICY "Buyer can confirm payment"
ON public.p2p_orders
FOR UPDATE
USING (
  status = 'awaiting_payment'::p2p_order_status
  AND auth.uid() = (
    CASE
      WHEN order_type = 'buy'::p2p_order_type THEN creator_id
      ELSE executor_id
    END
  )
)
WITH CHECK (
  status = 'payment_sent'::p2p_order_status
);

-- Seller can complete order (payment_sent -> completed)
CREATE POLICY "Seller can complete order"
ON public.p2p_orders
FOR UPDATE
USING (
  status = 'payment_sent'::p2p_order_status
  AND auth.uid() = (
    CASE
      WHEN order_type = 'sell'::p2p_order_type THEN creator_id
      ELSE executor_id
    END
  )
)
WITH CHECK (
  status = 'completed'::p2p_order_status
);

-- Either participant can relist an order BEFORE payment (awaiting_payment -> open, clears match)
CREATE POLICY "Participants can relist before payment"
ON public.p2p_orders
FOR UPDATE
USING (
  status = 'awaiting_payment'::p2p_order_status
  AND (auth.uid() = creator_id OR auth.uid() = executor_id)
)
WITH CHECK (
  status = 'open'::p2p_order_status
  AND executor_id IS NULL
  AND matched_at IS NULL
);

-- Either participant can open a dispute AFTER payment (payment_sent -> disputed)
CREATE POLICY "Participants can dispute after payment"
ON public.p2p_orders
FOR UPDATE
USING (
  status = 'payment_sent'::p2p_order_status
  AND (auth.uid() = creator_id OR auth.uid() = executor_id)
)
WITH CHECK (
  status = 'disputed'::p2p_order_status
);
