-- Remove the table-level policy that allowed any authenticated user to read
-- full rows of open p2p_orders (including payment_method_id).
--
-- The marketplace UI already queries the secure p2p_marketplace_orders view
-- which hides sensitive fields. The Realtime subscription that relied on this
-- policy is replaced with client-side polling in useP2PMarketplace.ts.
--
-- Remaining policies:
--   "Users can view their own orders"  — creator or executor only
--   Support / admin policies           — unchanged

DROP POLICY IF EXISTS "Users can view open orders for marketplace" ON public.p2p_orders;
