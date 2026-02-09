
-- ═══════════════════════════════════════════════════
-- AI SAFE EXECUTION ZONE
-- ═══════════════════════════════════════════════════

-- 1) Execution Permissions — what AI is allowed to do
CREATE TABLE IF NOT EXISTS public.ai_execution_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key text NOT NULL UNIQUE,
  permission_key_ar text,
  description text NOT NULL,
  description_ar text,
  category text NOT NULL DEFAULT 'general',
  max_risk_level text NOT NULL DEFAULT 'low',
  requires_approval boolean NOT NULL DEFAULT true,
  auto_execute_threshold integer NOT NULL DEFAULT 90,
  is_enabled boolean NOT NULL DEFAULT false,
  allowed_operations text[] NOT NULL DEFAULT '{}',
  cooldown_minutes integer NOT NULL DEFAULT 5,
  max_daily_executions integer NOT NULL DEFAULT 10,
  daily_executions_used integer NOT NULL DEFAULT 0,
  last_reset_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  granted_by uuid,
  CONSTRAINT valid_max_risk CHECK (max_risk_level IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT valid_category CHECK (category IN ('infra', 'performance', 'fraud', 'p2p', 'general'))
);

-- 2) Execution Requests — AI asks to do something
CREATE TABLE IF NOT EXISTS public.ai_execution_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_id uuid REFERENCES public.ai_execution_permissions(id),
  request_type text NOT NULL,
  title text NOT NULL,
  title_ar text,
  description text NOT NULL,
  description_ar text,
  risk_score integer NOT NULL DEFAULT 50,
  risk_level text NOT NULL DEFAULT 'medium',
  confidence_score integer NOT NULL DEFAULT 50,
  parameters jsonb NOT NULL DEFAULT '{}',
  rollback_plan text NOT NULL,
  rollback_plan_ar text,
  rollback_data jsonb DEFAULT '{}',
  estimated_impact text,
  estimated_impact_ar text,
  affected_entities text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamp with time zone,
  rejected_by uuid,
  rejected_at timestamp with time zone,
  rejection_reason text,
  expires_at timestamp with time zone DEFAULT (now() + interval '1 hour'),
  source_forecast_id uuid REFERENCES public.ai_forecasts(id),
  source_proposal_id uuid REFERENCES public.ai_proposals(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT valid_risk_level CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'executing', 'completed', 'failed', 'rolled_back', 'expired'))
);

-- 3) Execution Results — what happened
CREATE TABLE IF NOT EXISTS public.ai_execution_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.ai_execution_requests(id),
  execution_status text NOT NULL DEFAULT 'success',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  duration_ms integer,
  output jsonb DEFAULT '{}',
  error_message text,
  was_rolled_back boolean NOT NULL DEFAULT false,
  rolled_back_at timestamp with time zone,
  rollback_reason text,
  before_state jsonb DEFAULT '{}',
  after_state jsonb DEFAULT '{}',
  confidence_delta integer DEFAULT 0,
  human_feedback text,
  human_feedback_score integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT valid_exec_status CHECK (execution_status IN ('success', 'partial', 'failed', 'rolled_back')),
  CONSTRAINT valid_feedback_score CHECK (human_feedback_score IS NULL OR (human_feedback_score >= 1 AND human_feedback_score <= 5))
);

-- ═══════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════

ALTER TABLE public.ai_execution_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_execution_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_execution_results ENABLE ROW LEVEL SECURITY;

-- Permissions
CREATE POLICY "Admins manage execution permissions" ON public.ai_execution_permissions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Support view execution permissions" ON public.ai_execution_permissions FOR SELECT USING (is_support_staff(auth.uid()));
CREATE POLICY "Control room view permissions" ON public.ai_execution_permissions FOR SELECT USING (can_access_ai_control_room(auth.uid()));

-- Requests
CREATE POLICY "Admins manage execution requests" ON public.ai_execution_requests FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Support view execution requests" ON public.ai_execution_requests FOR SELECT USING (is_support_staff(auth.uid()));
CREATE POLICY "Control room view requests" ON public.ai_execution_requests FOR SELECT USING (can_access_ai_control_room(auth.uid()));
CREATE POLICY "Auth insert execution requests" ON public.ai_execution_requests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Results
CREATE POLICY "Admins manage execution results" ON public.ai_execution_results FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Support view execution results" ON public.ai_execution_results FOR SELECT USING (is_support_staff(auth.uid()));
CREATE POLICY "Control room view results" ON public.ai_execution_results FOR SELECT USING (can_access_ai_control_room(auth.uid()));
CREATE POLICY "Auth insert execution results" ON public.ai_execution_results FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ═══════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════

CREATE INDEX idx_exec_requests_status ON public.ai_execution_requests(status);
CREATE INDEX idx_exec_requests_risk ON public.ai_execution_requests(risk_level);
CREATE INDEX idx_exec_requests_permission ON public.ai_execution_requests(permission_id);
CREATE INDEX idx_exec_results_request ON public.ai_execution_results(request_id);
CREATE INDEX idx_exec_permissions_category ON public.ai_execution_permissions(category);

-- ═══════════════════════════════════════════════════
-- REALTIME
-- ═══════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_execution_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_execution_results;

-- ═══════════════════════════════════════════════════
-- SEED: Initial safe permissions (all disabled by default)
-- ═══════════════════════════════════════════════════

INSERT INTO public.ai_execution_permissions (permission_key, permission_key_ar, description, description_ar, category, max_risk_level, requires_approval, auto_execute_threshold, is_enabled, allowed_operations, cooldown_minutes, max_daily_executions) VALUES
('clear_stale_sessions', 'تنظيف الجلسات المنتهية', 'Remove expired user sessions older than 24h', 'حذف جلسات المستخدمين المنتهية منذ أكثر من 24 ساعة', 'infra', 'low', false, 95, false, ARRAY['delete_expired_sessions'], 30, 5),
('reset_daily_counters', 'إعادة تعيين العدادات اليومية', 'Reset daily execution counters at midnight', 'إعادة تعيين عدادات التنفيذ اليومية عند منتصف الليل', 'infra', 'low', false, 95, false, ARRAY['reset_counters'], 1440, 1),
('flag_suspicious_p2p', 'تعليم P2P مشبوه', 'Flag P2P orders with anomalous patterns for review', 'تعليم طلبات P2P ذات الأنماط المشبوهة للمراجعة', 'fraud', 'medium', true, 85, false, ARRAY['flag_order', 'add_review_note'], 10, 20),
('auto_expire_stale_orders', 'إنهاء الطلبات المتوقفة', 'Expire P2P orders that exceeded time limits', 'إنهاء طلبات P2P التي تجاوزت الحد الزمني', 'p2p', 'medium', true, 90, false, ARRAY['expire_order'], 15, 15),
('optimize_query_cache', 'تحسين ذاكرة الاستعلامات', 'Clear and rebuild query result caches', 'مسح وإعادة بناء ذاكرة نتائج الاستعلامات', 'performance', 'low', false, 90, false, ARRAY['clear_cache', 'rebuild_cache'], 60, 3),
('throttle_abuse_source', 'تقييد مصدر الإساءة', 'Rate-limit IPs or users showing abuse patterns', 'تقييد عناوين IP أو المستخدمين الذين يظهرون أنماط إساءة', 'fraud', 'high', true, 80, false, ARRAY['add_rate_limit'], 5, 10);
