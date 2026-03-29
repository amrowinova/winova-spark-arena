-- ============================================================
-- AGENT SYSTEM: Fix Agent Display Issues
-- ============================================================

-- ── 1. Create simple RPC to get all active agents ─────────────────────────────
CREATE OR REPLACE FUNCTION public.get_all_active_agents()
RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_agg(jsonb_build_object(
    'id', a.id,
    'user_id', a.user_id,
    'shop_name', a.shop_name,
    'whatsapp', a.whatsapp,
    'country', a.country,
    'city', a.city,
    'latitude', a.latitude,
    'longitude', a.longitude,
    'commission_pct', a.commission_pct,
    'bio', a.bio,
    'avg_rating', a.avg_rating,
    'trust_score', a.trust_score,
    'total_reviews', a.total_reviews,
    'total_completed', a.total_completed,
    'total_cancellations', a.total_cancellations,
    'total_disputes', a.total_disputes,
    'status', a.status,
    'balance', COALESCE(a.balance, 0),
    'created_at', a.created_at,
    'updated_at', a.updated_at
  ) ORDER BY a.trust_score DESC, a.avg_rating DESC)
  FROM public.agents a
  WHERE a.status = 'active';
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_active_agents TO authenticated;

-- ── 2. Fix RLS policies for agents table ─────────────────────────────────────
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "agents_select_own" ON public.agents;
DROP POLICY IF EXISTS "agents_select_admin" ON public.agents;
DROP POLICY IF EXISTS "agents_insert_own" ON public.agents;
DROP POLICY IF EXISTS "agents_update_admin" ON public.agents;

-- Create proper RLS policies
CREATE POLICY "agents_select_own" ON public.agents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "agents_select_public" ON public.agents
  FOR SELECT USING (status = 'active');

CREATE POLICY "agents_select_admin" ON public.agents
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  ));

CREATE POLICY "agents_insert_own" ON public.agents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "agents_update_admin" ON public.agents
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  ));

-- ── 3. Ensure agent_deposit_requests table has proper RLS ─────────────────────────
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "agent_deposit_requests_select_own" ON public.agent_deposit_requests;
DROP POLICY IF EXISTS "agent_deposit_requests_select_admin" ON public.agent_deposit_requests;

-- Create proper RLS policies for deposit requests
CREATE POLICY "agent_deposit_requests_select_own" ON public.agent_deposit_requests
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.agents a 
    WHERE a.id = agent_deposit_requests.agent_id 
    AND a.user_id = auth.uid()
  ));

CREATE POLICY "agent_deposit_requests_select_admin" ON public.agent_deposit_requests
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  ));

-- ── 4. Add notification for new deposit requests ────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_admin_on_deposit_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Insert notification for admin users
  INSERT INTO public.notifications (user_id, type, title, message, data)
  SELECT 
    ur.user_id,
    'new_deposit_request',
    'New Deposit Request',
    'Agent ' || a.shop_name || ' requested a deposit of И ' || NEW.amount_nova,
    jsonb_build_object(
      'request_id', NEW.id,
      'agent_id', NEW.agent_id,
      'agent_name', a.shop_name,
      'amount', NEW.amount_nova
    )
  FROM public.user_roles ur
  CROSS JOIN public.agents a
  WHERE ur.role = 'admin'
    AND a.id = NEW.agent_id;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Create trigger for deposit request notifications
DROP TRIGGER IF EXISTS on_deposit_request_notify_admin ON public.agent_deposit_requests;
CREATE TRIGGER on_deposit_request_notify_admin
  AFTER INSERT ON public.agent_deposit_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_deposit_request();

-- ── 5. Add function to check if user is admin ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;

-- ── 6. Update get_nearby_agents to ensure it works properly ─────────────────────────
CREATE OR REPLACE FUNCTION public.get_nearby_agents_fixed(
  p_country   TEXT    DEFAULT NULL,
  p_city      TEXT    DEFAULT NULL,
  p_latitude  NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_limit     INT     DEFAULT 30
)
RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_agg(jsonb_build_object(
    'id', a.id,
    'user_id', a.user_id,
    'shop_name', a.shop_name,
    'whatsapp', a.whatsapp,
    'country', a.country,
    'city', a.city,
    'latitude', a.latitude,
    'longitude', a.longitude,
    'commission_pct', a.commission_pct,
    'bio', a.bio,
    'avg_rating', a.avg_rating,
    'trust_score', a.trust_score,
    'total_reviews', a.total_reviews,
    'total_completed', a.total_completed,
    'total_cancellations', a.total_cancellations,
    'total_disputes', a.total_disputes,
    'status', a.status,
    'distance_km', CASE
      WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL
      THEN round(CAST(6371 * acos(
        cos(radians(p_latitude)) * cos(radians(a.latitude)) * cos(radians(a.longitude) - radians(p_longitude)) +
        sin(radians(p_latitude)) * sin(radians(a.latitude))) AS NUMERIC), 1)
      ELSE NULL END
  ) ORDER BY a.trust_score DESC, a.avg_rating DESC)
  FROM public.agents a
  WHERE a.status = 'active'
    AND (p_country IS NULL OR a.country = p_country)
    AND (p_city IS NULL OR a.city = p_city)
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_nearby_agents_fixed TO authenticated;
