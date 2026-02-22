
-- AI Projects table
CREATE TABLE public.ai_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  stack TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access ai_projects" ON public.ai_projects FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- AI Files table
CREATE TABLE public.ai_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.ai_projects(id) ON DELETE CASCADE NOT NULL,
  path TEXT NOT NULL,
  content TEXT,
  language TEXT,
  last_modified TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access ai_files" ON public.ai_files FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_ai_files_project_id ON public.ai_files(project_id);
CREATE INDEX idx_ai_files_path ON public.ai_files(path);

-- AI Project Executions table
CREATE TABLE public.ai_project_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.ai_projects(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  language TEXT DEFAULT 'typescript',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed','failed')),
  output TEXT,
  error_message TEXT,
  requested_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_project_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access ai_project_executions" ON public.ai_project_executions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_files;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_project_executions;
