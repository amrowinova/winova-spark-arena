
-- Create the ai_ci_reports table
CREATE TABLE IF NOT EXISTS public.ai_ci_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  pr_number integer NOT NULL,
  branch text NOT NULL,
  repository text,
  build_status text NOT NULL DEFAULT 'unknown', -- pass / fail / unknown
  lint_status text NOT NULL DEFAULT 'unknown',
  test_status text NOT NULL DEFAULT 'unknown',
  risk_level text NOT NULL DEFAULT 'unknown', -- low / medium / high
  raw_logs jsonb DEFAULT '{}'::jsonb,
  report_id uuid REFERENCES public.ai_engineer_reports(id)
);

-- Enable RLS
ALTER TABLE public.ai_ci_reports ENABLE ROW LEVEL SECURITY;

-- Admin → full access
CREATE POLICY "Admins can manage ai_ci_reports"
ON public.ai_ci_reports FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Support → read only
CREATE POLICY "Support can read ai_ci_reports"
ON public.ai_ci_reports FOR SELECT
USING (is_support_staff(auth.uid()));

-- AI/system → insert only
CREATE POLICY "Authenticated can insert ai_ci_reports"
ON public.ai_ci_reports FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Control room users → read only
CREATE POLICY "Control room users can view ci reports"
ON public.ai_ci_reports FOR SELECT
USING (can_access_ai_control_room(auth.uid()));
