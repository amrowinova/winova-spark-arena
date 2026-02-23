
-- Research Concepts (Knowledge Graph nodes)
CREATE TABLE public.research_concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.research_projects(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('financial_primitive','regulatory_rule','settlement_model','liquidity_pattern','risk_pattern','fraud_pattern','infrastructure_component')),
  definition text NOT NULL,
  confidence_score integer NOT NULL DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  first_detected_at timestamptz NOT NULL DEFAULT now(),
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  contradiction_flag boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_research_concepts_project ON public.research_concepts(project_id);
CREATE INDEX idx_research_concepts_category ON public.research_concepts(category);
CREATE UNIQUE INDEX idx_research_concepts_name_project ON public.research_concepts(project_id, lower(name));

ALTER TABLE public.research_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on research_concepts"
  ON public.research_concepts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Research Concept Relations (Knowledge Graph edges)
CREATE TABLE public.research_concept_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id uuid REFERENCES public.research_concepts(id) ON DELETE CASCADE NOT NULL,
  related_concept_id uuid REFERENCES public.research_concepts(id) ON DELETE CASCADE NOT NULL,
  relation_type text NOT NULL CHECK (relation_type IN ('depends_on','conflicts_with','enhances','replaces','mitigates','requires')),
  strength_score integer NOT NULL DEFAULT 50 CHECK (strength_score >= 0 AND strength_score <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_concept_relations_concept ON public.research_concept_relations(concept_id);
CREATE INDEX idx_concept_relations_related ON public.research_concept_relations(related_concept_id);

ALTER TABLE public.research_concept_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on research_concept_relations"
  ON public.research_concept_relations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Research Contradictions
CREATE TABLE public.research_contradictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id uuid REFERENCES public.research_concepts(id) ON DELETE CASCADE NOT NULL,
  previous_statement text NOT NULL,
  conflicting_statement text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolution_status text NOT NULL DEFAULT 'open' CHECK (resolution_status IN ('open','resolved','under_review'))
);

CREATE INDEX idx_contradictions_concept ON public.research_contradictions(concept_id);
CREATE INDEX idx_contradictions_status ON public.research_contradictions(resolution_status);

ALTER TABLE public.research_contradictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on research_contradictions"
  ON public.research_contradictions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
