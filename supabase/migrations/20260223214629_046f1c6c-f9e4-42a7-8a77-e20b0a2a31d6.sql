
-- =====================================================
-- WeNova Deep Research Engine (WDRE) — Isolated Schema
-- =====================================================

-- 1. Research Projects
CREATE TABLE public.research_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_by text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Research Outputs (structured files)
CREATE TABLE public.research_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.research_projects(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  content text NOT NULL,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Research Simulations
CREATE TABLE public.research_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.research_projects(id) ON DELETE CASCADE NOT NULL,
  scenario text NOT NULL,
  parameters jsonb DEFAULT '{}',
  results jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Research Sources
CREATE TABLE public.research_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.research_projects(id) ON DELETE CASCADE NOT NULL,
  output_id uuid REFERENCES public.research_outputs(id) ON DELETE SET NULL,
  source_type text NOT NULL DEFAULT 'official_doc',
  title text NOT NULL,
  url text,
  citation text,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Research Integrity Scores
CREATE TABLE public.research_integrity_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.research_projects(id) ON DELETE CASCADE NOT NULL,
  simulation_id uuid REFERENCES public.research_simulations(id) ON DELETE SET NULL,
  mathematical_consistency numeric NOT NULL DEFAULT 0,
  regulatory_feasibility numeric NOT NULL DEFAULT 0,
  attack_resistance numeric NOT NULL DEFAULT 0,
  liquidity_robustness numeric NOT NULL DEFAULT 0,
  overall_score numeric NOT NULL DEFAULT 0,
  failure_report text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_research_outputs_project ON public.research_outputs(project_id);
CREATE INDEX idx_research_simulations_project ON public.research_simulations(project_id);
CREATE INDEX idx_research_sources_project ON public.research_sources(project_id);
CREATE INDEX idx_research_sources_output ON public.research_sources(output_id);
CREATE INDEX idx_research_integrity_project ON public.research_integrity_scores(project_id);

-- RLS
ALTER TABLE public.research_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_integrity_scores ENABLE ROW LEVEL SECURITY;

-- Admin-only policies using has_role
CREATE POLICY "Admin read research_projects" ON public.research_projects FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin insert research_projects" ON public.research_projects FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update research_projects" ON public.research_projects FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete research_projects" ON public.research_projects FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin read research_outputs" ON public.research_outputs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin insert research_outputs" ON public.research_outputs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin read research_simulations" ON public.research_simulations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin insert research_simulations" ON public.research_simulations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin read research_sources" ON public.research_sources FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin insert research_sources" ON public.research_sources FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin read research_integrity_scores" ON public.research_integrity_scores FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin insert research_integrity_scores" ON public.research_integrity_scores FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
