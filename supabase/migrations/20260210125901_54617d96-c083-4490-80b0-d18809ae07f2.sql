
-- CEO Decision History
CREATE TABLE public.ceo_decision_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID,
  request_type TEXT NOT NULL,
  request_title TEXT NOT NULL,
  request_title_ar TEXT,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  urgency TEXT NOT NULL DEFAULT 'normal',
  services_affected TEXT[] DEFAULT '{}',
  suggested_fix TEXT,
  decision TEXT NOT NULL,
  modification_notes TEXT,
  decision_reason TEXT,
  response_time_ms BIGINT,
  context_snapshot JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ceo_decision_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage decision history" ON public.ceo_decision_history FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- CEO Decision Patterns
CREATE TABLE public.ceo_decision_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern_key TEXT NOT NULL UNIQUE,
  pattern_description TEXT NOT NULL,
  pattern_description_ar TEXT,
  pattern_type TEXT NOT NULL DEFAULT 'preference',
  conditions JSONB NOT NULL DEFAULT '{}',
  confidence NUMERIC NOT NULL DEFAULT 0.5,
  sample_count INT NOT NULL DEFAULT 0,
  last_validated_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ceo_decision_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage decision patterns" ON public.ceo_decision_patterns FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- CEO Prediction Scores
CREATE TABLE public.ceo_prediction_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL,
  predicted_decision TEXT NOT NULL,
  approval_probability NUMERIC NOT NULL DEFAULT 0.5,
  reasoning TEXT NOT NULL,
  reasoning_ar TEXT,
  similar_past_decisions UUID[] DEFAULT '{}',
  matching_patterns TEXT[] DEFAULT '{}',
  fast_track_eligible BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ceo_prediction_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage prediction scores" ON public.ceo_prediction_scores FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Indexes
CREATE INDEX idx_ceo_hist_type ON public.ceo_decision_history(request_type);
CREATE INDEX idx_ceo_hist_decision ON public.ceo_decision_history(decision);
CREATE INDEX idx_ceo_hist_risk ON public.ceo_decision_history(risk_level);
CREATE INDEX idx_ceo_pred_req ON public.ceo_prediction_scores(request_id);
CREATE INDEX idx_ceo_pat_active ON public.ceo_decision_patterns(is_active) WHERE is_active = true;

ALTER PUBLICATION supabase_realtime ADD TABLE public.ceo_prediction_scores;
