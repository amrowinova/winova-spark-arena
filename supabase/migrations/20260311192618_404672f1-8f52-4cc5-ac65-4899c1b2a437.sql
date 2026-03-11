CREATE OR REPLACE VIEW public.p2p_marketplace_orders AS
SELECT 
  o.id,
  o.order_type,
  o.nova_amount,
  o.local_amount,
  o.exchange_rate,
  o.country,
  o.time_limit_minutes,
  o.status,
  o.created_at,
  p.name AS creator_name,
  p.username AS creator_username,
  p.avatar_url AS creator_avatar_url,
  p.country AS creator_country
FROM p2p_orders o
JOIN profiles p ON p.user_id = o.creator_id
WHERE o.status = 'open';