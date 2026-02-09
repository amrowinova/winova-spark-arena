
-- ═══════════════════════════════════════════════════════
-- PHASE 2: Execution Tasks & Decision History
-- ═══════════════════════════════════════════════════════

-- Task status enum
CREATE TYPE public.execution_task_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'cancelled');

-- Decision type enum
CREATE TYPE public.ai_decision_type AS ENUM ('approve', 'defer', 'reject');

-- ─── execution_tasks ──────────────────────────────────
CREATE TABLE public.execution_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_ar text,
  description text,
  description_ar text,
  category text NOT NULL DEFAULT 'general',
  severity text DEFAULT 'medium',
  status execution_task_status NOT NULL DEFAULT 'pending',
  assigned_to uuid,
  created_by uuid NOT NULL,
  source_message_id uuid,
  source_alert_type text,
  conversation_id uuid,
  progress_notes text,
  completion_report text,
  completion_report_ar text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

ALTER TABLE public.execution_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage execution_tasks"
  ON public.execution_tasks FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Support can view execution_tasks"
  ON public.execution_tasks FOR SELECT
  USING (is_support_staff(auth.uid()));

-- ─── decision_history ─────────────────────────────────
CREATE TABLE public.decision_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  conversation_id uuid,
  decision ai_decision_type NOT NULL,
  decided_by uuid NOT NULL,
  reason text,
  alert_title text,
  alert_type text,
  alert_severity text,
  task_id uuid REFERENCES public.execution_tasks(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.decision_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage decision_history"
  ON public.decision_history FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Support can view decision_history"
  ON public.decision_history FOR SELECT
  USING (is_support_staff(auth.uid()));

-- ─── updated_at trigger ──────────────────────────────
CREATE TRIGGER update_execution_tasks_updated_at
  BEFORE UPDATE ON public.execution_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Send status updates back to DM on task changes ──
CREATE OR REPLACE FUNCTION trg_execution_task_status_to_dm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ai_uid uuid := '00000000-0000-0000-0000-a10000000001';
  conv_id uuid;
  status_emoji text;
  status_label text;
  msg text;
BEGIN
  -- Only fire on status change
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  status_emoji := CASE NEW.status
    WHEN 'in_progress' THEN '🔄'
    WHEN 'completed'   THEN '✅'
    WHEN 'failed'      THEN '❌'
    WHEN 'cancelled'   THEN '⏹️'
    ELSE '📋'
  END;

  status_label := CASE NEW.status
    WHEN 'in_progress' THEN 'IN PROGRESS'
    WHEN 'completed'   THEN 'COMPLETED'
    WHEN 'failed'      THEN 'FAILED'
    WHEN 'cancelled'   THEN 'CANCELLED'
    ELSE upper(NEW.status::text)
  END;

  msg := status_emoji || ' Task Update: ' || status_label || E'\n'
    || '━━━━━━━━━━━━━━━━━━━━━━' || E'\n\n'
    || '📋 ' || NEW.title || E'\n'
    || 'Category: ' || NEW.category || E'\n\n';

  IF NEW.status = 'completed' AND NEW.completion_report IS NOT NULL THEN
    msg := msg || '📊 Completion Report:' || E'\n' || NEW.completion_report || E'\n\n';
  END IF;

  IF NEW.status = 'failed' AND NEW.progress_notes IS NOT NULL THEN
    msg := msg || '⚠️ Failure Notes:' || E'\n' || NEW.progress_notes || E'\n\n';
  END IF;

  msg := msg || '⏱️ Updated: ' || to_char(now(), 'YYYY-MM-DD HH24:MI');

  -- Send to the original conversation if available
  IF NEW.conversation_id IS NOT NULL THEN
    INSERT INTO direct_messages (conversation_id, sender_id, content, message_type)
    VALUES (NEW.conversation_id, ai_uid, msg, 'system');
    UPDATE conversations SET last_message_at = now() WHERE id = NEW.conversation_id;
  ELSE
    -- Send to all admins
    FOR conv_id IN SELECT DISTINCT get_or_create_ai_conversation(ur.user_id)
      FROM user_roles ur WHERE ur.role = 'admin' AND ur.user_id != ai_uid
    LOOP
      INSERT INTO direct_messages (conversation_id, sender_id, content, message_type)
      VALUES (conv_id, ai_uid, msg, 'system');
      UPDATE conversations SET last_message_at = now() WHERE id = conv_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_execution_task_status_update
  AFTER UPDATE ON public.execution_tasks
  FOR EACH ROW EXECUTE FUNCTION trg_execution_task_status_to_dm();

-- ─── Learning loop: log outcomes to knowledge_memory ──
CREATE OR REPLACE FUNCTION trg_decision_to_knowledge()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO knowledge_memory (event_type, source, area, reference_id, payload)
  VALUES (
    'leadership_decision',
    'admin',
    COALESCE(NEW.alert_type, 'general'),
    NEW.id::text,
    jsonb_build_object(
      'decision', NEW.decision,
      'alert_title', NEW.alert_title,
      'alert_type', NEW.alert_type,
      'alert_severity', NEW.alert_severity,
      'reason', NEW.reason,
      'decided_by', NEW.decided_by,
      'task_created', NEW.task_id IS NOT NULL
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_decision_learning_loop
  AFTER INSERT ON public.decision_history
  FOR EACH ROW EXECUTE FUNCTION trg_decision_to_knowledge();

-- ─── Enable realtime for execution_tasks ──────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.execution_tasks;
