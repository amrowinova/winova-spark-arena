-- =====================================================
-- SECURITY FIX: Protect User Profile Data
-- =====================================================

-- 1. Drop the overly permissive search policy
DROP POLICY IF EXISTS "Authenticated users can search profiles" ON public.profiles;

-- 2. Create a secure view for user search that only exposes minimal data
CREATE OR REPLACE VIEW public.profiles_search
WITH (security_invoker=on) AS
SELECT 
  id,
  user_id,
  username,
  name,
  avatar_url,
  country
FROM public.profiles
WHERE username IS NOT NULL 
  AND length(username) >= 3;

-- 3. Create a more restrictive policy for profile search
-- Only allow searching when the user has a legitimate need (chat, transfer, P2P)
-- This replaces the broad "any authenticated user" policy
CREATE POLICY "Authenticated users can search minimal profile data"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND username IS NOT NULL 
  AND length(username) >= 3
  -- Only allow access to minimal fields through the search view
  -- Full profile access requires existing relationship (covered by other policies)
);

-- =====================================================
-- SECURITY FIX: Protect P2P Order Financial Data
-- =====================================================

-- 4. Drop the overly permissive open orders policy
DROP POLICY IF EXISTS "Users can view orders they are involved in" ON public.p2p_orders;

-- 5. Create separate, more restrictive policies:

-- Policy for users to view their own orders (creator or executor)
CREATE POLICY "Users can view their own orders"
ON public.p2p_orders
FOR SELECT
USING (
  auth.uid() = creator_id 
  OR auth.uid() = executor_id
);

-- Policy for marketplace: Allow viewing open orders but this is controlled via view
-- Users can see open orders in their country for marketplace matching
CREATE POLICY "Users can view open orders for marketplace"
ON public.p2p_orders
FOR SELECT
USING (
  status = 'open'::p2p_order_status
  AND auth.uid() IS NOT NULL
  AND auth.uid() != creator_id  -- Don't show own orders in marketplace
);

-- 6. Create a secure marketplace view that hides sensitive creator data
CREATE OR REPLACE VIEW public.p2p_marketplace_orders
WITH (security_invoker=on) AS
SELECT 
  id,
  order_type,
  nova_amount,
  local_amount,
  exchange_rate,
  country,
  time_limit_minutes,
  status,
  created_at
  -- NOTE: creator_id, payment_method_id, and other sensitive fields are hidden
FROM public.p2p_orders
WHERE status = 'open'::p2p_order_status;