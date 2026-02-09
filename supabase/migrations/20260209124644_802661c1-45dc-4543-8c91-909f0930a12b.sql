
-- Knowledge Memory
CREATE TABLE IF NOT EXISTS public.knowledge_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  source text,
  event_type text,
  area text,
  reference_id text,
  payload jsonb
);
ALTER TABLE public.knowledge_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage knowledge_memory" ON public.knowledge_memory FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Support can read knowledge_memory" ON public.knowledge_memory FOR SELECT USING (is_support_staff(auth.uid()));
CREATE POLICY "Authenticated can insert knowledge_memory" ON public.knowledge_memory FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Knowledge Rules
CREATE TABLE IF NOT EXISTS public.knowledge_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  rule_key text,
  description text,
  description_ar text,
  is_active boolean DEFAULT true
);
ALTER TABLE public.knowledge_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage knowledge_rules" ON public.knowledge_rules FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Support can read knowledge_rules" ON public.knowledge_rules FOR SELECT USING (is_support_staff(auth.uid()));
CREATE POLICY "Authenticated can read knowledge_rules" ON public.knowledge_rules FOR SELECT USING (auth.uid() IS NOT NULL);

-- Knowledge Decisions
CREATE TABLE IF NOT EXISTS public.knowledge_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  proposal_id uuid REFERENCES public.ai_proposals(id),
  decision text,
  decided_by uuid,
  notes text
);
ALTER TABLE public.knowledge_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage knowledge_decisions" ON public.knowledge_decisions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Support can read knowledge_decisions" ON public.knowledge_decisions FOR SELECT USING (is_support_staff(auth.uid()));

-- Knowledge Patterns
CREATE TABLE IF NOT EXISTS public.knowledge_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  pattern_type text,
  problem text,
  solution text,
  confidence int DEFAULT 0
);
ALTER TABLE public.knowledge_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage knowledge_patterns" ON public.knowledge_patterns FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Support can read knowledge_patterns" ON public.knowledge_patterns FOR SELECT USING (is_support_staff(auth.uid()));
CREATE POLICY "Authenticated can insert knowledge_patterns" ON public.knowledge_patterns FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
