
-- ═══════════════════════════════════════════════════════
-- CEO INTELLIGENCE LAYER — Permanent Upgrade
-- ═══════════════════════════════════════════════════════

-- 1) CEO Behavioral Model — persistent personality + preference tracking
CREATE TABLE IF NOT EXISTS public.ceo_behavioral_model (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dimension TEXT NOT NULL UNIQUE, -- e.g. 'risk_tolerance', 'speed_preference', 'detail_level'
  dimension_ar TEXT,
  current_value NUMERIC NOT NULL DEFAULT 0.5, -- 0.0 to 1.0 scale
  historical_values JSONB DEFAULT '[]'::jsonb, -- array of {value, timestamp, trigger}
  sample_count INTEGER NOT NULL DEFAULT 0,
  confidence NUMERIC NOT NULL DEFAULT 0.0,
  description_en TEXT,
  description_ar TEXT,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ceo_behavioral_model ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ceo_behavioral_model_read" ON public.ceo_behavioral_model FOR SELECT USING (true);

-- 2) CEO Communication Profile — tracks how CEO prefers to receive information
CREATE TABLE IF NOT EXISTS public.ceo_communication_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  preference_key TEXT NOT NULL UNIQUE,
  preference_key_ar TEXT,
  value TEXT NOT NULL,
  evidence JSONB DEFAULT '[]'::jsonb, -- array of observations that led to this
  confidence NUMERIC NOT NULL DEFAULT 0.5,
  sample_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ceo_communication_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ceo_comm_profile_read" ON public.ceo_communication_profile FOR SELECT USING (true);

-- Seed initial communication preferences based on known style
INSERT INTO public.ceo_communication_profile (preference_key, preference_key_ar, value, confidence, sample_count) VALUES
  ('message_length', 'طول الرسالة', 'short', 0.9, 10),
  ('tone', 'النبرة', 'direct_decisive', 0.9, 10),
  ('noise_tolerance', 'تحمل الضوضاء', 'very_low', 0.95, 10),
  ('detail_level', 'مستوى التفصيل', 'executive_summary_only', 0.85, 10),
  ('language_preference', 'تفضيل اللغة', 'arabic_primary', 0.8, 10),
  ('decision_format', 'صيغة القرار', 'impact_recommendation_confidence', 0.9, 10),
  ('interruption_threshold', 'عتبة المقاطعة', 'critical_only', 0.85, 10)
ON CONFLICT (preference_key) DO NOTHING;

-- Seed initial behavioral dimensions
INSERT INTO public.ceo_behavioral_model (dimension, dimension_ar, current_value, confidence, description_en, description_ar) VALUES
  ('risk_tolerance', 'تحمل المخاطر', 0.3, 0.7, 'Low risk tolerance — prefers simulation before execution', 'تحمل منخفض للمخاطر — يفضل المحاكاة قبل التنفيذ'),
  ('autonomy_comfort', 'راحة الاستقلالية', 0.4, 0.6, 'Moderate comfort with AI autonomy — requires approval for medium+ risk', 'راحة متوسطة مع استقلالية الذكاء — يتطلب موافقة للمخاطر المتوسطة+'),
  ('speed_preference', 'تفضيل السرعة', 0.7, 0.6, 'Prefers fast decisions with clear recommendations', 'يفضل القرارات السريعة مع توصيات واضحة'),
  ('financial_caution', 'الحذر المالي', 0.9, 0.85, 'Very cautious about financial operations — no auto-execution', 'حذر جداً بشأن العمليات المالية — لا تنفيذ تلقائي'),
  ('innovation_appetite', 'شهية الابتكار', 0.6, 0.5, 'Moderate appetite for new features and improvements', 'شهية معتدلة للميزات والتحسينات الجديدة'),
  ('delegation_level', 'مستوى التفويض', 0.35, 0.6, 'Prefers to stay involved in decisions — low delegation', 'يفضل البقاء مشاركاً في القرارات — تفويض منخفض')
ON CONFLICT (dimension) DO NOTHING;

-- 3) Add emotional_signal + response_speed columns to decision history
ALTER TABLE public.ceo_decision_history
  ADD COLUMN IF NOT EXISTS emotional_signal TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS was_modified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS prediction_was_correct BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS predicted_probability NUMERIC DEFAULT NULL;

-- 4) Governance rule for auto-routing
INSERT INTO public.owner_constitution (rule_key, rule_en, rule_ar, category, severity, is_active)
VALUES (
  'PREDICTION_ROUTING',
  'The Commander uses CEO decision prediction to route requests: probability >= 85% and risk <= medium → auto-proceed with notification. Probability 50-84% → recommend with confidence score. Probability < 50% → escalate for CEO decision. Financial operations NEVER auto-proceed regardless of prediction score. All auto-proceeded items must be logged and reversible.',
  'القائد يستخدم توقع قرارات الرئيس التنفيذي لتوجيه الطلبات: احتمال >= 85% ومخاطر <= متوسطة → المضي تلقائياً مع إشعار. احتمال 50-84% → توصية مع درجة ثقة. احتمال < 50% → تصعيد لقرار الرئيس. العمليات المالية لا تمضي تلقائياً أبداً بغض النظر عن درجة التوقع.',
  'governance',
  'critical',
  true
)
ON CONFLICT (rule_key) DO UPDATE SET
  rule_en = EXCLUDED.rule_en,
  rule_ar = EXCLUDED.rule_ar,
  is_active = true;

-- 5) Enable realtime for behavioral model changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.ceo_behavioral_model;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ceo_communication_profile;
