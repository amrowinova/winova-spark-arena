-- ============================================================
-- AGENT SYSTEM: Admin Agent Access Fix
-- ============================================================

-- Drop all existing policies on agents table to avoid conflicts
DROP POLICY IF EXISTS "agents_select_own" ON public.agents;
DROP POLICY IF EXISTS "agents_select_public" ON public.agents;
DROP POLICY IF EXISTS "agents_select_admin" ON public.agents;
DROP POLICY IF EXISTS "agents_insert_own" ON public.agents;
DROP POLICY IF EXISTS "agents_update_admin" ON public.agents;

-- Create simple and clear RLS policies for agents table
CREATE POLICY "agents_select_admin" ON public.agents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "agents_select_own" ON public.agents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "agents_select_public_active" ON public.agents
  FOR SELECT USING (status = 'active');

CREATE POLICY "agents_insert_own" ON public.agents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "agents_update_admin" ON public.agents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

-- Also ensure admin can access agent_deposit_requests
DROP POLICY IF EXISTS "agent_deposit_requests_select_own" ON public.agent_deposit_requests;
DROP POLICY IF EXISTS "agent_deposit_requests_select_admin" ON public.agent_deposit_requests;

CREATE POLICY "agent_deposit_requests_select_admin" ON public.agent_deposit_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "agent_deposit_requests_select_own" ON public.agent_deposit_requests
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.agents a 
    WHERE a.id = agent_deposit_requests.agent_id 
    AND a.user_id = auth.uid()
  ));

-- Create a simple function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_user_admin TO authenticated;

-- Create a direct admin RPC for getting all agents
CREATE OR REPLACE FUNCTION public.admin_get_all_agents_direct()
RETURNS TABLE(
  id UUID,
  user_id UUID,
  shop_name TEXT,
  whatsapp TEXT,
  country TEXT,
  city TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  commission_pct NUMERIC,
  bio TEXT,
  avg_rating NUMERIC,
  trust_score NUMERIC,
  total_reviews INTEGER,
  total_completed INTEGER,
  total_cancellations INTEGER,
  total_disputes INTEGER,
  status TEXT,
  balance NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  -- Only allow admin users to access this function
  SELECT 
    a.id,
    a.user_id,
    a.shop_name,
    a.whatsapp,
    a.country,
    a.city,
    a.latitude,
    a.longitude,
    a.commission_pct,
    a.bio,
    a.avg_rating,
    a.trust_score,
    a.total_reviews,
    a.total_completed,
    a.total_cancellations,
    a.total_disputes,
    a.status,
    a.balance,
    a.created_at,
    a.updated_at
  FROM public.agents a
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
  ORDER BY a.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_all_agents_direct TO authenticated;
