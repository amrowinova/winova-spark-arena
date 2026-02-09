
-- Add missing columns to knowledge_rules for the rule generator
ALTER TABLE public.knowledge_rules 
  ADD COLUMN IF NOT EXISTS confidence_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS generated_from_events uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS pattern_type text,
  ADD COLUMN IF NOT EXISTS sample_count integer DEFAULT 0;
