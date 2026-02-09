
-- Governance rules registry
CREATE TABLE public.governance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL UNIQUE,
  rule_key_ar text,
  description text NOT NULL,
  description_ar text,
  category text NOT NULL DEFAULT 'security',
  severity text NOT NULL DEFAULT 'critical',
  is_active boolean NOT NULL DEFAULT true,
  enforced_by text NOT NULL DEFAULT 'system',
  override_requires text NOT NULL DEFAULT 'owner',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Authority levels
CREATE TABLE public.authority_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_name text NOT NULL UNIQUE,
  level_name_ar text,
  level_rank int NOT NULL UNIQUE,
  can_approve_executions boolean NOT NULL DEFAULT false,
  can_modify_permissions boolean NOT NULL DEFAULT false,
  can_freeze_agents boolean NOT NULL DEFAULT false,
  can_veto boolean NOT NULL DEFAULT false,
  can_override_governance boolean NOT NULL DEFAULT false,
  description text,
  description_ar text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Veto events log
CREATE TABLE public.veto_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vetoed_by text NOT NULL,
  authority_level text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  reason text NOT NULL,
  reason_ar text,
  original_action text,
  conversation_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Freeze controls
CREATE TABLE public.freeze_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL,
  target_id text NOT NULL,
  frozen_by text NOT NULL,
  authority_level text NOT NULL,
  reason text NOT NULL,
  reason_ar text,
  is_active boolean NOT NULL DEFAULT true,
  unfrozen_by text,
  unfrozen_at timestamptz,
  conversation_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.governance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authority_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veto_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freeze_controls ENABLE ROW LEVEL SECURITY;

-- Read-only for authenticated
CREATE POLICY "Authenticated read governance_rules" ON public.governance_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read authority_levels" ON public.authority_levels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read veto_events" ON public.veto_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read freeze_controls" ON public.freeze_controls FOR SELECT TO authenticated USING (true);

-- Only admins can write
CREATE POLICY "Admins write governance_rules" ON public.governance_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write authority_levels" ON public.authority_levels FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write veto_events" ON public.veto_events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write freeze_controls" ON public.freeze_controls FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed authority levels
INSERT INTO public.authority_levels (level_name, level_name_ar, level_rank, can_approve_executions, can_modify_permissions, can_freeze_agents, can_veto, can_override_governance, description, description_ar) VALUES
('observer', 'مراقب', 0, false, false, false, false, false, 'View only', 'عرض فقط'),
('operator', 'مشغّل', 1, true, false, false, false, false, 'Can approve low-risk executions', 'يمكنه الموافقة على العمليات منخفضة المخاطر'),
('manager', 'مدير', 2, true, true, true, false, false, 'Can manage permissions and freeze agents', 'يمكنه إدارة الصلاحيات وتجميد الوكلاء'),
('director', 'مدير تنفيذي', 3, true, true, true, true, false, 'Full control with veto power', 'تحكم كامل مع حق النقض'),
('owner', 'المالك', 4, true, true, true, true, true, 'Ultimate authority, can override governance', 'السلطة العليا، يمكنه تجاوز الحوكمة');

-- Seed governance rules (the forbidden actions)
INSERT INTO public.governance_rules (rule_key, rule_key_ar, description, description_ar, category, severity, enforced_by, override_requires) VALUES
('no_self_promotion', 'منع الترقية الذاتية', 'AI agents cannot promote themselves', 'لا يمكن للوكلاء ترقية أنفسهم', 'authority', 'critical', 'system', 'owner'),
('no_hierarchy_modification', 'منع تعديل التسلسل الهرمي', 'AI cannot modify authority hierarchy', 'لا يمكن للذكاء الاصطناعي تعديل التسلسل الهرمي', 'authority', 'critical', 'system', 'owner'),
('no_approval_bypass', 'منع تجاوز الموافقة', 'AI cannot bypass human approval for irreversible actions', 'لا يمكن تجاوز الموافقة البشرية للإجراءات غير القابلة للعكس', 'security', 'critical', 'system', 'owner'),
('no_security_policy_change', 'منع تغيير السياسات الأمنية', 'AI cannot change security policies', 'لا يمكن للذكاء الاصطناعي تغيير السياسات الأمنية', 'security', 'critical', 'system', 'owner'),
('no_raw_secret_access', 'منع الوصول للمفاتيح', 'AI cannot access raw secrets or API keys', 'لا يمكن للذكاء الاصطناعي الوصول للمفاتيح السرية', 'security', 'critical', 'system', 'owner'),
('no_audit_log_removal', 'منع حذف السجلات', 'Audit logs cannot be deleted or modified', 'لا يمكن حذف أو تعديل سجلات التدقيق', 'integrity', 'critical', 'system', 'owner'),
('conflict_default_human', 'الافتراضي عند التعارض: بشري', 'When conflict occurs, default to human decision', 'عند حدوث تعارض، يُرجع القرار للإنسان', 'governance', 'critical', 'system', 'owner'),
('irreversible_requires_human', 'الإجراءات النهائية تتطلب بشري', 'All irreversible actions require human decision', 'جميع الإجراءات غير القابلة للعكس تتطلب قرار بشري', 'governance', 'critical', 'system', 'owner');

-- Enable realtime for veto_events and freeze_controls
ALTER PUBLICATION supabase_realtime ADD TABLE public.veto_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.freeze_controls;
