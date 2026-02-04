-- Add message_category column to ai_chat_room
ALTER TABLE public.ai_chat_room 
ADD COLUMN IF NOT EXISTS message_category TEXT DEFAULT 'discussion';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_chat_room_category ON public.ai_chat_room(message_category);