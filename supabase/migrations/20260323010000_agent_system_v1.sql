/**
 * Agent System V1 — Core
 * ──────────────────────
 * Location-based agents for Nova deposit/withdraw with escrow protection.
 *
 * Tables:
 *   agents              — verified agent profiles
 *   agent_reservations  — deposit/withdraw bookings
 *   agent_reviews       — ratings after completion
 *
 * Flow:
 *   User creates reservation (pending)
 *   → Agent accepts (Nova locked in escrow)
 *   → Both parties confirm in person
 *   → Nova released to recipient
 *   → User rates agent
 *
 * Escrow model:
 *   withdraw (user → cash): user's Nova locked → released to agent on completion
 *   deposit  (cash → user): agent's Nova locked → released to user on completion
 */

-- ── 0. Extend ledger_entry_type enum ─────────────────────────────────────────
ALTER TYPE public.ledger_entry_type ADD VALUE IF NOT EXISTS 'agent_escrow_lock';
ALTER TYPE public.ledger_entry_type ADD VALUE IF NOT EXISTS 'agent_escrow_release';
ALTER TYPE public.ledger_entry_type ADD VALUE IF NOT EXISTS 'streak_reward';

-- ── 1. agents ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  shop_name         TEXT NOT NULL,
  whatsapp          TEXT NOT NULL,
  country           TEXT NOT NULL,
  city              TEXT NOT NULL,
  latitude          DECIMAL(10,7),
  longitude         DECIMAL(10,7),
  commission_pct    DECIMAL(5,2) NOT NULL DEFAULT 3.0
                      CHECK (commission_pct >= 0 AND commission_pct <= 20),
  bio               TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'verified', 'suspended')),
  avg_rating        DECIMAL(3,2) NOT NULL DEFAULT 0.0
                      CHECK (avg_rating >= 0 AND avg_rating <= 5),
  total_reviews     INTEGER NOT NULL DEFAULT 0,
  total_completed   INTEGER NOT NULL DEFAULT 0,
  verified_at       TIMESTAMPTZ,
  suspended_at      TIMESTAMPTZ,
  suspended_reason  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can browse verified agents
CREATE POLICY "agents_select_verified"
  ON public.agents FOR SELECT
  USING (status = 'verified' OR auth.uid() = user_id);

-- Only service_role inserts (via RPC)
CREATE POLICY "agents_insert_via_rpc"
  ON public.agents FOR INSERT
  WITH CHECK (false);

CREATE POLICY "agents_update_via_rpc"
  ON public.agents FOR UPDATE
  USING (false);

-- ── 2. agent_reservations ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_reservations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id              UUID NOT NULL REFERENCES public.agents(id) ON DELETE RESTRICT,
  user_id               UUID NOT NULL REFERENCES auth.users(id)  ON DELETE RESTRICT,
  type                  TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw')),
  nova_amount           DECIMAL(20,6) NOT NULL CHECK (nova_amount > 0),
  fiat_amount           DECIMAL(20,2),
  fiat_currency         TEXT,
  commission_pct        DECIMAL(5,2) NOT NULL DEFAULT 3.0,
  commission_nova       DECIMAL(20,6) NOT NULL DEFAULT 0,
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN (
                            'pending', 'rejected', 'escrow',
                            'completed', 'cancelled', 'disputed', 'resolved'
                          )),
  escrow_holder         TEXT CHECK (escrow_holder IN ('user', 'agent')),
  user_confirmed_at     TIMESTAMPTZ,
  agent_confirmed_at    TIMESTAMPTZ,
  cancelled_by          TEXT CHECK (cancelled_by IN ('user', 'agent', 'system')),
  cancellation_reason   TEXT,
  dispute_reason        TEXT,
  dispute_raised_by     UUID REFERENCES auth.users(id),
  dispute_resolved_by   UUID REFERENCES auth.users(id),
  dispute_resolution    TEXT CHECK (
                          dispute_resolution IN ('release_to_user', 'release_to_agent')
                          OR dispute_resolution IS NULL
                        ),
  dispute_resolved_at   TIMESTAMPTZ,
  notes                 TEXT,
  expires_at            TIMESTAMPTZ NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agent_reservations ENABLE ROW LEVEL SECURITY;

-- User sees their own reservations
CREATE POLICY "reservations_select_user"
  ON public.agent_reservations FOR SELECT
  USING (
    auth.uid() = user_id OR
    auth.uid() IN (SELECT user_id FROM public.agents WHERE id = agent_id)
  );

CREATE POLICY "reservations_insert_via_rpc"
  ON public.agent_reservations FOR INSERT WITH CHECK (false);

CREATE POLICY "reservations_update_via_rpc"
  ON public.agent_reservations FOR UPDATE USING (false);

-- ── 3. agent_reviews ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  UUID UNIQUE NOT NULL
                    REFERENCES public.agent_reservations(id) ON DELETE CASCADE,
  agent_id        UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  reviewer_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT NOT NULL,
  has_issue       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agent_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_select_public"
  ON public.agent_reviews FOR SELECT USING (true);

CREATE POLICY "reviews_insert_via_rpc"
  ON public.agent_reviews FOR INSERT WITH CHECK (false);

-- ── 4. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_agents_status_country
  ON public.agents (status, country, city);

CREATE INDEX IF NOT EXISTS idx_agent_reservations_user
  ON public.agent_reservations (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_reservations_agent
  ON public.agent_reservations (agent_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_reviews_agent
  ON public.agent_reviews (agent_id, created_at DESC);

-- ── 5. apply_as_agent ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.apply_as_agent(
  p_shop_name   TEXT,
  p_whatsapp    TEXT,
  p_country     TEXT,
  p_city        TEXT,
  p_latitude    DECIMAL DEFAULT NULL,
  p_longitude   DECIMAL DEFAULT NULL,
  p_bio         TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check not already an agent (pending or verified)
  IF EXISTS (
    SELECT 1 FROM public.agents
    WHERE user_id = v_uid AND status IN ('pending', 'verified')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already applied or verified as agent');
  END IF;

  -- Validate required fields
  IF trim(p_shop_name) = '' OR trim(p_whatsapp) = '' OR
     trim(p_country)   = '' OR trim(p_city)      = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'All required fields must be filled');
  END IF;

  -- Insert or re-apply if previously suspended
  INSERT INTO public.agents (
    user_id, shop_name, whatsapp, country, city,
    latitude, longitude, bio, status
  ) VALUES (
    v_uid, trim(p_shop_name), trim(p_whatsapp), trim(p_country), trim(p_city),
    p_latitude, p_longitude, p_bio, 'pending'
  )
  ON CONFLICT (user_id) DO UPDATE
    SET shop_name  = EXCLUDED.shop_name,
        whatsapp   = EXCLUDED.whatsapp,
        country    = EXCLUDED.country,
        city       = EXCLUDED.city,
        latitude   = EXCLUDED.latitude,
        longitude  = EXCLUDED.longitude,
        bio        = EXCLUDED.bio,
        status     = 'pending',
        suspended_at     = NULL,
        suspended_reason = NULL,
        updated_at = NOW()
    WHERE public.agents.status = 'suspended';

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_as_agent(TEXT,TEXT,TEXT,TEXT,DECIMAL,DECIMAL,TEXT) TO authenticated;

-- ── 6. get_nearby_agents ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_nearby_agents(
  p_country   TEXT    DEFAULT NULL,
  p_city      TEXT    DEFAULT NULL,
  p_latitude  DECIMAL DEFAULT NULL,
  p_longitude DECIMAL DEFAULT NULL,
  p_limit     INTEGER DEFAULT 30
)
RETURNS TABLE (
  id              UUID,
  user_id         UUID,
  shop_name       TEXT,
  whatsapp        TEXT,
  country         TEXT,
  city            TEXT,
  latitude        DECIMAL,
  longitude       DECIMAL,
  commission_pct  DECIMAL,
  bio             TEXT,
  avg_rating      DECIMAL,
  total_reviews   INTEGER,
  total_completed INTEGER,
  distance_km     DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id, a.user_id, a.shop_name, a.whatsapp,
    a.country, a.city, a.latitude, a.longitude,
    a.commission_pct, a.bio,
    a.avg_rating, a.total_reviews, a.total_completed,
    CASE
      WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL
           AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL
      THEN ROUND(CAST(
        6371 * acos(LEAST(1.0,
          cos(radians(p_latitude)) * cos(radians(a.latitude)) *
          cos(radians(a.longitude) - radians(p_longitude)) +
          sin(radians(p_latitude)) * sin(radians(a.latitude))
        ))
      AS DECIMAL), 1)
      ELSE NULL
    END AS distance_km
  FROM public.agents a
  WHERE
    a.status = 'verified'
    AND (p_country IS NULL OR lower(a.country) = lower(p_country))
    AND (p_city    IS NULL OR lower(a.city)    = lower(p_city))
  ORDER BY
    CASE
      WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL
           AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL
      THEN 6371 * acos(LEAST(1.0,
        cos(radians(p_latitude)) * cos(radians(a.latitude)) *
        cos(radians(a.longitude) - radians(p_longitude)) +
        sin(radians(p_latitude)) * sin(radians(a.latitude))
      ))
      ELSE a.avg_rating * -1  -- fallback: sort by rating desc
    END ASC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_nearby_agents(TEXT,TEXT,DECIMAL,DECIMAL,INTEGER) TO authenticated;

-- ── 7. create_agent_reservation ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_agent_reservation(
  p_agent_id      UUID,
  p_type          TEXT,        -- 'deposit' | 'withdraw'
  p_nova_amount   DECIMAL,
  p_fiat_amount   DECIMAL  DEFAULT NULL,
  p_fiat_currency TEXT     DEFAULT NULL,
  p_notes         TEXT     DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid           UUID := auth.uid();
  v_agent         RECORD;
  v_wallet        RECORD;
  v_commission    DECIMAL;
  v_reservation_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_type NOT IN ('deposit', 'withdraw') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid reservation type');
  END IF;

  IF p_nova_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nova amount must be positive');
  END IF;

  -- Fetch agent
  SELECT * INTO v_agent FROM public.agents WHERE id = p_agent_id;
  IF NOT FOUND OR v_agent.status != 'verified' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agent not found or not verified');
  END IF;

  -- Agent cannot create reservation with themselves
  IF v_agent.user_id = v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot create reservation with yourself');
  END IF;

  -- For withdraw: check user has enough Nova
  IF p_type = 'withdraw' THEN
    SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_uid;
    IF NOT FOUND OR v_wallet.nova_balance < p_nova_amount THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient Nova balance');
    END IF;
    IF v_wallet.is_frozen THEN
      RETURN jsonb_build_object('success', false, 'error', 'Wallet is frozen');
    END IF;
  END IF;

  -- For deposit: check agent has enough Nova
  IF p_type = 'deposit' THEN
    SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_agent.user_id;
    IF NOT FOUND OR v_wallet.nova_balance < p_nova_amount THEN
      RETURN jsonb_build_object('success', false, 'error', 'Agent has insufficient Nova balance');
    END IF;
  END IF;

  -- Check no active reservation with same agent
  IF EXISTS (
    SELECT 1 FROM public.agent_reservations
    WHERE user_id  = v_uid
      AND agent_id = p_agent_id
      AND status IN ('pending', 'escrow')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have an active reservation with this agent');
  END IF;

  v_commission := ROUND(p_nova_amount * v_agent.commission_pct / 100, 6);

  INSERT INTO public.agent_reservations (
    agent_id, user_id, type, nova_amount, fiat_amount, fiat_currency,
    commission_pct, commission_nova, notes,
    escrow_holder,
    expires_at
  ) VALUES (
    p_agent_id, v_uid, p_type, p_nova_amount, p_fiat_amount, p_fiat_currency,
    v_agent.commission_pct, v_commission, p_notes,
    CASE p_type WHEN 'withdraw' THEN 'user' ELSE 'agent' END,
    NOW() + INTERVAL '24 hours'
  )
  RETURNING id INTO v_reservation_id;

  -- Notify agent
  INSERT INTO public.notifications (user_id, type, title, description, is_read, action_path)
  VALUES (
    v_agent.user_id,
    'agent_reservation',
    '📋 حجز جديد',
    'طلب حجز ' || p_type || ' بقيمة ' || p_nova_amount || ' Nova',
    false,
    '/agent-dashboard'
  );

  RETURN jsonb_build_object('success', true, 'reservation_id', v_reservation_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_agent_reservation(UUID,TEXT,DECIMAL,DECIMAL,TEXT,TEXT) TO authenticated;

-- ── 8. agent_respond_reservation ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.agent_respond_reservation(
  p_reservation_id UUID,
  p_accept         BOOLEAN,
  p_reject_reason  TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         UUID := auth.uid();
  v_reservation RECORD;
  v_agent       RECORD;
  v_wallet      RECORD;
  v_wallet_id   UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT r.*, a.user_id AS agent_user_id
    INTO v_reservation
    FROM public.agent_reservations r
    JOIN public.agents a ON a.id = r.agent_id
   WHERE r.id = p_reservation_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found');
  END IF;

  IF v_reservation.agent_user_id != v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_reservation.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation is not pending');
  END IF;

  -- Check expiry
  IF v_reservation.expires_at < NOW() THEN
    UPDATE public.agent_reservations
       SET status = 'cancelled', cancelled_by = 'system', updated_at = NOW()
     WHERE id = p_reservation_id;
    RETURN jsonb_build_object('success', false, 'error', 'Reservation has expired');
  END IF;

  IF NOT p_accept THEN
    -- Reject
    UPDATE public.agent_reservations
       SET status = 'rejected',
           cancellation_reason = p_reject_reason,
           updated_at = NOW()
     WHERE id = p_reservation_id;

    INSERT INTO public.notifications (user_id, type, title, description, is_read, action_path)
    VALUES (
      v_reservation.user_id,
      'agent_reservation_update',
      '❌ تم رفض الحجز',
      'رفض الوكيل طلب الحجز',
      false, '/agents'
    );

    RETURN jsonb_build_object('success', true, 'action', 'rejected');
  END IF;

  -- Accept: lock escrow
  -- For withdraw: lock user's Nova
  -- For deposit: lock agent's Nova
  IF v_reservation.escrow_holder = 'user' THEN
    -- Lock user Nova
    SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_reservation.user_id FOR UPDATE;
    IF NOT FOUND OR v_wallet.nova_balance < v_reservation.nova_amount THEN
      RETURN jsonb_build_object('success', false, 'error', 'User has insufficient Nova balance');
    END IF;
    IF v_wallet.is_frozen THEN
      RETURN jsonb_build_object('success', false, 'error', 'User wallet is frozen');
    END IF;
    v_wallet_id := v_wallet.id;

    UPDATE public.wallets
       SET nova_balance = nova_balance - v_reservation.nova_amount
     WHERE id = v_wallet_id;

    INSERT INTO public.wallet_ledger (
      wallet_id, user_id, entry_type, currency, amount, balance_after, description,
      reference_type, reference_id
    ) SELECT
      v_wallet_id, v_reservation.user_id,
      'agent_escrow_lock', 'nova',
      -v_reservation.nova_amount,
      nova_balance,
      'تجميد Nova للوكيل — حجز ' || p_reservation_id,
      'agent_reservation', p_reservation_id::TEXT
    FROM public.wallets WHERE id = v_wallet_id;

  ELSE
    -- Lock agent Nova (deposit type)
    SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_uid FOR UPDATE;
    IF NOT FOUND OR v_wallet.nova_balance < v_reservation.nova_amount THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient Nova balance to accept');
    END IF;
    v_wallet_id := v_wallet.id;

    UPDATE public.wallets
       SET nova_balance = nova_balance - v_reservation.nova_amount
     WHERE id = v_wallet_id;

    INSERT INTO public.wallet_ledger (
      wallet_id, user_id, entry_type, currency, amount, balance_after, description,
      reference_type, reference_id
    ) SELECT
      v_wallet_id, v_uid,
      'agent_escrow_lock', 'nova',
      -v_reservation.nova_amount,
      nova_balance,
      'تجميد Nova للمستخدم — حجز ' || p_reservation_id,
      'agent_reservation', p_reservation_id::TEXT
    FROM public.wallets WHERE id = v_wallet_id;
  END IF;

  UPDATE public.agent_reservations
     SET status = 'escrow', updated_at = NOW()
   WHERE id = p_reservation_id;

  INSERT INTO public.notifications (user_id, type, title, description, is_read, action_path)
  VALUES (
    v_reservation.user_id,
    'agent_reservation_update',
    '✅ الوكيل قبل طلبك',
    'قبل الوكيل الحجز — Nova محجوزة. قم بإتمام العملية في الواقع ثم أكد.',
    false, '/agents'
  );

  RETURN jsonb_build_object('success', true, 'action', 'accepted');
END;
$$;

GRANT EXECUTE ON FUNCTION public.agent_respond_reservation(UUID,BOOLEAN,TEXT) TO authenticated;

-- ── 9. confirm_agent_reservation ─────────────────────────────────────────────
-- Called by user OR agent to confirm their side of the deal.
-- When both confirm → auto-complete and release escrow.
CREATE OR REPLACE FUNCTION public.confirm_agent_reservation(
  p_reservation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          UUID := auth.uid();
  v_reservation  RECORD;
  v_agent        RECORD;
  v_is_agent     BOOLEAN;
  v_both_confirmed BOOLEAN;
  v_recipient_wallet RECORD;
  v_recipient_uid    UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT r.*, a.user_id AS agent_user_id
    INTO v_reservation
    FROM public.agent_reservations r
    JOIN public.agents a ON a.id = r.agent_id
   WHERE r.id = p_reservation_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found');
  END IF;

  IF v_reservation.status != 'escrow' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation is not in escrow state');
  END IF;

  -- Determine if caller is agent or user
  IF v_uid = v_reservation.agent_user_id THEN
    v_is_agent := true;
  ELSIF v_uid = v_reservation.user_id THEN
    v_is_agent := false;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Set confirmation timestamp
  IF v_is_agent THEN
    IF v_reservation.agent_confirmed_at IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Already confirmed');
    END IF;
    UPDATE public.agent_reservations
       SET agent_confirmed_at = NOW(), updated_at = NOW()
     WHERE id = p_reservation_id;
  ELSE
    IF v_reservation.user_confirmed_at IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Already confirmed');
    END IF;
    UPDATE public.agent_reservations
       SET user_confirmed_at = NOW(), updated_at = NOW()
     WHERE id = p_reservation_id;
  END IF;

  -- Re-fetch to check if both confirmed
  SELECT user_confirmed_at, agent_confirmed_at
    INTO v_reservation.user_confirmed_at, v_reservation.agent_confirmed_at
    FROM public.agent_reservations
   WHERE id = p_reservation_id;

  -- Manually merge the just-set value
  IF v_is_agent THEN
    v_both_confirmed := (v_reservation.user_confirmed_at IS NOT NULL);
  ELSE
    v_both_confirmed := (v_reservation.agent_confirmed_at IS NOT NULL);
  END IF;

  IF NOT v_both_confirmed THEN
    -- Notify other party that one side confirmed
    DECLARE
      v_notify_uid UUID;
      v_notify_msg TEXT;
    BEGIN
      IF v_is_agent THEN
        v_notify_uid := v_reservation.user_id;
        v_notify_msg := 'الوكيل أكد العملية — في انتظار تأكيدك';
      ELSE
        v_notify_uid := v_reservation.agent_user_id;
        v_notify_msg := 'المستخدم أكد العملية — في انتظار تأكيدك';
      END IF;

      INSERT INTO public.notifications (user_id, type, title, description, is_read, action_path)
      VALUES (v_notify_uid, 'agent_reservation_update', '⏳ تأكيد جزئي', v_notify_msg, false, '/agent-dashboard');
    END;

    RETURN jsonb_build_object('success', true, 'status', 'waiting_other_party');
  END IF;

  -- ── Both confirmed: release escrow ─────────────────────────────────────────
  -- Determine who receives the Nova
  -- withdraw: agent receives (escrow was user's Nova)
  -- deposit:  user receives (escrow was agent's Nova)
  IF v_reservation.type = 'withdraw' THEN
    v_recipient_uid := v_reservation.agent_user_id;
  ELSE
    v_recipient_uid := v_reservation.user_id;
  END IF;

  SELECT * INTO v_recipient_wallet
    FROM public.wallets WHERE user_id = v_recipient_uid FOR UPDATE;

  -- Credit Nova to recipient
  UPDATE public.wallets
     SET nova_balance = nova_balance + v_reservation.nova_amount
   WHERE id = v_recipient_wallet.id;

  INSERT INTO public.wallet_ledger (
    wallet_id, user_id, entry_type, currency, amount, balance_after, description,
    reference_type, reference_id
  ) SELECT
    v_recipient_wallet.id, v_recipient_uid,
    'agent_escrow_release', 'nova',
    v_reservation.nova_amount,
    nova_balance,
    CASE v_reservation.type
      WHEN 'withdraw' THEN 'استلام Nova من وكيل — حجز ' || p_reservation_id
      ELSE                  'استلام Nova من وكيل (إيداع) — حجز ' || p_reservation_id
    END,
    'agent_reservation', p_reservation_id::TEXT
  FROM public.wallets WHERE id = v_recipient_wallet.id;

  -- Mark completed + update agent stats
  UPDATE public.agent_reservations
     SET status = 'completed', updated_at = NOW()
   WHERE id = p_reservation_id;

  UPDATE public.agents
     SET total_completed = total_completed + 1,
         updated_at = NOW()
   WHERE id = v_reservation.agent_id;

  -- Notify both parties
  INSERT INTO public.notifications (user_id, type, title, description, is_read, action_path)
  VALUES
    (v_reservation.user_id, 'agent_reservation_update',
     '✅ عملية مكتملة!',
     'تمت العملية بنجاح — يمكنك الآن تقييم الوكيل',
     false, '/agents'),
    (v_reservation.agent_user_id, 'agent_reservation_update',
     '✅ عملية مكتملة',
     'تمت العملية بنجاح مع المستخدم',
     false, '/agent-dashboard');

  RETURN jsonb_build_object('success', true, 'status', 'completed');
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_agent_reservation(UUID) TO authenticated;

-- ── 10. cancel_agent_reservation ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_agent_reservation(
  p_reservation_id UUID,
  p_reason         TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         UUID := auth.uid();
  v_reservation RECORD;
  v_is_agent    BOOLEAN;
  v_wallet      RECORD;
  v_holder_uid  UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT r.*, a.user_id AS agent_user_id
    INTO v_reservation
    FROM public.agent_reservations r
    JOIN public.agents a ON a.id = r.agent_id
   WHERE r.id = p_reservation_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found');
  END IF;

  IF v_uid = v_reservation.agent_user_id THEN
    v_is_agent := true;
  ELSIF v_uid = v_reservation.user_id THEN
    v_is_agent := false;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_reservation.status NOT IN ('pending', 'escrow') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot cancel at this stage');
  END IF;

  -- If escrow is active: return Nova to original holder
  IF v_reservation.status = 'escrow' THEN
    IF v_reservation.escrow_holder = 'user' THEN
      v_holder_uid := v_reservation.user_id;
    ELSE
      v_holder_uid := v_reservation.agent_user_id;
    END IF;

    SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_holder_uid FOR UPDATE;

    UPDATE public.wallets
       SET nova_balance = nova_balance + v_reservation.nova_amount
     WHERE id = v_wallet.id;

    INSERT INTO public.wallet_ledger (
      wallet_id, user_id, entry_type, currency, amount, balance_after, description,
      reference_type, reference_id
    ) SELECT
      v_wallet.id, v_holder_uid,
      'agent_escrow_release', 'nova',
      v_reservation.nova_amount,
      nova_balance,
      'استرجاع Nova — إلغاء الحجز ' || p_reservation_id,
      'agent_reservation', p_reservation_id::TEXT
    FROM public.wallets WHERE id = v_wallet.id;
  END IF;

  UPDATE public.agent_reservations
     SET status = 'cancelled',
         cancelled_by = CASE WHEN v_is_agent THEN 'agent' ELSE 'user' END,
         cancellation_reason = p_reason,
         updated_at = NOW()
   WHERE id = p_reservation_id;

  -- Notify the other party
  DECLARE v_other_uid UUID;
  BEGIN
    v_other_uid := CASE WHEN v_is_agent THEN v_reservation.user_id ELSE v_reservation.agent_user_id END;
    INSERT INTO public.notifications (user_id, type, title, description, is_read, action_path)
    VALUES (
      v_other_uid, 'agent_reservation_update',
      '❌ تم إلغاء الحجز',
      COALESCE(p_reason, 'تم إلغاء الحجز من الطرف الآخر'),
      false, '/agents'
    );
  END;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_agent_reservation(UUID,TEXT) TO authenticated;

-- ── 11. raise_agent_dispute ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.raise_agent_dispute(
  p_reservation_id UUID,
  p_reason         TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         UUID := auth.uid();
  v_reservation RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT r.*, a.user_id AS agent_user_id
    INTO v_reservation
    FROM public.agent_reservations r
    JOIN public.agents a ON a.id = r.agent_id
   WHERE r.id = p_reservation_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found');
  END IF;

  IF v_uid != v_reservation.user_id AND v_uid != v_reservation.agent_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_reservation.status != 'escrow' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only dispute an active escrow');
  END IF;

  UPDATE public.agent_reservations
     SET status = 'disputed',
         dispute_reason = p_reason,
         dispute_raised_by = v_uid,
         updated_at = NOW()
   WHERE id = p_reservation_id;

  -- Notify admin via notification to all admins (simplified: notify both parties + a system note)
  INSERT INTO public.notifications (user_id, type, title, description, is_read, action_path)
  VALUES
    (v_reservation.user_id, 'agent_dispute',
     '⚠️ نزاع مُرفَع', 'تم رفع نزاع على الحجز — سيراجعه الفريق', false, '/agents'),
    (v_reservation.agent_user_id, 'agent_dispute',
     '⚠️ نزاع مُرفَع', 'تم رفع نزاع على الحجز — سيراجعه الفريق', false, '/agent-dashboard');

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.raise_agent_dispute(UUID,TEXT) TO authenticated;

-- ── 12. admin_resolve_agent_dispute ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_resolve_agent_dispute(
  p_reservation_id UUID,
  p_resolution     TEXT   -- 'release_to_user' | 'release_to_agent'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          UUID := auth.uid();
  v_reservation  RECORD;
  v_recipient_uid UUID;
  v_wallet       RECORD;
BEGIN
  -- Must be admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = v_uid AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  IF p_resolution NOT IN ('release_to_user', 'release_to_agent') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid resolution');
  END IF;

  SELECT r.*, a.user_id AS agent_user_id
    INTO v_reservation
    FROM public.agent_reservations r
    JOIN public.agents a ON a.id = r.agent_id
   WHERE r.id = p_reservation_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found');
  END IF;

  IF v_reservation.status != 'disputed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation is not disputed');
  END IF;

  -- Determine recipient
  IF p_resolution = 'release_to_user' THEN
    v_recipient_uid := v_reservation.user_id;
  ELSE
    v_recipient_uid := v_reservation.agent_user_id;
  END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_recipient_uid FOR UPDATE;

  -- Credit Nova to recipient
  UPDATE public.wallets
     SET nova_balance = nova_balance + v_reservation.nova_amount
   WHERE id = v_wallet.id;

  INSERT INTO public.wallet_ledger (
    wallet_id, user_id, entry_type, currency, amount, balance_after, description,
    reference_type, reference_id
  ) SELECT
    v_wallet.id, v_recipient_uid,
    'agent_escrow_release', 'nova',
    v_reservation.nova_amount,
    nova_balance,
    'إطلاق Nova بعد نزاع — قرار الإدارة — حجز ' || p_reservation_id,
    'agent_reservation', p_reservation_id::TEXT
  FROM public.wallets WHERE id = v_wallet.id;

  UPDATE public.agent_reservations
     SET status = 'resolved',
         dispute_resolution = p_resolution,
         dispute_resolved_by = v_uid,
         dispute_resolved_at = NOW(),
         updated_at = NOW()
   WHERE id = p_reservation_id;

  -- Notify both parties
  INSERT INTO public.notifications (user_id, type, title, description, is_read, action_path)
  VALUES
    (v_reservation.user_id, 'agent_dispute_resolved',
     '⚖️ تم حل النزاع',
     CASE p_resolution
       WHEN 'release_to_user' THEN 'تم تحرير Nova لصالحك'
       ELSE 'تم تحرير Nova لصالح الوكيل'
     END,
     false, '/agents'),
    (v_reservation.agent_user_id, 'agent_dispute_resolved',
     '⚖️ تم حل النزاع',
     CASE p_resolution
       WHEN 'release_to_agent' THEN 'تم تحرير Nova لصالحك'
       ELSE 'تم تحرير Nova لصالح المستخدم'
     END,
     false, '/agent-dashboard');

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_resolve_agent_dispute(UUID,TEXT) TO authenticated;

-- ── 13. submit_agent_review ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_agent_review(
  p_reservation_id UUID,
  p_rating         INTEGER,
  p_comment        TEXT,
  p_has_issue      BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         UUID := auth.uid();
  v_reservation RECORD;
  v_new_avg     DECIMAL;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_rating NOT BETWEEN 1 AND 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rating must be between 1 and 5');
  END IF;

  IF trim(p_comment) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Comment is required');
  END IF;

  SELECT * INTO v_reservation
    FROM public.agent_reservations
   WHERE id = p_reservation_id;

  IF NOT FOUND OR v_reservation.user_id != v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found or not authorized');
  END IF;

  IF v_reservation.status NOT IN ('completed', 'resolved') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only review completed reservations');
  END IF;

  IF EXISTS (SELECT 1 FROM public.agent_reviews WHERE reservation_id = p_reservation_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already reviewed');
  END IF;

  INSERT INTO public.agent_reviews (
    reservation_id, agent_id, reviewer_id, rating, comment, has_issue
  ) VALUES (
    p_reservation_id, v_reservation.agent_id, v_uid, p_rating, p_comment, p_has_issue
  );

  -- Recalculate avg_rating
  SELECT AVG(rating), COUNT(*) INTO v_new_avg, v_reservation.agent_id
    FROM public.agent_reviews WHERE agent_id = v_reservation.agent_id;

  UPDATE public.agents
     SET avg_rating    = ROUND(v_new_avg, 2),
         total_reviews = total_reviews + 1,
         updated_at    = NOW()
   WHERE id = v_reservation.agent_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_agent_review(UUID,INTEGER,TEXT,BOOLEAN) TO authenticated;

-- ── 14. admin_manage_agent ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_manage_agent(
  p_agent_id UUID,
  p_action   TEXT,   -- 'approve' | 'suspend'
  p_reason   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_agent RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = v_uid AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  SELECT * INTO v_agent FROM public.agents WHERE id = p_agent_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agent not found');
  END IF;

  IF p_action = 'approve' THEN
    UPDATE public.agents
       SET status = 'verified', verified_at = NOW(), updated_at = NOW()
     WHERE id = p_agent_id;

    INSERT INTO public.notifications (user_id, type, title, description, is_read, action_path)
    VALUES (
      v_agent.user_id, 'agent_status_update',
      '✅ تم قبولك كوكيل!',
      'تم اعتماد حسابك كوكيل في WeNova. يمكنك الآن استقبال الحجوزات.',
      false, '/agent-dashboard'
    );

  ELSIF p_action = 'suspend' THEN
    UPDATE public.agents
       SET status = 'suspended',
           suspended_at = NOW(),
           suspended_reason = p_reason,
           updated_at = NOW()
     WHERE id = p_agent_id;

    INSERT INTO public.notifications (user_id, type, title, description, is_read, action_path)
    VALUES (
      v_agent.user_id, 'agent_status_update',
      '🚫 تم تعليق حساب الوكيل',
      COALESCE(p_reason, 'تم تعليق حسابك كوكيل'),
      false, '/agents'
    );
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_manage_agent(UUID,TEXT,TEXT) TO authenticated;

-- ── 15. get_my_agent_profile ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_agent_profile()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_agent RECORD;
BEGIN
  SELECT * INTO v_agent FROM public.agents WHERE user_id = v_uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  RETURN jsonb_build_object(
    'found', true,
    'id', v_agent.id,
    'shop_name', v_agent.shop_name,
    'whatsapp', v_agent.whatsapp,
    'country', v_agent.country,
    'city', v_agent.city,
    'commission_pct', v_agent.commission_pct,
    'bio', v_agent.bio,
    'status', v_agent.status,
    'avg_rating', v_agent.avg_rating,
    'total_reviews', v_agent.total_reviews,
    'total_completed', v_agent.total_completed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_agent_profile() TO authenticated;
