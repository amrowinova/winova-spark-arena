-- Add risk, impact, and rollback fields to ai_proposals
ALTER TABLE public.ai_proposals
ADD COLUMN IF NOT EXISTS risk_level text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS impact_scope text,
ADD COLUMN IF NOT EXISTS rollback_plan text,
ADD COLUMN IF NOT EXISTS code_snippet text,
ADD COLUMN IF NOT EXISTS estimated_effort text;

-- Create ai_discussion_sessions if not exists (for scheduled discussions)
-- Already exists, just add new fields
ALTER TABLE public.ai_discussion_sessions
ADD COLUMN IF NOT EXISTS discussion_topic text,
ADD COLUMN IF NOT EXISTS discussion_topic_ar text,
ADD COLUMN IF NOT EXISTS findings_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS proposals_generated integer DEFAULT 0;

-- Add comment for Level 3 governance
COMMENT ON TABLE public.ai_proposals IS 'Level 3 Governance: All AI suggestions require explicit Admin approval before execution. No Auto-Deploy allowed.';