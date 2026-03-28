-- ============================================================
-- ANALYTICS SYSTEM: RPC Functions for Admin Analytics Dashboard
-- ============================================================

-- ── 1. Get User Growth Analytics ───────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_user_growth(
  p_period TEXT DEFAULT '30d' -- '7d', '30d', '1y'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_interval INTERVAL;
  v_result JSONB;
BEGIN
  -- Set interval based on period
  CASE p_period
    WHEN '7d' THEN v_interval := INTERVAL '7 days';
    WHEN '30d' THEN v_interval := INTERVAL '30 days';
    WHEN '1y' THEN v_interval := INTERVAL '1 year';
    ELSE v_interval := INTERVAL '30 days';
  END CASE;

  -- Get daily user growth
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', DATE_TRUNC('day', created_at)::DATE,
      'new_users', COUNT(*),
      'cumulative_total', SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('day', created_at)::DATE)
    ) ORDER BY DATE_TRUNC('day', created_at)::DATE
  )
  INTO v_result
  FROM auth.users
  WHERE created_at >= NOW() - v_interval
  GROUP BY DATE_TRUNC('day', created_at)::DATE;

  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

-- ── 2. Get Donation Analytics ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_donations(
  p_period TEXT DEFAULT '30d'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_interval INTERVAL;
  v_result JSONB;
BEGIN
  CASE p_period
    WHEN '7d' THEN v_interval := INTERVAL '7 days';
    WHEN '30d' THEN v_interval := INTERVAL '30 days';
    WHEN '1y' THEN v_interval := INTERVAL '1 year';
    ELSE v_interval := INTERVAL '30 days';
  END CASE;

  -- Get daily donations
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', DATE_TRUNC('day', created_at)::DATE,
      'total_amount', COALESCE(SUM(amount), 0),
      'donation_count', COUNT(*),
      'unique_donors', COUNT(DISTINCT user_id)
    ) ORDER BY DATE_TRUNC('day', created_at)::DATE
  )
  INTO v_result
  FROM family_supports
  WHERE created_at >= NOW() - v_interval
    AND status = 'completed'
  GROUP BY DATE_TRUNC('day', created_at)::DATE;

  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

-- ── 3. Get Contest Analytics ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_contests(
  p_period TEXT DEFAULT '30d'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_interval INTERVAL;
  v_result JSONB;
BEGIN
  CASE p_period
    WHEN '7d' THEN v_interval := INTERVAL '7 days';
    WHEN '30d' THEN v_interval := INTERVAL '30 days';
    WHEN '1y' THEN v_interval := INTERVAL '1 year';
    ELSE v_interval := INTERVAL '30 days';
  END CASE;

  -- Get contest statistics
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', DATE_TRUNC('day', created_at)::DATE,
      'participants', COUNT(DISTINCT user_id),
      'total_prizes', COALESCE(SUM(prize_amount), 0),
      'contest_count', COUNT(DISTINCT contest_id)
    ) ORDER BY DATE_TRUNC('day', created_at)::DATE
  )
  INTO v_result
  FROM contest_participants
  WHERE created_at >= NOW() - v_interval
  GROUP BY DATE_TRUNC('day', created_at)::DATE;

  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

-- ── 4. Get Agent Earnings Analytics ────────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_agent_earnings(
  p_period TEXT DEFAULT '30d'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_interval INTERVAL;
  v_result JSONB;
BEGIN
  CASE p_period
    WHEN '7d' THEN v_interval := INTERVAL '7 days';
    WHEN '30d' THEN v_interval := INTERVAL '30 days';
    WHEN '1y' THEN v_interval := INTERVAL '1 year';
    ELSE v_interval := INTERVAL '30 days';
  END CASE;

  -- Get agent earnings
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', DATE_TRUNC('day', updated_at)::DATE,
      'total_earnings', COALESCE(SUM(commission_nova), 0),
      'completed_orders', COUNT(*) FILTER (WHERE status = 'completed'),
      'active_agents', COUNT(DISTINCT agent_id)
    ) ORDER BY DATE_TRUNC('day', updated_at)::DATE
  )
  INTO v_result
  FROM agent_reservations
  WHERE updated_at >= NOW() - v_interval
    AND status = 'completed'
  GROUP BY DATE_TRUNC('day', updated_at)::DATE;

  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

-- ── 5. Get P2P Volume Analytics ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_p2p_volume(
  p_period TEXT DEFAULT '30d'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_interval INTERVAL;
  v_result JSONB;
BEGIN
  CASE p_period
    WHEN '7d' THEN v_interval := INTERVAL '7 days';
    WHEN '30d' THEN v_interval := INTERVAL '30 days';
    WHEN '1y' THEN v_interval := INTERVAL '1 year';
    ELSE v_interval := INTERVAL '30 days';
  END CASE;

  -- Get P2P trading volume
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', DATE_TRUNC('day', created_at)::DATE,
      'total_volume', COALESCE(SUM(nova_amount), 0),
      'order_count', COUNT(*),
      'buy_orders', COUNT(*) FILTER (WHERE type = 'buy'),
      'sell_orders', COUNT(*) FILTER (WHERE type = 'sell')
    ) ORDER BY DATE_TRUNC('day', created_at)::DATE
  )
  INTO v_result
  FROM p2p_orders
  WHERE created_at >= NOW() - v_interval
    AND status NOT IN ('cancelled', 'expired')
  GROUP BY DATE_TRUNC('day', created_at)::DATE;

  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

-- ── 6. Get Families Supported Analytics ───────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_families(
  p_period TEXT DEFAULT '30d'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_interval INTERVAL;
  v_result JSONB;
BEGIN
  CASE p_period
    WHEN '7d' THEN v_interval := INTERVAL '7 days';
    WHEN '30d' THEN v_interval := INTERVAL '30 days';
    WHEN '1y' THEN v_interval := INTERVAL '1 year';
    ELSE v_interval := INTERVAL '30 days';
  END CASE;

  -- Get families supported
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', DATE_TRUNC('day', created_at)::DATE,
      'new_families', COUNT(*),
      'supported_families', COUNT(*) FILTER (WHERE status = 'supported'),
      'total_supporters', COUNT(DISTINCT user_id)
    ) ORDER BY DATE_TRUNC('day', created_at)::DATE
  )
  INTO v_result
  FROM family_supports
  WHERE created_at >= NOW() - v_interval
  GROUP BY DATE_TRUNC('day', created_at)::DATE;

  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

-- ── 7. Get Overall Analytics Summary ───────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_summary(
  p_period TEXT DEFAULT '30d'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_interval INTERVAL;
  v_result JSONB;
BEGIN
  CASE p_period
    WHEN '7d' THEN v_interval := INTERVAL '7 days';
    WHEN '30d' THEN v_interval := INTERVAL '30 days';
    WHEN '1y' THEN v_interval := INTERVAL '1 year';
    ELSE v_interval := INTERVAL '30 days';
  END CASE;

  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM auth.users WHERE created_at >= NOW() - v_interval),
    'active_users', (SELECT COUNT(DISTINCT user_id) FROM user_activity WHERE last_seen >= NOW() - INTERVAL '7 days'),
    'total_donations', COALESCE((SELECT SUM(amount) FROM family_supports WHERE created_at >= NOW() - v_interval AND status = 'completed'), 0),
    'total_p2p_volume', COALESCE((SELECT SUM(nova_amount) FROM p2p_orders WHERE created_at >= NOW() - v_interval AND status NOT IN ('cancelled', 'expired')), 0),
    'total_contests', (SELECT COUNT(DISTINCT contest_id) FROM contest_participants WHERE created_at >= NOW() - v_interval),
    'active_agents', (SELECT COUNT(*) FROM agents WHERE status = 'active'),
    'supported_families', (SELECT COUNT(DISTINCT family_id) FROM family_supports WHERE created_at >= NOW() - v_interval AND status = 'completed'),
    'total_agent_earnings', COALESCE((SELECT SUM(commission_nova) FROM agent_reservations WHERE updated_at >= NOW() - v_interval AND status = 'completed'), 0)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users (admin role check should be done in application)
GRANT EXECUTE ON FUNCTION public.analytics_user_growth TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_donations TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_contests TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_agent_earnings TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_p2p_volume TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_families TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_summary TO authenticated;
