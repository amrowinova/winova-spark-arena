
-- =============================================
-- TEAM CHAT: Tables, RLS, Realtime, Auto-enrollment
-- =============================================

-- 1) Team Conversations (one per leader)
CREATE TABLE public.team_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  leader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(leader_id)
);

-- 2) Team Conversation Members
CREATE TABLE public.team_conversation_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.team_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member', 'viewer')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- 3) Team Messages
CREATE TABLE public.team_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.team_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'announcement')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_team_conv_members_user ON public.team_conversation_members(user_id);
CREATE INDEX idx_team_conv_members_conv ON public.team_conversation_members(conversation_id);
CREATE INDEX idx_team_messages_conv ON public.team_messages(conversation_id, created_at DESC);
CREATE INDEX idx_team_messages_sender ON public.team_messages(sender_id);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.team_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

-- Helper: Check if user is member of a team conversation
CREATE OR REPLACE FUNCTION public.is_team_member(p_user_id UUID, p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_conversation_members
    WHERE user_id = p_user_id AND conversation_id = p_conversation_id
  );
$$;

-- Helper: Check if user is leader of a team conversation
CREATE OR REPLACE FUNCTION public.is_team_leader(p_user_id UUID, p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_conversation_members
    WHERE user_id = p_user_id AND conversation_id = p_conversation_id AND role = 'leader'
  );
$$;

-- team_conversations: members can see their conversations
CREATE POLICY "Members can view their team conversations"
ON public.team_conversations FOR SELECT
TO authenticated
USING (public.is_team_member(auth.uid(), id));

-- team_conversation_members: members can see other members in their conversations
CREATE POLICY "Members can view conversation members"
ON public.team_conversation_members FOR SELECT
TO authenticated
USING (public.is_team_member(auth.uid(), conversation_id));

-- team_messages: members can read messages
CREATE POLICY "Members can read team messages"
ON public.team_messages FOR SELECT
TO authenticated
USING (public.is_team_member(auth.uid(), conversation_id));

-- team_messages: members can send text messages
CREATE POLICY "Members can send text messages"
ON public.team_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_team_member(auth.uid(), conversation_id)
  AND message_type = 'text'
);

-- team_messages: leaders can send announcements
CREATE POLICY "Leaders can send announcements"
ON public.team_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_team_leader(auth.uid(), conversation_id)
  AND message_type = 'announcement'
);

-- =============================================
-- AUTO-ENROLLMENT: RPC called during signup
-- =============================================

CREATE OR REPLACE FUNCTION public.team_chat_enroll_member(
  p_new_user_id UUID,
  p_leader_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id UUID;
BEGIN
  -- Find or create team conversation for this leader
  SELECT id INTO v_conv_id
  FROM public.team_conversations
  WHERE leader_id = p_leader_id;

  IF v_conv_id IS NULL THEN
    -- Create conversation
    INSERT INTO public.team_conversations (leader_id)
    VALUES (p_leader_id)
    RETURNING id INTO v_conv_id;

    -- Add leader as leader role
    INSERT INTO public.team_conversation_members (conversation_id, user_id, role)
    VALUES (v_conv_id, p_leader_id, 'leader')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  -- Add new user as member
  INSERT INTO public.team_conversation_members (conversation_id, user_id, role)
  VALUES (v_conv_id, p_new_user_id, 'member')
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  -- Insert system welcome message
  INSERT INTO public.team_messages (conversation_id, sender_id, content, message_type)
  VALUES (
    v_conv_id,
    p_leader_id,
    'New member joined the team / انضم عضو جديد للفريق',
    'system'
  );
END;
$$;

-- =============================================
-- TRIGGER: Auto-enroll on team_members insert (level=1 = direct)
-- =============================================

CREATE OR REPLACE FUNCTION public.trg_team_chat_auto_enroll()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only auto-enroll direct members (level = 1)
  IF NEW.level = 1 THEN
    PERFORM public.team_chat_enroll_member(NEW.member_id, NEW.leader_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER team_chat_auto_enroll_on_team_member
AFTER INSERT ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.trg_team_chat_auto_enroll();

-- =============================================
-- FETCH RPC: Get team conversations for a user
-- =============================================

CREATE OR REPLACE FUNCTION public.get_team_conversations(p_user_id UUID)
RETURNS TABLE (
  conversation_id UUID,
  leader_id UUID,
  leader_name TEXT,
  leader_username TEXT,
  leader_avatar_url TEXT,
  member_count BIGINT,
  user_role TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_type TEXT,
  unread_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    tc.id AS conversation_id,
    tc.leader_id,
    p.name AS leader_name,
    p.username AS leader_username,
    p.avatar_url AS leader_avatar_url,
    (SELECT COUNT(*) FROM team_conversation_members WHERE conversation_id = tc.id) AS member_count,
    tcm.role AS user_role,
    (SELECT content FROM team_messages WHERE conversation_id = tc.id ORDER BY created_at DESC LIMIT 1) AS last_message,
    (SELECT created_at FROM team_messages WHERE conversation_id = tc.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
    (SELECT message_type FROM team_messages WHERE conversation_id = tc.id ORDER BY created_at DESC LIMIT 1) AS last_message_type,
    0::BIGINT AS unread_count
  FROM team_conversation_members tcm
  JOIN team_conversations tc ON tc.id = tcm.conversation_id
  JOIN profiles p ON p.user_id = tc.leader_id
  WHERE tcm.user_id = p_user_id
  ORDER BY last_message_at DESC NULLS LAST;
$$;

-- =============================================
-- ENABLE REALTIME
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;
