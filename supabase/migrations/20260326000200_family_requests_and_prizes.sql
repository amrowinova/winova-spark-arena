-- ══════════════════════════════════════════════════════════════════════════════
-- Phase 2: Family requests system + Referral prizes
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. family_requests (user-submitted, reviewed by admin) ───────────────────
CREATE TABLE IF NOT EXISTS public.family_requests (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  head_name       TEXT        NOT NULL,
  country         TEXT        NOT NULL,
  city            TEXT        NOT NULL,
  story           TEXT        NOT NULL,
  members_count   INTEGER     DEFAULT 1 CHECK (members_count >= 1),
  contact_phone   TEXT,
  photo_urls      TEXT[]      DEFAULT '{}',
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','approved','rejected')),
  admin_note      TEXT,
  reviewed_by     UUID        REFERENCES auth.users(id),
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_family_requests_status  ON public.family_requests(status);
CREATE INDEX idx_family_requests_user    ON public.family_requests(submitted_by);

ALTER TABLE public.family_requests ENABLE ROW LEVEL SECURITY;

-- Users can see and submit their own requests
CREATE POLICY "family_requests_own"
  ON public.family_requests FOR SELECT
  USING (submitted_by = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "family_requests_insert"
  ON public.family_requests FOR INSERT
  WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "family_requests_admin_update"
  ON public.family_requests FOR UPDATE
  USING (public.has_role(auth.uid(),'admin'));

-- updated_at trigger
CREATE TRIGGER trg_family_requests_updated_at
  BEFORE UPDATE ON public.family_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── 2. submit_family_request RPC ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_family_request(
  p_head_name     text,
  p_country       text,
  p_city          text,
  p_story         text,
  p_members_count int,
  p_contact_phone text DEFAULT NULL,
  p_photo_urls    text[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing_count int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Limit 1 pending request per user
  SELECT COUNT(*) INTO v_existing_count
  FROM public.family_requests
  WHERE submitted_by = v_user_id AND status = 'pending';

  IF v_existing_count >= 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have a pending request');
  END IF;

  INSERT INTO public.family_requests (
    submitted_by, head_name, country, city, story,
    members_count, contact_phone, photo_urls
  ) VALUES (
    v_user_id, p_head_name, p_country, p_city, p_story,
    p_members_count, p_contact_phone, p_photo_urls
  );

  -- Notify admins via notifications table (best effort)
  INSERT INTO public.notifications (user_id, type, title, body, metadata)
  SELECT p.user_id,
         'family_request_new',
         'طلب عائلة جديد',
         'تم تقديم طلب عائلة جديد من ' || COALESCE((SELECT display_name FROM profiles WHERE user_id = v_user_id), 'مستخدم'),
         jsonb_build_object('submitted_by', v_user_id)
  FROM public.profiles p
  WHERE public.has_role(p.user_id, 'admin')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ── 3. admin_review_family_request RPC ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_review_family_request(
  p_request_id uuid,
  p_action     text,   -- 'approve' | 'reject'
  p_note       text    DEFAULT NULL,
  p_need_score int     DEFAULT 70
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id  uuid := auth.uid();
  v_req       record;
  v_family_id uuid;
  v_nova_id   text;
BEGIN
  IF NOT public.has_role(v_admin_id, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_req FROM public.family_requests
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or already reviewed');
  END IF;

  IF p_action = 'approve' THEN
    -- Generate nova_id
    SELECT UPPER(LEFT(v_req.country, 2)) || '-' || LPAD(NEXTVAL('public.nova_id_seq')::text, 6, '0')
    INTO v_nova_id;

    INSERT INTO public.families (
      nova_id, head_name, country, city, story,
      members_count, need_score, status
    ) VALUES (
      v_nova_id, v_req.head_name, v_req.country, v_req.city, v_req.story,
      v_req.members_count, p_need_score, 'active'
    ) RETURNING id INTO v_family_id;

    -- Add photos as family_media
    IF array_length(v_req.photo_urls, 1) > 0 THEN
      INSERT INTO public.family_media (family_id, type, url)
      SELECT v_family_id, 'image', unnest(v_req.photo_urls);
    END IF;

    UPDATE public.family_requests
    SET status = 'approved', admin_note = p_note,
        reviewed_by = v_admin_id, reviewed_at = NOW()
    WHERE id = p_request_id;

    -- Notify submitter
    INSERT INTO public.notifications (user_id, type, title, body, metadata)
    VALUES (
      v_req.submitted_by, 'family_request_approved',
      'تم قبول طلبكم',
      'تمت الموافقة على طلب تسجيل عائلتكم في نظام العطاء. شكراً لثقتكم.',
      jsonb_build_object('family_id', v_family_id, 'nova_id', v_nova_id)
    ) ON CONFLICT DO NOTHING;

  ELSIF p_action = 'reject' THEN
    UPDATE public.family_requests
    SET status = 'rejected', admin_note = p_note,
        reviewed_by = v_admin_id, reviewed_at = NOW()
    WHERE id = p_request_id;

    -- Notify submitter
    INSERT INTO public.notifications (user_id, type, title, body, metadata)
    VALUES (
      v_req.submitted_by, 'family_request_rejected',
      'تعذّر قبول الطلب',
      COALESCE(p_note, 'نأسف، لم نتمكن من قبول الطلب في الوقت الحالي.'),
      jsonb_build_object('request_id', p_request_id)
    ) ON CONFLICT DO NOTHING;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
  END IF;

  RETURN jsonb_build_object('success', true, 'action', p_action);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_family_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_family_request TO authenticated;

-- ── 4. referral_prizes table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referral_prizes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prize_month  TEXT        NOT NULL,   -- 'YYYY-MM' format
  rank         INTEGER     NOT NULL CHECK (rank BETWEEN 1 AND 10),
  amount_nova  DECIMAL(18,2) NOT NULL,
  referral_count bigint    NOT NULL,
  awarded_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, prize_month)
);

CREATE INDEX idx_referral_prizes_month ON public.referral_prizes(prize_month);
ALTER TABLE public.referral_prizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referral_prizes_own"
  ON public.referral_prizes FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ── 5. award_monthly_referral_prizes RPC (called by cron at month start) ─────
CREATE OR REPLACE FUNCTION public.award_monthly_referral_prizes(
  p_month text DEFAULT NULL   -- 'YYYY-MM', defaults to previous month
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month       text;
  v_prize_month text;
  v_prizes      int[]  := ARRAY[1000,500,500,500,500,200,200,200,200,200];
  v_rec         record;
  v_rank        int := 0;
  v_awarded     int := 0;
  v_wallet_id   uuid;
  v_balance     decimal;
BEGIN
  -- Default to previous month
  v_prize_month := COALESCE(p_month,
    TO_CHAR(DATE_TRUNC('month', NOW()) - INTERVAL '1 month', 'YYYY-MM'));

  -- Already awarded this month?
  IF EXISTS (SELECT 1 FROM public.referral_prizes WHERE prize_month = v_prize_month) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already awarded for ' || v_prize_month);
  END IF;

  -- Get top 10 referrers for the prize month
  FOR v_rec IN
    SELECT
      p.user_id,
      COUNT(r.user_id) AS ref_count,
      ROW_NUMBER() OVER (ORDER BY COUNT(r.user_id) DESC) AS rnk
    FROM profiles p
    INNER JOIN profiles r ON r.referred_by = p.user_id
      AND TO_CHAR(r.created_at AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM') = v_prize_month
    GROUP BY p.user_id
    ORDER BY ref_count DESC
    LIMIT 10
  LOOP
    v_rank := v_rec.rnk;

    -- Get wallet
    SELECT id, nova_balance INTO v_wallet_id, v_balance
    FROM public.wallets WHERE user_id = v_rec.user_id LIMIT 1;

    IF NOT FOUND THEN CONTINUE; END IF;

    -- Credit prize
    UPDATE public.wallets
    SET nova_balance = nova_balance + v_prizes[v_rank]
    WHERE id = v_wallet_id;

    INSERT INTO public.wallet_ledger (
      user_id, wallet_id, amount, currency,
      entry_type, description, description_ar,
      balance_before, balance_after,
      reference_type, reference_id
    ) VALUES (
      v_rec.user_id, v_wallet_id, v_prizes[v_rank], 'nova',
      'referral_prize',
      'Monthly referral prize - rank ' || v_rank || ' (' || v_prize_month || ')',
      'جائزة الإحالة الشهرية - المرتبة ' || v_rank || ' (' || v_prize_month || ')',
      v_balance, v_balance + v_prizes[v_rank],
      'referral_prize', v_prize_month
    );

    INSERT INTO public.referral_prizes (user_id, prize_month, rank, amount_nova, referral_count)
    VALUES (v_rec.user_id, v_prize_month, v_rank, v_prizes[v_rank], v_rec.ref_count);

    -- Notify winner
    INSERT INTO public.notifications (user_id, type, title, body, metadata)
    VALUES (
      v_rec.user_id, 'referral_prize',
      '🏆 جائزة الإحالة الشهرية',
      'مبروك! حصلت على جائزة И' || v_prizes[v_rank] || ' كمتصدر للإحالات في ' || v_prize_month || ' (المرتبة ' || v_rank || ')',
      jsonb_build_object('rank', v_rank, 'amount', v_prizes[v_rank], 'month', v_prize_month)
    ) ON CONFLICT DO NOTHING;

    v_awarded := v_awarded + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'awarded', v_awarded, 'month', v_prize_month);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_monthly_referral_prizes(text) TO authenticated;

-- ── 6. Agent rate limiting — 7-day cooldown on applications ──────────────────
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS last_applied_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.apply_as_agent(
  p_shop_name     text,
  p_whatsapp      text,
  p_country       text,
  p_city          text,
  p_bio           text DEFAULT NULL,
  p_commission    numeric DEFAULT 3.0,
  p_lat           numeric DEFAULT NULL,
  p_lng           numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid := auth.uid();
  v_existing     record;
  v_last_applied timestamptz;
  v_cooldown     interval := INTERVAL '7 days';
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check existing application
  SELECT id, status, last_applied_at INTO v_existing
  FROM public.agents WHERE user_id = v_user_id LIMIT 1;

  IF FOUND THEN
    IF v_existing.status IN ('pending', 'verified', 'active') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Already have an active application');
    END IF;

    -- Rate limit: rejected/suspended agents must wait 7 days
    IF v_existing.last_applied_at IS NOT NULL
       AND NOW() - v_existing.last_applied_at < v_cooldown THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Please wait 7 days before reapplying',
        'retry_after', v_existing.last_applied_at + v_cooldown
      );
    END IF;

    -- Re-apply (update existing record)
    UPDATE public.agents SET
      shop_name      = p_shop_name,
      whatsapp       = p_whatsapp,
      country        = p_country,
      city           = p_city,
      bio            = p_bio,
      commission_pct = p_commission,
      lat            = p_lat,
      lng            = p_lng,
      status         = 'pending',
      last_applied_at = NOW(),
      updated_at     = NOW()
    WHERE id = v_existing.id;
  ELSE
    INSERT INTO public.agents (
      user_id, shop_name, whatsapp, country, city,
      bio, commission_pct, lat, lng, status, last_applied_at
    ) VALUES (
      v_user_id, p_shop_name, p_whatsapp, p_country, p_city,
      p_bio, p_commission, p_lat, p_lng, 'pending', NOW()
    );
  END IF;

  -- Notify admins
  INSERT INTO public.notifications (user_id, type, title, body, metadata)
  SELECT p.user_id,
         'agent_application_new',
         'طلب وكيل جديد',
         'قدّم ' || COALESCE((SELECT display_name FROM profiles WHERE user_id = v_user_id), 'مستخدم') || ' طلباً ليصبح وكيلاً في ' || p_city,
         jsonb_build_object('applicant_id', v_user_id, 'city', p_city, 'country', p_country)
  FROM public.profiles p
  WHERE public.has_role(p.user_id, 'admin')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ── 7. admin_update_agent with notifications ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_manage_agent(
  p_agent_id uuid,
  p_action   text,   -- 'approve' | 'reject' | 'suspend' | 'reactivate'
  p_note     text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_agent    record;
  v_title    text;
  v_body     text;
BEGIN
  IF NOT public.has_role(v_admin_id, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_agent FROM public.agents WHERE id = p_agent_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agent not found');
  END IF;

  CASE p_action
    WHEN 'approve' THEN
      UPDATE public.agents SET status = 'verified', updated_at = NOW() WHERE id = p_agent_id;
      v_title := '🎉 تم قبول طلبك كوكيل!';
      v_body  := 'مبروك! تم قبول طلبك كوكيل Nova. يمكنك الآن استقبال طلبات الإيداع والسحب.';
    WHEN 'reject' THEN
      UPDATE public.agents SET status = 'rejected', updated_at = NOW() WHERE id = p_agent_id;
      v_title := 'طلب الوكالة - لم يُقبل';
      v_body  := COALESCE(p_note, 'لم نتمكن من قبول طلبك في الوقت الحالي. يمكنك إعادة التقديم بعد 7 أيام.');
    WHEN 'suspend' THEN
      UPDATE public.agents SET status = 'suspended', updated_at = NOW() WHERE id = p_agent_id;
      v_title := 'تم إيقاف حسابك كوكيل';
      v_body  := COALESCE(p_note, 'تم إيقاف حسابك كوكيل. تواصل مع الدعم لمزيد من المعلومات.');
    WHEN 'reactivate' THEN
      UPDATE public.agents SET status = 'verified', updated_at = NOW() WHERE id = p_agent_id;
      v_title := '✅ تم إعادة تفعيل حسابك';
      v_body  := 'تم إعادة تفعيل حسابك كوكيل Nova. مرحباً بعودتك!';
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
  END CASE;

  -- Notify agent
  INSERT INTO public.notifications (user_id, type, title, body, metadata)
  VALUES (
    v_agent.user_id, 'agent_status_' || p_action,
    v_title, v_body,
    jsonb_build_object('agent_id', p_agent_id, 'action', p_action, 'note', p_note)
  ) ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true, 'action', p_action);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_as_agent TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_manage_agent TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_monthly_referral_prizes TO authenticated;
