
-- 1. Agent Skills
CREATE TABLE public.ai_agent_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  skill_name text NOT NULL,
  skill_name_ar text,
  skill_category text NOT NULL DEFAULT 'general',
  proficiency_level integer NOT NULL DEFAULT 0 CHECK (proficiency_level BETWEEN 0 AND 100),
  acquired_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agent_id, skill_name)
);

-- 2. Training History
CREATE TABLE public.ai_training_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  training_type text NOT NULL DEFAULT 'observation',
  topic text NOT NULL,
  topic_ar text,
  data_source text,
  samples_processed integer DEFAULT 0,
  accuracy_before numeric,
  accuracy_after numeric,
  duration_ms integer,
  notes text,
  status text NOT NULL DEFAULT 'completed',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Evaluation Results
CREATE TABLE public.ai_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  evaluation_type text NOT NULL DEFAULT 'periodic',
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  overall_score integer CHECK (overall_score BETWEEN 0 AND 100),
  accuracy_score integer,
  speed_score integer,
  reliability_score integer,
  insight_quality_score integer,
  false_positive_rate numeric,
  tasks_completed integer DEFAULT 0,
  tasks_failed integer DEFAULT 0,
  findings_accepted integer DEFAULT 0,
  findings_rejected integer DEFAULT 0,
  evaluator text NOT NULL DEFAULT 'system',
  summary text,
  summary_ar text,
  recommendations text,
  recommendations_ar text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Promotions & Lifecycle Events
CREATE TABLE public.ai_agent_lifecycle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('birth','promotion','demotion','suspension','reactivation','retirement','skill_upgrade','reassignment')),
  from_state jsonb,
  to_state jsonb,
  reason text,
  reason_ar text,
  approved_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_agent_skills_agent ON public.ai_agent_skills(agent_id);
CREATE INDEX idx_training_agent ON public.ai_training_history(agent_id);
CREATE INDEX idx_evaluations_agent ON public.ai_evaluations(agent_id);
CREATE INDEX idx_lifecycle_agent ON public.ai_agent_lifecycle(agent_id);
CREATE INDEX idx_lifecycle_type ON public.ai_agent_lifecycle(event_type);

-- RLS
ALTER TABLE public.ai_agent_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_training_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_lifecycle ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins manage ai_agent_skills" ON public.ai_agent_skills FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage ai_training_history" ON public.ai_training_history FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage ai_evaluations" ON public.ai_evaluations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage ai_agent_lifecycle" ON public.ai_agent_lifecycle FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Support read access
CREATE POLICY "Support view ai_agent_skills" ON public.ai_agent_skills FOR SELECT
  USING (is_support_staff(auth.uid()));

CREATE POLICY "Support view ai_training_history" ON public.ai_training_history FOR SELECT
  USING (is_support_staff(auth.uid()));

CREATE POLICY "Support view ai_evaluations" ON public.ai_evaluations FOR SELECT
  USING (is_support_staff(auth.uid()));

CREATE POLICY "Support view ai_agent_lifecycle" ON public.ai_agent_lifecycle FOR SELECT
  USING (is_support_staff(auth.uid()));

-- Authenticated insert (for edge functions logging)
CREATE POLICY "Auth insert ai_agent_skills" ON public.ai_agent_skills FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Auth insert ai_training_history" ON public.ai_training_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Auth insert ai_evaluations" ON public.ai_evaluations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Auth insert ai_agent_lifecycle" ON public.ai_agent_lifecycle FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Auto-log birth event when agent is created
CREATE OR REPLACE FUNCTION public.log_agent_birth()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.ai_agent_lifecycle (agent_id, event_type, to_state, reason)
  VALUES (
    NEW.id,
    'birth',
    jsonb_build_object('role', NEW.agent_role, 'name', NEW.agent_name, 'focus_areas', NEW.focus_areas),
    'Agent created in system'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_agent_birth
  AFTER INSERT ON public.ai_agents
  FOR EACH ROW EXECUTE FUNCTION public.log_agent_birth();

-- Auto-log retirement/reactivation on is_active toggle
CREATE OR REPLACE FUNCTION public.log_agent_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_active = true AND NEW.is_active = false THEN
    INSERT INTO public.ai_agent_lifecycle (agent_id, event_type, from_state, to_state, reason)
    VALUES (NEW.id, 'retirement',
      jsonb_build_object('is_active', true),
      jsonb_build_object('is_active', false),
      'Agent deactivated');
  ELSIF OLD.is_active = false AND NEW.is_active = true THEN
    INSERT INTO public.ai_agent_lifecycle (agent_id, event_type, from_state, to_state, reason)
    VALUES (NEW.id, 'reactivation',
      jsonb_build_object('is_active', false),
      jsonb_build_object('is_active', true),
      'Agent reactivated');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_agent_status_change
  AFTER UPDATE OF is_active ON public.ai_agents
  FOR EACH ROW EXECUTE FUNCTION public.log_agent_status_change();
