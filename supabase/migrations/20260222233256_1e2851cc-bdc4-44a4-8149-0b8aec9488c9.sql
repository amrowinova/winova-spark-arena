
-- Create ai_memory table for long-term AI Core memory
CREATE TABLE public.ai_memory (
  id BIGSERIAL PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'general',
  key TEXT NOT NULL,
  content TEXT NOT NULL,
  importance FLOAT NOT NULL DEFAULT 0.5,
  last_used TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ai_memory_category ON public.ai_memory (category);
CREATE INDEX idx_ai_memory_importance ON public.ai_memory (importance DESC);

-- Enable RLS
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;

-- Service role access only (admin edge functions)
CREATE POLICY "Service role full access on ai_memory"
  ON public.ai_memory
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_memory;
