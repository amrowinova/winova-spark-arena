-- ============================================================
-- Special Days Table - إدارة الأيام الخاصة والعطلات الرسمية
-- ============================================================
-- التغييرات:
-- 1. إنشاء جدول special_days
-- 2. دعم الأيام الوطنية والدينية والثقافية لكل دولة
-- 3. قواعد مسابقات مخصصة لكل يوم خاص
-- ============================================================

-- 1. إنشاء جدول special_days
CREATE TABLE IF NOT EXISTS public.special_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  date DATE NOT NULL,
  country_code CHAR(2) REFERENCES public.country_codes(code), -- NULL means global
  type TEXT NOT NULL CHECK (type IN ('national', 'religious', 'cultural', 'custom')),
  contest_rules JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. إنشاء فهارس
CREATE INDEX IF NOT EXISTS idx_special_days_date ON public.special_days(date);
CREATE INDEX IF NOT EXISTS idx_special_days_country ON public.special_days(country_code);
CREATE INDEX IF NOT EXISTS idx_special_days_type ON public.special_days(type);
CREATE INDEX IF NOT EXISTS idx_special_days_active ON public.special_days(is_active) WHERE is_active = true;

-- 3. إضافة حقول محدثة تلقائياً
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_special_days_updated_at 
    BEFORE UPDATE ON public.special_days 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- 4. إدخال أيام خاصة شائعة
INSERT INTO public.special_days (name, name_ar, date, country_code, type, contest_rules) VALUES
  -- السعودية
  ('Saudi National Day', 'اليوم الوطني السعودي', '2024-09-23', 'SA', 'national', 
   '{"free_contest": true, "prize_multiplier": 2.0, "special_prizes": true, "description": "Celebrate Saudi National Day with free contest and double prizes!", "description_ar": "احتفل باليوم الوطني السعودي بمسابقة مجانية وجوائز مضاعفة!"}'),
  
  ('Eid Al-Fitr', 'عيد الفطر المبارك', '2024-04-10', NULL, 'religious', 
   '{"free_contest": true, "prize_multiplier": 1.5, "special_prizes": true, "description": "Eid Al-Fitr celebration with special prizes!", "description_ar": "احتفال بعيد الفطر المبارك بجوائز خاصة!"}'),
  
  ('Eid Al-Adha', 'عيد الأضحى المبارك', '2024-06-17', NULL, 'religious', 
   '{"free_contest": true, "prize_multiplier": 2.0, "special_prizes": true, "description": "Eid Al-Adha celebration with double prizes!", "description_ar": "احتفال بعيد الأضحى المبارك بجوائز مضاعفة!"}'),
  
  -- الإمارات
  ('UAE National Day', 'اليوم الوطني الإماراتي', '2024-12-02', 'AE', 'national', 
   '{"free_contest": true, "prize_multiplier": 2.0, "special_prizes": true, "description": "UAE National Day celebration!", "description_ar": "احتفال باليوم الوطني الإماراتي!"}'),
  
  -- مصر
  ('Egyptian Revolution Day', 'عيد ثورة 25 يناير', '2024-01-25', 'EG', 'national', 
   '{"free_contest": true, "prize_multiplier": 1.5, "special_prizes": true, "description": "Egyptian Revolution Day celebration!", "description_ar": "احتفال بعيد ثورة 25 يناير!"}'),
  
  ('Sinai Liberation Day', 'عيد تحرير سيناء', '2024-04-25', 'EG', 'national', 
   '{"entry_fee": 5, "prize_multiplier": 1.5, "special_prizes": true, "description": "Sinai Liberation Day special contest!", "description_ar": "مسابقة خاصة بعيد تحرير سيناء!"}'),
  
  -- الأردن
  ('Jordan Independence Day', 'عيد الاستقلال الأردني', '2024-05-25', 'JO', 'national', 
   '{"free_contest": true, "prize_multiplier": 1.5, "special_prizes": true, "description": "Jordan Independence Day celebration!", "description_ar": "احتفال بعيد الاستقلال الأردني!"}'),
  
  -- الكويت
  ('Kuwait National Day', 'اليوم الوطني الكويتي', '2024-02-25', 'KW', 'national', 
   '{"free_contest": true, "prize_multiplier": 2.0, "special_prizes": true, "description": "Kuwait National Day celebration!", "description_ar": "احتفال باليوم الوطني الكويتي!"}'),
  
  ('Kuwait Liberation Day', 'عيد التحرير الكويتي', '2024-02-26', 'KW', 'national', 
   '{"free_contest": true, "prize_multiplier": 1.5, "special_prizes": true, "description": "Kuwait Liberation Day celebration!", "description_ar": "احتفال بعيد التحرير الكويتي!"}'),
  
  -- البحرين
  ('Bahrain National Day', 'اليوم الوطني البحريني', '2024-12-16', 'BH', 'national', 
   '{"free_contest": true, "prize_multiplier": 1.5, "special_prizes": true, "description": "Bahrain National Day celebration!", "description_ar": "احتفال باليوم الوطني البحريني!"}'),
  
  -- قطر
  ('Qatar National Day', 'اليوم الوطني القطري', '2024-12-18', 'QA', 'national', 
   '{"free_contest": true, "prize_multiplier": 2.0, "special_prizes": true, "description": "Qatar National Day celebration!", "description_ar": "احتفال باليوم الوطني القطري!"}'),
  
  -- عمان
  ('Oman National Day', 'اليوم الوطني العماني', '2024-11-18', 'OM', 'national', 
   '{"free_contest": true, "prize_multiplier": 1.5, "special_prizes": true, "description": "Oman National Day celebration!", "description_ar": "احتفال باليوم الوطني العماني!"}'),
  
  -- أيام ثقافية عالمية
  ('World Children\'s Day', 'يوم الطفل العالمي', '2024-11-20', NULL, 'cultural', 
   '{"free_contest": true, "prize_multiplier": 1.5, "special_prizes": true, "description": "World Children\'s Day - special contest for kids!", "description_ar": "يوم الطفل العالمي - مسابقة خاصة للأطفال!"}'),
  
  ('International Women\'s Day', 'يوم المرأة العالمي', '2024-03-08', NULL, 'cultural', 
   '{"free_contest": true, "prize_multiplier": 1.5, "special_prizes": true, "description": "International Women\'s Day celebration!", "description_ar": "احتفال بيوم المرأة العالمي!"}'),
  
  ('New Year\'s Day', 'رأس السنة الميلادية', '2024-01-01', NULL, 'cultural', 
   '{"free_contest": true, "prize_multiplier": 2.0, "special_prizes": true, "description": "New Year\'s Day celebration with double prizes!", "description_ar": "احتفال برأس السنة الميلادية بجوائز مضاعفة!"}'),

-- 5. RPC للحصول على قواعد المسابقة لليوم الحالي
CREATE OR REPLACE FUNCTION public.get_contest_rules_for_date(p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_rules JSONB := '{}';
  v_special_day RECORD;
BEGIN
  -- البحث عن يوم خاص في التاريخ المحدد
  SELECT * INTO v_special_day
  FROM public.special_days
  WHERE date = p_date 
    AND is_active = true
    AND (country_code IS NULL OR country_code = (
      SELECT COALESCE((SELECT value::TEXT FROM public.app_settings WHERE key = 'default_country'), 'SA')
    ))
  ORDER BY 
    CASE WHEN country_code IS NULL THEN 1 ELSE 2 END, -- Global days first
    type DESC -- National > Religious > Cultural > Custom
  LIMIT 1;

  IF FOUND THEN
    v_rules := jsonb_build_object(
      'special_day_id', v_special_day.id,
      'special_day_name', v_special_day.name,
      'special_day_name_ar', v_special_day.name_ar,
      'special_day_type', v_special_day.type,
      'contest_rules', v_special_day.contest_rules,
      'is_special_day', true
    );
  ELSE
    -- القواعد الافتراضية
    v_rules := jsonb_build_object(
      'is_special_day', false,
      'contest_rules', jsonb_build_object(
        'entry_fee', 10,
        'prize_multiplier', 1.0,
        'free_contest', false,
        'special_prizes', false
      )
    );
  END IF;

  RETURN v_rules;
END;
$$;

-- 6. RPC للتحقق من وجود يوم خاص
CREATE OR REPLACE FUNCTION public.is_special_day(p_date DATE DEFAULT CURRENT_DATE, p_country_code TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_exists BOOLEAN := false;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.special_days
    WHERE date = p_date 
      AND is_active = true
      AND (country_code IS NULL OR country_code = p_country_code OR p_country_code IS NULL)
  ) INTO v_exists;

  RETURN v_exists;
END;
$$;

-- 7. منح الصلاحيات
GRANT SELECT ON public.special_days TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_contest_rules_for_date TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_special_day TO authenticated;

-- 8. إضافة تعليقات
COMMENT ON TABLE public.special_days IS 'Special days and holidays with custom contest rules';
COMMENT ON COLUMN public.special_days.name IS 'Name of the special day in English';
COMMENT ON COLUMN public.special_days.name_ar IS 'Name of the special day in Arabic';
COMMENT ON COLUMN public.special_days.date IS 'Date of the special day';
COMMENT ON COLUMN public.special_days.country_code IS 'Country code (NULL for global days)';
COMMENT ON COLUMN public.special_days.type IS 'Type: national, religious, cultural, or custom';
COMMENT ON COLUMN public.special_days.contest_rules IS 'JSON object with custom contest rules';
COMMENT ON COLUMN public.special_days.is_active IS 'Whether this special day is active';

-- 9. RLS (Row Level Security)
ALTER TABLE public.special_days ENABLE ROW LEVEL SECURITY;

-- Everyone can read special days
CREATE POLICY "Special days are viewable by everyone" ON public.special_days
    FOR SELECT USING (true);

-- Only authenticated users can see active special days
CREATE POLICY "Active special days are viewable by authenticated users" ON public.special_days
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Admin users can manage special days
CREATE POLICY "Admins can manage special days" ON public.special_days
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );
