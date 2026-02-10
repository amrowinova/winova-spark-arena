
-- Create authority_tier_state table for tracking autonomy level
CREATE TABLE public.authority_tier_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  current_level INTEGER NOT NULL DEFAULT 0 CHECK (current_level >= 0 AND current_level <= 4),
  reason TEXT NOT NULL DEFAULT 'System initialized — no autonomy earned yet',
  reason_ar TEXT DEFAULT 'النظام مُهيّأ — لم تُكتسب أي صلاحية بعد',
  last_promoted_at TIMESTAMPTZ,
  last_demoted_at TIMESTAMPTZ,
  promoted_by UUID,
  accuracy_at_change NUMERIC,
  reversal_rate_at_change NUMERIC,
  override_count_at_change INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.authority_tier_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read authority tier" ON public.authority_tier_state
  FOR SELECT USING (true);

CREATE POLICY "Admins can update authority tier" ON public.authority_tier_state
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert authority tier" ON public.authority_tier_state
  FOR INSERT WITH CHECK (true);

-- Seed initial state
INSERT INTO public.authority_tier_state (current_level, reason, reason_ar)
VALUES (0, 'System initialized at L0 — no autonomy earned yet', 'النظام مُهيّأ عند المستوى ٠ — لم تُكتسب أي صلاحية بعد');

-- Authority promotion log
CREATE TABLE public.authority_promotion_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_level INTEGER NOT NULL,
  to_level INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('promotion', 'demotion', 'freeze')),
  reason TEXT NOT NULL,
  reason_ar TEXT,
  triggered_by TEXT NOT NULL DEFAULT 'system',
  approved_by UUID,
  accuracy_trend NUMERIC,
  reversal_rate NUMERIC,
  override_frequency NUMERIC,
  decision_similarity NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.authority_promotion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read promotion log" ON public.authority_promotion_log
  FOR SELECT USING (true);

CREATE POLICY "System can insert promotion log" ON public.authority_promotion_log
  FOR INSERT WITH CHECK (true);
