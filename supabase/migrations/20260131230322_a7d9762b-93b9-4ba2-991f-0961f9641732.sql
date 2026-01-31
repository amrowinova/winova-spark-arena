-- ============================================================
-- SECURITY FIX: Address error-level vulnerabilities
-- ============================================================

-- 1. FIX: P2P Orders Missing Dispute Resolution Policy
-- Drop existing policy that allows participants to update any order
DROP POLICY IF EXISTS "Involved users can update orders" ON public.p2p_orders;

-- Create policy for participants to update non-disputed orders only
CREATE POLICY "Participants can update non-disputed orders" ON public.p2p_orders
  FOR UPDATE 
  USING (
    (auth.uid() = creator_id OR auth.uid() = executor_id)
    AND status != 'disputed'
  );

-- Create policy for support staff to resolve disputes
CREATE POLICY "Support staff can resolve disputes" ON public.p2p_orders
  FOR UPDATE 
  USING (
    status = 'disputed' 
    AND is_support_staff(auth.uid())
  )
  WITH CHECK (
    is_support_staff(auth.uid())
  );

-- Allow support staff to read all p2p_orders for dispute handling
CREATE POLICY "Support staff can view all orders" ON public.p2p_orders
  FOR SELECT
  USING (is_support_staff(auth.uid()));

-- 2. FIX: Profiles Table Public Exposure
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create restricted policies for profiles
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view profiles of people they interact with (P2P orders, team)
CREATE POLICY "Users can view profiles in their P2P orders" ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.p2p_orders
      WHERE (p2p_orders.creator_id = auth.uid() OR p2p_orders.executor_id = auth.uid())
        AND (p2p_orders.creator_id = profiles.user_id OR p2p_orders.executor_id = profiles.user_id)
    )
  );

-- Users can view team member profiles
CREATE POLICY "Users can view team member profiles" ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE (team_members.leader_id = auth.uid() AND team_members.member_id = profiles.user_id)
         OR (team_members.member_id = auth.uid() AND team_members.leader_id = profiles.user_id)
    )
  );

-- Support staff can view all profiles
CREATE POLICY "Support staff can view all profiles" ON public.profiles
  FOR SELECT
  USING (is_support_staff(auth.uid()));

-- 3. FIX: p2p_orders_with_profiles view security
-- This is a VIEW - we need to enable RLS on the underlying data or use security_invoker
-- First, let's recreate the view with security_invoker = true
DROP VIEW IF EXISTS public.p2p_orders_with_profiles;

CREATE VIEW public.p2p_orders_with_profiles 
WITH (security_invoker = true)
AS
SELECT 
  o.id,
  o.creator_id,
  o.executor_id,
  o.order_type,
  o.status,
  o.nova_amount,
  o.local_amount,
  o.exchange_rate,
  o.country,
  o.payment_method_id,
  o.time_limit_minutes,
  o.cancelled_by,
  o.cancellation_reason,
  o.completed_at,
  o.created_at,
  o.updated_at,
  cp.id as creator_profile_id,
  cp.name as creator_name,
  cp.username as creator_username,
  cp.avatar_url as creator_avatar_url,
  cp.country as creator_country,
  ep.id as executor_profile_id,
  ep.name as executor_name,
  ep.username as executor_username,
  ep.avatar_url as executor_avatar_url,
  ep.country as executor_country
FROM public.p2p_orders o
LEFT JOIN public.profiles cp ON o.creator_id = cp.user_id
LEFT JOIN public.profiles ep ON o.executor_id = ep.user_id;

-- 4. FIX: Wallets table needs support staff access policy for user lookup
CREATE POLICY "Support staff can view all wallets" ON public.wallets
  FOR SELECT
  USING (is_support_staff(auth.uid()));

-- 5. FIX: User roles table needs support staff access policy
CREATE POLICY "Support staff can view all user roles" ON public.user_roles
  FOR SELECT
  USING (is_support_staff(auth.uid()));

-- 6. BONUS: Allow users viewing open orders to see basic profile info (for marketplace)
-- This allows the P2P marketplace to function by showing creator info on open orders
CREATE POLICY "Users can view profiles for open P2P orders" ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.p2p_orders
      WHERE p2p_orders.status = 'open'
        AND p2p_orders.creator_id = profiles.user_id
    )
  );