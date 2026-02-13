
-- Fix the stuck escrow check to use correct enum values
CREATE OR REPLACE FUNCTION public.run_load_simulation(
  p_transfer_count integer DEFAULT 100,
  p_intensity text DEFAULT 'medium'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_time timestamptz := clock_timestamp();
  v_total_nova_before numeric;
  v_total_nova_after numeric;
  v_transfer_success integer := 0;
  v_transfer_fail integer := 0;
  v_deadlock_count integer := 0;
  v_lock_wait_count integer := 0;
  v_msg_success integer := 0;
  v_notif_success integer := 0;
  v_desync_count integer := 0;
  v_stuck_escrow integer := 0;
  v_min_ms numeric := 999999;
  v_max_ms numeric := 0;
  v_total_ms numeric := 0;
  v_t0 timestamptz;
  v_elapsed numeric;
  v_result jsonb;
  v_transfer_result jsonb;
  v_wallets jsonb[];
  v_sender_id uuid;
  v_recipient_id uuid;
  v_i integer;
  v_wallet_count integer;
  v_err_msg text;
  v_sqlstate text;
BEGIN
  SELECT coalesce(sum(nova_balance), 0) INTO v_total_nova_before FROM wallets;

  SELECT array_agg(jsonb_build_object('user_id', user_id, 'wallet_id', id, 'balance', nova_balance))
  INTO v_wallets
  FROM (
    SELECT user_id, id, nova_balance FROM wallets WHERE nova_balance >= 2 ORDER BY nova_balance DESC LIMIT 30
  ) w;

  v_wallet_count := coalesce(array_length(v_wallets, 1), 0);
  IF v_wallet_count < 2 THEN
    RETURN jsonb_build_object('error', 'Not enough funded wallets', 'funded_wallets', v_wallet_count);
  END IF;

  -- PHASE 1: TRANSFER STORM
  FOR v_i IN 1..p_transfer_count LOOP
    BEGIN
      v_sender_id := (v_wallets[1 + (floor(random() * v_wallet_count))::int] ->> 'user_id')::uuid;
      v_recipient_id := (v_wallets[1 + (floor(random() * v_wallet_count))::int] ->> 'user_id')::uuid;
      IF v_sender_id = v_recipient_id THEN
        v_recipient_id := (v_wallets[1 + ((floor(random() * v_wallet_count))::int + 1) % v_wallet_count] ->> 'user_id')::uuid;
      END IF;

      v_t0 := clock_timestamp();
      SELECT public.execute_transfer(
        v_sender_id, v_recipient_id, 1, 'nova'::currency_type,
        'load_test', null, '[LOAD_TEST] #' || v_i, null
      ) INTO v_transfer_result;

      v_elapsed := extract(milliseconds from clock_timestamp() - v_t0);
      v_total_ms := v_total_ms + v_elapsed;
      IF v_elapsed < v_min_ms THEN v_min_ms := v_elapsed; END IF;
      IF v_elapsed > v_max_ms THEN v_max_ms := v_elapsed; END IF;

      IF (v_transfer_result ->> 'success')::boolean THEN
        v_transfer_success := v_transfer_success + 1;
      ELSE
        v_transfer_fail := v_transfer_fail + 1;
      END IF;
    EXCEPTION 
      WHEN deadlock_detected THEN
        v_deadlock_count := v_deadlock_count + 1;
        v_transfer_fail := v_transfer_fail + 1;
      WHEN lock_not_available THEN
        v_lock_wait_count := v_lock_wait_count + 1;
        v_transfer_fail := v_transfer_fail + 1;
      WHEN OTHERS THEN
        v_transfer_fail := v_transfer_fail + 1;
    END;
  END LOOP;

  -- PHASE 2: MESSAGE FLOOD
  BEGIN
    INSERT INTO direct_messages (sender_id, recipient_id, content)
    SELECT 
      (v_wallets[1 + (floor(random() * v_wallet_count))::int] ->> 'user_id')::uuid,
      (v_wallets[1 + ((floor(random() * v_wallet_count))::int + 1) % v_wallet_count] ->> 'user_id')::uuid,
      '[LOAD_TEST] msg ' || g
    FROM generate_series(1, LEAST(p_transfer_count * 5, 500)) g;
    GET DIAGNOSTICS v_msg_success = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN v_msg_success := 0;
  END;

  -- PHASE 3: NOTIFICATION SPIKE
  BEGIN
    INSERT INTO notifications (user_id, title, title_ar, body, body_ar, type)
    SELECT 
      (v_wallets[1 + (floor(random() * v_wallet_count))::int] ->> 'user_id')::uuid,
      '[LOAD_TEST] Alert', '[LOAD_TEST] تنبيه',
      'Load test #' || g, 'اختبار #' || g, 'system'
    FROM generate_series(1, LEAST(p_transfer_count * 3, 300)) g;
    GET DIAGNOSTICS v_notif_success = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN v_notif_success := 0;
  END;

  -- INTEGRITY CHECKS
  SELECT coalesce(sum(nova_balance), 0) INTO v_total_nova_after FROM wallets;

  SELECT count(*) INTO v_desync_count
  FROM wallets w
  WHERE w.nova_balance <> (
    SELECT coalesce(sum(l.amount), 0) FROM wallet_ledger l WHERE l.wallet_id = w.id AND l.currency = 'nova'
  );

  SELECT count(*) INTO v_stuck_escrow
  FROM p2p_orders
  WHERE status IN ('matched'::p2p_order_status, 'awaiting_payment'::p2p_order_status, 'payment_sent'::p2p_order_status)
  AND created_at < now() - interval '24 hours';

  -- COMPILE REPORT
  RETURN jsonb_build_object(
    'simulation', jsonb_build_object(
      'intensity', p_intensity,
      'duration_ms', round(extract(milliseconds from clock_timestamp() - v_start_time)),
      'wallets_used', v_wallet_count,
      'transfers_requested', p_transfer_count
    ),
    'transfer_storm', jsonb_build_object(
      'successes', v_transfer_success,
      'failures', v_transfer_fail,
      'deadlocks', v_deadlock_count,
      'lock_waits', v_lock_wait_count,
      'success_rate', round(v_transfer_success::numeric / GREATEST(p_transfer_count, 1) * 100, 1) || '%',
      'latency_min_ms', round(v_min_ms, 1),
      'latency_avg_ms', round(v_total_ms / GREATEST(p_transfer_count, 1), 1),
      'latency_max_ms', round(v_max_ms, 1)
    ),
    'messaging_flood', jsonb_build_object('inserted', v_msg_success),
    'notification_spike', jsonb_build_object('inserted', v_notif_success),
    'integrity', jsonb_build_object(
      'nova_supply_before', v_total_nova_before,
      'nova_supply_after', v_total_nova_after,
      'supply_drift', abs(v_total_nova_after - v_total_nova_before),
      'supply_conserved', abs(v_total_nova_after - v_total_nova_before) < 0.01,
      'wallet_ledger_desync', v_desync_count,
      'stuck_escrows', v_stuck_escrow
    ),
    'verdict', jsonb_build_object(
      'no_money_mismatch', abs(v_total_nova_after - v_total_nova_before) < 0.01 AND v_desync_count = 0,
      'no_deadlocks', v_deadlock_count = 0,
      'no_stuck_escrow', v_stuck_escrow = 0,
      'acceptable_latency', v_max_ms < 10000,
      'OVERALL', CASE 
        WHEN abs(v_total_nova_after - v_total_nova_before) < 0.01 AND v_desync_count = 0 AND v_deadlock_count = 0 AND v_stuck_escrow = 0 AND v_max_ms < 10000
        THEN 'PASS' ELSE 'ISSUES_DETECTED'
      END
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_load_simulation FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_load_simulation FROM anon;
REVOKE EXECUTE ON FUNCTION public.run_load_simulation FROM authenticated;
