
-- AI Core: Private AI Operating System tables

-- Conversations
CREATE TABLE public.ai_core_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  system_prompt TEXT,
  model TEXT DEFAULT 'default',
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_core_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only - ai_core_conversations" ON public.ai_core_conversations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Messages
CREATE TABLE public.ai_core_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_core_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_core_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only - ai_core_messages" ON public.ai_core_messages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_ai_core_messages_conv ON public.ai_core_messages(conversation_id, created_at);

-- Long-term Memory
CREATE TABLE public.ai_core_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'general',
  key TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding_id TEXT,
  importance INTEGER DEFAULT 5,
  tags TEXT[] DEFAULT '{}',
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_core_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only - ai_core_memory" ON public.ai_core_memory
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Execution Logs
CREATE TABLE public.ai_core_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.ai_core_conversations(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  input JSONB DEFAULT '{}',
  output JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  requires_approval BOOLEAN DEFAULT true,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_core_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only - ai_core_executions" ON public.ai_core_executions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- File attachments
CREATE TABLE public.ai_core_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.ai_core_conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.ai_core_messages(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_core_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only - ai_core_files" ON public.ai_core_files
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE TRIGGER update_ai_core_conversations_updated_at
  BEFORE UPDATE ON public.ai_core_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_core_memory_updated_at
  BEFORE UPDATE ON public.ai_core_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for AI Core files
INSERT INTO storage.buckets (id, name, public) VALUES ('ai-core-files', 'ai-core-files', false);

CREATE POLICY "Admin upload ai-core-files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ai-core-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin read ai-core-files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'ai-core-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin delete ai-core-files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'ai-core-files' AND public.has_role(auth.uid(), 'admin'));
