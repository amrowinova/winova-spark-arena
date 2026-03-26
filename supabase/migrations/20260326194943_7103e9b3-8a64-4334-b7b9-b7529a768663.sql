
-- ═══════════════════════════════════════════════════════════════════════
-- AGENTS SYSTEM — RPCs
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Apply as agent
CREATE OR REPLACE FUNCTION public.apply_as_agent(
  p_shop_name TEXT,
  p_whatsapp TEXT,
  p_country TEXT,
  p_city TEXT,
  p_district TEXT DEFAULT '',
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL,
  p_bio TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing UUID;
  v_new_id UUID;
BEGIN
  SELECT id INTO v_existing FROM agents WHERE user_id = auth.uid();
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have an agent application');
  END IF;

  INSERT INTO agents (user_id, shop_name, whatsapp, country, city, district, latitude, longitude, bio)
  VALUES (auth.uid(), p_shop_name, p_whatsapp, p_country, p_city, COALESCE(p_district, ''), p_latitude, p_longitude, p_bio)
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('success', true, 'agent_id', v_new_id);
END;
$$;

-- 2. Get my agent profile
CREATE OR REPLACE FUNCTION public.get_my_agent_profile()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent RECORD;
BEGIN
  SELECT * INTO v_agent FROM agents WHERE user_id = auth.uid();
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
    'district', v_agent.district,
    'commission_pct', v_agent.commission_pct,
    'bio', v_agent.bio,
    'status', v_agent.status,
    'avg_rating', v_agent.avg_rating,
    'trust_score', v_agent.trust_score,
    'total_reviews', v_agent.total_reviews,
    'total_completed', v_agent.total_completed,
    'total_disputes', v_agent.total_disputes,
    'total_cancellations', v_agent.total_cancellations,
    'avg_response_time_seconds', v_agent.avg_response_time_seconds
  );
END;
$$;

-- 3. Get nearby agents
CREATE OR REPLACE FUNCTION public.get_nearby_agents(
  p_country TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL,
  p_limit INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb) INTO v_result
  FROM (
    SELECT
      a.id, a.user_id, a.shop_name, a.whatsapp, a.country, a.city, a.district,
      a.latitude, a.longitude, a.commission_pct, a.bio,
      a.avg_rating, a.trust_score, a.total_reviews, a.total_completed,
      a.total_cancellations, a.total_disputes, a.avg_response_time_seconds,
      a.status,
      CASE
        WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL
        THEN ROUND((
          6371 * acos(
            LEAST(1, cos(radians(p_latitude)) * cos(radians(a.latitude)) *
            cos(radians(a.longitude) - radians(p_longitude)) +
            sin(radians(p_latitude)) * sin(radians(a.latitude)))
          )
        )::numeric, 1)
        ELSE NULL
      END AS distance_km
    FROM agents a
    WHERE a.status = 'active'
      AND (p_country IS NULL OR a.country = p_country)
      AND (p_city IS NULL OR a.city = p_city)
    ORDER BY
      CASE WHEN p_latitude IS NOT NULL AND a.latitude IS NOT NULL
        THEN 6371 * acos(
          LEAST(1, cos(radians(p_latitude)) * cos(radians(a.latitude)) *
          cos(radians(a.longitude) - radians(p_longitude)) +
          sin(radians(p_latitude)) * sin(radians(a.latitude)))
        )
        ELSE 0
      END ASC,
      a.trust_score DESC,
      a.avg_rating DESC
    LIMIT p_limit
  ) t;

  RETURN v_result;
END;
$$;

-- 4. Get agent detail
CREATE OR REPLACE FUNCTION public.get_agent_detail(p_agent_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent RECORD;
  v_reviews JSONB;
  v_profile RECORD;
BEGIN
  SELECT * INTO v_agent FROM agents WHERE id = p_agent_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT name, avatar_url INTO v_profile FROM profiles WHERE user_id = v_agent.user_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'rating', r.rating, 'comment', r.comment, 'has_issue', r.has_issue, 'created_at', r.created_at
  ) ORDER BY r.created_at DESC), '[]'::jsonb) INTO v_reviews
  FROM agent_reviews r WHERE r.agent_id = p_agent_id
  LIMIT 20;

  RETURN jsonb_build_object(
    'found', true,
    'id', v_agent.id,
    'user_id', v_agent.user_id,
    'shop_name', v_agent.shop_name,
    'whatsapp', v_agent.whatsapp,
    'country', v_agent.country,
    'city', v_agent.city,
    'district', v_agent.district,
    'latitude', v_agent.latitude,
    'longitude', v_agent.longitude,
    'commission_pct', v_agent.commission_pct,
    'bio', v_agent.bio,
    'avg_rating', v_agent.avg_rating,
    'trust_score', v_agent.trust_score,
    'total_reviews', v_agent.total_reviews,
    'total_completed', v_agent.total_completed,
    'total_disputes', v_agent.total_disputes,
    'total_cancellations', v_agent.total_cancellations,
    'status', v_agent.status,
    'user_name', COALESCE(v_profile.name, ''),
    'avatar_url', v_profile.avatar_url,
    'recent_reviews', v_reviews
  );
END;
$$;

-- 5. Admin manage agent (approve/suspend)
CREATE OR REPLACE FUNCTION public.admin_manage_agent(
  p_agent_id UUID,
  p_action TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF p_action = 'approve' THEN
    UPDATE agents SET status = 'active', updated_at = now() WHERE id = p_agent_id;
  ELSIF p_action = 'suspend' THEN
    UPDATE agents SET status = 'suspended', updated_at = now() WHERE id = p_agent_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 6. Agent request deposit
CREATE OR REPLACE FUNCTION public.agent_request_deposit(
  p_amount_nova NUMERIC,
  p_payment_method TEXT,
  p_payment_reference TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent RECORD;
BEGIN
  SELECT * INTO v_agent FROM agents WHERE user_id = auth.uid() AND status = 'active';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agent not found or not active');
  END IF;

  INSERT INTO agent_deposit_requests (agent_id, user_id, amount_nova, payment_method, payment_reference)
  VALUES (v_agent.id, auth.uid(), p_amount_nova, p_payment_method, p_payment_reference);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. Get agent deposit requests (own)
CREATE OR REPLACE FUNCTION public.get_agent_deposit_requests()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(dr)::jsonb ORDER BY dr.created_at DESC)
    FROM agent_deposit_requests dr
    WHERE dr.user_id = auth.uid()
  ), '[]'::jsonb);
END;
$$;

-- 8. Admin get all deposit requests
CREATE OR REPLACE FUNCTION public.admin_get_all_deposit_requests(p_status TEXT DEFAULT 'pending')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', dr.id,
      'amount_nova', dr.amount_nova,
      'amount_local', dr.amount_local,
      'payment_method', dr.payment_method,
      'payment_reference', dr.payment_reference,
      'admin_notes', dr.admin_notes,
      'status', dr.status,
      'created_at', dr.created_at,
      'completed_at', dr.completed_at,
      'agent_id', dr.agent_id,
      'agent_shop_name', a.shop_name,
      'agent_country', a.country,
      'agent_city', a.city
    ) ORDER BY dr.created_at DESC)
    FROM agent_deposit_requests dr
    JOIN agents a ON a.id = dr.agent_id
    WHERE (p_status = 'all' OR dr.status = p_status)
  ), '[]'::jsonb);
END;
$$;

-- 9. Admin approve deposit
CREATE OR REPLACE FUNCTION public.admin_approve_deposit(
  p_request_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  SELECT * INTO v_req FROM agent_deposit_requests WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or already processed');
  END IF;

  UPDATE agent_deposit_requests
  SET status = 'approved', admin_notes = p_admin_notes, completed_at = now()
  WHERE id = p_request_id;

  -- Add nova to agent's wallet
  UPDATE wallets
  SET nova_balance = nova_balance + v_req.amount_nova
  WHERE user_id = v_req.user_id;

  -- Record in ledger
  INSERT INTO wallet_ledger (user_id, type, amount, balance_after, description)
  SELECT v_req.user_id, 'credit', v_req.amount_nova, w.nova_balance, 'Agent deposit approved'
  FROM wallets w WHERE w.user_id = v_req.user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 10. Admin reject deposit
CREATE OR REPLACE FUNCTION public.admin_reject_deposit(
  p_request_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  UPDATE agent_deposit_requests
  SET status = 'rejected', admin_notes = COALESCE(p_reason, 'Rejected'), completed_at = now()
  WHERE id = p_request_id AND status = 'pending';

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 11. Create agent reservation
CREATE OR REPLACE FUNCTION public.create_agent_reservation(
  p_agent_id UUID,
  p_type TEXT,
  p_nova_amount NUMERIC,
  p_fiat_amount NUMERIC DEFAULT NULL,
  p_fiat_currency TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent RECORD;
  v_new_id UUID;
  v_commission NUMERIC;
BEGIN
  SELECT * INTO v_agent FROM agents WHERE id = p_agent_id AND status = 'active';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agent not found or inactive');
  END IF;

  IF v_agent.user_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot book yourself');
  END IF;

  v_commission := p_nova_amount * (v_agent.commission_pct / 100);

  INSERT INTO agent_reservations (
    agent_id, user_id, agent_user_id, type, nova_amount,
    fiat_amount, fiat_currency, commission_pct, commission_nova, notes
  ) VALUES (
    p_agent_id, auth.uid(), v_agent.user_id, p_type, p_nova_amount,
    p_fiat_amount, p_fiat_currency, v_agent.commission_pct, v_commission, p_notes
  ) RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('success', true, 'reservation_id', v_new_id);
END;
$$;

-- 12. Agent respond to reservation
CREATE OR REPLACE FUNCTION public.agent_respond_reservation(
  p_reservation_id UUID,
  p_accept BOOLEAN,
  p_reject_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res RECORD;
BEGIN
  SELECT * INTO v_res FROM agent_reservations WHERE id = p_reservation_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found or not pending');
  END IF;

  IF v_res.agent_user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF p_accept THEN
    UPDATE agent_reservations
    SET status = 'accepted',
        escrow_deadline = now() + interval '60 minutes',
        updated_at = now()
    WHERE id = p_reservation_id;
  ELSE
    UPDATE agent_reservations
    SET status = 'rejected', reject_reason = p_reject_reason, updated_at = now()
    WHERE id = p_reservation_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 13. Confirm agent reservation (both parties)
CREATE OR REPLACE FUNCTION public.confirm_agent_reservation(p_reservation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res RECORD;
  v_caller UUID := auth.uid();
BEGIN
  SELECT * INTO v_res FROM agent_reservations
  WHERE id = p_reservation_id AND status IN ('accepted', 'active');
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found');
  END IF;

  IF v_caller = v_res.user_id THEN
    UPDATE agent_reservations SET user_confirmed_at = now(), status = 'active', updated_at = now()
    WHERE id = p_reservation_id AND user_confirmed_at IS NULL;
  ELSIF v_caller = v_res.agent_user_id THEN
    UPDATE agent_reservations SET agent_confirmed_at = now(), status = 'active', updated_at = now()
    WHERE id = p_reservation_id AND agent_confirmed_at IS NULL;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Check if both confirmed
  SELECT * INTO v_res FROM agent_reservations WHERE id = p_reservation_id;
  IF v_res.user_confirmed_at IS NOT NULL AND v_res.agent_confirmed_at IS NOT NULL THEN
    UPDATE agent_reservations SET status = 'completed', updated_at = now()
    WHERE id = p_reservation_id;

    -- Update agent stats
    UPDATE agents SET total_completed = total_completed + 1, updated_at = now()
    WHERE id = v_res.agent_id;

    RETURN jsonb_build_object('success', true, 'status', 'completed');
  END IF;

  RETURN jsonb_build_object('success', true, 'status', 'active');
END;
$$;

-- 14. Cancel agent reservation
CREATE OR REPLACE FUNCTION public.cancel_agent_reservation(
  p_reservation_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res RECORD;
BEGIN
  SELECT * INTO v_res FROM agent_reservations
  WHERE id = p_reservation_id AND status IN ('pending', 'accepted', 'active');
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found');
  END IF;

  IF auth.uid() NOT IN (v_res.user_id, v_res.agent_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  UPDATE agent_reservations
  SET status = 'cancelled', notes = COALESCE(p_reason, notes), updated_at = now()
  WHERE id = p_reservation_id;

  -- Update agent cancellation count
  UPDATE agents SET total_cancellations = total_cancellations + 1, updated_at = now()
  WHERE id = v_res.agent_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 15. Raise agent dispute
CREATE OR REPLACE FUNCTION public.raise_agent_dispute(
  p_reservation_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res RECORD;
BEGIN
  SELECT * INTO v_res FROM agent_reservations WHERE id = p_reservation_id AND status = 'active';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found or not active');
  END IF;

  UPDATE agent_reservations
  SET status = 'disputed', dispute_reason = p_reason, updated_at = now()
  WHERE id = p_reservation_id;

  UPDATE agents SET total_disputes = total_disputes + 1, updated_at = now()
  WHERE id = v_res.agent_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 16. Send agent message
CREATE OR REPLACE FUNCTION public.send_agent_message(
  p_reservation_id UUID,
  p_content TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res RECORD;
BEGIN
  SELECT * INTO v_res FROM agent_reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found');
  END IF;

  IF auth.uid() NOT IN (v_res.user_id, v_res.agent_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  INSERT INTO agent_messages (reservation_id, sender_id, content)
  VALUES (p_reservation_id, auth.uid(), p_content);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 17. Get reservation with messages
CREATE OR REPLACE FUNCTION public.get_reservation_with_messages(p_reservation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res RECORD;
  v_messages JSONB;
  v_agent RECORD;
  v_is_agent BOOLEAN;
BEGIN
  SELECT * INTO v_res FROM agent_reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  IF auth.uid() NOT IN (v_res.user_id, v_res.agent_user_id)
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  v_is_agent := (auth.uid() = v_res.agent_user_id);

  SELECT * INTO v_agent FROM agents WHERE id = v_res.agent_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', m.id, 'sender_id', m.sender_id, 'content', m.content,
    'is_system_msg', m.is_system_msg, 'created_at', m.created_at
  ) ORDER BY m.created_at ASC), '[]'::jsonb) INTO v_messages
  FROM agent_messages m WHERE m.reservation_id = p_reservation_id;

  RETURN jsonb_build_object(
    'found', true,
    'id', v_res.id,
    'agent_id', v_res.agent_id,
    'user_id', v_res.user_id,
    'agent_user_id', v_res.agent_user_id,
    'type', v_res.type,
    'nova_amount', v_res.nova_amount,
    'fiat_amount', v_res.fiat_amount,
    'fiat_currency', v_res.fiat_currency,
    'commission_pct', v_res.commission_pct,
    'commission_nova', v_res.commission_nova,
    'status', v_res.status,
    'escrow_holder', v_res.escrow_holder,
    'user_confirmed_at', v_res.user_confirmed_at,
    'agent_confirmed_at', v_res.agent_confirmed_at,
    'escrow_deadline', v_res.escrow_deadline,
    'extension_requested_by', v_res.extension_requested_by,
    'extension_minutes', v_res.extension_minutes,
    'extension_status', v_res.extension_status,
    'dispute_reason', v_res.dispute_reason,
    'dispute_resolution', v_res.dispute_resolution,
    'notes', v_res.notes,
    'expires_at', v_res.expires_at,
    'created_at', v_res.created_at,
    'shop_name', v_agent.shop_name,
    'whatsapp', v_agent.whatsapp,
    'messages', v_messages,
    'is_agent', v_is_agent
  );
END;
$$;

-- 18. Submit agent review
CREATE OR REPLACE FUNCTION public.submit_agent_review(
  p_reservation_id UUID,
  p_rating INTEGER,
  p_comment TEXT DEFAULT '',
  p_has_issue BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res RECORD;
  v_avg NUMERIC;
  v_count INTEGER;
BEGIN
  SELECT * INTO v_res FROM agent_reservations WHERE id = p_reservation_id AND status = 'completed';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not completed');
  END IF;

  INSERT INTO agent_reviews (reservation_id, agent_id, reviewer_id, rating, comment, has_issue)
  VALUES (p_reservation_id, v_res.agent_id, auth.uid(), p_rating, COALESCE(p_comment, ''), p_has_issue)
  ON CONFLICT (reservation_id, reviewer_id) DO NOTHING;

  -- Update agent avg rating
  SELECT AVG(rating), COUNT(*) INTO v_avg, v_count
  FROM agent_reviews WHERE agent_id = v_res.agent_id;

  UPDATE agents SET avg_rating = COALESCE(v_avg, 0), total_reviews = v_count, updated_at = now()
  WHERE id = v_res.agent_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 19. Rate user by agent
CREATE OR REPLACE FUNCTION public.rate_user_by_agent(
  p_reservation_id UUID,
  p_rating INTEGER,
  p_comment TEXT DEFAULT '',
  p_has_issue BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- For now just return success - can be expanded later
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 20. Request extension
CREATE OR REPLACE FUNCTION public.request_extension(
  p_reservation_id UUID,
  p_minutes INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res RECORD;
BEGIN
  SELECT * INTO v_res FROM agent_reservations WHERE id = p_reservation_id AND status = 'active';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not active');
  END IF;

  UPDATE agent_reservations
  SET extension_requested_by = auth.uid(),
      extension_minutes = p_minutes,
      extension_status = 'pending',
      updated_at = now()
  WHERE id = p_reservation_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 21. Respond to extension
CREATE OR REPLACE FUNCTION public.respond_extension(
  p_reservation_id UUID,
  p_accept BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res RECORD;
BEGIN
  SELECT * INTO v_res FROM agent_reservations
  WHERE id = p_reservation_id AND extension_status = 'pending';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No pending extension');
  END IF;

  IF p_accept THEN
    UPDATE agent_reservations
    SET extension_status = 'accepted',
        escrow_deadline = escrow_deadline + (v_res.extension_minutes || ' minutes')::interval,
        updated_at = now()
    WHERE id = p_reservation_id;
  ELSE
    UPDATE agent_reservations
    SET extension_status = 'rejected', updated_at = now()
    WHERE id = p_reservation_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 22. Admin resolve agent dispute
CREATE OR REPLACE FUNCTION public.admin_resolve_agent_dispute(
  p_reservation_id UUID,
  p_resolution TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  UPDATE agent_reservations
  SET status = 'resolved', dispute_resolution = p_resolution, updated_at = now()
  WHERE id = p_reservation_id AND status = 'disputed';

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 23. Get countries (from locationData — use agents' distinct countries for now)
CREATE OR REPLACE FUNCTION public.get_countries()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return list of supported countries from country_codes if exists, else static
  RETURN '[
    {"id":"SA","code":"SA","name_ar":"السعودية","name_en":"Saudi Arabia","phone_code":"+966","currency":"SAR"},
    {"id":"EG","code":"EG","name_ar":"مصر","name_en":"Egypt","phone_code":"+20","currency":"EGP"},
    {"id":"PS","code":"PS","name_ar":"فلسطين","name_en":"Palestine","phone_code":"+970","currency":"ILS"},
    {"id":"JO","code":"JO","name_ar":"الأردن","name_en":"Jordan","phone_code":"+962","currency":"JOD"},
    {"id":"AE","code":"AE","name_ar":"الإمارات","name_en":"UAE","phone_code":"+971","currency":"AED"},
    {"id":"QA","code":"QA","name_ar":"قطر","name_en":"Qatar","phone_code":"+974","currency":"QAR"},
    {"id":"KW","code":"KW","name_ar":"الكويت","name_en":"Kuwait","phone_code":"+965","currency":"KWD"},
    {"id":"BH","code":"BH","name_ar":"البحرين","name_en":"Bahrain","phone_code":"+973","currency":"BHD"},
    {"id":"OM","code":"OM","name_ar":"عُمان","name_en":"Oman","phone_code":"+968","currency":"OMR"},
    {"id":"MA","code":"MA","name_ar":"المغرب","name_en":"Morocco","phone_code":"+212","currency":"MAD"},
    {"id":"TN","code":"TN","name_ar":"تونس","name_en":"Tunisia","phone_code":"+216","currency":"TND"},
    {"id":"TR","code":"TR","name_ar":"تركيا","name_en":"Turkey","phone_code":"+90","currency":"TRY"},
    {"id":"PK","code":"PK","name_ar":"باكستان","name_en":"Pakistan","phone_code":"+92","currency":"PKR"},
    {"id":"ID","code":"ID","name_ar":"إندونيسيا","name_en":"Indonesia","phone_code":"+62","currency":"IDR"},
    {"id":"DZ","code":"DZ","name_ar":"الجزائر","name_en":"Algeria","phone_code":"+213","currency":"DZD"},
    {"id":"LY","code":"LY","name_ar":"ليبيا","name_en":"Libya","phone_code":"+218","currency":"LYD"},
    {"id":"SD","code":"SD","name_ar":"السودان","name_en":"Sudan","phone_code":"+249","currency":"SDG"},
    {"id":"IQ","code":"IQ","name_ar":"العراق","name_en":"Iraq","phone_code":"+964","currency":"IQD"},
    {"id":"NL","code":"NL","name_ar":"هولندا","name_en":"Netherlands","phone_code":"+31","currency":"EUR"},
    {"id":"DE","code":"DE","name_ar":"ألمانيا","name_en":"Germany","phone_code":"+49","currency":"EUR"}
  ]'::jsonb;
END;
$$;

-- 24. Get cities by country (placeholder using locationData mapping)
CREATE OR REPLACE FUNCTION public.get_cities_by_country(p_country_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return empty array - cities are managed client-side from locationData
  RETURN '[]'::jsonb;
END;
$$;
