
-- =============================================
-- AI CHAT DELIVERY SYSTEM
-- Triggers for AI → DM alerts to admins
-- System user UUID: 00000000-0000-0000-0000-a10000000001
-- No profile needed — conversations/DMs have no FK to auth
-- =============================================

-- Store system user config in app_settings
INSERT INTO public.app_settings (key, value, description)
VALUES (
  'ai_system_user',
  '{"user_id": "00000000-0000-0000-0000-a10000000001", "name": "WINOVA Intelligence", "username": "ai.intelligence"}'::jsonb,
  'Virtual AI system user for delivering intelligence alerts via DM'
) ON CONFLICT (key) DO NOTHING;

-- 1. Get or create conversation between AI system user and any user
CREATE OR REPLACE FUNCTION public.get_or_create_ai_conversation(target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ai_uid uuid := '00000000-0000-0000-0000-a10000000001';
  conv_id uuid;
BEGIN
  SELECT id INTO conv_id FROM conversations
  WHERE (participant1_id = ai_uid AND participant2_id = target_user_id)
     OR (participant1_id = target_user_id AND participant2_id = ai_uid)
  LIMIT 1;

  IF conv_id IS NULL THEN
    INSERT INTO conversations (participant1_id, participant2_id, last_message_at)
    VALUES (ai_uid, target_user_id, now())
    RETURNING id INTO conv_id;
  END IF;

  RETURN conv_id;
END;
$$;

-- 2. Core: send formatted alert DM to all admins
CREATE OR REPLACE FUNCTION public.send_ai_alert_to_admins(
  p_title text,
  p_severity text,
  p_confidence integer,
  p_body text,
  p_action text,
  p_source_type text DEFAULT 'general'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ai_uid uuid := '00000000-0000-0000-0000-a10000000001';
  admin_rec record;
  conv_id uuid;
  emoji text;
  full_msg text;
  recent_dup integer;
BEGIN
  -- BUNDLING: skip if same title sent in last 5 min
  SELECT count(*) INTO recent_dup
  FROM direct_messages
  WHERE sender_id = ai_uid
    AND created_at > now() - interval '5 minutes'
    AND content LIKE '%' || left(p_title, 40) || '%';

  IF recent_dup > 0 THEN RETURN; END IF;

  emoji := CASE p_severity
    WHEN 'critical' THEN '🔴'
    WHEN 'high'     THEN '🟠'
    WHEN 'medium'   THEN '🟡'
    ELSE '🔵'
  END;

  full_msg := emoji || ' ' || p_title || E'\n'
    || 'Confidence: ' || p_confidence || '%' || E'\n\n'
    || p_body || E'\n\n'
    || '💡 Recommended:' || E'\n' || p_action;

  FOR admin_rec IN
    SELECT DISTINCT ur.user_id FROM user_roles ur WHERE ur.role = 'admin'
  LOOP
    IF admin_rec.user_id = ai_uid THEN CONTINUE; END IF;

    conv_id := get_or_create_ai_conversation(admin_rec.user_id);

    INSERT INTO direct_messages (conversation_id, sender_id, content, message_type)
    VALUES (conv_id, ai_uid, full_msg, 'system');

    UPDATE conversations SET last_message_at = now() WHERE id = conv_id;
  END LOOP;
END;
$$;

-- =============================================
-- TRIGGERS
-- =============================================

-- T1: Strategic insights (critical/high)
CREATE OR REPLACE FUNCTION public.trg_ai_insight_to_dm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.severity IN ('critical', 'high') THEN
    PERFORM send_ai_alert_to_admins(
      NEW.title, NEW.severity,
      COALESCE(NEW.confidence_score, 50),
      NEW.description || E'\n\nImpact:\n' || COALESCE(NEW.impact_estimation, 'Under analysis'),
      COALESCE(NEW.recommended_action, 'Review in Strategic Brain'),
      'insight'
    );
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_ai_insight_to_dm
AFTER INSERT ON public.ai_strategic_insights
FOR EACH ROW EXECUTE FUNCTION trg_ai_insight_to_dm();

-- T2: Priorities
CREATE OR REPLACE FUNCTION public.trg_ai_priority_to_dm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM send_ai_alert_to_admins(
    COALESCE(NEW.title, 'New AI Priority'),
    COALESCE(NEW.severity, 'medium'),
    COALESCE(NEW.confidence_score, 50),
    COALESCE(NEW.description, 'A new priority has been flagged.') || E'\n\nCategory: ' || COALESCE(NEW.category, 'general'),
    'Review in Control Tower',
    'priority'
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_ai_priority_to_dm
AFTER INSERT ON public.ai_priorities
FOR EACH ROW EXECUTE FUNCTION trg_ai_priority_to_dm();

-- T3: Failure spike (5+ same RPC in 10 min)
CREATE OR REPLACE FUNCTION public.trg_ai_failure_spike_to_dm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  fail_count integer;
  already_alerted integer;
  ai_uid uuid := '00000000-0000-0000-0000-a10000000001';
BEGIN
  SELECT count(*) INTO fail_count FROM ai_failures
  WHERE rpc_name = NEW.rpc_name AND created_at > now() - interval '10 minutes';

  IF fail_count >= 5 THEN
    SELECT count(*) INTO already_alerted FROM direct_messages
    WHERE sender_id = ai_uid AND created_at > now() - interval '10 minutes'
      AND content LIKE '%' || NEW.rpc_name || '%Failure Spike%';

    IF already_alerted = 0 THEN
      PERFORM send_ai_alert_to_admins(
        NEW.rpc_name || ' Failure Spike', 'critical', 92,
        fail_count || ' failures in last 10 minutes for ' || NEW.rpc_name
          || E'\n\nLatest error: ' || COALESCE(NEW.error_message, 'Unknown'),
        'Investigate ' || NEW.rpc_name || ' RPC immediately',
        'failure_spike'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_ai_failure_spike_to_dm
AFTER INSERT ON public.ai_failures
FOR EACH ROW EXECUTE FUNCTION trg_ai_failure_spike_to_dm();

-- T4: Engineer reports (with critical issues)
CREATE OR REPLACE FUNCTION public.trg_ai_engineer_report_to_dm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.critical_issues > 0 THEN
    PERFORM send_ai_alert_to_admins(
      'Engineer Report: ' || NEW.critical_issues || ' Critical Issues', 'high', 80,
      COALESCE(NEW.summary, 'Engineering analysis completed.')
        || E'\n\nScanned: ' || NEW.activities_scanned || ' activities, ' || NEW.failures_scanned || ' failures',
      'Review findings in Control Tower',
      'engineer_report'
    );
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_ai_engineer_report_to_dm
AFTER INSERT ON public.ai_engineer_reports
FOR EACH ROW EXECUTE FUNCTION trg_ai_engineer_report_to_dm();

-- T5: Product proposals
CREATE OR REPLACE FUNCTION public.trg_ai_product_proposal_to_dm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM send_ai_alert_to_admins(
    COALESCE(NEW.title, 'New Product Proposal'), 'medium',
    COALESCE(NEW.confidence_score, 50),
    COALESCE(NEW.description, 'A new product opportunity identified.')
      || E'\n\nType: ' || COALESCE(NEW.opportunity_type, 'general')
      || E'\nImpact: ' || COALESCE(NEW.estimated_impact, 'Under analysis'),
    'Review and approve in Strategic Brain',
    'product_proposal'
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_ai_product_proposal_to_dm
AFTER INSERT ON public.ai_product_proposals
FOR EACH ROW EXECUTE FUNCTION trg_ai_product_proposal_to_dm();

-- T6: Leadership questions
CREATE OR REPLACE FUNCTION public.trg_ai_question_to_dm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM send_ai_alert_to_admins(
    '❓ AI Needs Strategic Direction', 'high', 90,
    'Question: ' || NEW.question,
    'Respond in AI Control Room',
    'human_question'
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_ai_question_to_dm
AFTER INSERT ON public.ai_human_sessions
FOR EACH ROW EXECUTE FUNCTION trg_ai_question_to_dm();

-- T7: External knowledge (relevance > 80)
CREATE OR REPLACE FUNCTION public.trg_ai_external_knowledge_to_dm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.relevance_score, 0) > 80 THEN
    PERFORM send_ai_alert_to_admins(
      '🌐 ' || NEW.title, 'medium', NEW.relevance_score,
      left(NEW.content, 500)
        || E'\n\nSource: ' || NEW.source_name || COALESCE(' (' || NEW.source_category || ')', ''),
      'Review in Strategic Brain',
      'external_knowledge'
    );
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_ai_external_knowledge_to_dm
AFTER INSERT ON public.external_knowledge
FOR EACH ROW EXECUTE FUNCTION trg_ai_external_knowledge_to_dm();
