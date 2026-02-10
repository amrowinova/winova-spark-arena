
-- Intelligence Manifesto: permanent constitution rule
INSERT INTO public.owner_constitution (rule_key, rule_en, rule_ar, is_active)
VALUES (
  'INTELLIGENCE_MANIFESTO',
  'Intelligence = correct decisions improving over time. ACCURACY > FEATURES. LEARNING > AUTOMATION. TRUST > SPEED. SAFETY > POWER. The system learns from: approvals, rejections, edits, delays, overrides, reversals, ignored items. Auto-actions only when: high confidence + low risk + reversible + non-financial. Progress is measured by: fewer wrong predictions, fewer escalations, fewer reversals, faster CEO alignment. If accuracy is not improving, the system is not evolving.',
  'الذكاء = قرارات صحيحة تتحسن بمرور الوقت. الدقة > الميزات. التعلم > الأتمتة. الثقة > السرعة. الأمان > القوة. النظام يتعلم من: الموافقات، الرفض، التعديلات، التأخيرات، التجاوزات، التراجعات، العناصر المتجاهلة. الإجراءات التلقائية فقط عند: ثقة عالية + مخاطر منخفضة + قابلة للعكس + غير مالية.',
  true
) ON CONFLICT (rule_key) DO UPDATE SET rule_en = EXCLUDED.rule_en, rule_ar = EXCLUDED.rule_ar;

-- Intelligence Metrics table
CREATE TABLE IF NOT EXISTS public.intelligence_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  prediction_accuracy NUMERIC DEFAULT 0,
  confidence_vs_correctness NUMERIC DEFAULT 0,
  reversal_rate NUMERIC DEFAULT 0,
  auto_approval_success_rate NUMERIC DEFAULT 0,
  total_predictions INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  total_auto_actions INTEGER DEFAULT 0,
  successful_auto_actions INTEGER DEFAULT 0,
  total_reversals INTEGER DEFAULT 0,
  total_escalations INTEGER DEFAULT 0,
  total_ignored INTEGER DEFAULT 0,
  top_mistakes JSONB DEFAULT '[]'::jsonb,
  misunderstood_areas JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(metric_date)
);

ALTER TABLE public.intelligence_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view intelligence metrics"
  ON public.intelligence_metrics FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role can manage intelligence metrics"
  ON public.intelligence_metrics FOR ALL
  USING (true) WITH CHECK (true);

-- Learning signals table
CREATE TABLE IF NOT EXISTS public.learning_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('approval', 'rejection', 'edit', 'delay', 'override', 'reversal', 'ignored')),
  source_entity TEXT,
  source_id TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  weight NUMERIC DEFAULT 1.0,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages learning signals"
  ON public.learning_signals FOR ALL
  USING (true) WITH CHECK (true);
