-- Phase 2: Expand AI Agent Roles

-- Add new roles to the enum
ALTER TYPE public.ai_agent_role ADD VALUE IF NOT EXISTS 'qa_breaker';
ALTER TYPE public.ai_agent_role ADD VALUE IF NOT EXISTS 'fraud_analyst';
ALTER TYPE public.ai_agent_role ADD VALUE IF NOT EXISTS 'support_agent';
ALTER TYPE public.ai_agent_role ADD VALUE IF NOT EXISTS 'power_user';
ALTER TYPE public.ai_agent_role ADD VALUE IF NOT EXISTS 'contest_judge';
ALTER TYPE public.ai_agent_role ADD VALUE IF NOT EXISTS 'p2p_moderator';

-- Add session tracking for scheduled discussions
ALTER TABLE public.ai_chat_room ADD COLUMN IF NOT EXISTS session_id uuid;
ALTER TABLE public.ai_chat_room ADD COLUMN IF NOT EXISTS is_summary boolean DEFAULT false;

-- Create session tracking table for discussion rounds
CREATE TABLE IF NOT EXISTS public.ai_discussion_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  trigger_type text NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'manual'
  participants_count int DEFAULT 0,
  messages_count int DEFAULT 0,
  summary text,
  summary_ar text,
  action_items jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'in_progress' -- 'in_progress', 'completed'
);

-- Enable RLS
ALTER TABLE public.ai_discussion_sessions ENABLE ROW LEVEL SECURITY;

-- Only admins and support can view sessions
CREATE POLICY "Admins can view AI sessions"
ON public.ai_discussion_sessions FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Support can view AI sessions"
ON public.ai_discussion_sessions FOR SELECT
USING (is_support_staff(auth.uid()));