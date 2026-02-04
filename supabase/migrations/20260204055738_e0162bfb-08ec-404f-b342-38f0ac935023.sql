-- Update view to use actual message_category column
CREATE OR REPLACE VIEW public.ai_control_room_messages AS
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
  COALESCE(c.message_category, 
    CASE
      WHEN c.message_type = 'human_question' THEN 'human'
      WHEN c.is_summary = true THEN 'success'
      WHEN c.message_type = 'analysis' THEN 'info'
      ELSE 'discussion'
    END
  ) AS message_category
FROM ai_chat_room c
JOIN ai_agents a ON c.agent_id = a.id
ORDER BY c.created_at;