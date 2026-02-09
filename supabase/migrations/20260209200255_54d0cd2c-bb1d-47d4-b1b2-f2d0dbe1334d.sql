
-- Enable pg_cron and pg_net
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Helper: check admin role
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Agent Schedules
CREATE TABLE IF NOT EXISTS public.agent_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_function TEXT NOT NULL,
  schedule_cron TEXT NOT NULL,
  schedule_label TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_status TEXT DEFAULT 'never_run',
  last_duration_ms INTEGER,
  last_error TEXT,
  run_count INTEGER DEFAULT 0,
  fail_count INTEGER DEFAULT 0,
  consecutive_failures INTEGER DEFAULT 0,
  max_consecutive_failures INTEGER DEFAULT 3,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.agent_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_agent_schedules" ON public.agent_schedules FOR ALL USING (public.is_admin_user());

-- Agent Health Checks
CREATE TABLE IF NOT EXISTS public.agent_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_function TEXT NOT NULL,
  check_type TEXT NOT NULL DEFAULT 'heartbeat',
  status TEXT NOT NULL DEFAULT 'healthy',
  response_time_ms INTEGER,
  error_count_1h INTEGER DEFAULT 0,
  error_count_24h INTEGER DEFAULT 0,
  avg_duration_ms INTEGER,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_error TEXT,
  token_usage_24h INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.agent_health_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_health_checks" ON public.agent_health_checks FOR SELECT USING (public.is_admin_user());

-- Command Queue
CREATE TABLE IF NOT EXISTS public.agent_command_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_message_id UUID,
  sender_id UUID,
  raw_text TEXT NOT NULL,
  detected_intent TEXT,
  target_agent TEXT,
  dispatch_status TEXT DEFAULT 'pending',
  dispatch_result JSONB,
  dispatched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.agent_command_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_command_queue" ON public.agent_command_queue FOR ALL USING (public.is_admin_user());

-- Sandbox
CREATE SCHEMA IF NOT EXISTS sandbox;

CREATE TABLE IF NOT EXISTS public.sandbox_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.ai_execution_requests(id),
  sql_statement TEXT NOT NULL,
  execution_mode TEXT DEFAULT 'dry_run',
  result JSONB,
  rows_affected INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  approved_for_production BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ
);
ALTER TABLE public.sandbox_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_sandbox" ON public.sandbox_executions FOR ALL USING (public.is_admin_user());

-- Agent Memory
CREATE TABLE IF NOT EXISTS public.agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_function TEXT NOT NULL,
  memory_type TEXT NOT NULL,
  content TEXT NOT NULL,
  importance INTEGER DEFAULT 5,
  tags TEXT[] DEFAULT '{}',
  reference_id UUID,
  expires_at TIMESTAMPTZ,
  recalled_count INTEGER DEFAULT 0,
  last_recalled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_agent_memory" ON public.agent_memory FOR SELECT USING (public.is_admin_user());
CREATE INDEX idx_agent_memory_function ON public.agent_memory(agent_function);
CREATE INDEX idx_agent_memory_type ON public.agent_memory(memory_type);
CREATE INDEX idx_agent_memory_importance ON public.agent_memory(importance DESC);

-- Orchestrator State
CREATE TABLE IF NOT EXISTS public.orchestrator_state (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  last_heartbeat TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'active',
  tick_count BIGINT DEFAULT 0,
  commands_processed BIGINT DEFAULT 0,
  schedules_triggered BIGINT DEFAULT 0,
  health_checks_run BIGINT DEFAULT 0,
  auto_executions BIGINT DEFAULT 0,
  errors_caught BIGINT DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);
ALTER TABLE public.orchestrator_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_orchestrator" ON public.orchestrator_state FOR SELECT USING (public.is_admin_user());
INSERT INTO public.orchestrator_state (id) VALUES ('singleton') ON CONFLICT (id) DO NOTHING;

-- Message Router Trigger
CREATE OR REPLACE FUNCTION public.fn_route_chat_command()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.human_sender_id IS NOT NULL 
     AND NEW.message_type IN ('text', 'command')
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_route_chat_command ON public.ai_chat_room;
CREATE TRIGGER trg_route_chat_command
  AFTER INSERT ON public.ai_chat_room
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_route_chat_command();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_command_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_health_checks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orchestrator_state;
