
-- Add missing columns to existing ai_agents
ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS specialty text,
  ADD COLUMN IF NOT EXISTS rank text NOT NULL DEFAULT 'trainee',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'training',
  ADD COLUMN IF NOT EXISTS confidence integer DEFAULT 0;

-- ai_training_sessions (simpler than ai_training_history, dedicated table)
CREATE TABLE IF NOT EXISTS public.ai_training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  topic text,
  sources_count integer,
  confidence_gain integer,
  weaknesses text,
  trained_at timestamptz DEFAULT now()
);

-- ai_promotions (dedicated promotion tracking)
CREATE TABLE IF NOT EXISTS public.ai_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  from_rank text,
  to_rank text,
  reason text,
  approved_by uuid,
  promoted_at timestamptz DEFAULT now()
);

-- ai_retirements
CREATE TABLE IF NOT EXISTS public.ai_retirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  reason text,
  retired_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_training_sessions_agent ON public.ai_training_sessions(agent_id);
CREATE INDEX idx_promotions_agent ON public.ai_promotions(agent_id);
CREATE INDEX idx_retirements_agent ON public.ai_retirements(agent_id);

-- RLS
ALTER TABLE public.ai_training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_retirements ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins manage ai_training_sessions" ON public.ai_training_sessions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage ai_promotions" ON public.ai_promotions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage ai_retirements" ON public.ai_retirements FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Support read
CREATE POLICY "Support view ai_training_sessions" ON public.ai_training_sessions FOR SELECT
  USING (is_support_staff(auth.uid()));

CREATE POLICY "Support view ai_promotions" ON public.ai_promotions FOR SELECT
  USING (is_support_staff(auth.uid()));

CREATE POLICY "Support view ai_retirements" ON public.ai_retirements FOR SELECT
  USING (is_support_staff(auth.uid()));

-- Auth insert (edge functions)
CREATE POLICY "Auth insert ai_training_sessions" ON public.ai_training_sessions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Auth insert ai_promotions" ON public.ai_promotions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Auth insert ai_retirements" ON public.ai_retirements FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
