-- Auto-cleanup logs older than 90 days
-- Runs daily at 3:00 AM UTC via pg_cron
-- Protected tables (never touched): wallet_ledger, p2p_orders, decision_history, freeze_controls, veto_events

CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete user notifications older than 90 days
  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '90 days';

  -- Delete P2P messages that belong to orders completed or cancelled more than 90 days ago
  DELETE FROM p2p_messages
  WHERE order_id IN (
    SELECT id FROM p2p_orders
    WHERE status IN ('completed', 'cancelled', 'expired')
      AND updated_at < NOW() - INTERVAL '90 days'
  );

  -- Delete votes that belong to contests completed more than 90 days ago
  DELETE FROM votes
  WHERE contest_id IN (
    SELECT id FROM contests
    WHERE status = 'completed'
      AND updated_at < NOW() - INTERVAL '90 days'
  );
END;
$$;

-- Schedule daily cleanup at 3:00 AM UTC
SELECT cron.schedule(
  'daily-log-cleanup',
  '0 3 * * *',
  $$ SELECT cleanup_old_logs() $$
);
