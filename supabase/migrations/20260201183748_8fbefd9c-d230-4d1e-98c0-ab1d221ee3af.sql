-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Participants can update non-disputed orders" ON public.p2p_orders;
DROP POLICY IF EXISTS "Support staff can resolve disputes" ON public.p2p_orders;

-- Create new policy: Allow any authenticated user to execute an OPEN order (become executor)
CREATE POLICY "Users can execute open orders"
ON public.p2p_orders
FOR UPDATE
USING (
  status = 'open'::p2p_order_status 
  AND auth.uid() != creator_id  -- Can't execute own order
)
WITH CHECK (
  status IN ('matched'::p2p_order_status, 'awaiting_payment'::p2p_order_status)
  AND executor_id = auth.uid()  -- Must set themselves as executor
);

-- Create policy: Participants can update their matched/in-progress orders
CREATE POLICY "Participants can update active orders"
ON public.p2p_orders
FOR UPDATE
USING (
  (auth.uid() = creator_id OR auth.uid() = executor_id)
  AND status NOT IN ('open'::p2p_order_status, 'disputed'::p2p_order_status, 'completed'::p2p_order_status, 'cancelled'::p2p_order_status)
);

-- Re-create support staff policy for disputes
CREATE POLICY "Support staff can resolve disputes"
ON public.p2p_orders
FOR UPDATE
USING (status = 'disputed'::p2p_order_status AND is_support_staff(auth.uid()))
WITH CHECK (is_support_staff(auth.uid()));