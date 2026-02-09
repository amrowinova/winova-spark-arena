
-- WINOVA AI Evolution System

-- 1) Enrich ai_agents
ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS trust_score numeric DEFAULT 50 NOT NULL,
  ADD COLUMN IF NOT EXISTS success_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failure_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_operations integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS demotions integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supervisor_agent_id uuid REFERENCES public.ai_agents(id),
  ADD COLUMN IF NOT EXISTS last_evaluation_date timestamptz,
  ADD COLUMN IF NOT EXISTS auto_execute_level integer DEFAULT 0;

-- 2) Trust change ledger
CREATE TABLE IF NOT EXISTS public.ai_trust_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id),
  delta numeric NOT NULL,
  previous_score numeric NOT NULL,
  new_score numeric NOT NULL,
  reason text NOT NULL,
  reason_ar text,
  source_type text NOT NULL,
  source_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_trust_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read trust changes" ON public.ai_trust_changes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 3) Self-evaluation reports
CREATE TABLE IF NOT EXISTS public.ai_self_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id),
  evaluation_period_start timestamptz NOT NULL,
  evaluation_period_end timestamptz NOT NULL,
  operations_reviewed integer DEFAULT 0,
  correct_predictions integer DEFAULT 0,
  incorrect_predictions integer DEFAULT 0,
  human_agreements integer DEFAULT 0,
  human_overrides integer DEFAULT 0,
  errors_analyzed integer DEFAULT 0,
  improvement_hypotheses jsonb DEFAULT '[]',
  strengths text[],
  weaknesses text[],
  summary text,
  summary_ar text,
  trust_score_at_evaluation numeric,
  recommended_action text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_self_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read self evaluations" ON public.ai_self_evaluations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 4) Promotion requests
CREATE TABLE IF NOT EXISTS public.ai_promotion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id),
  current_rank text NOT NULL,
  requested_rank text NOT NULL,
  justification text NOT NULL,
  justification_ar text,
  impact_summary text,
  impact_summary_ar text,
  trust_score_at_request numeric,
  success_rate_at_request numeric,
  total_ops_at_request integer,
  conversation_id text,
  status text NOT NULL DEFAULT 'pending',
  decided_by uuid,
  decided_at timestamptz,
  decision_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_promotion_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage promotion requests" ON public.ai_promotion_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 5) Agent creation proposals
CREATE TABLE IF NOT EXISTS public.ai_agent_creation_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposed_by_agent uuid NOT NULL REFERENCES public.ai_agents(id),
  proposed_name text NOT NULL,
  proposed_name_ar text,
  mission text NOT NULL,
  mission_ar text,
  expected_improvement text,
  expected_improvement_ar text,
  risk_level text DEFAULT 'low',
  supervision_model text,
  supervisor_agent_id uuid REFERENCES public.ai_agents(id),
  required_skills text[],
  conversation_id text,
  status text NOT NULL DEFAULT 'pending',
  decided_by uuid,
  decided_at timestamptz,
  decision_reason text,
  created_agent_id uuid REFERENCES public.ai_agents(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_agent_creation_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage agent creation proposals" ON public.ai_agent_creation_proposals FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 6) Agent comparisons
CREATE TABLE IF NOT EXISTS public.ai_agent_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty text NOT NULL,
  agents_compared jsonb NOT NULL,
  winner_agent_id uuid REFERENCES public.ai_agents(id),
  recommendation text,
  recommendation_ar text,
  details text,
  details_ar text,
  conversation_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_agent_comparisons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read comparisons" ON public.ai_agent_comparisons FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 7) Retirement proposals
CREATE TABLE IF NOT EXISTS public.ai_retirement_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id),
  reason text NOT NULL,
  reason_ar text,
  performance_summary jsonb,
  recommendation text NOT NULL,
  recommendation_ar text,
  conversation_id text,
  status text NOT NULL DEFAULT 'pending',
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_retirement_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage retirement proposals" ON public.ai_retirement_proposals FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 8) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_trust_changes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_promotion_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_retirement_proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_agent_creation_proposals;

-- 9) Indexes
CREATE INDEX IF NOT EXISTS idx_trust_changes_agent ON public.ai_trust_changes(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_self_eval_agent ON public.ai_self_evaluations(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_promo_req_status ON public.ai_promotion_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_retire_status ON public.ai_retirement_proposals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_creation_status ON public.ai_agent_creation_proposals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comparisons_specialty ON public.ai_agent_comparisons(specialty, created_at DESC);
