-- ============================================================
-- AGENT SYSTEM: Add get_nearest_agents RPC for P2P Integration
-- ============================================================

-- Add get_nearest_agents RPC specifically for P2P integration
CREATE OR REPLACE FUNCTION public.get_nearest_agents(
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_limit INT DEFAULT 5
)
RETURNS TABLE(
  id UUID,
  shop_name TEXT,
  distance_km NUMERIC,
  avg_rating NUMERIC,
  trust_score NUMERIC,
  exchange_rate NUMERIC,
  whatsapp TEXT,
  city TEXT,
  user_id UUID
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.shop_name,
    (6371 * acos(cos(radians(p_latitude)) * cos(radians(a.latitude)) * cos(radians(a.longitude) - radians(p_longitude)) + sin(radians(p_latitude)) * sin(radians(a.latitude))))::NUMERIC AS distance_km,
    a.avg_rating,
    a.trust_score,
    a.exchange_rate,
    a.whatsapp,
    a.city,
    a.user_id
  FROM agents a
  WHERE a.status = 'active'
    AND a.latitude IS NOT NULL 
    AND a.longitude IS NOT NULL
  ORDER BY distance_km, a.avg_rating DESC, a.exchange_rate ASC
  LIMIT p_limit;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_nearest_agents TO authenticated;
