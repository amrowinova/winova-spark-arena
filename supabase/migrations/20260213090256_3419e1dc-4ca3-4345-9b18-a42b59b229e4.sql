
-- Fix search_path on the 6-param overload of send_ai_alert_to_admins
-- and all 7 trigger functions

-- Drop and recreate the 6-param overload with search_path
CREATE OR REPLACE FUNCTION public.send_ai_alert_to_admins(p_title text, p_severity text, p_confidence integer, p_body text, p_action text, p_type text DEFAULT 'general'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  ai_uid uuid := '00000000-0000-0000-0000-a10000000001';
  admin_rec record;
  conv_id uuid;
  sev_indicator text;
  full_msg text;
  recent_dup integer;
BEGIN
  SELECT count(*) INTO recent_dup
  FROM direct_messages
  WHERE sender_id = ai_uid
    AND created_at > now() - interval '5 minutes'
    AND content LIKE '%' || left(p_title, 40) || '%';

  IF recent_dup > 0 THEN RETURN; END IF;

  sev_indicator := CASE p_severity
    WHEN 'critical' THEN '🔴 CRITICAL'
    WHEN 'high'     THEN '🟠 HIGH'
    WHEN 'medium'   THEN '🟡 MEDIUM'
    ELSE '🔵 LOW'
  END;

  full_msg :=
    '━━━━━━━━━━━━━━━━━━━━━━' || E'\n'
    || sev_indicator || ' │ ' || p_title || E'\n'
    || '━━━━━━━━━━━━━━━━━━━━━━' || E'\n\n'
    || '📊 Confidence: ' || p_confidence || '%' || E'\n\n'
    || '📋 What happened:' || E'\n'
    || p_body || E'\n\n'
    || '⚠️ Why this matters:' || E'\n'
    || CASE p_type
        WHEN 'failure_spike' THEN 'Service degradation directly impacts active users.'
        WHEN 'insight' THEN 'Strategic intelligence requires timely review.'
        WHEN 'priority' THEN 'Ranked by Executive Brain as requiring attention.'
        WHEN 'engineer_report' THEN 'Technical issues left unaddressed compound over time.'
        WHEN 'product_proposal' THEN 'Market opportunities have a limited window.'
        WHEN 'human_question' THEN 'AI has reached a decision boundary requiring human judgment.'
        WHEN 'external_knowledge' THEN 'External intelligence with high relevance detected.'
        ELSE 'Flagged by AI system as requiring leadership awareness.'
      END || E'\n\n'
    || '🔧 Recommended actions:' || E'\n'
    || p_action || E'\n\n'
    || '⏱️ AI does NOT execute. Awaiting your decision.';

  FOR admin_rec IN SELECT user_id FROM user_roles WHERE role = 'admin' LOOP
    SELECT id INTO conv_id FROM conversations
    WHERE (participant1_id = ai_uid AND participant2_id = admin_rec.user_id)
       OR (participant1_id = admin_rec.user_id AND participant2_id = ai_uid)
    LIMIT 1;

    IF conv_id IS NULL THEN
      INSERT INTO conversations (participant1_id, participant2_id) VALUES (ai_uid, admin_rec.user_id) RETURNING id INTO conv_id;
    END IF;

    INSERT INTO direct_messages (conversation_id, sender_id, content, message_type) VALUES (conv_id, ai_uid, full_msg, 'system');
    UPDATE conversations SET last_message_at = now() WHERE id = conv_id;
  END LOOP;
END;
$function$;

-- Fix all 7 trigger functions with SET search_path = public

CREATE OR REPLACE FUNCTION public.trg_ai_engineer_report_to_dm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
  IF NEW.critical_issues > 0 THEN
    PERFORM send_ai_alert_to_admins(
      'Engineer Report: ' || NEW.critical_issues || ' Critical Issues', 'high', 80,
      'Activities scanned: ' || NEW.activities_scanned || ' │ Failures: ' || NEW.failures_scanned || ' │ Money flows: ' || NEW.money_flows_scanned || E'\nFindings: ' || NEW.findings_count || ' │ Patches proposed: ' || NEW.patches_proposed || E'\n\n' || COALESCE(NEW.summary, 'Engineering analysis completed.'),
      '1. Review all proposed patches in Control Tower' || E'\n2. Approve safe patches for deployment' || E'\n3. Escalate critical findings to engineering lead',
      'engineer_report');
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_ai_external_knowledge_to_dm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
  IF COALESCE(NEW.relevance_score, 0) > 80 THEN
    PERFORM send_ai_alert_to_admins(
      '🌐 ' || NEW.title, 'medium', NEW.relevance_score,
      'Source: ' || NEW.source_name || ' (' || COALESCE(NEW.source_category, 'general') || ')' || CASE WHEN NEW.source_url IS NOT NULL THEN E'\n🔗 ' || NEW.source_url ELSE '' END || E'\nTags: ' || COALESCE(array_to_string(NEW.tags, ', '), 'none') || E'\n\n' || left(NEW.content, 600),
      '1. Review full intelligence in Strategic Brain' || E'\n2. Assess applicability to WINOVA' || E'\n3. Flag for deeper investigation if relevant',
      'external_knowledge');
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_ai_failure_spike_to_dm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  fail_count integer;
  already_alerted integer;
  ai_uid uuid := '00000000-0000-0000-0000-a10000000001';
  unique_errors text;
BEGIN
  SELECT count(*) INTO fail_count FROM ai_failures WHERE rpc_name = NEW.rpc_name AND created_at > now() - interval '10 minutes';
  IF fail_count >= 5 THEN
    SELECT count(*) INTO already_alerted FROM direct_messages WHERE sender_id = ai_uid AND created_at > now() - interval '10 minutes' AND content LIKE '%' || NEW.rpc_name || '%Failure Spike%';
    IF already_alerted = 0 THEN
      SELECT string_agg(DISTINCT left(error_message, 80), E'\n• ') INTO unique_errors FROM ai_failures WHERE rpc_name = NEW.rpc_name AND created_at > now() - interval '10 minutes';
      PERFORM send_ai_alert_to_admins(
        NEW.rpc_name || ' Failure Spike', 'critical', 92,
        'Failures in last 10 min: ' || fail_count || E'\nRPC: ' || NEW.rpc_name || E'\n\n🧾 Unique errors:' || E'\n• ' || COALESCE(unique_errors, 'Unknown'),
        '1. Check ' || NEW.rpc_name || ' function logs' || E'\n2. Verify database connectivity' || E'\n3. Review recent code deployments' || E'\n4. Check for parameter validation issues',
        'failure_spike');
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_ai_insight_to_dm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
  IF NEW.severity IN ('critical', 'high') THEN
    PERFORM send_ai_alert_to_admins(
      NEW.title, NEW.severity, COALESCE(NEW.confidence_score, 50),
      'Category: ' || NEW.category || ' │ Type: ' || NEW.insight_type || E'\n\n' || NEW.description || E'\n\n📈 Impact estimation:\n' || COALESCE(NEW.impact_estimation, 'Under analysis') || E'\n\n🔗 Source knowledge IDs: ' || COALESCE(array_to_string(NEW.source_knowledge_ids, ', '), 'N/A'),
      COALESCE(NEW.recommended_action, 'Review in Strategic Brain → Insights tab'),
      'insight');
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_ai_priority_to_dm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
  PERFORM send_ai_alert_to_admins(
    COALESCE(NEW.title, 'New AI Priority'), COALESCE(NEW.severity, 'medium'), COALESCE(NEW.confidence_score, 50),
    'Category: ' || COALESCE(NEW.category, 'general') || ' │ Source: ' || COALESCE(NEW.source, 'unknown') || ' │ Impact: ' || COALESCE(NEW.estimated_impact, 'N/A') || E'\n\n' || COALESCE(NEW.description, 'A new priority has been flagged by the Executive Brain.') || CASE WHEN NEW.reference_id IS NOT NULL THEN E'\n\n🔗 Reference: ' || NEW.reference_id ELSE '' END,
    'Review in Control Tower → Priorities',
    'priority');
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_ai_product_proposal_to_dm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
  PERFORM send_ai_alert_to_admins(
    COALESCE(NEW.title, 'New Product Proposal'), 'medium', COALESCE(NEW.confidence_score, 50),
    'Opportunity type: ' || COALESCE(NEW.opportunity_type, 'general') || ' │ Impact: ' || COALESCE(NEW.estimated_impact, 'N/A') || ' │ Based on: ' || COALESCE(NEW.based_on_events::text, '0') || ' events' || E'\n\n' || COALESCE(NEW.description, 'A new product opportunity identified.'),
    '1. Evaluate business case in Strategic Brain' || E'\n2. Assess resource requirements' || E'\n3. Approve, defer, or archive',
    'product_proposal');
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_ai_question_to_dm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
  PERFORM send_ai_alert_to_admins(
    '❓ AI Needs Strategic Direction', 'high', 90,
    'Question:' || E'\n' || NEW.question || E'\n\nResponse mode: ' || COALESCE(NEW.response_mode, 'sequential'),
    '1. Open AI Control Room' || E'\n2. Read full context from all agents' || E'\n3. Provide your strategic direction',
    'human_question');
  RETURN NEW;
END; $function$;
