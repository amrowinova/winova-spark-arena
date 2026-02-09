
-- System-wide autonomy cap table
CREATE TABLE public.autonomy_caps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cap_key text NOT NULL UNIQUE,
  cap_key_ar text,
  max_auto_execute_level int NOT NULL DEFAULT 3,
  description text NOT NULL,
  description_ar text,
  set_by text NOT NULL DEFAULT 'owner',
  requires_human text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.autonomy_caps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read autonomy_caps" ON public.autonomy_caps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins write autonomy_caps" ON public.autonomy_caps FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed caps: owner-defined limits
INSERT INTO public.autonomy_caps (cap_key, cap_key_ar, max_auto_execute_level, description, description_ar, requires_human) VALUES
('global_cap', 'الحد الأقصى العام', 3, 'No agent can auto-execute above this level regardless of rank', 'لا يمكن لأي وكيل التنفيذ التلقائي فوق هذا المستوى بغض النظر عن الرتبة', '{}'),
('infrastructure', 'البنية التحتية', 99, 'Infrastructure changes always require human approval', 'تغييرات البنية التحتية تتطلب دائماً موافقة بشرية', '{"create_table","alter_schema","deploy_function","modify_storage","change_rls"}'),
('financial', 'العمليات المالية', 99, 'Financial operations always require human approval', 'العمليات المالية تتطلب دائماً موافقة بشرية', '{"adjust_balance","transfer_funds","escrow_release","wallet_freeze","ledger_write"}'),
('external_integrations', 'التكاملات الخارجية', 99, 'External API integrations always require human approval', 'التكاملات الخارجية تتطلب دائماً موافقة بشرية', '{"request_api_key","call_external_api","webhook_create","payment_gateway"}'),
('security_policies', 'السياسات الأمنية', 99, 'Security policy changes always require human approval', 'تغييرات السياسات الأمنية تتطلب دائماً موافقة بشرية', '{"modify_rls","change_role","update_governance","modify_auth"}'),
('agent_lifecycle', 'دورة حياة الوكلاء', 99, 'Agent creation/promotion/retirement always requires human approval', 'إنشاء/ترقية/تقاعد الوكلاء يتطلب دائماً موافقة بشرية', '{"create_agent","promote_agent","retire_agent","modify_trust_rules"}');

-- Add governance rule for autonomy cap
INSERT INTO public.governance_rules (rule_key, rule_key_ar, description, description_ar, category, severity, enforced_by, override_requires) VALUES
('autonomy_cap_enforced', 'فرض سقف الاستقلالية', 'No agent can exceed owner-defined autonomy cap even at highest rank', 'لا يمكن لأي وكيل تجاوز سقف الاستقلالية المحدد من المالك حتى بأعلى رتبة', 'authority', 'critical', 'system', 'owner');
