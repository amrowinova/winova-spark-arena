
-- Create ai_core_evaluations table for per-message self-evaluation
CREATE TABLE public.ai_core_evaluations (
  id BIGSERIAL PRIMARY KEY,
  conversation_id TEXT,
  message_id TEXT,
  relevance FLOAT NOT NULL DEFAULT 0,
  clarity FLOAT NOT NULL DEFAULT 0,
  technical_depth FLOAT NOT NULL DEFAULT 0,
  hallucination_risk FLOAT NOT NULL DEFAULT 0,
  composite_score FLOAT NOT NULL DEFAULT 0,
  improvement_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_core_evaluations ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on ai_core_evaluations"
  ON public.ai_core_evaluations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable realtime for live score updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_core_evaluations;
