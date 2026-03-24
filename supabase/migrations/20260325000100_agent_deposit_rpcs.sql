-- ============================================================
-- AGENT DEPOSIT RPCs + Countries/Cities helpers
-- ============================================================

-- ── 1. get_countries ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_countries()
RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id, 'code', code,
      'name_ar', name_ar, 'name_en', name_en,
      'phone_code', phone_code, 'currency', currency
    ) ORDER BY sort_order, name_ar
  )
  FROM public.countries
  WHERE is_active = true;
$$;
GRANT EXECUTE ON FUNCTION public.get_countries() TO anon, authenticated;

-- ── 2. get_cities_by_country ───────────────────────────────
CREATE OR REPLACE FUNCTION public.get_cities_by_country(p_country_code TEXT)
RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ci.id,
      'name_ar', ci.name_ar,
      'name_en', ci.name_en
    ) ORDER BY ci.sort_order, ci.name_ar
  )
  FROM public.cities ci
  JOIN public.countries co ON co.id = ci.country_id
  WHERE co.code = p_country_code
    AND ci.is_active = true
    AND co.is_active = true;
$$;
GRANT EXECUTE ON FUNCTION public.get_cities_by_country(TEXT) TO anon, authenticated;

-- ── 3. agent_request_deposit ──────────────────────────────
CREATE OR REPLACE FUNCTION public.agent_request_deposit(
  p_amount_nova       NUMERIC,
  p_payment_method    TEXT,
  p_payment_reference TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_agent_id     UUID;
  v_exchange_rate NUMERIC;
  v_amount_local  NUMERIC;
  v_request_id   UUID;
  v_open_count   INTEGER;
BEGIN
  -- جلب الوكيل المعتمد
  SELECT id, exchange_rate INTO v_agent_id, v_exchange_rate
  FROM public.agents
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_agent_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'أنت لست وكيلاً معتمداً');
  END IF;

  -- التحقق من المبلغ
  IF p_amount_nova IS NULL OR p_amount_nova <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'مبلغ غير صحيح');
  END IF;

  -- منع أكثر من 3 طلبات معلقة في وقت واحد
  SELECT COUNT(*) INTO v_open_count
  FROM public.agent_deposit_requests
  WHERE agent_id = v_agent_id AND status = 'pending';

  IF v_open_count >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'لديك طلبات معلقة بالفعل. انتظر حتى تتم المعالجة.');
  END IF;

  -- حساب المبلغ المحلي
  v_amount_local := CASE WHEN v_exchange_rate IS NOT NULL AND v_exchange_rate > 0
                         THEN p_amount_nova * v_exchange_rate
                         ELSE NULL END;

  -- إنشاء الطلب
  INSERT INTO public.agent_deposit_requests
    (agent_id, amount_nova, amount_local, payment_method, payment_reference)
  VALUES
    (v_agent_id, p_amount_nova, v_amount_local, p_payment_method, p_payment_reference)
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object('success', true, 'request_id', v_request_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION public.agent_request_deposit(NUMERIC, TEXT, TEXT) TO authenticated;

-- ── 4. admin_approve_deposit ──────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_approve_deposit(
  p_request_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_request       RECORD;
  v_balance_before NUMERIC;
BEGIN
  -- تحقق صلاحيات الأدمن
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  -- جلب الطلب مع LOCK
  SELECT * INTO v_request
  FROM public.agent_deposit_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;

  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب تم معالجته مسبقاً');
  END IF;

  -- رصيد الوكيل قبل التحديث
  SELECT balance INTO v_balance_before
  FROM public.agents WHERE id = v_request.agent_id
  FOR UPDATE;

  -- تحديث حالة الطلب
  UPDATE public.agent_deposit_requests
  SET status = 'approved',
      admin_notes = p_admin_notes,
      completed_at = now()
  WHERE id = p_request_id;

  -- زيادة رصيد الوكيل
  UPDATE public.agents
  SET balance = balance + v_request.amount_nova,
      updated_at = now()
  WHERE id = v_request.agent_id;

  -- تسجيل في سجل العمليات
  INSERT INTO public.agent_transactions
    (agent_id, type, amount, balance_before, balance_after, reference_id, description)
  VALUES
    (v_request.agent_id, 'deposit', v_request.amount_nova,
     v_balance_before, v_balance_before + v_request.amount_nova,
     p_request_id, 'شحن رصيد - موافقة أدمن');

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_approve_deposit(UUID, TEXT) TO authenticated;

-- ── 5. admin_reject_deposit ───────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_reject_deposit(
  p_request_id UUID,
  p_reason     TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_request RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  SELECT * INTO v_request
  FROM public.agent_deposit_requests
  WHERE id = p_request_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب غير موجود');
  END IF;

  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب تم معالجته مسبقاً');
  END IF;

  UPDATE public.agent_deposit_requests
  SET status = 'rejected',
      admin_notes = p_reason,
      completed_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_reject_deposit(UUID, TEXT) TO authenticated;

-- ── 6. get_agent_balance ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_agent_balance()
RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'balance',        COALESCE(a.balance, 0),
    'total_earnings', COALESCE(a.total_earnings, 0)
  )
  FROM public.agents a
  WHERE a.user_id = auth.uid()
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_agent_balance() TO authenticated;

-- ── 7. get_agent_deposit_requests (للوكيل) ───────────────
CREATE OR REPLACE FUNCTION public.get_agent_deposit_requests()
RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', dr.id,
      'amount_nova', dr.amount_nova,
      'amount_local', dr.amount_local,
      'payment_method', dr.payment_method,
      'payment_reference', dr.payment_reference,
      'admin_notes', dr.admin_notes,
      'status', dr.status,
      'created_at', dr.created_at,
      'completed_at', dr.completed_at
    ) ORDER BY dr.created_at DESC
  ), '[]'::jsonb)
  FROM public.agent_deposit_requests dr
  JOIN public.agents a ON a.id = dr.agent_id
  WHERE a.user_id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_agent_deposit_requests() TO authenticated;

-- ── 8. admin_get_all_deposit_requests ────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_all_deposit_requests(
  p_status TEXT DEFAULT 'pending'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
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
        'agent_city', a.city,
        'agent_balance', a.balance
      ) ORDER BY dr.created_at DESC
    ), '[]'::jsonb)
    FROM public.agent_deposit_requests dr
    JOIN public.agents a ON a.id = dr.agent_id
    WHERE (p_status = 'all' OR dr.status = p_status)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_all_deposit_requests(TEXT) TO authenticated;
