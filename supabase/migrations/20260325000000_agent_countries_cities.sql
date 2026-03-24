-- ============================================================
-- AGENT SYSTEM v3: Countries, Cities, Agent Balance, Deposits
-- ============================================================

-- ── 1. countries ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.countries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar     TEXT NOT NULL,
  name_en     TEXT NOT NULL,
  code        TEXT UNIQUE NOT NULL,
  phone_code  TEXT NOT NULL,
  currency    TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 99,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_countries_code     ON public.countries(code);
CREATE INDEX IF NOT EXISTS idx_countries_active   ON public.countries(is_active, sort_order);

-- ── 2. cities ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id  UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  name_ar     TEXT NOT NULL,
  name_en     TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 99,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cities_country_id ON public.cities(country_id, sort_order);

-- ── 3. agent_transactions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id       UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  type           TEXT NOT NULL CHECK (type IN ('deposit','commission','withdrawal','adjustment')),
  amount         NUMERIC(18,2) NOT NULL,
  balance_before NUMERIC(18,2) NOT NULL DEFAULT 0,
  balance_after  NUMERIC(18,2) NOT NULL DEFAULT 0,
  reference_id   UUID,
  description    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_txns_agent    ON public.agent_transactions(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_txns_type     ON public.agent_transactions(type);

-- ── 4. agent_deposit_requests ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_deposit_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  amount_nova       NUMERIC(18,2) NOT NULL CHECK (amount_nova > 0),
  amount_local      NUMERIC(18,2),
  payment_method    TEXT NOT NULL CHECK (payment_method IN ('bank_transfer','vodafone_cash','stc_pay','easypaisa','dana','instapay','other')),
  payment_reference TEXT NOT NULL,
  admin_notes       TEXT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_deposit_req_agent  ON public.agent_deposit_requests(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposit_req_status ON public.agent_deposit_requests(status, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_deposit_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_deposit_requests_updated_at
  BEFORE UPDATE ON public.agent_deposit_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_deposit_updated_at();

-- ── 5. Add balance columns to agents ───────────────────────
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS balance         NUMERIC(18,2) NOT NULL DEFAULT 0;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS total_earnings  NUMERIC(18,2) NOT NULL DEFAULT 0;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS exchange_rate   NUMERIC(10,4);
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS working_hours   JSONB;

-- ── 6. RLS ──────────────────────────────────────────────────
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_deposit_requests ENABLE ROW LEVEL SECURITY;

-- countries: public read
CREATE POLICY "Public can read countries"
  ON public.countries FOR SELECT
  USING (is_active = true);

-- cities: public read
CREATE POLICY "Public can read cities"
  ON public.cities FOR SELECT
  USING (is_active = true);

-- agent_transactions: only the agent and admin
CREATE POLICY "Agent sees own transactions"
  ON public.agent_transactions FOR SELECT
  TO authenticated
  USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- deposit_requests: agent sees own, admin sees all
CREATE POLICY "Agent sees own deposit requests"
  ON public.agent_deposit_requests FOR SELECT
  TO authenticated
  USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Agent can create deposit request"
  ON public.agent_deposit_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Admin can update deposit requests"
  ON public.agent_deposit_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── 7. Seed: Countries ──────────────────────────────────────
INSERT INTO public.countries (name_ar, name_en, code, phone_code, currency, sort_order) VALUES
  ('مصر',          'Egypt',        'EG', '+20',   'EGP', 1),
  ('السعودية',     'Saudi Arabia', 'SA', '+966',  'SAR', 2),
  ('الإمارات',     'UAE',          'AE', '+971',  'AED', 3),
  ('الكويت',       'Kuwait',       'KW', '+965',  'KWD', 4),
  ('قطر',          'Qatar',        'QA', '+974',  'QAR', 5),
  ('البحرين',      'Bahrain',      'BH', '+973',  'BHD', 6),
  ('عمان',         'Oman',         'OM', '+968',  'OMR', 7),
  ('الأردن',       'Jordan',       'JO', '+962',  'JOD', 8),
  ('فلسطين',       'Palestine',    'PS', '+970',  'ILS', 9),
  ('لبنان',        'Lebanon',      'LB', '+961',  'LBP', 10),
  ('العراق',       'Iraq',         'IQ', '+964',  'IQD', 11),
  ('سوريا',        'Syria',        'SY', '+963',  'SYP', 12),
  ('اليمن',        'Yemen',        'YE', '+967',  'YER', 13),
  ('السودان',      'Sudan',        'SD', '+249',  'SDG', 14),
  ('ليبيا',        'Libya',        'LY', '+218',  'LYD', 15),
  ('تونس',         'Tunisia',      'TN', '+216',  'TND', 16),
  ('الجزائر',      'Algeria',      'DZ', '+213',  'DZD', 17),
  ('المغرب',       'Morocco',      'MA', '+212',  'MAD', 18),
  ('موريتانيا',    'Mauritania',   'MR', '+222',  'MRU', 19),
  ('تركيا',        'Turkey',       'TR', '+90',   'TRY', 20),
  ('باكستان',      'Pakistan',     'PK', '+92',   'PKR', 21),
  ('إندونيسيا',    'Indonesia',    'ID', '+62',   'IDR', 22),
  ('ماليزيا',      'Malaysia',     'MY', '+60',   'MYR', 23),
  ('الهند',        'India',        'IN', '+91',   'INR', 24),
  ('بنغلاديش',     'Bangladesh',   'BD', '+880',  'BDT', 25)
ON CONFLICT (code) DO NOTHING;

-- ── 8. Seed: Cities ─────────────────────────────────────────
-- مصر
INSERT INTO public.cities (country_id, name_ar, name_en, sort_order)
SELECT c.id, v.ar, v.en, v.s FROM public.countries c,
  (VALUES ('القاهرة','Cairo',1),('الإسكندرية','Alexandria',2),('الجيزة','Giza',3),('بورسعيد','Port Said',4),('المنصورة','Mansoura',5)) AS v(ar,en,s)
WHERE c.code = 'EG' ON CONFLICT DO NOTHING;

-- السعودية
INSERT INTO public.cities (country_id, name_ar, name_en, sort_order)
SELECT c.id, v.ar, v.en, v.s FROM public.countries c,
  (VALUES ('الرياض','Riyadh',1),('جدة','Jeddah',2),('مكة','Mecca',3),('المدينة','Medina',4),('الدمام','Dammam',5)) AS v(ar,en,s)
WHERE c.code = 'SA' ON CONFLICT DO NOTHING;

-- الإمارات
INSERT INTO public.cities (country_id, name_ar, name_en, sort_order)
SELECT c.id, v.ar, v.en, v.s FROM public.countries c,
  (VALUES ('دبي','Dubai',1),('أبوظبي','Abu Dhabi',2),('الشارقة','Sharjah',3),('عجمان','Ajman',4),('الفجيرة','Fujairah',5)) AS v(ar,en,s)
WHERE c.code = 'AE' ON CONFLICT DO NOTHING;

-- الكويت
INSERT INTO public.cities (country_id, name_ar, name_en, sort_order)
SELECT c.id, v.ar, v.en, v.s FROM public.countries c,
  (VALUES ('الكويت','Kuwait City',1),('السالمية','Salmiya',2),('حولي','Hawalli',3),('الفروانية','Farwaniya',4),('مبارك الكبير','Mubarak Al-Kabeer',5)) AS v(ar,en,s)
WHERE c.code = 'KW' ON CONFLICT DO NOTHING;

-- قطر
INSERT INTO public.cities (country_id, name_ar, name_en, sort_order)
SELECT c.id, v.ar, v.en, v.s FROM public.countries c,
  (VALUES ('الدوحة','Doha',1),('الريان','Al Rayyan',2),('الوكرة','Al Wakrah',3),('الخور','Al Khor',4)) AS v(ar,en,s)
WHERE c.code = 'QA' ON CONFLICT DO NOTHING;

-- البحرين
INSERT INTO public.cities (country_id, name_ar, name_en, sort_order)
SELECT c.id, v.ar, v.en, v.s FROM public.countries c,
  (VALUES ('المنامة','Manama',1),('المحرق','Muharraq',2),('الرفاع','Riffa',3),('مدينة حمد','Hamad City',4)) AS v(ar,en,s)
WHERE c.code = 'BH' ON CONFLICT DO NOTHING;

-- عمان
INSERT INTO public.cities (country_id, name_ar, name_en, sort_order)
SELECT c.id, v.ar, v.en, v.s FROM public.countries c,
  (VALUES ('مسقط','Muscat',1),('صلالة','Salalah',2),('صحار','Sohar',3),('نزوى','Nizwa',4)) AS v(ar,en,s)
WHERE c.code = 'OM' ON CONFLICT DO NOTHING;

-- الأردن
INSERT INTO public.cities (country_id, name_ar, name_en, sort_order)
SELECT c.id, v.ar, v.en, v.s FROM public.countries c,
  (VALUES ('عمان','Amman',1),('الزرقاء','Zarqa',2),('إربد','Irbid',3),('العقبة','Aqaba',4)) AS v(ar,en,s)
WHERE c.code = 'JO' ON CONFLICT DO NOTHING;

-- فلسطين
INSERT INTO public.cities (country_id, name_ar, name_en, sort_order)
SELECT c.id, v.ar, v.en, v.s FROM public.countries c,
  (VALUES ('غزة','Gaza',1),('رام الله','Ramallah',2),('نابلس','Nablus',3),('الخليل','Hebron',4),('جنين','Jenin',5)) AS v(ar,en,s)
WHERE c.code = 'PS' ON CONFLICT DO NOTHING;

-- لبنان
INSERT INTO public.cities (country_id, name_ar, name_en, sort_order)
SELECT c.id, v.ar, v.en, v.s FROM public.countries c,
  (VALUES ('بيروت','Beirut',1),('طرابلس','Tripoli',2),('صيدا','Sidon',3),('صور','Tyre',4)) AS v(ar,en,s)
WHERE c.code = 'LB' ON CONFLICT DO NOTHING;

-- العراق
INSERT INTO public.cities (country_id, name_ar, name_en, sort_order)
SELECT c.id, v.ar, v.en, v.s FROM public.countries c,
  (VALUES ('بغداد','Baghdad',1),('البصرة','Basra',2),('الموصل','Mosul',3),('النجف','Najaf',4),('أربيل','Erbil',5)) AS v(ar,en,s)
WHERE c.code = 'IQ' ON CONFLICT DO NOTHING;

-- سوريا
INSERT INTO public.cities (country_id, name_ar, name_en, sort_order)
SELECT c.id, v.ar, v.en, v.s FROM public.countries c,
  (VALUES ('دمشق','Damascus',1),('حلب','Aleppo',2),('حمص','Homs',3),('اللاذقية','Latakia',4)) AS v(ar,en,s)
WHERE c.code = 'SY' ON CONFLICT DO NOTHING;

-- اليمن
INSERT INTO public.cities (country_id, name_ar, name_en, sort_order)
SELECT c.id, v.ar, v.en, v.s FROM public.countries c,
  (VALUES ('صنعاء','Sanaa',1),('عدن','Aden',2),('تعز','Taiz',3),('الحديدة','Hodeidah',4)) AS v(ar,en,s)
WHERE c.code = 'YE' ON CONFLICT DO NOTHING;

-- السودان
INSERT INTO public.cities (country_id, name_ar, name_en, sort_order)
SELECT c.id, v.ar, v.en, v.s FROM public.countries c,
  (VALUES ('الخرطوم','Khartoum',1),('أم درمان','Omdurman',2),('بورتسودان','Port Sudan',3)) AS v(ar,en,s)
WHERE c.code = 'SD' ON CONFLICT DO NOTHING;

-- ليبيا
INSERT INTO public.cities (country_id, name_ar, name_en, sort_order)
SELECT c.id, v.ar, v.en, v.s FROM public.countries c,
  (VALUES ('طرابلس','Tripoli',1),('بنغازي','Benghazi',2),('مصراتة','Misrata',3)) AS v(ar,en,s)
WHERE c.code = 'LY' ON CONFLICT DO NOTHING;

-- تونس
INSERT INTO public.cities (country_id, name_ar, name_en, sort_order)
SELECT c.id, v.ar, v.en, v.s FROM public.countries c,
  (VALUES ('تونس','Tunis',1),('صفاقس','Sfax',2),('سوسة','Sousse',3),('القيروان','Kairouan',4)) AS v(ar,en,s)
WHERE c.code = 'TN' ON CONFLICT DO NOTHING;

-- الجزائر
INSERT INTO public.cities (country_id, name_ar, name_en, sort_order)
SELECT c.id, v.ar, v.en, v.s FROM public.countries c,
  (VALUES ('الجزائر','Algiers',1),('وهران','Oran',2),('قسنطينة','Constantine',3),('عنابة','Annaba',4)) AS v(ar,en,s)
WHERE c.code = 'DZ' ON CONFLICT DO NOTHING;

-- المغرب
INSERT INTO public.cities (country_id, name_ar, name_en, sort_order)
SELECT c.id, v.ar, v.en, v.s FROM public.countries c,
  (VALUES ('الرباط','Rabat',1),('الدار البيضاء','Casablanca',2),('فاس','Fez',3),('مراكش','Marrakech',4),('طنجة','Tangier',5)) AS v(ar,en,s)
WHERE c.code = 'MA' ON CONFLICT DO NOTHING;

-- موريتانيا
INSERT INTO public.cities (country_id, name_ar, name_en, sort_order)
SELECT c.id, v.ar, v.en, v.s FROM public.countries c,
  (VALUES ('نواكشوط','Nouakchott',1),('نواذيبو','Nouadhibou',2),('روصو','Rosso',3)) AS v(ar,en,s)
WHERE c.code = 'MR' ON CONFLICT DO NOTHING;

-- تركيا
INSERT INTO public.cities (country_id, name_ar, name_en, sort_order)
SELECT c.id, v.ar, v.en, v.s FROM public.countries c,
  (VALUES ('إسطنبول','Istanbul',1),('أنقرة','Ankara',2),('إزمير','Izmir',3),('بورصة','Bursa',4),('أنطاليا','Antalya',5)) AS v(ar,en,s)
WHERE c.code = 'TR' ON CONFLICT DO NOTHING;

-- باكستان
INSERT INTO public.cities (country_id, name_ar, name_en, sort_order)
SELECT c.id, v.ar, v.en, v.s FROM public.countries c,
  (VALUES ('كراتشي','Karachi',1),('لاهور','Lahore',2),('إسلام آباد','Islamabad',3),('فيصل آباد','Faisalabad',4),('راولبندي','Rawalpindi',5)) AS v(ar,en,s)
WHERE c.code = 'PK' ON CONFLICT DO NOTHING;

-- إندونيسيا
INSERT INTO public.cities (country_id, name_ar, name_en, sort_order)
SELECT c.id, v.ar, v.en, v.s FROM public.countries c,
  (VALUES ('جاكرتا','Jakarta',1),('سورابايا','Surabaya',2),('باندونغ','Bandung',3),('ميدان','Medan',4),('سيمارانغ','Semarang',5)) AS v(ar,en,s)
WHERE c.code = 'ID' ON CONFLICT DO NOTHING;

-- ماليزيا
INSERT INTO public.cities (country_id, name_ar, name_en, sort_order)
SELECT c.id, v.ar, v.en, v.s FROM public.countries c,
  (VALUES ('كوالالمبور','Kuala Lumpur',1),('بينانغ','Penang',2),('جوهور بهرو','Johor Bahru',3),('بيتالينغ جايا','Petaling Jaya',4)) AS v(ar,en,s)
WHERE c.code = 'MY' ON CONFLICT DO NOTHING;

-- الهند
INSERT INTO public.cities (country_id, name_ar, name_en, sort_order)
SELECT c.id, v.ar, v.en, v.s FROM public.countries c,
  (VALUES ('مومباي','Mumbai',1),('دلهي','Delhi',2),('بنغالور','Bangalore',3),('حيدر آباد','Hyderabad',4),('أحمد آباد','Ahmedabad',5)) AS v(ar,en,s)
WHERE c.code = 'IN' ON CONFLICT DO NOTHING;

-- بنغلاديش
INSERT INTO public.cities (country_id, name_ar, name_en, sort_order)
SELECT c.id, v.ar, v.en, v.s FROM public.countries c,
  (VALUES ('دكا','Dhaka',1),('شيتاغونغ','Chittagong',2),('كومبلا','Comilla',3),('رجشاهي','Rajshahi',4)) AS v(ar,en,s)
WHERE c.code = 'BD' ON CONFLICT DO NOTHING;
