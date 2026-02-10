
-- System Incidents Monitor table
CREATE TABLE public.system_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id UUID,
  target_user_id UUID,
  actor_username TEXT,
  target_username TEXT,
  is_ghost BOOLEAN DEFAULT false,
  screen TEXT,
  feature TEXT,
  action_type TEXT NOT NULL,
  error_message TEXT,
  error_code TEXT,
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  category TEXT,
  endpoint TEXT,
  flow TEXT,
  root_cause TEXT,
  frequency INTEGER DEFAULT 1,
  latency_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast querying
CREATE INDEX idx_system_incidents_actor ON public.system_incidents(actor_user_id);
CREATE INDEX idx_system_incidents_severity ON public.system_incidents(severity);
CREATE INDEX idx_system_incidents_created ON public.system_incidents(created_at DESC);
CREATE INDEX idx_system_incidents_category ON public.system_incidents(category);
CREATE INDEX idx_system_incidents_is_ghost ON public.system_incidents(is_ghost);
CREATE INDEX idx_system_incidents_flow ON public.system_incidents(flow);

-- Enable RLS
ALTER TABLE public.system_incidents ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write
CREATE POLICY "Admins can read incidents"
  ON public.system_incidents FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service role can insert incidents"
  ON public.system_incidents FOR INSERT
  WITH CHECK (true);

-- Enable realtime for live monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_incidents;
