
-- Track all AI-generated code changes
CREATE TABLE public.ai_code_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_function TEXT NOT NULL DEFAULT 'ai-code-engineer',
  branch_name TEXT NOT NULL,
  pr_number INTEGER,
  pr_url TEXT,
  pr_title TEXT NOT NULL,
  pr_body TEXT,
  files_changed JSONB NOT NULL DEFAULT '[]'::jsonb,
  diff_summary TEXT,
  diff_summary_ar TEXT,
  source_request_id UUID REFERENCES public.ai_execution_requests(id),
  source_command TEXT,
  status TEXT NOT NULL DEFAULT 'branch_created',
  risk_level TEXT NOT NULL DEFAULT 'low',
  confidence_score NUMERIC DEFAULT 0,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  merged_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_code_changes ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage code changes"
  ON public.ai_code_changes FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Read for authenticated users
CREATE POLICY "Authenticated users can view code changes"
  ON public.ai_code_changes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Index for fast lookups
CREATE INDEX idx_ai_code_changes_status ON public.ai_code_changes(status);
CREATE INDEX idx_ai_code_changes_branch ON public.ai_code_changes(branch_name);
CREATE INDEX idx_ai_code_changes_created ON public.ai_code_changes(created_at DESC);

-- Timestamp trigger
CREATE TRIGGER update_ai_code_changes_updated_at
  BEFORE UPDATE ON public.ai_code_changes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_code_changes;
