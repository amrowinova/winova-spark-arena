-- Add human_question message type support
-- Update ai_chat_room to support human questions

-- Add profile_id to ai_chat_room for human senders
ALTER TABLE public.ai_chat_room 
ADD COLUMN IF NOT EXISTS human_sender_id uuid REFERENCES auth.users(id);

-- Create table for human question sessions
CREATE TABLE IF NOT EXISTS public.ai_human_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  asked_by uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  summary text,
  summary_ar text
);

-- Enable RLS
ALTER TABLE public.ai_human_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for human sessions
CREATE POLICY "Admins can manage human sessions"
ON public.ai_human_sessions
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Support staff can view human sessions"
ON public.ai_human_sessions
FOR SELECT
USING (is_support_staff(auth.uid()));

CREATE POLICY "Presidents and managers can create sessions"
ON public.ai_human_sessions
FOR INSERT
WITH CHECK (
  can_access_ai_control_room(auth.uid())
);

CREATE POLICY "Presidents and managers can view their sessions"
ON public.ai_human_sessions
FOR SELECT
USING (
  can_access_ai_control_room(auth.uid())
);

-- Update the view to include human messages
DROP VIEW IF EXISTS public.ai_control_room_messages;

CREATE VIEW public.ai_control_room_messages 
WITH (security_invoker = true)
AS
SELECT 
  c.id,
  c.agent_id,
  a.agent_name,
  a.agent_name_ar,
  a.agent_role,
  a.profile_id,
  c.content,
  c.content_ar,
  c.message_type,
  c.is_summary,
  c.session_id,
  c.created_at,
  c.metadata,
  c.human_sender_id,
  CASE 
    WHEN c.message_type = 'human_question' THEN 'human'
    WHEN c.is_summary = true THEN 'success'
    WHEN c.message_type = 'analysis' THEN 'info'
    WHEN c.message_type = 'discussion' THEN 'discussion'
    ELSE 'discussion'
  END as message_category
FROM public.ai_chat_room c
JOIN public.ai_agents a ON c.agent_id = a.id
ORDER BY c.created_at ASC;