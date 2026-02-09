
-- Drop old function first (parameter name changed)
DROP FUNCTION IF EXISTS send_ai_alert_to_admins(text,text,integer,text,text,text);

-- Recreate with upgraded executive-grade formatting
CREATE OR REPLACE FUNCTION send_ai_alert_to_admins(
  p_title text,
  p_severity text,
  p_confidence integer,
  p_body text,
  p_action text,
  p_type text DEFAULT 'general'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
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
        WHEN 'failure_spike' THEN 'Service degradation directly impacts active users and transaction completion rates. Continued failures risk user churn and financial loss.'
        WHEN 'insight' THEN 'Strategic intelligence requires timely leadership review. Delayed response may result in missed competitive advantage or unmitigated risk.'
        WHEN 'priority' THEN 'This item has been ranked by the Executive Brain as requiring attention based on cross-system analysis of all AI subsystems.'
        WHEN 'engineer_report' THEN 'Technical issues left unaddressed compound over time. Critical findings indicate potential system instability or data integrity risk.'
        WHEN 'product_proposal' THEN 'Market opportunities have a limited window. Early action on validated proposals maximizes competitive positioning.'
        WHEN 'human_question' THEN 'AI has reached a decision boundary that requires human judgment. Progress on dependent tasks is blocked until guidance is provided.'
        WHEN 'external_knowledge' THEN 'External intelligence with high relevance detected. Industry patterns may directly apply to WINOVA operations and risk posture.'
        ELSE 'This alert has been flagged by the AI system as requiring leadership awareness.'
      END || E'\n\n'
    || '🔧 Recommended actions:' || E'\n'
    || p_action || E'\n\n'
    || '🗳️ Decision required:' || E'\n'
    || CASE p_type
        WHEN 'failure_spike' THEN '→ Approve emergency investigation' || E'\n' || '→ Escalate to on-call engineer' || E'\n' || '→ Monitor and wait for auto-resolution'
        WHEN 'insight' THEN '→ Approve recommended action' || E'\n' || '→ Request deeper analysis' || E'\n' || '→ Dismiss as non-applicable'
        WHEN 'priority' THEN '→ Approve and assign for execution' || E'\n' || '→ Defer to next review cycle' || E'\n' || '→ Reject with reasoning'
        WHEN 'engineer_report' THEN '→ Approve proposed patches' || E'\n' || '→ Request manual code review' || E'\n' || '→ Acknowledge and monitor'
        WHEN 'product_proposal' THEN '→ Greenlight for development' || E'\n' || '→ Request MVP scope reduction' || E'\n' || '→ Archive for future consideration'
        WHEN 'human_question' THEN '→ Provide strategic direction' || E'\n' || '→ Delegate to domain expert' || E'\n' || '→ Request AI to re-analyze with constraints'
        WHEN 'external_knowledge' THEN '→ Apply findings to WINOVA roadmap' || E'\n' || '→ Flag for deeper investigation' || E'\n' || '→ Note as informational only'
        ELSE '→ Review and take appropriate action'
      END || E'\n\n'
    || '⏱️ AI does NOT execute. Awaiting your decision.';

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


-- ═══════════════════════════════════════════════════════
-- UPGRADE all 7 trigger callers with richer metrics
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION trg_ai_insight_to_dm() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.severity IN ('critical', 'high') THEN
    PERFORM send_ai_alert_to_admins(
      NEW.title, NEW.severity, COALESCE(NEW.confidence_score, 50),
      'Category: ' || NEW.category || ' │ Type: ' || NEW.insight_type || E'\n\n'
        || NEW.description
        || E'\n\n📈 Impact estimation:\n' || COALESCE(NEW.impact_estimation, 'Under analysis')
        || E'\n\n🔗 Source knowledge IDs: ' || COALESCE(array_to_string(NEW.source_knowledge_ids, ', '), 'N/A'),
      COALESCE(NEW.recommended_action, 'Review in Strategic Brain → Insights tab'),
      'insight'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_ai_priority_to_dm() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM send_ai_alert_to_admins(
    COALESCE(NEW.title, 'New AI Priority'), COALESCE(NEW.severity, 'medium'), COALESCE(NEW.confidence_score, 50),
    'Category: ' || COALESCE(NEW.category, 'general')
      || ' │ Source: ' || COALESCE(NEW.source, 'unknown')
      || ' │ Impact: ' || COALESCE(NEW.estimated_impact, 'N/A')
      || E'\n\n' || COALESCE(NEW.description, 'A new priority has been flagged by the Executive Brain.')
      || CASE WHEN NEW.reference_id IS NOT NULL THEN E'\n\n🔗 Reference: ' || NEW.reference_id ELSE '' END,
    'Review in Control Tower → Priorities',
    'priority'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_ai_failure_spike_to_dm() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  fail_count integer;
  already_alerted integer;
  ai_uid uuid := '00000000-0000-0000-0000-a10000000001';
  unique_errors text;
BEGIN
  SELECT count(*) INTO fail_count FROM ai_failures
  WHERE rpc_name = NEW.rpc_name AND created_at > now() - interval '10 minutes';

  IF fail_count >= 5 THEN
    SELECT count(*) INTO already_alerted FROM direct_messages
    WHERE sender_id = ai_uid AND created_at > now() - interval '10 minutes'
      AND content LIKE '%' || NEW.rpc_name || '%Failure Spike%';

    IF already_alerted = 0 THEN
      SELECT string_agg(DISTINCT left(error_message, 80), E'\n• ') INTO unique_errors
      FROM ai_failures WHERE rpc_name = NEW.rpc_name AND created_at > now() - interval '10 minutes';

      PERFORM send_ai_alert_to_admins(
        NEW.rpc_name || ' Failure Spike', 'critical', 92,
        'Failures in last 10 min: ' || fail_count || E'\n'
          || 'RPC: ' || NEW.rpc_name || E'\n\n'
          || '🧾 Unique errors:' || E'\n• ' || COALESCE(unique_errors, 'Unknown'),
        '1. Check ' || NEW.rpc_name || ' function logs' || E'\n'
          || '2. Verify database connectivity' || E'\n'
          || '3. Review recent code deployments' || E'\n'
          || '4. Check for parameter validation issues',
        'failure_spike'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_ai_engineer_report_to_dm() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.critical_issues > 0 THEN
    PERFORM send_ai_alert_to_admins(
      'Engineer Report: ' || NEW.critical_issues || ' Critical Issues', 'high', 80,
      'Activities scanned: ' || NEW.activities_scanned
        || ' │ Failures: ' || NEW.failures_scanned
        || ' │ Money flows: ' || NEW.money_flows_scanned || E'\n'
        || 'Findings: ' || NEW.findings_count || ' │ Patches proposed: ' || NEW.patches_proposed || E'\n\n'
        || COALESCE(NEW.summary, 'Engineering analysis completed.'),
      '1. Review all proposed patches in Control Tower' || E'\n'
        || '2. Approve safe patches for deployment' || E'\n'
        || '3. Escalate critical findings to engineering lead',
      'engineer_report'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_ai_product_proposal_to_dm() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM send_ai_alert_to_admins(
    COALESCE(NEW.title, 'New Product Proposal'), 'medium', COALESCE(NEW.confidence_score, 50),
    'Opportunity type: ' || COALESCE(NEW.opportunity_type, 'general')
      || ' │ Impact: ' || COALESCE(NEW.estimated_impact, 'N/A')
      || ' │ Based on: ' || COALESCE(NEW.based_on_events::text, '0') || ' events' || E'\n\n'
      || COALESCE(NEW.description, 'A new product opportunity identified.'),
    '1. Evaluate business case in Strategic Brain' || E'\n'
      || '2. Assess resource requirements' || E'\n'
      || '3. Approve, defer, or archive',
    'product_proposal'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_ai_question_to_dm() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM send_ai_alert_to_admins(
    '❓ AI Needs Strategic Direction', 'high', 90,
    'Question:' || E'\n' || NEW.question || E'\n\nResponse mode: ' || COALESCE(NEW.response_mode, 'sequential'),
    '1. Open AI Control Room' || E'\n'
      || '2. Read full context from all agents' || E'\n'
      || '3. Provide your strategic direction',
    'human_question'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_ai_external_knowledge_to_dm() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF COALESCE(NEW.relevance_score, 0) > 80 THEN
    PERFORM send_ai_alert_to_admins(
      '🌐 ' || NEW.title, 'medium', NEW.relevance_score,
      'Source: ' || NEW.source_name || ' (' || COALESCE(NEW.source_category, 'general') || ')'
        || CASE WHEN NEW.source_url IS NOT NULL THEN E'\n🔗 ' || NEW.source_url ELSE '' END
        || E'\nTags: ' || COALESCE(array_to_string(NEW.tags, ', '), 'none') || E'\n\n'
        || left(NEW.content, 600),
      '1. Review full intelligence in Strategic Brain → Learnings' || E'\n'
        || '2. Assess applicability to WINOVA' || E'\n'
        || '3. Flag for deeper investigation if relevant',
      'external_knowledge'
    );
  END IF;
  RETURN NEW;
END;
$$;
