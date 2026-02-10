
-- WINOVA Constitution: immutable owner rules
CREATE TABLE public.owner_constitution (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_key TEXT NOT NULL UNIQUE,
  rule_en TEXT NOT NULL,
  rule_ar TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  severity TEXT NOT NULL DEFAULT 'mandatory',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.owner_constitution ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage constitution" ON public.owner_constitution FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Owner Preferences: learned behavioral weights
CREATE TABLE public.owner_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  preference_key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'general',
  value JSONB NOT NULL DEFAULT '{}',
  confidence NUMERIC NOT NULL DEFAULT 0.5,
  sample_count INT NOT NULL DEFAULT 0,
  description_en TEXT,
  description_ar TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.owner_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage preferences" ON public.owner_preferences FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Owner Corrections: every time Amro corrects AI behavior
CREATE TABLE public.owner_corrections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id UUID,
  original_output TEXT NOT NULL,
  correction TEXT NOT NULL,
  correction_ar TEXT,
  correction_type TEXT NOT NULL DEFAULT 'edit',
  lesson_learned TEXT,
  lesson_learned_ar TEXT,
  preferences_updated TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.owner_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage corrections" ON public.owner_corrections FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Indexes
CREATE INDEX idx_constitution_category ON public.owner_constitution(category);
CREATE INDEX idx_constitution_active ON public.owner_constitution(is_active) WHERE is_active = true;
CREATE INDEX idx_preferences_category ON public.owner_preferences(category);
CREATE INDEX idx_preferences_active ON public.owner_preferences(is_active) WHERE is_active = true;
CREATE INDEX idx_corrections_type ON public.owner_corrections(correction_type);

-- Seed constitution with foundational rules
INSERT INTO public.owner_constitution (rule_key, rule_en, rule_ar, category, severity) VALUES
('NO_AUTO_MERGE', 'No code may be merged automatically. All PRs require explicit owner approval.', 'لا يمكن دمج أي كود تلقائياً. جميع طلبات السحب تتطلب موافقة صريحة من المالك.', 'governance', 'mandatory'),
('NO_AUTO_EXECUTION', 'No high-risk execution may proceed without owner decision.', 'لا يمكن تنفيذ أي عملية عالية المخاطر بدون قرار المالك.', 'governance', 'mandatory'),
('MONEY_SAFETY_FIRST', 'Any change affecting wallet balances, transfers, or financial flows must be treated as critical-risk.', 'أي تغيير يؤثر على أرصدة المحافظ أو التحويلات أو التدفقات المالية يجب معاملته كمخاطر حرجة.', 'finance', 'mandatory'),
('USER_DATA_PROTECTION', 'User personal data must never be exposed, logged in plain text, or transmitted without encryption.', 'بيانات المستخدم الشخصية يجب ألا تُعرض أو تُسجل بنص واضح أو تُنقل بدون تشفير.', 'security', 'mandatory'),
('P2P_ESCROW_INTEGRITY', 'P2P escrow funds must never be released without verified payment confirmation.', 'أموال الضمان في P2P يجب ألا تُحرر بدون تأكيد دفع موثق.', 'finance', 'mandatory'),
('NO_HALLUCINATION', 'AI must never fabricate data, metrics, or references. If evidence is insufficient, state so explicitly.', 'يجب ألا يختلق الذكاء الاصطناعي بيانات أو مقاييس أو مراجع. إذا كانت الأدلة غير كافية، يجب التصريح بذلك.', 'integrity', 'mandatory'),
('ROLLBACK_REQUIRED', 'Every proposed change must include a rollback plan.', 'كل تغيير مقترح يجب أن يتضمن خطة تراجع.', 'engineering', 'mandatory'),
('TRANSPARENCY', 'AI must always explain why it recommends something, with evidence.', 'يجب أن يشرح الذكاء الاصطناعي دائماً سبب توصيته بشيء ما، مع أدلة.', 'communication', 'mandatory'),
('CEO_AUTHORITY', 'The owner (Amro) has final authority on all decisions. AI advises, never decides.', 'المالك (عمرو) لديه السلطة النهائية على جميع القرارات. الذكاء الاصطناعي يستشير ولا يقرر.', 'governance', 'mandatory'),
('AUDIT_TRAIL', 'Every significant action must leave a traceable audit trail.', 'كل إجراء مهم يجب أن يترك سجل تدقيق قابل للتتبع.', 'compliance', 'mandatory');

-- Seed initial preferences
INSERT INTO public.owner_preferences (preference_key, category, value, confidence, description_en, description_ar) VALUES
('risk_appetite', 'decision_style', '{"level": "moderate", "bias": "safety_over_speed"}', 0.5, 'Owner risk tolerance level', 'مستوى تحمل المخاطر للمالك'),
('communication_style', 'interaction', '{"format": "structured", "language": "bilingual_ar_en", "detail_level": "executive_summary"}', 0.6, 'Preferred communication format', 'تنسيق التواصل المفضل'),
('solution_preference', 'engineering', '{"bias": "simple_reliable", "avoid": "over_engineering"}', 0.5, 'Preferred solution approach', 'نهج الحل المفضل'),
('approval_speed', 'workflow', '{"fast_track_threshold": 0.85, "auto_reject_threshold": 0.15}', 0.5, 'Approval speed preferences', 'تفضيلات سرعة الموافقة');
