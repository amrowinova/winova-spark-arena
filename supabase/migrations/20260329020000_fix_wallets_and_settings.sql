-- ============================================================
-- Fix 1: Add is_frozen column to wallets if missing
-- ============================================================
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- Fix 2: Insert default nova_prices into app_settings if missing
-- ============================================================
INSERT INTO public.app_settings (key, value, description)
VALUES (
  'nova_prices',
  '{"egp": 10, "sar": 0.75, "usd": 0.20, "eur": 0.18}'::jsonb,
  'Nova anchor prices per currency'
)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- Fix 3: Fix apply_as_agent to accept optional p_district param
-- ============================================================
CREATE OR REPLACE FUNCTION public.apply_as_agent(
  p_shop_name  TEXT,
  p_whatsapp   TEXT,
  p_country    TEXT,
  p_city       TEXT,
  p_district   TEXT    DEFAULT '',
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
  v_existing UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if already applied
  SELECT id INTO v_existing FROM public.agents WHERE user_id = v_user_id;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already applied as agent');
  END IF;

  INSERT INTO public.agents (
    user_id, shop_name, whatsapp, country, city,
    latitude, longitude, bio, status
  ) VALUES (
    v_user_id, p_shop_name, p_whatsapp, p_country, p_city,
    p_latitude, p_longitude, p_bio, 'pending'
  );

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- Fix 4: Ensure admin deposit requests policy uses correct check
-- ============================================================
DROP POLICY IF EXISTS "dep_req_admin_all" ON public.agent_deposit_requests;

CREATE POLICY "dep_req_admin_all"
  ON public.agent_deposit_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- Fix 5: get_agent_detail RPC (used by Agents.tsx booking dialog)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_agent_detail(p_agent_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent     RECORD;
  v_reviews   JSONB;
  v_profile   RECORD;
BEGIN
  SELECT a.*, p.display_name AS user_name, p.avatar_url
    INTO v_agent
    FROM public.agents a
    JOIN public.profiles p ON p.id = a.user_id
   WHERE a.id = p_agent_id AND a.status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'rating',     ar.user_rating,
      'comment',    ar.user_review_comment,
      'has_issue',  ar.user_has_issue,
      'created_at', ar.updated_at
    ) ORDER BY ar.updated_at DESC
  ), '[]'::jsonb)
  INTO v_reviews
  FROM public.agent_reservations ar
  WHERE ar.agent_id = p_agent_id
    AND ar.user_rating IS NOT NULL
  LIMIT 10;

  RETURN jsonb_build_object(
    'found',               true,
    'id',                  v_agent.id,
    'user_id',             v_agent.user_id,
    'shop_name',           v_agent.shop_name,
    'whatsapp',            v_agent.whatsapp,
    'country',             v_agent.country,
    'city',                v_agent.city,
    'latitude',            v_agent.latitude,
    'longitude',           v_agent.longitude,
    'commission_pct',      v_agent.commission_pct,
    'bio',                 v_agent.bio,
    'avg_rating',          v_agent.avg_rating,
    'trust_score',         v_agent.trust_score,
    'total_reviews',       v_agent.total_reviews,
    'total_completed',     v_agent.total_completed,
    'total_cancellations', v_agent.total_cancellations,
    'total_disputes',      v_agent.total_disputes,
    'avg_response_time_seconds', v_agent.avg_response_time_seconds,
    'user_name',           v_agent.user_name,
    'avatar_url',          v_agent.avatar_url,
    'recent_reviews',      v_reviews
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('found', false, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- Fix 6: get_my_agent_profile RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_agent_profile()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_agent   RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT * INTO v_agent FROM public.agents WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found',               true,
    'id',                  v_agent.id,
    'shop_name',           v_agent.shop_name,
    'whatsapp',            v_agent.whatsapp,
    'country',             v_agent.country,
    'city',                v_agent.city,
    'commission_pct',      v_agent.commission_pct,
    'bio',                 v_agent.bio,
    'status',              v_agent.status,
    'avg_rating',          v_agent.avg_rating,
    'trust_score',         v_agent.trust_score,
    'total_reviews',       v_agent.total_reviews,
    'total_completed',     v_agent.total_completed,
    'total_disputes',      v_agent.total_disputes,
    'total_cancellations', v_agent.total_cancellations,
    'avg_response_time_seconds', v_agent.avg_response_time_seconds
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('found', false, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- Fix 7: admin_manage_agent RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_manage_agent(
  p_agent_id UUID,
  p_action   TEXT,   -- 'approve' | 'suspend'
  p_reason   TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid AND role = 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF p_action = 'approve' THEN
    UPDATE public.agents SET status = 'active', updated_at = now()
     WHERE id = p_agent_id;
  ELSIF p_action = 'suspend' THEN
    UPDATE public.agents SET status = 'suspended', updated_at = now()
     WHERE id = p_agent_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Unknown action');
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- Fix 8: get_countries and get_cities_by_country RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_countries()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT jsonb_agg(row_to_json(c)) FROM public.countries c ORDER BY c.name_en),
    '[]'::jsonb
  );
EXCEPTION WHEN OTHERS THEN
  RETURN '[]'::jsonb;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_cities_by_country(p_country_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT jsonb_agg(row_to_json(ci))
       FROM public.cities ci
       JOIN public.countries co ON co.id = ci.country_id
      WHERE co.code = p_country_code
      ORDER BY ci.name_en),
    '[]'::jsonb
  );
EXCEPTION WHEN OTHERS THEN
  RETURN '[]'::jsonb;
END;
$$;
