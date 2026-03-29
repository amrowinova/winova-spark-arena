-- ============================================================
-- AGENT SYSTEM: Complete Rebuild - Simple and Direct
-- ============================================================

-- Drop all existing agent-related functions to avoid conflicts
DROP FUNCTION IF EXISTS public.apply_as_agent CASCADE;
DROP FUNCTION IF EXISTS public.get_all_active_agents CASCADE;
DROP FUNCTION IF EXISTS public.get_all_agents_json CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_all_agents CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_all_agents_direct CASCADE;
DROP FUNCTION IF EXISTS public.get_nearby_agents CASCADE;
DROP FUNCTION IF EXISTS public.get_nearby_agents_fixed CASCADE;
DROP FUNCTION IF EXISTS public.agent_request_deposit CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_all_deposit_requests CASCADE;
DROP FUNCTION IF EXISTS public.admin_approve_deposit CASCADE;
DROP FUNCTION IF EXISTS public.admin_reject_deposit CASCADE;

-- Drop all existing policies
DROP POLICY IF EXISTS "agents_select_admin" ON public.agents;
DROP POLICY IF EXISTS "agents_select_own" ON public.agents;
DROP POLICY IF EXISTS "agents_select_public_active" ON public.agents;
DROP POLICY IF EXISTS "agents_insert_own" ON public.agents;
DROP POLICY IF EXISTS "agents_update_admin" ON public.agents;

DROP POLICY IF EXISTS "agent_deposit_requests_select_admin" ON public.agent_deposit_requests;
DROP POLICY IF EXISTS "agent_deposit_requests_select_own" ON public.agent_deposit_requests;

-- ============================================================
-- 1. SIMPLE AGENT APPLICATION RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.apply_as_agent(
  p_shop_name  TEXT,
  p_whatsapp   TEXT,
  p_country    TEXT,
  p_city       TEXT,
  p_latitude   NUMERIC DEFAULT NULL,
  p_longitude  NUMERIC DEFAULT NULL,
  p_bio        TEXT    DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID := auth.uid(); v_existing_id UUID;
BEGIN
  -- Basic validation
  IF v_user_id IS NULL THEN 
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); 
  END IF;
  
  -- Check if already applied
  SELECT id INTO v_existing_id FROM public.agents WHERE user_id = v_user_id LIMIT 1;
  IF v_existing_id IS NOT NULL THEN 
    RETURN jsonb_build_object('success', false, 'error', 'Already applied as agent'); 
  END IF;
  
  -- Insert new agent application
  INSERT INTO public.agents (
    user_id, shop_name, whatsapp, country, city, 
    latitude, longitude, bio, status, commission_pct, 
    avg_rating, trust_score, total_reviews, total_completed, 
    total_cancellations, total_disputes, created_at, updated_at
  ) VALUES (
    v_user_id, p_shop_name, p_whatsapp, p_country, p_city, 
    p_latitude, p_longitude, p_bio, 'pending', 5, 
    0, 50, 0, 0, 0, 0, now(), now()
  );
  
  RETURN jsonb_build_object('success', true, 'message', 'Application submitted successfully');
EXCEPTION WHEN OTHERS THEN 
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- 2. SIMPLE GET ACTIVE AGENTS FOR PUBLIC
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_active_agents()
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

-- ============================================================
-- 3. SIMPLE GET ALL AGENTS FOR ADMIN
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_all_agents()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_result JSONB;
BEGIN
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied: Admin required');
  END IF;
  
  -- Get all agents
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
  ) ORDER BY a.created_at DESC)
  INTO v_result
  FROM public.agents a;
  
  RETURN jsonb_build_object('success', true, 'data', COALESCE(v_result, '[]'::JSONB));
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- 4. SIMPLE DEPOSIT REQUEST RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.agent_request_deposit(
  p_amount_nova       NUMERIC,
  p_payment_method    TEXT,
  p_payment_reference TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID := auth.uid(); v_agent_id UUID;
BEGIN
  -- Basic validation
  IF v_user_id IS NULL THEN 
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); 
  END IF;
  
  -- Get agent ID
  SELECT id INTO v_agent_id FROM public.agents WHERE user_id = v_user_id AND status = 'active' LIMIT 1;
  IF v_agent_id IS NULL THEN 
    RETURN jsonb_build_object('success', false, 'error', 'Agent not found or not active'); 
  END IF;
  
  -- Insert deposit request
  INSERT INTO public.agent_deposit_requests (
    agent_id, amount_nova, payment_method, payment_reference, 
    status, created_at, updated_at
  ) VALUES (
    v_agent_id, p_amount_nova, p_payment_method, p_payment_reference, 
    'pending', now(), now()
  );
  
  RETURN jsonb_build_object('success', true, 'message', 'Deposit request submitted');
EXCEPTION WHEN OTHERS THEN 
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- 5. SIMPLE ADMIN GET DEPOSIT REQUESTS
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_deposit_requests(p_status TEXT DEFAULT 'pending')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_result JSONB;
BEGIN
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied: Admin required');
  END IF;
  
  -- Get deposit requests with agent info
  SELECT jsonb_agg(jsonb_build_object(
    'id', dr.id,
    'agent_id', dr.agent_id,
    'amount_nova', dr.amount_nova,
    'payment_method', dr.payment_method,
    'payment_reference', dr.payment_reference,
    'status', dr.status,
    'admin_notes', dr.admin_notes,
    'created_at', dr.created_at,
    'updated_at', dr.updated_at,
    'agent_shop_name', a.shop_name,
    'agent_city', a.city,
    'agent_country', a.country,
    'agent_balance', a.balance
  ) ORDER BY dr.created_at DESC)
  INTO v_result
  FROM public.agent_deposit_requests dr
  JOIN public.agents a ON dr.agent_id = a.id
  WHERE (p_status = 'all' OR dr.status = p_status);
  
  RETURN jsonb_build_object('success', true, 'data', COALESCE(v_result, '[]'::JSONB));
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- 6. SIMPLE ADMIN APPROVE DEPOSIT
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_approve_deposit(
  p_request_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_request RECORD;
  v_agent_balance NUMERIC;
BEGIN
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied: Admin required');
  END IF;
  
  -- Get the request
  SELECT * INTO v_request 
  FROM public.agent_deposit_requests 
  WHERE id = p_request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or not pending');
  END IF;
  
  -- Update request status
  UPDATE public.agent_deposit_requests 
  SET status = 'approved', 
      admin_notes = p_admin_notes,
      updated_at = now()
  WHERE id = p_request_id;
  
  -- Update agent balance
  UPDATE public.agents 
  SET balance = COALESCE(balance, 0) + v_request.amount_nova,
      updated_at = now()
  WHERE id = v_request.agent_id;
  
  -- Get updated balance
  SELECT balance INTO v_agent_balance 
  FROM public.agents 
  WHERE id = v_request.agent_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Deposit approved and balance updated',
    'new_balance', v_agent_balance
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- 7. SIMPLE ADMIN MANAGE AGENT
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_manage_agent(
  p_agent_id UUID,
  p_action TEXT -- 'approve' or 'suspend'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_new_status TEXT;
BEGIN
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied: Admin required');
  END IF;
  
  -- Determine new status
  v_new_status := CASE p_action 
    WHEN 'approve' THEN 'active'
    WHEN 'suspend' THEN 'suspended'
    ELSE 'pending'
  END;
  
  -- Update agent status
  UPDATE public.agents 
  SET status = v_new_status,
      updated_at = now()
  WHERE id = p_agent_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agent not found');
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Agent status updated to ' || v_new_status,
    'new_status', v_new_status
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- 8. SIMPLE RLS POLICIES
-- ============================================================

-- Agents table policies
CREATE POLICY "agents_select_admin" ON public.agents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "agents_select_public_active" ON public.agents
  FOR SELECT USING (status = 'active');

CREATE POLICY "agents_select_own" ON public.agents
  FOR SELECT USING (auth.uid() = user_id);

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

-- Deposit requests table policies
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

-- ============================================================
-- 9. GRANT PERMISSIONS
-- ============================================================
GRANT EXECUTE ON FUNCTION public.apply_as_agent TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_agents TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_all_agents TO authenticated;
GRANT EXECUTE ON FUNCTION public.agent_request_deposit TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_deposit_requests TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_deposit TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_manage_agent TO authenticated;
