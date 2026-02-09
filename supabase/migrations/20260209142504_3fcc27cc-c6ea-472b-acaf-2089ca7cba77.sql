
-- External Knowledge: stores collected intelligence from external sources
CREATE TABLE public.external_knowledge (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_name TEXT NOT NULL,
  source_url TEXT,
  source_category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  title_ar TEXT,
  content TEXT NOT NULL,
  content_ar TEXT,
  relevance_score INTEGER DEFAULT 50,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  is_processed BOOLEAN DEFAULT false,
  collected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.external_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage external_knowledge"
  ON public.external_knowledge FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Control room users can view external_knowledge"
  ON public.external_knowledge FOR SELECT
  USING (can_access_ai_control_room(auth.uid()));

CREATE POLICY "Support can read external_knowledge"
  ON public.external_knowledge FOR SELECT
  USING (is_support_staff(auth.uid()));

-- Strategic Insights: AI-generated comparisons between global knowledge and WINOVA behavior
CREATE TABLE public.ai_strategic_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  insight_type TEXT NOT NULL DEFAULT 'general',
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT NOT NULL,
  description_ar TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  confidence_score INTEGER DEFAULT 50,
  impact_estimation TEXT,
  impact_estimation_ar TEXT,
  source_knowledge_ids UUID[] DEFAULT '{}',
  recommended_action TEXT,
  recommended_action_ar TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_strategic_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ai_strategic_insights"
  ON public.ai_strategic_insights FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Control room users can view ai_strategic_insights"
  ON public.ai_strategic_insights FOR SELECT
  USING (can_access_ai_control_room(auth.uid()));

CREATE POLICY "Support can read ai_strategic_insights"
  ON public.ai_strategic_insights FOR SELECT
  USING (is_support_staff(auth.uid()));

-- Index for performance
CREATE INDEX idx_external_knowledge_category ON public.external_knowledge(source_category);
CREATE INDEX idx_external_knowledge_processed ON public.external_knowledge(is_processed);
CREATE INDEX idx_ai_strategic_insights_status ON public.ai_strategic_insights(status);
CREATE INDEX idx_ai_strategic_insights_type ON public.ai_strategic_insights(insight_type);

-- Enable realtime for strategic insights
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_strategic_insights;
