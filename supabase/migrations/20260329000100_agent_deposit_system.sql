-- ══════════════════════════════════════════════════════════════════════════════
-- Agent Deposit Request System
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Table
CREATE TABLE IF NOT EXISTS agent_deposit_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_nova       numeric(14,4) NOT NULL CHECK (amount_nova > 0),
  amount_local      numeric(14,2),
  payment_method    text NOT NULL DEFAULT 'bank_transfer',
  payment_reference text NOT NULL DEFAULT '',
  admin_notes       text,
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected','completed')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz
);

ALTER TABLE agent_deposit_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "agent_deposit_requests_own_read"
    ON agent_deposit_requests FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "agent_deposit_requests_own_insert"
    ON agent_deposit_requests FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. agent_request_deposit
CREATE OR REPLACE FUNCTION agent_request_deposit(
  p_amount_nova       numeric,
  p_payment_method    text,
  p_payment_reference text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_agent_id uuid;
BEGIN
  SELECT id INTO v_agent_id FROM agents WHERE user_id = auth.uid() AND status = 'active';
  IF v_agent_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active agent profile');
  END IF;
  INSERT INTO agent_deposit_requests (agent_id, user_id, amount_nova, payment_method, payment_reference)
  VALUES (v_agent_id, auth.uid(), p_amount_nova, p_payment_method, p_payment_reference);
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3. get_agent_deposit_requests
CREATE OR REPLACE FUNCTION get_agent_deposit_requests()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'id', r.id, 'amount_nova', r.amount_nova, 'amount_local', r.amount_local,
    'payment_method', r.payment_method, 'payment_reference', r.payment_reference,
    'admin_notes', r.admin_notes, 'status', r.status,
    'created_at', r.created_at, 'completed_at', r.completed_at
  ) ORDER BY r.created_at DESC)
  INTO v_result FROM agent_deposit_requests r WHERE r.user_id = auth.uid();
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- 4. admin_get_all_deposit_requests
CREATE OR REPLACE FUNCTION admin_get_all_deposit_requests(p_status text DEFAULT 'pending')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_result jsonb;
BEGIN
  IF NOT (SELECT has_role(auth.uid(), 'admin')) THEN RAISE EXCEPTION 'Access denied'; END IF;
  SELECT jsonb_agg(jsonb_build_object(
    'id', r.id, 'agent_id', r.agent_id,
    'amount_nova', r.amount_nova, 'amount_local', r.amount_local,
    'payment_method', r.payment_method, 'payment_reference', r.payment_reference,
    'admin_notes', r.admin_notes, 'status', r.status,
    'created_at', r.created_at, 'completed_at', r.completed_at,
    'agent_shop_name', a.shop_name, 'agent_country', a.country,
    'agent_city', a.city, 'agent_balance', w.balance
  ) ORDER BY r.created_at DESC)
  INTO v_result
  FROM agent_deposit_requests r
  JOIN agents a ON a.id = r.agent_id
  LEFT JOIN wallets w ON w.user_id = r.user_id
  WHERE (p_status = 'all' OR r.status = p_status);
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- 5. admin_approve_deposit
CREATE OR REPLACE FUNCTION admin_approve_deposit(
  p_request_id  uuid,
  p_admin_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_req    agent_deposit_requests%ROWTYPE;
  v_wallet wallets%ROWTYPE;
BEGIN
  IF NOT (SELECT has_role(auth.uid(), 'admin')) THEN RAISE EXCEPTION 'Access denied'; END IF;

  SELECT * INTO v_req FROM agent_deposit_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Not found'); END IF;
  IF v_req.status <> 'pending' THEN RETURN jsonb_build_object('success', false, 'error', 'Already processed'); END IF;

  SELECT * INTO v_wallet FROM wallets WHERE user_id = v_req.user_id;

  UPDATE wallets SET balance = balance + v_req.amount_nova, updated_at = now()
  WHERE user_id = v_req.user_id;

  INSERT INTO wallet_ledger (user_id, wallet_id, entry_type, currency, amount,
    balance_before, balance_after, reference_type, reference_id, description)
  VALUES (v_req.user_id, v_wallet.id, 'admin_credit', 'nova', v_req.amount_nova,
    v_wallet.balance, v_wallet.balance + v_req.amount_nova,
    'agent_deposit', v_req.id, 'Agent deposit approved');

  UPDATE agent_deposit_requests
  SET status = 'approved', admin_notes = p_admin_notes, completed_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 6. admin_reject_deposit
CREATE OR REPLACE FUNCTION admin_reject_deposit(
  p_request_id uuid,
  p_reason     text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT (SELECT has_role(auth.uid(), 'admin')) THEN RAISE EXCEPTION 'Access denied'; END IF;
  UPDATE agent_deposit_requests
  SET status = 'rejected', admin_notes = p_reason, completed_at = now()
  WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Not found or already processed'); END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;
