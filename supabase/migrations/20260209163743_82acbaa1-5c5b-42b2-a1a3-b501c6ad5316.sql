
-- Build Projects table for WINOVA Software Factory
CREATE TABLE public.ai_build_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requested_by UUID NOT NULL,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT NOT NULL,
  description_ar TEXT,
  conversation_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'clarifying' CHECK (status IN ('clarifying', 'planning', 'generating', 'simulating', 'review', 'approved', 'delivering', 'completed', 'failed', 'cancelled')),
  current_phase TEXT NOT NULL DEFAULT 'clarification',
  phase_progress JSONB DEFAULT '{}',
  architecture JSONB DEFAULT '{}',
  stack_choices JSONB DEFAULT '{}',
  db_schemas JSONB DEFAULT '[]',
  backend_services JSONB DEFAULT '[]',
  frontend_components JSONB DEFAULT '[]',
  infra_config JSONB DEFAULT '{}',
  env_variables JSONB DEFAULT '[]',
  api_docs JSONB DEFAULT '{}',
  run_instructions TEXT,
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  simulation_id UUID REFERENCES public.ai_shadow_simulations(id),
  simulation_verdict TEXT,
  execution_request_id UUID REFERENCES public.ai_execution_requests(id),
  clarification_questions JSONB DEFAULT '[]',
  clarification_answers JSONB DEFAULT '[]',
  model_used TEXT DEFAULT 'google/gemini-2.5-pro',
  total_tokens_used INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_build_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage build projects"
  ON public.ai_build_projects FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_build_projects;

CREATE TRIGGER update_ai_build_projects_updated_at
  BEFORE UPDATE ON public.ai_build_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
