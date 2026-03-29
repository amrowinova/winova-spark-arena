-- ============================================================
-- AGENT SYSTEM: Complete RPC Functions
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
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID := auth.uid(); v_existing_id UUID;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT id INTO v_existing_id FROM public.agents WHERE user_id = v_user_id LIMIT 1;
  IF v_existing_id IS NOT NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Already applied as agent'); END IF;
  INSERT INTO public.agents (user_id, shop_name, whatsapp, country, city, latitude, longitude, bio, status, commission_pct, avg_rating, trust_score, total_reviews, total_completed, total_cancellations, total_disputes)
  VALUES (v_user_id, p_shop_name, p_whatsapp, p_country, p_city, p_latitude, p_longitude, p_bio, 'pending', 5, 0, 50, 0, 0, 0, 0);
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

-- ── 2. get_my_agent_profile ───────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_agent_profile()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID := auth.uid(); v_row public.agents%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.agents WHERE user_id = v_user_id LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;
  RETURN jsonb_build_object('found', true, 'id', v_row.id, 'shop_name', v_row.shop_name, 'whatsapp', v_row.whatsapp,
    'country', v_row.country, 'city', v_row.city, 'commission_pct', v_row.commission_pct, 'bio', v_row.bio,
    'status', v_row.status, 'avg_rating', v_row.avg_rating, 'trust_score', v_row.trust_score,
    'total_reviews', v_row.total_reviews, 'total_completed', v_row.total_completed,
    'total_disputes', v_row.total_disputes, 'total_cancellations', v_row.total_cancellations);
END; $$;

-- ── 3. get_nearby_agents ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_nearby_agents(
  p_country   TEXT    DEFAULT NULL,
  p_city      TEXT    DEFAULT NULL,
  p_latitude  NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_limit     INT     DEFAULT 30
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result JSONB;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'id', a.id, 'user_id', a.user_id, 'shop_name', a.shop_name, 'whatsapp', a.whatsapp,
    'country', a.country, 'city', a.city, 'latitude', a.latitude, 'longitude', a.longitude,
    'commission_pct', a.commission_pct, 'bio', a.bio, 'avg_rating', a.avg_rating,
    'trust_score', a.trust_score, 'total_reviews', a.total_reviews, 'total_completed', a.total_completed,
    'total_cancellations', a.total_cancellations, 'total_disputes', a.total_disputes, 'status', a.status,
    'distance_km', CASE
      WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL
      THEN round(CAST(6371 * acos(
        cos(radians(p_latitude)) * cos(radians(a.latitude)) * cos(radians(a.longitude) - radians(p_longitude)) +
        sin(radians(p_latitude)) * sin(radians(a.latitude))) AS NUMERIC), 1)
      ELSE NULL END
  ) ORDER BY a.trust_score DESC, a.avg_rating DESC)
  INTO v_result
  FROM public.agents a
  WHERE a.status = 'active'
    AND (p_country IS NULL OR a.country = p_country)
    AND (p_city    IS NULL OR a.city    = p_city)
  LIMIT p_limit;
  RETURN COALESCE(v_result, '[]'::JSONB);
END; $$;

-- ── 4. get_agent_detail ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_agent_detail(p_agent_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_agent public.agents%ROWTYPE;
  v_profile_name TEXT; v_avatar_url TEXT;
  v_reviews JSONB;
BEGIN
  SELECT * INTO v_agent FROM public.agents WHERE id = p_agent_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;

  SELECT COALESCE(p.name, ''), COALESCE(p.avatar_url, '')
  INTO v_profile_name, v_avatar_url
  FROM public.profiles p WHERE p.user_id = v_agent.user_id LIMIT 1;

  SELECT jsonb_agg(jsonb_build_object(
    'rating', ar.user_rating, 'comment', ar.user_review_comment,
    'has_issue', ar.user_has_issue, 'created_at', ar.updated_at
  ) ORDER BY ar.updated_at DESC)
  INTO v_reviews
  FROM public.agent_reservations ar
  WHERE ar.agent_id = p_agent_id AND ar.user_rating IS NOT NULL
  LIMIT 10;

  RETURN jsonb_build_object(
    'found', true, 'id', v_agent.id, 'user_id', v_agent.user_id,
    'shop_name', v_agent.shop_name, 'whatsapp', v_agent.whatsapp,
    'country', v_agent.country, 'city', v_agent.city,
    'latitude', v_agent.latitude, 'longitude', v_agent.longitude,
    'commission_pct', v_agent.commission_pct, 'bio', v_agent.bio,
    'avg_rating', v_agent.avg_rating, 'trust_score', v_agent.trust_score,
    'total_reviews', v_agent.total_reviews, 'total_completed', v_agent.total_completed,
    'total_cancellations', v_agent.total_cancellations, 'total_disputes', v_agent.total_disputes,
    'status', v_agent.status,
    'user_name', COALESCE(v_profile_name, ''),
    'avatar_url', v_avatar_url,
    'recent_reviews', COALESCE(v_reviews, '[]'::JSONB)
  );
END; $$;

-- ── 5. create_agent_reservation ───────────────────────────
CREATE OR REPLACE FUNCTION public.create_agent_reservation(
  p_agent_id      UUID,
  p_type          TEXT,
  p_nova_amount   NUMERIC,
  p_fiat_amount   NUMERIC DEFAULT NULL,
  p_fiat_currency TEXT    DEFAULT NULL,
  p_notes         TEXT    DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID := auth.uid(); v_agent public.agents%ROWTYPE;
  v_commission NUMERIC; v_reservation_id UUID;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT * INTO v_agent FROM public.agents WHERE id = p_agent_id AND status = 'active' LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Agent not found or inactive'); END IF;
  IF v_agent.user_id = v_user_id THEN RETURN jsonb_build_object('success', false, 'error', 'Cannot reserve your own agent slot'); END IF;
  v_commission := round(p_nova_amount * v_agent.commission_pct / 100, 2);
  INSERT INTO public.agent_reservations (agent_id, user_id, type, nova_amount, fiat_amount, fiat_currency, commission_pct, commission_nova, status, notes)
  VALUES (p_agent_id, v_user_id, p_type, p_nova_amount, p_fiat_amount, p_fiat_currency, v_agent.commission_pct, v_commission, 'pending', p_notes)
  RETURNING id INTO v_reservation_id;
  -- System message
  INSERT INTO public.agent_messages (reservation_id, sender_id, content, is_system_msg)
  VALUES (v_reservation_id, v_user_id, 'Reservation created. Waiting for agent to accept.', true);
  RETURN jsonb_build_object('success', true, 'reservation_id', v_reservation_id);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

-- ── 6. agent_respond_reservation ──────────────────────────
CREATE OR REPLACE FUNCTION public.agent_respond_reservation(
  p_reservation_id UUID,
  p_accept         BOOLEAN,
  p_reject_reason  TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_res public.agent_reservations%ROWTYPE;
  v_agent_user_id UUID;
BEGIN
  SELECT * INTO v_res FROM public.agent_reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Reservation not found'); END IF;
  IF v_res.status <> 'pending' THEN RETURN jsonb_build_object('success', false, 'error', 'Reservation is not pending'); END IF;
  SELECT user_id INTO v_agent_user_id FROM public.agents WHERE id = v_res.agent_id;
  IF v_agent_user_id <> v_uid THEN RETURN jsonb_build_object('success', false, 'error', 'Only the agent can respond'); END IF;

  IF p_accept THEN
    UPDATE public.agent_reservations
    SET status = 'accepted', escrow_deadline = now() + INTERVAL '2 hours'
    WHERE id = p_reservation_id;
    INSERT INTO public.agent_messages (reservation_id, sender_id, content, is_system_msg)
    VALUES (p_reservation_id, v_uid, 'Agent accepted the reservation. Proceed with the transaction.', true);
  ELSE
    UPDATE public.agent_reservations
    SET status = 'cancelled', reject_reason = p_reject_reason
    WHERE id = p_reservation_id;
    INSERT INTO public.agent_messages (reservation_id, sender_id, content, is_system_msg)
    VALUES (p_reservation_id, v_uid, COALESCE('Agent declined: ' || p_reject_reason, 'Agent declined the reservation.'), true);
  END IF;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

-- ── 7. confirm_agent_reservation ──────────────────────────
CREATE OR REPLACE FUNCTION public.confirm_agent_reservation(p_reservation_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_res public.agent_reservations%ROWTYPE;
  v_agent_user_id UUID; v_new_status TEXT;
BEGIN
  SELECT * INTO v_res FROM public.agent_reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Reservation not found'); END IF;
  IF v_res.status NOT IN ('accepted','active') THEN RETURN jsonb_build_object('success', false, 'error', 'Cannot confirm at this stage'); END IF;
  SELECT user_id INTO v_agent_user_id FROM public.agents WHERE id = v_res.agent_id;

  IF v_uid = v_res.user_id THEN
    UPDATE public.agent_reservations SET user_confirmed_at = now(),
      status = CASE WHEN agent_confirmed_at IS NOT NULL THEN 'completed' ELSE 'active' END
    WHERE id = p_reservation_id;
  ELSIF v_uid = v_agent_user_id THEN
    UPDATE public.agent_reservations SET agent_confirmed_at = now(),
      status = CASE WHEN user_confirmed_at IS NOT NULL THEN 'completed' ELSE 'active' END
    WHERE id = p_reservation_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Not a party to this reservation');
  END IF;

  SELECT status INTO v_new_status FROM public.agent_reservations WHERE id = p_reservation_id;

  IF v_new_status = 'completed' THEN
    -- Update agent stats
    UPDATE public.agents SET total_completed = total_completed + 1 WHERE id = v_res.agent_id;
    -- Update avg_rating if both rated
    UPDATE public.agents a SET
      avg_rating = (SELECT COALESCE(AVG(user_rating), 0) FROM public.agent_reservations
                    WHERE agent_id = a.id AND user_rating IS NOT NULL),
      total_reviews = (SELECT COUNT(*) FROM public.agent_reservations
                       WHERE agent_id = a.id AND user_rating IS NOT NULL)
    WHERE a.id = v_res.agent_id;
    INSERT INTO public.agent_messages (reservation_id, sender_id, content, is_system_msg)
    VALUES (p_reservation_id, v_uid, 'Transaction completed successfully! Please rate your experience.', true);
  END IF;

  RETURN jsonb_build_object('success', true, 'status', v_new_status);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

-- ── 8. cancel_agent_reservation ───────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_agent_reservation(
  p_reservation_id UUID,
  p_reason         TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_res public.agent_reservations%ROWTYPE;
  v_agent_user_id UUID;
BEGIN
  SELECT * INTO v_res FROM public.agent_reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Reservation not found'); END IF;
  IF v_res.status IN ('completed','cancelled','disputed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot cancel at this stage'); END IF;
  SELECT user_id INTO v_agent_user_id FROM public.agents WHERE id = v_res.agent_id;
  IF v_uid <> v_res.user_id AND v_uid <> v_agent_user_id AND NOT public.has_role(v_uid, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized'); END IF;

  UPDATE public.agent_reservations SET status = 'cancelled', cancel_reason = p_reason WHERE id = p_reservation_id;

  IF v_uid = v_agent_user_id THEN
    UPDATE public.agents SET total_cancellations = total_cancellations + 1 WHERE id = v_res.agent_id;
  END IF;

  INSERT INTO public.agent_messages (reservation_id, sender_id, content, is_system_msg)
  VALUES (p_reservation_id, v_uid, COALESCE('Cancelled: ' || p_reason, 'Reservation cancelled.'), true);
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

-- ── 9. raise_agent_dispute ────────────────────────────────
CREATE OR REPLACE FUNCTION public.raise_agent_dispute(
  p_reservation_id UUID,
  p_reason         TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_res public.agent_reservations%ROWTYPE;
  v_agent_user_id UUID;
BEGIN
  SELECT * INTO v_res FROM public.agent_reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Reservation not found'); END IF;
  IF v_res.status NOT IN ('accepted','active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only dispute active reservations'); END IF;
  SELECT user_id INTO v_agent_user_id FROM public.agents WHERE id = v_res.agent_id;
  IF v_uid <> v_res.user_id AND v_uid <> v_agent_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a party to this reservation'); END IF;

  UPDATE public.agent_reservations SET status = 'disputed', dispute_reason = p_reason WHERE id = p_reservation_id;
  UPDATE public.agents SET total_disputes = total_disputes + 1 WHERE id = v_res.agent_id;
  INSERT INTO public.agent_messages (reservation_id, sender_id, content, is_system_msg)
  VALUES (p_reservation_id, v_uid, 'Dispute raised: ' || p_reason || '. Admin will review.', true);
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

-- ── 10. submit_agent_review (user rates agent) ────────────
CREATE OR REPLACE FUNCTION public.submit_agent_review(
  p_reservation_id UUID,
  p_rating         SMALLINT,
  p_comment        TEXT,
  p_has_issue      BOOLEAN DEFAULT FALSE
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_res public.agent_reservations%ROWTYPE;
BEGIN
  SELECT * INTO v_res FROM public.agent_reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Reservation not found'); END IF;
  IF v_res.user_id <> v_uid THEN RETURN jsonb_build_object('success', false, 'error', 'Not your reservation'); END IF;
  IF v_res.status <> 'completed' THEN RETURN jsonb_build_object('success', false, 'error', 'Can only review completed reservations'); END IF;
  IF v_res.user_rating IS NOT NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Already reviewed'); END IF;
  IF p_rating < 1 OR p_rating > 5 THEN RETURN jsonb_build_object('success', false, 'error', 'Rating must be 1-5'); END IF;

  UPDATE public.agent_reservations
  SET user_rating = p_rating, user_review_comment = p_comment, user_has_issue = p_has_issue
  WHERE id = p_reservation_id;

  -- Recalculate agent avg_rating
  UPDATE public.agents a SET
    avg_rating = (SELECT COALESCE(AVG(user_rating::NUMERIC), 0) FROM public.agent_reservations
                  WHERE agent_id = a.id AND user_rating IS NOT NULL),
    total_reviews = (SELECT COUNT(*) FROM public.agent_reservations
                     WHERE agent_id = a.id AND user_rating IS NOT NULL)
  WHERE a.id = v_res.agent_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

-- ── 11. rate_user_by_agent ────────────────────────────────
CREATE OR REPLACE FUNCTION public.rate_user_by_agent(
  p_reservation_id UUID,
  p_rating         SMALLINT,
  p_comment        TEXT,
  p_has_issue      BOOLEAN DEFAULT FALSE
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_res public.agent_reservations%ROWTYPE;
  v_agent_user_id UUID;
BEGIN
  SELECT * INTO v_res FROM public.agent_reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Reservation not found'); END IF;
  SELECT user_id INTO v_agent_user_id FROM public.agents WHERE id = v_res.agent_id;
  IF v_agent_user_id <> v_uid THEN RETURN jsonb_build_object('success', false, 'error', 'Only agent can rate user'); END IF;
  IF v_res.status <> 'completed' THEN RETURN jsonb_build_object('success', false, 'error', 'Can only review completed reservations'); END IF;
  IF v_res.agent_rating IS NOT NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Already reviewed'); END IF;

  UPDATE public.agent_reservations
  SET agent_rating = p_rating, agent_review_comment = p_comment, agent_has_issue = p_has_issue
  WHERE id = p_reservation_id;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

-- ── 12. send_agent_message ────────────────────────────────
CREATE OR REPLACE FUNCTION public.send_agent_message(
  p_reservation_id UUID,
  p_content        TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_res public.agent_reservations%ROWTYPE;
  v_agent_user_id UUID; v_msg_id UUID;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT * INTO v_res FROM public.agent_reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Reservation not found'); END IF;
  SELECT user_id INTO v_agent_user_id FROM public.agents WHERE id = v_res.agent_id;
  IF v_uid <> v_res.user_id AND v_uid <> v_agent_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a party to this reservation'); END IF;
  IF v_res.status IN ('completed','cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot message on closed reservation'); END IF;

  INSERT INTO public.agent_messages (reservation_id, sender_id, content, is_system_msg)
  VALUES (p_reservation_id, v_uid, p_content, false) RETURNING id INTO v_msg_id;
  RETURN jsonb_build_object('success', true, 'message_id', v_msg_id);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

-- ── 13. request_extension ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.request_extension(
  p_reservation_id UUID,
  p_minutes        INT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_res public.agent_reservations%ROWTYPE;
  v_agent_user_id UUID;
BEGIN
  SELECT * INTO v_res FROM public.agent_reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Reservation not found'); END IF;
  IF v_res.status <> 'active' THEN RETURN jsonb_build_object('success', false, 'error', 'Can only extend active reservations'); END IF;
  IF p_minutes NOT IN (10, 20, 30) THEN RETURN jsonb_build_object('success', false, 'error', 'Extension must be 10, 20 or 30 minutes'); END IF;
  IF v_res.extension_status = 'pending' THEN RETURN jsonb_build_object('success', false, 'error', 'Extension already pending'); END IF;
  SELECT user_id INTO v_agent_user_id FROM public.agents WHERE id = v_res.agent_id;
  IF v_uid <> v_res.user_id AND v_uid <> v_agent_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a party to this reservation'); END IF;

  UPDATE public.agent_reservations
  SET extension_requested_by = v_uid, extension_minutes = p_minutes, extension_status = 'pending'
  WHERE id = p_reservation_id;
  INSERT INTO public.agent_messages (reservation_id, sender_id, content, is_system_msg)
  VALUES (p_reservation_id, v_uid, 'Requested ' || p_minutes || ' minute extension.', true);
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

-- ── 14. respond_extension ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.respond_extension(
  p_reservation_id UUID,
  p_accept         BOOLEAN
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_res public.agent_reservations%ROWTYPE;
  v_agent_user_id UUID;
BEGIN
  SELECT * INTO v_res FROM public.agent_reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Reservation not found'); END IF;
  IF v_res.extension_status <> 'pending' THEN RETURN jsonb_build_object('success', false, 'error', 'No pending extension request'); END IF;
  -- Responder is the OTHER party
  SELECT user_id INTO v_agent_user_id FROM public.agents WHERE id = v_res.agent_id;
  IF v_res.extension_requested_by = v_res.user_id AND v_uid <> v_agent_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only agent can accept this extension'); END IF;
  IF v_res.extension_requested_by = v_agent_user_id AND v_uid <> v_res.user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only user can accept this extension'); END IF;

  IF p_accept THEN
    UPDATE public.agent_reservations
    SET extension_status = 'accepted',
        escrow_deadline = COALESCE(escrow_deadline, now()) + (extension_minutes || ' minutes')::INTERVAL
    WHERE id = p_reservation_id;
    INSERT INTO public.agent_messages (reservation_id, sender_id, content, is_system_msg)
    VALUES (p_reservation_id, v_uid, 'Extension accepted. Deadline extended by ' || v_res.extension_minutes || ' minutes.', true);
  ELSE
    UPDATE public.agent_reservations SET extension_status = 'declined' WHERE id = p_reservation_id;
    INSERT INTO public.agent_messages (reservation_id, sender_id, content, is_system_msg)
    VALUES (p_reservation_id, v_uid, 'Extension declined.', true);
  END IF;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

-- ── 15. get_reservation_with_messages ─────────────────────
CREATE OR REPLACE FUNCTION public.get_reservation_with_messages(p_reservation_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_res public.agent_reservations%ROWTYPE;
  v_agent public.agents%ROWTYPE;
  v_msgs JSONB;
BEGIN
  SELECT * INTO v_res FROM public.agent_reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;
  SELECT * INTO v_agent FROM public.agents WHERE id = v_res.agent_id;

  -- Access check
  IF v_uid <> v_res.user_id AND v_uid <> v_agent.user_id AND NOT public.has_role(v_uid, 'admin') THEN
    RETURN jsonb_build_object('found', false, 'error', 'Access denied'); END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'id', m.id, 'sender_id', m.sender_id, 'content', m.content,
    'is_system_msg', m.is_system_msg, 'created_at', m.created_at
  ) ORDER BY m.created_at ASC)
  INTO v_msgs FROM public.agent_messages m WHERE m.reservation_id = p_reservation_id;

  RETURN jsonb_build_object(
    'found', true,
    'id', v_res.id, 'agent_id', v_res.agent_id, 'user_id', v_res.user_id,
    'agent_user_id', v_agent.user_id, 'shop_name', v_agent.shop_name,
    'whatsapp', v_agent.whatsapp, 'avg_rating', v_agent.avg_rating, 'trust_score', v_agent.trust_score,
    'type', v_res.type, 'nova_amount', v_res.nova_amount,
    'fiat_amount', v_res.fiat_amount, 'fiat_currency', v_res.fiat_currency,
    'commission_pct', v_res.commission_pct, 'commission_nova', v_res.commission_nova,
    'status', v_res.status, 'escrow_holder', v_res.escrow_holder,
    'user_confirmed_at', v_res.user_confirmed_at, 'agent_confirmed_at', v_res.agent_confirmed_at,
    'escrow_deadline', v_res.escrow_deadline,
    'extension_requested_by', v_res.extension_requested_by,
    'extension_minutes', v_res.extension_minutes, 'extension_status', v_res.extension_status,
    'dispute_reason', v_res.dispute_reason, 'dispute_resolution', v_res.dispute_resolution,
    'notes', v_res.notes, 'expires_at', v_res.expires_at,
    'created_at', v_res.created_at,
    'is_agent', (v_uid = v_agent.user_id),
    'messages', COALESCE(v_msgs, '[]'::JSONB)
  );
END; $$;

-- ── 16. admin_manage_agent ────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_manage_agent(
  p_agent_id UUID,
  p_action   TEXT,
  p_reason   TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RETURN jsonb_build_object('success', false, 'error', 'Unauthorized'); END IF;
  IF p_action NOT IN ('approve', 'reject', 'suspend', 'reactivate') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action'); END IF;
  UPDATE public.agents SET status = CASE p_action
    WHEN 'approve'    THEN 'active'
    WHEN 'reject'     THEN 'rejected'
    WHEN 'suspend'    THEN 'suspended'
    WHEN 'reactivate' THEN 'active'
  END WHERE id = p_agent_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Agent not found'); END IF;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

-- ── 17. admin_resolve_agent_dispute ───────────────────────
CREATE OR REPLACE FUNCTION public.admin_resolve_agent_dispute(
  p_reservation_id UUID,
  p_resolution     TEXT  -- 'release_to_user' | 'release_to_agent'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_res public.agent_reservations%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RETURN jsonb_build_object('success', false, 'error', 'Unauthorized'); END IF;
  SELECT * INTO v_res FROM public.agent_reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Reservation not found'); END IF;
  IF v_res.status <> 'disputed' THEN RETURN jsonb_build_object('success', false, 'error', 'Reservation is not in disputed state'); END IF;
  IF p_resolution NOT IN ('release_to_user','release_to_agent') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid resolution'); END IF;

  UPDATE public.agent_reservations
  SET status = 'completed', dispute_resolution = p_resolution
  WHERE id = p_reservation_id;

  INSERT INTO public.agent_messages (reservation_id, sender_id, content, is_system_msg)
  VALUES (p_reservation_id, auth.uid(), 'Admin resolved dispute: ' || p_resolution, true);
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

-- ── Grants ────────────────────────────────────────────────
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
