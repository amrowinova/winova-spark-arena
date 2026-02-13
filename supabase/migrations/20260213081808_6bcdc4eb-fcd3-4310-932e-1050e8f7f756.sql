
-- Fix security definer view issue by making it SECURITY INVOKER
DROP VIEW IF EXISTS public.support_staff_metrics;

CREATE VIEW public.support_staff_metrics
WITH (security_invoker = true)
AS
SELECT
  s.staff_id,
  p.name AS staff_name,
  COUNT(DISTINCT s.order_id) AS total_ratings,
  COUNT(*) FILTER (WHERE s.rating = 'up') AS positive_ratings,
  COUNT(*) FILTER (WHERE s.rating = 'down') AS negative_ratings,
  ROUND(
    COUNT(*) FILTER (WHERE s.rating = 'up') * 100.0 / NULLIF(COUNT(*), 0), 1
  ) AS positive_pct,
  (SELECT COUNT(DISTINCT da.order_id) FROM p2p_dispute_actions da WHERE da.staff_id = s.staff_id AND da.action_type IN ('release_to_buyer', 'refund_seller')) AS cases_handled,
  (SELECT COUNT(DISTINCT da.order_id) FROM p2p_dispute_actions da WHERE da.staff_id = s.staff_id AND da.action_type = 'escalate') AS escalations,
  (SELECT COUNT(DISTINCT da.order_id) FROM p2p_dispute_actions da WHERE da.staff_id = s.staff_id AND da.action_type = 'mark_fraud') AS fraud_flags
FROM support_agent_ratings s
LEFT JOIN profiles p ON p.user_id = s.staff_id
GROUP BY s.staff_id, p.name;
