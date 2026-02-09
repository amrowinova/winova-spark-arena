
-- ═══════════════════════════════════════════════════════
-- WINOVA PROJECT OPERATING SYSTEM — Database Layer
-- ═══════════════════════════════════════════════════════

-- Project Phases tracking
CREATE TABLE public.project_phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.ai_build_projects(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL,
  phase_name_ar TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  agent_id UUID REFERENCES public.ai_agents(id),
  output_summary TEXT,
  output_summary_ar TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project Artifacts (documentation, reports, configs)
CREATE TABLE public.project_artifacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.ai_build_projects(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL,
  title TEXT NOT NULL,
  title_ar TEXT,
  content TEXT,
  content_json JSONB,
  file_url TEXT,
  file_size INT,
  mime_type TEXT,
  generated_by UUID REFERENCES public.ai_agents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project Files (downloadable outputs)
CREATE TABLE public.project_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.ai_build_projects(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  storage_path TEXT,
  file_size INT,
  mime_type TEXT DEFAULT 'application/octet-stream',
  description TEXT,
  description_ar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project Agents (which agents are assigned)
CREATE TABLE public.project_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.ai_build_projects(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id),
  role TEXT NOT NULL DEFAULT 'contributor',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tasks_completed INT DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  UNIQUE(project_id, agent_id)
);

-- Project Activity Stream
CREATE TABLE public.project_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.ai_build_projects(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  description_ar TEXT,
  agent_id UUID REFERENCES public.ai_agents(id),
  user_id UUID,
  metadata JSONB DEFAULT '{}',
  risk_level TEXT DEFAULT 'low',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_activity ENABLE ROW LEVEL SECURITY;

-- RLS: Authenticated users can read all project data
CREATE POLICY "Authenticated users can read project_phases" ON public.project_phases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read project_artifacts" ON public.project_artifacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read project_files" ON public.project_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read project_agents" ON public.project_agents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read project_activity" ON public.project_activity FOR SELECT TO authenticated USING (true);

-- Service role can insert/update (edge functions)
CREATE POLICY "Service can manage project_phases" ON public.project_phases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage project_artifacts" ON public.project_artifacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage project_files" ON public.project_files FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage project_agents" ON public.project_agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage project_activity" ON public.project_activity FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_phases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_activity;

-- Storage bucket for project files
INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read project files" ON storage.objects FOR SELECT USING (bucket_id = 'project-files');
CREATE POLICY "Service can upload project files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'project-files');

-- Create indexes
CREATE INDEX idx_project_phases_project ON public.project_phases(project_id);
CREATE INDEX idx_project_artifacts_project ON public.project_artifacts(project_id);
CREATE INDEX idx_project_files_project ON public.project_files(project_id);
CREATE INDEX idx_project_agents_project ON public.project_agents(project_id);
CREATE INDEX idx_project_activity_project ON public.project_activity(project_id, created_at DESC);
