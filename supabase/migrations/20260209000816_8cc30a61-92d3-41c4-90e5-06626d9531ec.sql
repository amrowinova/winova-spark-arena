
-- Table: ai_engineer_reports — stores each hourly analysis cycle
CREATE TABLE public.ai_engineer_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  analysis_type text NOT NULL DEFAULT 'hourly_scan',
  status text NOT NULL DEFAULT 'completed',
  
  -- Data examined
  failures_scanned int NOT NULL DEFAULT 0,
  activities_scanned int NOT NULL DEFAULT 0,
  money_flows_scanned int NOT NULL DEFAULT 0,
  
  -- Findings
  findings_count int NOT NULL DEFAULT 0,
  patches_proposed int NOT NULL DEFAULT 0,
  critical_issues int NOT NULL DEFAULT 0,
  
  -- AI analysis
  summary text,
  summary_ar text,
  raw_analysis jsonb DEFAULT '{}'::jsonb,
  
  -- GitHub PR info
  github_pr_url text,
  github_pr_number int,
  github_branch text,
  
  -- Timing
  duration_ms int,
  
  -- Metadata
  model_used text,
  tokens_used int
);

-- Enable RLS
ALTER TABLE public.ai_engineer_reports ENABLE ROW LEVEL SECURITY;

-- Admin read
CREATE POLICY "Admins can view engineer reports"
ON public.ai_engineer_reports FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Support read
CREATE POLICY "Support can view engineer reports"
ON public.ai_engineer_reports FOR SELECT
USING (is_support_staff(auth.uid()));

-- Presidents/managers can view
CREATE POLICY "Control room users can view reports"
ON public.ai_engineer_reports FOR SELECT
USING (can_access_ai_control_room(auth.uid()));

-- Add confidence and risk columns to ai_proposals
ALTER TABLE public.ai_proposals
ADD COLUMN IF NOT EXISTS confidence_score int,
ADD COLUMN IF NOT EXISTS risk_label text DEFAULT 'low',
ADD COLUMN IF NOT EXISTS github_pr_url text,
ADD COLUMN IF NOT EXISTS github_pr_number int,
ADD COLUMN IF NOT EXISTS source text DEFAULT 'ai_discussion',
ADD COLUMN IF NOT EXISTS report_id uuid REFERENCES public.ai_engineer_reports(id);

-- Add index for report lookups
CREATE INDEX idx_ai_engineer_reports_created ON public.ai_engineer_reports(created_at DESC);
CREATE INDEX idx_ai_proposals_report_id ON public.ai_proposals(report_id);
CREATE INDEX idx_ai_proposals_source ON public.ai_proposals(source);
