/**
 * Agent System V2 — Trust Layer
 * ─────────────────────────────
 * Adds:
 *   1. agent_messages       — reservation-scoped chat
 *   2. Extension system     — timeout + extend request
 *   3. Trust score          — agents + users
 *   4. Mutual rating        — agent rates user
 *   5. Enhanced stats       — response time, cancellations, disputes
 */

-- ── 1. Escrow deadline + extension columns on agent_reservations ──────────────
ALTER TABLE public.agent_reservations
  ADD COLUMN IF NOT EXISTS escrow_deadline          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS extension_requested_by   UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS extension_minutes        INTEGER CHECK (extension_minutes IN (10, 20, 30)),
  ADD COLUMN IF NOT EXISTS extension_requested_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS extension_status         TEXT
    CHECK (extension_status IN ('pending', 'accepted', 'rejected') OR extension_status IS NULL);

-- ── 2. Enhanced stats on agents ───────────────────────────────────────────────
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS total_cancellations        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_disputes             INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_response_time_seconds  INTEGER,
  ADD COLUMN IF NOT EXISTS trust_score                DECIMAL(5,2) NOT NULL DEFAULT 100.0
    CHECK (trust_score >= 0 AND trust_score <= 100);

-- Trust score for regular users (shown when they interact with agents)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_trust_score DECIMAL(5,2) NOT NULL DEFAULT 100.0
    CHECK (user_trust_score >= 0 AND user_trust_score <= 100);

-- ── 3. agent_messages — reservation-scoped chat ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  UUID NOT NULL
                    REFERENCES public.agent_reservations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  is_system_msg   BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_messages_select"
  ON public.agent_messages FOR SELECT
  USING (
    sender_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.agent_reservations r
      JOIN public.agents a ON a.id = r.agent_id
      WHERE r.id = reservation_id
        AND (r.user_id = auth.uid() OR a.user_id = auth.uid())
    )
  );

CREATE POLICY "agent_messages_insert"
  ON public.agent_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.agent_reservations r
      JOIN public.agents a ON a.id = r.agent_id
      WHERE r.id = reservation_id
        AND (r.user_id = auth.uid() OR a.user_id = auth.uid())
        AND r.status IN ('escrow', 'pending')
    )
  );

-- ── 4. user_reviews — agent rates the user ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_user_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  UUID UNIQUE NOT NULL
                    REFERENCES public.agent_reservations(id) ON DELETE CASCADE,
  agent_id        UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  reviewee_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT NOT NULL,
  has_issue       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agent_user_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_reviews_select"
  ON public.agent_user_reviews FOR SELECT USING (true);

CREATE POLICY "user_reviews_insert_via_rpc"
  ON public.agent_user_reviews FOR INSERT WITH CHECK (false);

-- ── 5. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_agent_messages_reservation
  ON public.agent_messages (reservation_id, created_at ASC);

-- ── 6. send_agent_message ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.send_agent_message(
  p_reservation_id UUID,
  p_content        TEXT
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

  IF trim(p_content) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Message cannot be empty');
  END IF;

  -- Verify participant
  IF NOT EXISTS (
    SELECT 1 FROM public.agent_reservations r
    JOIN public.agents a ON a.id = r.agent_id
    WHERE r.id = p_reservation_id
      AND (r.user_id = v_uid OR a.user_id = v_uid)
      AND r.status IN ('pending', 'escrow', 'disputed')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized or reservation closed');
  END IF;

  INSERT INTO public.agent_messages (reservation_id, sender_id, content)
  VALUES (p_reservation_id, v_uid, trim(p_content));

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_agent_message(UUID,TEXT) TO authenticated;

-- ── 7. request_extension ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.request_extension(
  p_reservation_id UUID,
  p_minutes        INTEGER  -- 10 | 20 | 30
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

  IF p_minutes NOT IN (10, 20, 30) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid extension. Choose 10, 20 or 30 minutes');
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
    RETURN jsonb_build_object('success', false, 'error', 'Can only extend active escrow');
  END IF;

  IF v_reservation.extension_status = 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'An extension request is already pending');
  END IF;

  UPDATE public.agent_reservations
     SET extension_requested_by = v_uid,
         extension_minutes      = p_minutes,
         extension_requested_at = NOW(),
         extension_status       = 'pending',
         updated_at             = NOW()
   WHERE id = p_reservation_id;

  -- Notify the other party
  DECLARE v_other_uid UUID;
  BEGIN
    v_other_uid := CASE WHEN v_uid = v_reservation.user_id
                    THEN v_reservation.agent_user_id
                    ELSE v_reservation.user_id END;
    INSERT INTO public.notifications (user_id, type, title, description, is_read, action_path)
    VALUES (
      v_other_uid, 'agent_extension_request',
      '⏱️ طلب تمديد',
      'الطرف الآخر يطلب تمديد العملية بـ ' || p_minutes || ' دقيقة',
      false, '/agent-dashboard'
    );
  END;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_extension(UUID,INTEGER) TO authenticated;

-- ── 8. respond_extension ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.respond_extension(
  p_reservation_id UUID,
  p_accept         BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         UUID := auth.uid();
  v_reservation RECORD;
  v_requester   UUID;
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

  IF v_reservation.extension_status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'No pending extension request');
  END IF;

  -- The responder must NOT be the requester
  IF v_uid = v_reservation.extension_requested_by THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot respond to your own request');
  END IF;

  IF v_uid != v_reservation.user_id AND v_uid != v_reservation.agent_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF p_accept THEN
    UPDATE public.agent_reservations
       SET extension_status  = 'accepted',
           escrow_deadline   = COALESCE(escrow_deadline, NOW()) + (extension_minutes || ' minutes')::INTERVAL,
           updated_at        = NOW()
     WHERE id = p_reservation_id;

    -- System message in chat
    INSERT INTO public.agent_messages (reservation_id, sender_id, content, is_system_msg)
    VALUES (
      p_reservation_id, v_uid,
      'تم قبول التمديد — تمديد ' || v_reservation.extension_minutes || ' دقيقة',
      true
    );
  ELSE
    UPDATE public.agent_reservations
       SET extension_status = 'rejected', updated_at = NOW()
     WHERE id = p_reservation_id;
  END IF;

  -- Notify requester
  INSERT INTO public.notifications (user_id, type, title, description, is_read, action_path)
  VALUES (
    v_reservation.extension_requested_by,
    'agent_extension_response',
    CASE WHEN p_accept THEN '✅ تم قبول التمديد' ELSE '❌ تم رفض التمديد' END,
    CASE WHEN p_accept
      THEN 'تم تمديد العملية بـ ' || v_reservation.extension_minutes || ' دقيقة'
      ELSE 'رفض الطرف الآخر طلب التمديد'
    END,
    false, '/agent-dashboard'
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_extension(UUID,BOOLEAN) TO authenticated;

-- ── 9. rate_user_by_agent — agent rates the user after completion ─────────────
CREATE OR REPLACE FUNCTION public.rate_user_by_agent(
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
  v_review_count INTEGER;
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

  SELECT r.*, a.user_id AS agent_user_id
    INTO v_reservation
    FROM public.agent_reservations r
    JOIN public.agents a ON a.id = r.agent_id
   WHERE r.id = p_reservation_id;

  IF NOT FOUND OR v_reservation.agent_user_id != v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_reservation.status NOT IN ('completed', 'resolved') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only rate completed reservations');
  END IF;

  IF EXISTS (SELECT 1 FROM public.agent_user_reviews WHERE reservation_id = p_reservation_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already rated');
  END IF;

  INSERT INTO public.agent_user_reviews (
    reservation_id, agent_id, reviewee_id, rating, comment, has_issue
  ) VALUES (
    p_reservation_id, v_reservation.agent_id, v_reservation.user_id,
    p_rating, p_comment, p_has_issue
  );

  -- Recalculate user trust score based on reviews
  SELECT AVG(rating), COUNT(*) INTO v_new_avg, v_review_count
    FROM public.agent_user_reviews WHERE reviewee_id = v_reservation.user_id;

  -- Simple trust score: base 100, -5 per bad review (rating < 3), -10 per has_issue
  UPDATE public.profiles
     SET user_trust_score = GREATEST(0, LEAST(100,
       100 - (
         (SELECT COUNT(*) FROM public.agent_user_reviews
          WHERE reviewee_id = v_reservation.user_id AND rating < 3) * 5 +
         (SELECT COUNT(*) FROM public.agent_user_reviews
          WHERE reviewee_id = v_reservation.user_id AND has_issue = true) * 10
       )
     ))
   WHERE user_id = v_reservation.user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rate_user_by_agent(UUID,INTEGER,TEXT,BOOLEAN) TO authenticated;

-- ── 10. compute_agent_trust_score ─────────────────────────────────────────────
-- Called after any status change to keep trust_score fresh.
CREATE OR REPLACE FUNCTION public.compute_agent_trust_score(p_agent_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total         INTEGER;
  v_completed     INTEGER;
  v_cancelled     INTEGER;
  v_disputes      INTEGER;
  v_avg_rating    DECIMAL;
  v_complete_rate DECIMAL;
  v_rating_score  DECIMAL;
  v_dispute_pen   DECIMAL;
  v_score         DECIMAL;
BEGIN
  SELECT total_completed, total_cancellations, total_disputes, avg_rating
    INTO v_completed, v_cancelled, v_disputes, v_avg_rating
    FROM public.agents WHERE id = p_agent_id;

  v_total := GREATEST(1, v_completed + v_cancelled);

  -- completion rate (40% weight)
  v_complete_rate := (v_completed::DECIMAL / v_total) * 40;

  -- rating score (40% weight: avg_rating/5 * 40)
  v_rating_score  := (COALESCE(v_avg_rating, 5) / 5.0) * 40;

  -- dispute penalty (−5 per dispute, max −20)
  v_dispute_pen   := LEAST(20, v_disputes * 5);

  v_score := GREATEST(0, LEAST(100, v_complete_rate + v_rating_score - v_dispute_pen + 20));
  -- +20 base to start new agents at 100

  UPDATE public.agents
     SET trust_score = ROUND(v_score, 1),
         updated_at  = NOW()
   WHERE id = p_agent_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_agent_trust_score(UUID) TO service_role;

-- ── 11. Trigger to update trust_score after reservation status changes ─────────
CREATE OR REPLACE FUNCTION public._update_agent_trust_on_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('completed', 'cancelled', 'resolved') AND
     NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.compute_agent_trust_score(NEW.agent_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agent_trust_update ON public.agent_reservations;
CREATE TRIGGER trg_agent_trust_update
  AFTER UPDATE ON public.agent_reservations
  FOR EACH ROW EXECUTE FUNCTION public._update_agent_trust_on_reservation();

-- ── 12. get_agent_detail ─────────────────────────────────────────────────────
-- Returns full agent profile + recent reviews + stats for display
CREATE OR REPLACE FUNCTION public.get_agent_detail(p_agent_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent   RECORD;
  v_reviews JSONB;
BEGIN
  SELECT a.*, p.name AS user_name, p.avatar_url
    INTO v_agent
    FROM public.agents a
    JOIN public.profiles p ON p.user_id = a.user_id
   WHERE a.id = p_agent_id AND a.status = 'verified';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'rating', r.rating,
      'comment', r.comment,
      'has_issue', r.has_issue,
      'created_at', r.created_at
    ) ORDER BY r.created_at DESC
  )
  INTO v_reviews
  FROM public.agent_reviews r
  WHERE r.agent_id = p_agent_id
  LIMIT 5;

  RETURN jsonb_build_object(
    'found', true,
    'id', v_agent.id,
    'user_id', v_agent.user_id,
    'user_name', v_agent.user_name,
    'avatar_url', v_agent.avatar_url,
    'shop_name', v_agent.shop_name,
    'whatsapp', v_agent.whatsapp,
    'country', v_agent.country,
    'city', v_agent.city,
    'commission_pct', v_agent.commission_pct,
    'bio', v_agent.bio,
    'avg_rating', v_agent.avg_rating,
    'trust_score', v_agent.trust_score,
    'total_reviews', v_agent.total_reviews,
    'total_completed', v_agent.total_completed,
    'total_cancellations', v_agent.total_cancellations,
    'total_disputes', v_agent.total_disputes,
    'avg_response_time_seconds', v_agent.avg_response_time_seconds,
    'recent_reviews', COALESCE(v_reviews, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_agent_detail(UUID) TO authenticated;

-- ── 13. get_reservation_with_messages ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_reservation_with_messages(p_reservation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         UUID := auth.uid();
  v_reservation RECORD;
  v_messages    JSONB;
  v_agent       RECORD;
  v_user_profile RECORD;
BEGIN
  SELECT r.*, a.user_id AS agent_user_id, a.shop_name, a.commission_pct,
         a.avg_rating, a.trust_score, a.whatsapp
    INTO v_reservation
    FROM public.agent_reservations r
    JOIN public.agents a ON a.id = r.agent_id
   WHERE r.id = p_reservation_id
     AND (r.user_id = v_uid OR a.user_id = v_uid);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'sender_id', m.sender_id,
      'content', m.content,
      'is_system_msg', m.is_system_msg,
      'created_at', m.created_at
    ) ORDER BY m.created_at ASC
  )
  INTO v_messages
  FROM public.agent_messages m
  WHERE m.reservation_id = p_reservation_id;

  RETURN jsonb_build_object(
    'found', true,
    'id', v_reservation.id,
    'agent_id', v_reservation.agent_id,
    'agent_user_id', v_reservation.agent_user_id,
    'user_id', v_reservation.user_id,
    'shop_name', v_reservation.shop_name,
    'type', v_reservation.type,
    'nova_amount', v_reservation.nova_amount,
    'fiat_amount', v_reservation.fiat_amount,
    'fiat_currency', v_reservation.fiat_currency,
    'commission_pct', v_reservation.commission_pct,
    'commission_nova', v_reservation.commission_nova,
    'status', v_reservation.status,
    'escrow_holder', v_reservation.escrow_holder,
    'user_confirmed_at', v_reservation.user_confirmed_at,
    'agent_confirmed_at', v_reservation.agent_confirmed_at,
    'escrow_deadline', v_reservation.escrow_deadline,
    'extension_requested_by', v_reservation.extension_requested_by,
    'extension_minutes', v_reservation.extension_minutes,
    'extension_status', v_reservation.extension_status,
    'dispute_reason', v_reservation.dispute_reason,
    'dispute_resolution', v_reservation.dispute_resolution,
    'notes', v_reservation.notes,
    'expires_at', v_reservation.expires_at,
    'created_at', v_reservation.created_at,
    'whatsapp', v_reservation.whatsapp,
    'avg_rating', v_reservation.avg_rating,
    'trust_score', v_reservation.trust_score,
    'messages', COALESCE(v_messages, '[]'::jsonb),
    'is_agent', (v_uid = v_reservation.agent_user_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_reservation_with_messages(UUID) TO authenticated;
