
-- Create shadow simulations table
CREATE TABLE public.ai_shadow_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES public.ai_execution_requests(id),
  proposal_id UUID REFERENCES public.ai_proposals(id),
  trigger_source TEXT NOT NULL DEFAULT 'execution_request',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  
  -- Snapshot
  snapshot_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot_tables TEXT[] NOT NULL DEFAULT '{}',
  
  -- Simulation config
  simulation_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  scenarios_run INTEGER NOT NULL DEFAULT 0,
  scenarios_passed INTEGER NOT NULL DEFAULT 0,
  scenarios_failed INTEGER NOT NULL DEFAULT 0,
  
  -- Results
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  success_delta NUMERIC DEFAULT 0,
  risk_delta NUMERIC DEFAULT 0,
  affected_systems TEXT[] NOT NULL DEFAULT '{}',
  financial_deviation NUMERIC DEFAULT 0,
  logical_deviations INTEGER DEFAULT 0,
  rollback_ready BOOLEAN NOT NULL DEFAULT false,
  
  -- CTO Report
  cto_report TEXT,
  cto_report_ar TEXT,
  verdict TEXT NOT NULL DEFAULT 'pending' CHECK (verdict IN ('pending', 'safe', 'risky', 'dangerous', 'blocked')),
  
  -- Timing
  duration_ms INTEGER,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.ai_shadow_simulations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins manage shadow simulations"
  ON public.ai_shadow_simulations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Auth insert shadow simulations"
  ON public.ai_shadow_simulations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Control room view shadow simulations"
  ON public.ai_shadow_simulations FOR SELECT
  USING (can_access_ai_control_room(auth.uid()));

CREATE POLICY "Support view shadow simulations"
  ON public.ai_shadow_simulations FOR SELECT
  USING (is_support_staff(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_shadow_simulations;

-- Add simulation_id to execution requests for linkage
ALTER TABLE public.ai_execution_requests 
  ADD COLUMN IF NOT EXISTS simulation_id UUID REFERENCES public.ai_shadow_simulations(id),
  ADD COLUMN IF NOT EXISTS simulation_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS simulation_verdict TEXT;
