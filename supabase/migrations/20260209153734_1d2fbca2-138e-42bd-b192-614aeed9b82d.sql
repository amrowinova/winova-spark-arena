
-- =============================================
-- PART 1: Predictive Intelligence - ai_forecasts
-- =============================================
CREATE TABLE IF NOT EXISTS public.ai_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_type text NOT NULL DEFAULT 'risk',
  title text NOT NULL,
  title_ar text,
  description text NOT NULL,
  description_ar text,
  probability integer NOT NULL DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  impact_range text,
  impact_range_ar text,
  time_window text,
  recommended_action text,
  recommended_action_ar text,
  confidence_score integer DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  metadata jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'new',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ai_forecasts" ON public.ai_forecasts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can insert ai_forecasts" ON public.ai_forecasts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Support can read ai_forecasts" ON public.ai_forecasts FOR SELECT
  USING (is_support_staff(auth.uid()));

CREATE POLICY "Control room can view ai_forecasts" ON public.ai_forecasts FOR SELECT
  USING (can_access_ai_control_room(auth.uid()));

CREATE INDEX idx_ai_forecasts_type ON public.ai_forecasts(forecast_type);
CREATE INDEX idx_ai_forecasts_status ON public.ai_forecasts(status);
CREATE INDEX idx_ai_forecasts_probability ON public.ai_forecasts(probability DESC);
CREATE INDEX idx_ai_forecasts_created ON public.ai_forecasts(created_at DESC);

-- =============================================
-- PART 2: Evolution Engine - ai_evolution_proposals
-- =============================================
CREATE TABLE IF NOT EXISTS public.ai_evolution_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  missing_capability text NOT NULL,
  missing_capability_ar text,
  reason text NOT NULL,
  reason_ar text,
  expected_impact text,
  expected_impact_ar text,
  urgency text NOT NULL DEFAULT 'medium',
  suggested_agent_type text,
  suggested_agent_type_ar text,
  skills_required text[],
  confidence integer DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
  metadata jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'proposed',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_evolution_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ai_evolution_proposals" ON public.ai_evolution_proposals FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can insert ai_evolution_proposals" ON public.ai_evolution_proposals FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Support can read ai_evolution_proposals" ON public.ai_evolution_proposals FOR SELECT
  USING (is_support_staff(auth.uid()));

CREATE POLICY "Control room can view ai_evolution_proposals" ON public.ai_evolution_proposals FOR SELECT
  USING (can_access_ai_control_room(auth.uid()));

CREATE INDEX idx_ai_evolution_urgency ON public.ai_evolution_proposals(urgency);
CREATE INDEX idx_ai_evolution_status ON public.ai_evolution_proposals(status);
CREATE INDEX idx_ai_evolution_created ON public.ai_evolution_proposals(created_at DESC);

-- =============================================
-- PART 3: Agent Growth Tracking - ai_capability_metrics
-- =============================================
CREATE TABLE IF NOT EXISTS public.ai_capability_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  total_agents integer NOT NULL DEFAULT 0,
  active_agents integer NOT NULL DEFAULT 0,
  skills_coverage integer DEFAULT 0,
  avg_confidence integer DEFAULT 0,
  solved_without_human integer DEFAULT 0,
  escalations integer DEFAULT 0,
  improvement_rate numeric(5,2) DEFAULT 0,
  forecasts_generated integer DEFAULT 0,
  forecasts_accurate integer DEFAULT 0,
  proposals_approved integer DEFAULT 0,
  proposals_rejected integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_metric_date UNIQUE (metric_date)
);

ALTER TABLE public.ai_capability_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ai_capability_metrics" ON public.ai_capability_metrics FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can insert ai_capability_metrics" ON public.ai_capability_metrics FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Support can read ai_capability_metrics" ON public.ai_capability_metrics FOR SELECT
  USING (is_support_staff(auth.uid()));

CREATE POLICY "Control room can view ai_capability_metrics" ON public.ai_capability_metrics FOR SELECT
  USING (can_access_ai_control_room(auth.uid()));

CREATE INDEX idx_ai_capability_date ON public.ai_capability_metrics(metric_date DESC);

-- =============================================
-- Enable realtime for forecasts (live dashboard)
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_forecasts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_evolution_proposals;
