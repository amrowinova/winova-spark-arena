-- ============================================================
-- AGENT SYSTEM: Simple Direct Query Fix
-- ============================================================

-- Create a very simple RPC that just returns all active agents
CREATE OR REPLACE FUNCTION public.get_all_agents_simple()
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
  WHERE a.status = 'active'
  ORDER BY a.trust_score DESC, a.avg_rating DESC;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_agents_simple TO authenticated;

-- Also create a JSON version for easier frontend use
CREATE OR REPLACE FUNCTION public.get_all_agents_json()
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

GRANT EXECUTE ON FUNCTION public.get_all_agents_json TO authenticated;
