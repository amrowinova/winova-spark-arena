-- Fix Missing RPCs and Select Issues
-- Migration to create missing RPCs for the agent system

-- 1. Create get_active_agents RPC for public view
CREATE OR REPLACE FUNCTION get_active_agents()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', id,
      'user_id', user_id,
      'shop_name', shop_name,
      'whatsapp', whatsapp,
      'country', country,
      'city', city,
      'avg_rating', avg_rating,
      'trust_score', trust_score,
      'commission_pct', commission_pct,
      'bio', bio,
      'latitude', latitude,
      'longitude', longitude,
      'status', status,
      'created_at', created_at,
      'updated_at', updated_at,
      'balance', balance
    )
  )
  INTO result
  FROM agents
  WHERE status = 'active';
  
  RETURN COALESCE(result, '[]'::JSON);
END;
$$;

-- 2. Create get_my_agent_profile RPC for agent dashboard
CREATE OR REPLACE FUNCTION get_my_agent_profile()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  current_user_id UUID;
BEGIN
  -- Get current authenticated user ID
  SELECT auth.uid() INTO current_user_id;
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('found', false);
  END IF;
  
  -- Get agent profile
  SELECT json_build_object(
    'found', true,
    'id', id,
    'user_id', user_id,
    'shop_name', shop_name,
    'whatsapp', whatsapp,
    'country', country,
    'city', city,
    'commission_pct', commission_pct,
    'bio', bio,
    'status', status,
    'avg_rating', avg_rating,
    'trust_score', trust_score,
    'total_reviews', total_reviews,
    'total_completed', total_completed,
    'total_disputes', total_disputes,
    'balance', balance,
    'created_at', created_at,
    'updated_at', updated_at
  )
  INTO result
  FROM agents
  WHERE user_id = current_user_id;
  
  IF result IS NULL THEN
    RETURN json_build_object('found', false);
  END IF;
  
  RETURN result;
END;
$$;

-- 3. Create agent_request_deposit RPC for deposit requests
CREATE OR REPLACE FUNCTION agent_request_deposit(
  p_amount_nova BIGINT,
  p_payment_method TEXT,
  p_payment_reference TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  current_user_id UUID;
  agent_record RECORD;
BEGIN
  -- Get current authenticated user ID
  SELECT auth.uid() INTO current_user_id;
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Check if user is an active agent
  SELECT * INTO agent_record
  FROM agents
  WHERE user_id = current_user_id AND status = 'active';
  
  IF agent_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User is not an active agent');
  END IF;
  
  -- Create deposit request
  INSERT INTO agent_deposit_requests (
    agent_id,
    amount_nova,
    payment_method,
    payment_reference,
    status,
    created_at,
    updated_at
  ) VALUES (
    agent_record.id,
    p_amount_nova,
    p_payment_method,
    p_payment_reference,
    'pending',
    NOW(),
    NOW()
  )
  RETURNING id
  INTO result;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Deposit request submitted successfully',
    'request_id', result
  );
END;
$$;

-- 4. Create get_countries RPC for country selection
CREATE OR REPLACE FUNCTION get_countries()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', id,
      'code', code,
      'name_ar', name_ar,
      'name_en', name_en,
      'dial_code', dial_code
    )
  )
  INTO result
  FROM countries
  ORDER BY name_en;
  
  RETURN COALESCE(result, '[]'::JSON);
END;
$$;

-- 5. Create get_cities_by_country RPC for city selection
CREATE OR REPLACE FUNCTION get_cities_by_country(p_country_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', id,
      'name_ar', name_ar,
      'name_en', name_en
    )
  )
  INTO result
  FROM cities
  WHERE country_code = p_country_code
  ORDER BY name_en;
  
  RETURN COALESCE(result, '[]'::JSON);
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_active_agents() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_agent_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION agent_request_deposit(BIGINT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_countries() TO authenticated;
GRANT EXECUTE ON FUNCTION get_cities_by_country(TEXT) TO authenticated;

-- Grant execute permissions to service_role for admin functions
GRANT EXECUTE ON FUNCTION admin_get_all_agents() TO service_role;
GRANT EXECUTE ON FUNCTION admin_get_deposit_requests(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION admin_approve_deposit(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION admin_manage_agent(TEXT, TEXT) TO service_role;
