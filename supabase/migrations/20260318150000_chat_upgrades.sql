-- =============================================
-- Chat Upgrades: Images, Reactions, Reply Threading, Soft Delete
-- =============================================

-- 1. dm-media storage bucket (private, 10MB limit, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dm-media',
  'dm-media',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "dm_media_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dm-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "dm_media_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dm-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "dm_media_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'dm-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 2. Extend direct_messages: images, reply threading, soft delete
ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.direct_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reply_to_content TEXT,
  ADD COLUMN IF NOT EXISTS reply_to_sender TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 3. DM Message Reactions table
CREATE TABLE IF NOT EXISTS public.dm_message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT dm_reactions_unique UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_dm_reactions_message ON public.dm_message_reactions(message_id);

ALTER TABLE public.dm_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dm_reactions_select" ON public.dm_message_reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.direct_messages dm
      JOIN public.conversations c ON c.id = dm.conversation_id
      WHERE dm.id = message_id
        AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
    )
  );

CREATE POLICY "dm_reactions_insert" ON public.dm_message_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.direct_messages dm
      JOIN public.conversations c ON c.id = dm.conversation_id
      WHERE dm.id = message_id
        AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
    )
  );

CREATE POLICY "dm_reactions_delete" ON public.dm_message_reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 4. Extend team_messages: images, reply threading
ALTER TABLE public.team_messages
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.team_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reply_to_content TEXT,
  ADD COLUMN IF NOT EXISTS reply_to_sender TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 5. Team Message Reactions table
CREATE TABLE IF NOT EXISTS public.team_message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.team_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT team_reactions_unique UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_team_reactions_message ON public.team_message_reactions(message_id);

ALTER TABLE public.team_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_reactions_select" ON public.team_message_reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_messages tm
      JOIN public.team_conversation_members tcm ON tcm.conversation_id = tm.conversation_id
      WHERE tm.id = message_id AND tcm.user_id = auth.uid()
    )
  );

CREATE POLICY "team_reactions_insert" ON public.team_message_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.team_messages tm
      JOIN public.team_conversation_members tcm ON tcm.conversation_id = tm.conversation_id
      WHERE tm.id = message_id AND tcm.user_id = auth.uid()
    )
  );

CREATE POLICY "team_reactions_delete" ON public.team_message_reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
