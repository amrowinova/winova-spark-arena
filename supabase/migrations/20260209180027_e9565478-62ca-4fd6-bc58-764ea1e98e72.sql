
-- Global emergency switches
CREATE TABLE public.emergency_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_key text NOT NULL UNIQUE,
  control_key_ar text,
  is_active boolean NOT NULL DEFAULT false,
  description text NOT NULL,
  description_ar text,
  activated_by text,
  activated_at timestamptz,
  deactivated_by text,
  deactivated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.emergency_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read emergency_controls" ON public.emergency_controls FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins write emergency_controls" ON public.emergency_controls FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.emergency_controls (control_key, control_key_ar, is_active, description, description_ar) VALUES
('FREEZE_EVOLUTION', 'تجميد التطور', false, 'Stops all learning, agent creation, training, skill acquisition, and evolution proposals', 'يوقف جميع عمليات التعلم وإنشاء الوكلاء والتدريب واكتساب المهارات ومقترحات التطور'),
('FREEZE_EXECUTION', 'تجميد التنفيذ', false, 'Stops all AI execution actions including autonomous and approved requests', 'يوقف جميع عمليات التنفيذ بما فيها التلقائية والموافق عليها'),
('KILL_ALL_AGENTS', 'إيقاف جميع الوكلاء', false, 'Instantly disables all active agents', 'يوقف جميع الوكلاء النشطين فوراً');

ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_controls;
