DROP VIEW IF EXISTS public.p2p_marketplace_orders;
CREATE VIEW public.p2p_marketplace_orders AS
SELECT 
  o.id, o.order_type, o.nova_amount, o.local_amount, o.exchange_rate,
  o.country, o.time_limit_minutes, o.status, o.created_at, o.expires_at,
  p.name AS creator_name,
  p.username AS creator_username,
  p.avatar_url AS creator_avatar_url,
  p.country AS creator_country,
  COALESCE(r.positive_ratings, 0) AS positive_ratings,
  COALESCE(r.negative_ratings, 0) AS negative_ratings,
  COALESCE(r.total_trades, 0) AS total_trades,
  COALESCE(r.reputation_score, 100) AS reputation_score,
  (o.creator_id = auth.uid()) AS is_own_order
FROM p2p_orders o
JOIN profiles p ON p.user_id = o.creator_id
LEFT JOIN p2p_user_reputation r ON r.user_id = o.creator_id
WHERE o.status = 'open';