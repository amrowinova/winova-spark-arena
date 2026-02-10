
CREATE TABLE IF NOT EXISTS public.executive_understanding_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id TEXT NOT NULL,
  agent_function TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'scheduled',
  patterns_discovered TEXT NOT NULL DEFAULT 'None detected',
  owner_model_changes TEXT NOT NULL DEFAULT 'No changes',
  future_decision_impact TEXT NOT NULL DEFAULT 'No impact identified',
  risk_delta TEXT NOT NULL DEFAULT 'Unchanged',
  executive_summary TEXT NOT NULL,
  executive_summary_ar TEXT,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  validation_errors TEXT[],
  confidence_score INTEGER DEFAULT 70,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.executive_understanding_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on EUL" ON public.executive_understanding_reports
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_eul_agent ON public.executive_understanding_reports(agent_function);
CREATE INDEX IF NOT EXISTS idx_eul_created ON public.executive_understanding_reports(created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.executive_understanding_reports;
