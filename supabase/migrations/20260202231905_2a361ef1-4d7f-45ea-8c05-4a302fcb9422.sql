-- Fix the security definer view issue by using security_invoker
DROP VIEW IF EXISTS public.p2p_user_reputation;

CREATE VIEW public.p2p_user_reputation 
WITH (security_invoker = true)
AS
SELECT 
  u.user_id,
  COUNT(DISTINCT o.id) AS total_trades,
  COALESCE(SUM(CASE WHEN r.rating = 1 THEN 1 ELSE 0 END), 0) AS positive_ratings,
  COALESCE(SUM(CASE WHEN r.rating = -1 THEN 1 ELSE 0 END), 0) AS negative_ratings,
  CASE 
    WHEN COUNT(r.id) = 0 THEN 100
    ELSE ROUND((SUM(CASE WHEN r.rating = 1 THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(r.id), 0)) * 100, 1)
  END AS reputation_score
FROM profiles u
LEFT JOIN p2p_orders o ON (o.creator_id = u.user_id OR o.executor_id = u.user_id) AND o.status = 'completed'
LEFT JOIN p2p_ratings r ON r.rated_id = u.user_id
GROUP BY u.user_id;