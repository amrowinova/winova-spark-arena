-- =============================================
-- AI Control Room Integration with Chat System
-- =============================================

-- Add ai_session_id to ai_chat_room for linking discussions
ALTER TABLE public.ai_chat_room ADD COLUMN IF NOT EXISTS ai_session_id uuid REFERENCES public.ai_discussion_sessions(id);

-- Create a view to expose AI messages in chat-like format
CREATE OR REPLACE VIEW public.ai_control_room_messages AS
SELECT 
  acr.id,
  acr.agent_id,
  ag.agent_name,
  ag.agent_name_ar,
  ag.agent_role,
  ag.profile_id,
  acr.content,
  acr.content_ar,
  acr.message_type,
  acr.is_summary,
  acr.session_id,
  acr.created_at,
  acr.metadata,
  -- Severity/category tag for UI display
  CASE 
    WHEN acr.message_type = 'finding' THEN 'warning'
    WHEN acr.message_type = 'recommendation' THEN 'info'
    WHEN acr.message_type = 'risk' THEN 'critical'
    WHEN acr.message_type = 'summary' OR acr.is_summary = true THEN 'success'
    ELSE 'discussion'
  END as message_category
FROM public.ai_chat_room acr
JOIN public.ai_agents ag ON ag.id = acr.agent_id
ORDER BY acr.created_at ASC;

-- Create a view for AI analysis logs in chat format
CREATE OR REPLACE VIEW public.ai_control_room_findings AS
SELECT 
  aal.id,
  aal.agent_id,
  ag.agent_name,
  ag.agent_name_ar,
  ag.agent_role,
  ag.profile_id,
  aal.title,
  aal.title_ar,
  aal.description,
  aal.description_ar,
  aal.severity,
  aal.affected_area,
  aal.suggested_fix,
  aal.technical_reason,
  aal.status,
  aal.created_at,
  -- Map severity to category
  CASE 
    WHEN aal.severity = 'critical' THEN 'critical'
    WHEN aal.severity = 'high' THEN 'warning'
    WHEN aal.severity = 'medium' THEN 'info'
    ELSE 'discussion'
  END as message_category
FROM public.ai_analysis_logs aal
JOIN public.ai_agents ag ON ag.id = aal.agent_id
ORDER BY aal.created_at DESC;

-- RLS for the views - only admins, support, presidents, and managers can view
ALTER VIEW public.ai_control_room_messages SET (security_invoker = true);
ALTER VIEW public.ai_control_room_findings SET (security_invoker = true);

-- Create function to check if user can access AI control room
CREATE OR REPLACE FUNCTION public.can_access_ai_control_room(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Check for admin/support role
    has_role(p_user_id, 'admin') OR 
    has_role(p_user_id, 'support') OR
    -- Check for president or manager rank
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = p_user_id 
      AND rank IN ('president', 'manager')
    )
$$;

-- Grant select on views to authenticated users (RLS will handle access)
GRANT SELECT ON public.ai_control_room_messages TO authenticated;
GRANT SELECT ON public.ai_control_room_findings TO authenticated;

-- Add emoji avatars to AI agents for chat display
UPDATE public.ai_agents SET behavior_description = COALESCE(behavior_description, '') || 
  CASE agent_role
    WHEN 'user_tester' THEN ' | 🧪'
    WHEN 'marketer_growth' THEN ' | 📈'
    WHEN 'leader_team' THEN ' | 👥'
    WHEN 'manager_stats' THEN ' | 📊'
    WHEN 'backend_engineer' THEN ' | ⚙️'
    WHEN 'system_architect' THEN ' | 🏗️'
    WHEN 'qa_breaker' THEN ' | 💥'
    WHEN 'fraud_analyst' THEN ' | 🔍'
    WHEN 'support_agent' THEN ' | 🎧'
    WHEN 'power_user' THEN ' | ⚡'
    WHEN 'contest_judge' THEN ' | ⚖️'
    WHEN 'p2p_moderator' THEN ' | 🤝'
    ELSE ' | 🤖'
  END
WHERE behavior_description NOT LIKE '%|%';