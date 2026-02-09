
CREATE OR REPLACE FUNCTION fn_route_chat_command()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.human_sender_id IS NOT NULL 
     AND NEW.message_type IN ('text', 'command', 'human_question')
     AND NEW.content IS NOT NULL
     AND length(NEW.content) > 2
  THEN
    IF EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = NEW.human_sender_id 
      AND role = 'admin'
    ) THEN
      INSERT INTO public.agent_command_queue (
        source_message_id, sender_id, raw_text
      ) VALUES (
        NEW.id, NEW.human_sender_id, NEW.content
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
