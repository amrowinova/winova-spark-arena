-- ============================================================
-- GIVING SYSTEM — families, family_media, family_supports
-- ============================================================

-- Add giving_donation to ledger enum
ALTER TYPE public.ledger_entry_type ADD VALUE IF NOT EXISTS 'giving_donation';

-- ── Tables ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.families (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nova_id        TEXT        UNIQUE NOT NULL,
  head_name      TEXT        NOT NULL,
  country        TEXT        NOT NULL,
  city           TEXT        NOT NULL,
  story          TEXT        NOT NULL,
  members_count  INTEGER     DEFAULT 1,
  need_score     INTEGER     DEFAULT 0 CHECK (need_score BETWEEN 0 AND 100),
  status         TEXT        DEFAULT 'active' CHECK (status IN ('active','supported','pending')),
  total_received DECIMAL(18,2) DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.family_media (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id  UUID        NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL CHECK (type IN ('image','video')),
  url        TEXT        NOT NULL,
  caption    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.family_supports (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    UUID          NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  from_user_id UUID          NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
  amount_nova  DECIMAL(18,2) NOT NULL CHECK (amount_nova IN (1,5,10,20)),
  created_at   TIMESTAMPTZ   DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────

CREATE INDEX idx_families_status      ON public.families(status);
CREATE INDEX idx_families_need_score  ON public.families(need_score DESC);
CREATE INDEX idx_families_country     ON public.families(country);
CREATE INDEX idx_family_media_family  ON public.family_media(family_id);
CREATE INDEX idx_family_supports_fam  ON public.family_supports(family_id);
CREATE INDEX idx_family_supports_user ON public.family_supports(from_user_id);

-- ── updated_at trigger ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_families_updated_at
  BEFORE UPDATE ON public.families
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── RLS ───────────────────────────────────────────────────

ALTER TABLE public.families        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_media    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_supports ENABLE ROW LEVEL SECURITY;

-- families
CREATE POLICY "families_select_all"   ON public.families FOR SELECT USING (true);
CREATE POLICY "families_admin_insert" ON public.families FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "families_admin_update" ON public.families FOR UPDATE USING (public.has_role(auth.uid(),'admin'));

-- family_media
CREATE POLICY "family_media_select_all"   ON public.family_media FOR SELECT USING (true);
CREATE POLICY "family_media_admin_insert" ON public.family_media FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "family_media_admin_update" ON public.family_media FOR UPDATE USING (public.has_role(auth.uid(),'admin'));

-- family_supports
CREATE POLICY "family_supports_select_all"  ON public.family_supports FOR SELECT USING (true);
CREATE POLICY "family_supports_auth_insert" ON public.family_supports FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- ── RPC: support_family ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.support_family(
  p_family_id UUID,
  p_amount    DECIMAL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       UUID := auth.uid();
  v_wallet_id     UUID;
  v_balance       DECIMAL(18,2);
  v_family_name   TEXT;
  v_family_status TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_amount NOT IN (1, 5, 10, 20) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  SELECT head_name, status
    INTO v_family_name, v_family_status
    FROM public.families WHERE id = p_family_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Family not found');
  END IF;

  IF v_family_status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Family is not accepting support');
  END IF;

  SELECT id, nova_balance
    INTO v_wallet_id, v_balance
    FROM public.wallets
   WHERE user_id = v_user_id
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  UPDATE public.wallets
     SET nova_balance = nova_balance - p_amount
   WHERE id = v_wallet_id;

  INSERT INTO public.wallet_ledger (
    user_id, wallet_id, amount, currency,
    entry_type, description, description_ar,
    balance_before, balance_after,
    reference_type, reference_id
  ) VALUES (
    v_user_id, v_wallet_id, -p_amount, 'nova',
    'giving_donation',
    'Giving donation to family ' || v_family_name,
    'تبرع لعائلة ' || v_family_name,
    v_balance, v_balance - p_amount,
    'giving', p_family_id::TEXT
  );

  INSERT INTO public.family_supports (family_id, from_user_id, amount_nova)
  VALUES (p_family_id, v_user_id, p_amount);

  UPDATE public.families
     SET total_received = total_received + p_amount
   WHERE id = p_family_id;

  RETURN jsonb_build_object('success', true, 'amount', p_amount);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.support_family TO authenticated;

-- ── Seed data ─────────────────────────────────────────────

INSERT INTO public.families (id, nova_id, head_name, country, city, story, members_count, need_score, status, total_received) VALUES
  ('a1000000-0000-0000-0000-000000000001','EG-000001','محمد حسن',     'Egypt',        'القاهرة',   'أب يعمل بالأجر اليومي وابنه الأكبر يحتاج عملية جراحية عاجلة لا يملك ثمنها. العائلة تعيش في غرفة واحدة وتكاد لا تجد قوتها اليومي.',      6, 97,'active',0),
  ('a1000000-0000-0000-0000-000000000002','SA-000002','عبدالله محمد',  'Saudi Arabia', 'جدة',       'أب فقد قدرته على العمل بسبب إعاقة جسدية ويعتمد على مساعدات الجيران. أطفاله الأربعة يحتاجون للتعليم والرعاية.',                              4, 88,'active',0),
  ('a1000000-0000-0000-0000-000000000003','PK-000003','أحمد خان',      'Pakistan',     'كراتشي',   'أرملة تعمل في تنظيف الشوارع لتعيل سبعة أطفال بعد وفاة زوجها. دخلها اليومي لا يكفي للإيجار والطعام معاً.',                                 7, 95,'active',0),
  ('a1000000-0000-0000-0000-000000000004','ID-000004','سيتي نور',      'Indonesia',    'جاكرتا',   'أم أرملة لثلاثة أطفال صغار فقدت زوجها في حادث عمل ولا تحصل على أي تعويض. تعمل بائعة متجولة لتأمين الحد الأدنى.',                         4, 85,'active',0),
  ('a1000000-0000-0000-0000-000000000005','TR-000005','محمد دمير',     'Turkey',       'إسطنبول',  'لاجئ سوري فقد وظيفته بعد إغلاق المصنع الذي كان يعمل فيه. يحاول إعالة خمسة أفراد في ظروف صعبة بعيداً عن وطنه.',                          5, 90,'active',0);

INSERT INTO public.family_media (family_id, type, url, caption) VALUES
  ('a1000000-0000-0000-0000-000000000001','image','https://images.unsplash.com/photo-1609220136736-443140cffec6?w=800','منزل العائلة'),
  ('a1000000-0000-0000-0000-000000000001','image','https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800','الأطفال'),
  ('a1000000-0000-0000-0000-000000000001','image','https://images.unsplash.com/photo-1531983412531-1f49a365ffed?w=800',NULL),
  ('a1000000-0000-0000-0000-000000000002','image','https://images.unsplash.com/photo-1474552226712-ac0f0961a954?w=800','الأسرة'),
  ('a1000000-0000-0000-0000-000000000002','image','https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=800',NULL),
  ('a1000000-0000-0000-0000-000000000003','image','https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800','صورة العائلة'),
  ('a1000000-0000-0000-0000-000000000003','image','https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=800',NULL),
  ('a1000000-0000-0000-0000-000000000004','image','https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800','الأم والأطفال'),
  ('a1000000-0000-0000-0000-000000000004','image','https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800',NULL),
  ('a1000000-0000-0000-0000-000000000005','image','https://images.unsplash.com/photo-1609220136736-443140cffec6?w=800','العائلة'),
  ('a1000000-0000-0000-0000-000000000005','image','https://images.unsplash.com/photo-1531983412531-1f49a365ffed?w=800',NULL);
