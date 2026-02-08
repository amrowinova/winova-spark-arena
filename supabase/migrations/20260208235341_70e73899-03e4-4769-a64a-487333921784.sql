
-- ===========================================
-- AI Observability Tables (Phase 1)
-- ===========================================

-- Table 1: ai_activity_stream
CREATE TABLE public.ai_activity_stream (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  role text,
  action_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  duration_ms integer,
  success boolean,
  error_code text
);

-- Table 2: ai_money_flow
CREATE TABLE public.ai_money_flow (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  operation text NOT NULL,
  from_user uuid,
  to_user uuid,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'nova',
  reference_type text,
  reference_id uuid
);

-- Table 3: ai_failures
CREATE TABLE public.ai_failures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  rpc_name text NOT NULL,
  user_id uuid,
  error_message text,
  parameters jsonb
);

-- Enable RLS on all tables
ALTER TABLE public.ai_activity_stream ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_money_flow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_failures ENABLE ROW LEVEL SECURITY;

-- RLS: Only admins/support can read. Authenticated users can insert (for logging).
CREATE POLICY "Admins can read activity stream"
  ON public.ai_activity_stream FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert activity"
  ON public.ai_activity_stream FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can read money flow"
  ON public.ai_money_flow FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert money flow"
  ON public.ai_money_flow FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can read failures"
  ON public.ai_failures FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert failures"
  ON public.ai_failures FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Support staff can also read
CREATE POLICY "Support can read activity stream"
  ON public.ai_activity_stream FOR SELECT
  USING (is_support_staff(auth.uid()));

CREATE POLICY "Support can read money flow"
  ON public.ai_money_flow FOR SELECT
  USING (is_support_staff(auth.uid()));

CREATE POLICY "Support can read failures"
  ON public.ai_failures FOR SELECT
  USING (is_support_staff(auth.uid()));

-- Indexes for future AI queries
CREATE INDEX idx_ai_activity_stream_user ON public.ai_activity_stream (user_id, created_at DESC);
CREATE INDEX idx_ai_activity_stream_action ON public.ai_activity_stream (action_type, created_at DESC);
CREATE INDEX idx_ai_activity_stream_entity ON public.ai_activity_stream (entity_type, entity_id);
CREATE INDEX idx_ai_money_flow_operation ON public.ai_money_flow (operation, created_at DESC);
CREATE INDEX idx_ai_money_flow_users ON public.ai_money_flow (from_user, to_user);
CREATE INDEX idx_ai_money_flow_ref ON public.ai_money_flow (reference_type, reference_id);
CREATE INDEX idx_ai_failures_rpc ON public.ai_failures (rpc_name, created_at DESC);
CREATE INDEX idx_ai_failures_user ON public.ai_failures (user_id, created_at DESC);
