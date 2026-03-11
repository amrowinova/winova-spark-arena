
SELECT cron.schedule(
  'p2p-auto-expire',
  '*/5 * * * *',
  $$
  SELECT p2p_expire_order(id)
  FROM p2p_orders
  WHERE status IN ('awaiting_payment', 'payment_sent')
    AND matched_at IS NOT NULL
    AND matched_at + (time_limit_minutes * interval '1 minute') < NOW();
  $$
);
