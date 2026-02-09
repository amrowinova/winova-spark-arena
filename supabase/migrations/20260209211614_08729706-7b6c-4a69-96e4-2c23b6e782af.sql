
-- 1) Add lifecycle columns to ai_agents
ALTER TABLE public.ai_agents 
  ADD COLUMN IF NOT EXISTS lifecycle_state text NOT NULL DEFAULT 'healthy',
  ADD COLUMN IF NOT EXISTS lifecycle_changed_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS probation_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS disabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS lifecycle_reason text;

-- 2) Agent performance metrics history
CREATE TABLE public.agent_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_function text NOT NULL,
  measured_at timestamptz NOT NULL DEFAULT now(),
  success_rate numeric DEFAULT 0,
  failures_1h integer DEFAULT 0,
  failures_24h integer DEFAULT 0,
  consecutive_failures integer DEFAULT 0,
  avg_duration_ms numeric DEFAULT 0,
  tasks_completed integer DEFAULT 0,
  time_since_last_success_minutes numeric DEFAULT 0,
  lifecycle_state text DEFAULT 'healthy',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_perf_function ON public.agent_performance_metrics(agent_function);
CREATE INDEX idx_agent_perf_measured ON public.agent_performance_metrics(measured_at DESC);

ALTER TABLE public.agent_performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to agent_performance_metrics"
  ON public.agent_performance_metrics FOR ALL
  USING (true) WITH CHECK (true);

-- 3) Commander review log
CREATE TABLE public.commander_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_type text NOT NULL DEFAULT 'hourly',
  agents_scanned integer DEFAULT 0,
  healthy_count integer DEFAULT 0,
  watch_count integer DEFAULT 0,
  warning_count integer DEFAULT 0,
  probation_count integer DEFAULT 0,
  disabled_count integer DEFAULT 0,
  escalations jsonb DEFAULT '[]'::jsonb,
  report_content text,
  report_content_ar text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commander_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to commander_reviews"
  ON public.commander_reviews FOR ALL
  USING (true) WITH CHECK (true);

-- 4) Enable realtime for performance visibility
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_performance_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.commander_reviews;
