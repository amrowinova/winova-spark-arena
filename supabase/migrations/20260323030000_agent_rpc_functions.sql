-- ============================================================
-- Agent System RPC Functions
-- ============================================================

-- ── 1. apply_as_agent ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.apply_as_agent(
  p_shop_name  TEXT,
  p_whatsapp   TEXT,
  p_country    TEXT,
  p_city       TEXT,
  p_latitude   NUMERIC DEFAULT NULL,
  p_longitude  NUMERIC DEFAULT NULL,
  p_bio        TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_existing_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if already applied
  SELECT id INTO v_existing_id FROM public.agents WHERE user_id = v_user_id LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already applied as agent');
  END IF;

  INSERT INTO public.agents (
    user_id, shop_name, whatsapp, country, city,
    latitude, longitude, bio, status,
    commission_pct, avg_rating, trust_score,
    total_reviews, total_completed, total_cancellations, total_disputes
  ) VALUES (
    v_user_id, p_shop_name, p_whatsapp, p_country, p_city,
    p_latitude, p_longitude, p_bio, 'pending',
    5, 0, 50,
    0, 0, 0, 0
  );

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ── 2. get_my_agent_profile ───────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_agent_profile()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_row     public.agents%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.agents WHERE user_id = v_user_id LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found',               true,
    'id',                  v_row.id,
    'shop_name',           v_row.shop_name,
    'whatsapp',            v_row.whatsapp,
    'country',             v_row.country,
    'city',                v_row.city,
    'commission_pct',      v_row.commission_pct,
    'bio',                 v_row.bio,
    'status',              v_row.status,
    'avg_rating',          v_row.avg_rating,
    'trust_score',         v_row.trust_score,
    'total_reviews',       v_row.total_reviews,
    'total_completed',     v_row.total_completed,
    'total_disputes',      v_row.total_disputes,
    'total_cancellations', v_row.total_cancellations
  );
END;
$$;

-- ── 3. get_nearby_agents ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_nearby_agents(
  p_country   TEXT    DEFAULT NULL,
  p_city      TEXT    DEFAULT NULL,
  p_latitude  NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_limit     INT     DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id',                  a.id,
      'user_id',             a.user_id,
      'shop_name',           a.shop_name,
      'whatsapp',            a.whatsapp,
      'country',             a.country,
      'city',                a.city,
      'latitude',            a.latitude,
      'longitude',           a.longitude,
      'commission_pct',      a.commission_pct,
      'bio',                 a.bio,
      'avg_rating',          a.avg_rating,
      'trust_score',         a.trust_score,
      'total_reviews',       a.total_reviews,
      'total_completed',     a.total_completed,
      'total_cancellations', a.total_cancellations,
      'total_disputes',      a.total_disputes,
      'status',              a.status,
      'distance_km',
        CASE
          WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL
               AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL
          THEN round(CAST(
            6371 * acos(
              cos(radians(p_latitude)) * cos(radians(a.latitude)) *
              cos(radians(a.longitude) - radians(p_longitude)) +
              sin(radians(p_latitude)) * sin(radians(a.latitude))
            ) AS NUMERIC), 1)
          ELSE NULL
        END
    )
    ORDER BY a.trust_score DESC, a.avg_rating DESC
  )
  INTO v_result
  FROM public.agents a
  WHERE a.status = 'active'
    AND (p_country IS NULL OR a.country = p_country)
    AND (p_city    IS NULL OR a.city    = p_city)
  LIMIT p_limit;

  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

-- ── 4. create_agent_reservation ───────────────────────────
CREATE OR REPLACE FUNCTION public.create_agent_reservation(
  p_agent_id      UUID,
  p_type          TEXT,
  p_nova_amount   NUMERIC,
  p_fiat_amount   NUMERIC DEFAULT NULL,
  p_fiat_currency TEXT    DEFAULT NULL,
  p_notes         TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       UUID := auth.uid();
  v_agent         public.agents%ROWTYPE;
  v_commission    NUMERIC;
  v_reservation_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_agent FROM public.agents WHERE id = p_agent_id AND status = 'active' LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agent not found or inactive');
  END IF;

  IF v_agent.user_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot reserve your own agent slot');
  END IF;

  v_commission := round(p_nova_amount * v_agent.commission_pct / 100, 2);

  INSERT INTO public.agent_reservations (
    agent_id, user_id, type,
    nova_amount, fiat_amount, fiat_currency,
    commission_pct, commission_nova,
    status, notes
  ) VALUES (
    p_agent_id, v_user_id, p_type,
    p_nova_amount, p_fiat_amount, p_fiat_currency,
    v_agent.commission_pct, v_commission,
    'pending', p_notes
  )
  RETURNING id INTO v_reservation_id;

  RETURN jsonb_build_object('success', true, 'reservation_id', v_reservation_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ── 5. admin_manage_agent ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_manage_agent(
  p_agent_id UUID,
  p_action   TEXT,
  p_reason   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF p_action NOT IN ('approve', 'reject', 'suspend', 'reactivate') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
  END IF;

  UPDATE public.agents
  SET status = CASE p_action
    WHEN 'approve'     THEN 'active'
    WHEN 'reject'      THEN 'rejected'
    WHEN 'suspend'     THEN 'suspended'
    WHEN 'reactivate'  THEN 'active'
  END
  WHERE id = p_agent_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agent not found');
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ── Grants ────────────────────────────────────────────────
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
