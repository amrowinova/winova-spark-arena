-- ============================================================
-- NOTIFICATION SYSTEM: Scheduler and Processing RPCs
-- ============================================================

-- ── 1. Send Notification RPC ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.send_notification(
  p_user_id UUID,
  p_type TEXT,
  p_event TEXT,
  p_data JSONB DEFAULT '{}',
  p_channels TEXT[] DEFAULT ARRAY['in_app'],
  p_scheduled_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_settings RECORD;
  v_template RECORD;
  v_can_send BOOLEAN := FALSE;
  v_current_time TIMESTAMPTZ := now();
  v_scheduled_time TIMESTAMPTZ := COALESCE(p_scheduled_at, v_current_time);
BEGIN
  -- Get user notification settings
  SELECT * INTO v_user_settings
  FROM user_notification_settings
  WHERE user_id = p_user_id;

  -- Check if user exists and has settings
  IF NOT FOUND THEN
    -- Create default settings
    INSERT INTO user_notification_settings (user_id)
    VALUES (p_user_id);
    
    SELECT * INTO v_user_settings
    FROM user_notification_settings
    WHERE user_id = p_user_id;
  END IF;

  -- Check quiet hours
  IF v_user_settings.quiet_hours_enabled THEN
    -- Extract current time hour
    DECLARE v_current_hour INTEGER := EXTRACT(HOUR FROM v_current_time);
    DECLARE v_start_hour INTEGER := EXTRACT(HOUR FROM v_user_settings.quiet_hours_start);
    DECLARE v_end_hour INTEGER := EXTRACT(HOUR FROM v_user_settings.quiet_hours_end);
    
    -- Check if current time is in quiet hours range
    IF v_start_hour <= v_end_hour THEN
      -- Same day range (e.g., 22:00 to 08:00)
      IF v_current_hour >= v_start_hour AND v_current_hour < v_end_hour THEN
        RETURN FALSE; -- Skip due to quiet hours
      END IF;
    ELSE
      -- Overnight range (e.g., 22:00 to 08:00 next day)
      IF v_current_hour >= v_start_hour OR v_current_hour < v_end_hour THEN
        RETURN FALSE; -- Skip due to quiet hours
      END IF;
    END IF;
  END IF;

  -- Check frequency limits
  DECLARE v_today_count INTEGER;
  DECLARE v_hour_count INTEGER;
  
  -- Count notifications today
  SELECT COUNT(*) INTO v_today_count
  FROM notification_queue
  WHERE user_id = p_user_id
    AND DATE(created_at) = CURRENT_DATE
    AND status = 'sent';
    
  -- Count notifications this hour
  SELECT COUNT(*) INTO v_hour_count
  FROM notification_queue
  WHERE user_id = p_user_id
    AND created_at >= v_current_time - INTERVAL '1 hour'
    AND status = 'sent';

  IF v_today_count >= v_user_settings.daily_limit OR v_hour_count >= v_user_settings.hourly_limit THEN
    RETURN FALSE; -- Skip due to frequency limits
  END IF;

  -- Get notification template
  SELECT * INTO v_template
  FROM notification_templates
  WHERE type = p_type
    AND event = p_event
    AND is_active = TRUE
    AND language = COALESCE(
      (SELECT language FROM profiles WHERE id = p_user_id LIMIT 1),
      'en'
    )
  LIMIT 1;

  IF NOT FOUND THEN
    -- Try English template as fallback
    SELECT * INTO v_template
    FROM notification_templates
    WHERE type = p_type
      AND event = p_event
      AND is_active = TRUE
      AND language = 'en'
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RAISE WARNING 'No template found for %:%', p_type, p_event;
    RETURN FALSE;
  END IF;

  -- Check user preferences for this notification type
  CASE p_event
    WHEN 'contest_win' THEN
      IF NOT v_user_settings.contest_wins THEN RETURN FALSE; END IF;
    WHEN 'contest_reminder' THEN
      IF NOT v_user_settings.contest_reminders THEN RETURN FALSE; END IF;
    WHEN 'agent_request_received', 'agent_approved' THEN
      IF NOT v_user_settings.agent_requests THEN RETURN FALSE; END IF;
    WHEN 'donation_received' THEN
      IF NOT v_user_settings.donations_received THEN RETURN FALSE; END IF;
    WHEN 'giving_hour_reminder' THEN
      IF NOT v_user_settings.giving_hour_reminders THEN RETURN FALSE; END IF;
    WHEN 'team_member_joined' THEN
      IF NOT v_user_settings.team_activities THEN RETURN FALSE; END IF;
    WHEN 'p2p_order_created' THEN
      IF NOT v_user_settings.p2p_orders THEN RETURN FALSE; END IF;
  END CASE;

  -- Check channel preferences
  IF 'push' = ANY(p_channels) AND NOT v_user_settings.push_enabled THEN
    p_channels := array_remove(p_channels, 'push');
  END IF;
  
  IF 'email' = ANY(p_channels) AND NOT v_user_settings.email_enabled THEN
    p_channels := array_remove(p_channels, 'email');
  END IF;
  
  IF 'in_app' = ANY(p_channels) AND NOT v_user_settings.in_app_enabled THEN
    p_channels := array_remove(p_channels, 'in_app');
  END IF;

  IF array_length(p_channels, 1) IS NULL THEN
    RETURN FALSE; -- No channels available
  END IF;

  -- Add to notification queue
  INSERT INTO notification_queue (
    user_id, title, body, type, event, channels, 
    scheduled_at, data
  )
  VALUES (
    p_user_id,
    replace_variables(v_template.title, p_data),
    replace_variables(v_template.body, p_data),
    p_type,
    p_event,
    p_channels,
    v_scheduled_time,
    p_data
  );

  RETURN TRUE;
END;
$$;

-- ── 2. Variable Replacement Function ─────────────────────────────
CREATE OR REPLACE FUNCTION public.replace_variables(
  p_text TEXT,
  p_data JSONB
)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  -- Replace {{variable}} with actual values
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              p_text,
              '\{\{user_name\}\}', COALESCE(p_data->>'user_name', 'User'), 'g'
            ),
            '\{\{amount\}\}', COALESCE(p_data->>'amount', '0'), 'g'
          ),
          '\{\{prize_amount\}\}', COALESCE(p_data->>'prize_amount', '0'), 'g'
        ),
        '\{\{contest_name\}\}', COALESCE(p_data->>'contest_name', 'Contest'), 'g'
      ),
      '\{\{shop_name\}\}', COALESCE(p_data->>'shop_name', 'Shop'), 'g'
    ),
    '\{\{family_name\}\}', COALESCE(p_data->>'family_name', 'Family'), 'g'
  );
END;
$$;

-- ── 3. Process Notification Queue RPC ───────────────────────────
CREATE OR REPLACE FUNCTION public.process_notification_queue()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_processed_count INTEGER := 0;
  v_notification RECORD;
BEGIN
  -- Process pending notifications
  FOR v_notification IN 
    SELECT * FROM notification_queue
    WHERE status = 'pending'
      AND scheduled_at <= now()
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY scheduled_at ASC
    LIMIT 100
  LOOP
    -- Update status to sent
    UPDATE notification_queue
    SET status = 'sent',
        sent_at = now(),
        delivery_attempts = delivery_attempts + 1,
        last_attempt_at = now()
    WHERE id = v_notification.id;

    -- Log analytics
    INSERT INTO notification_analytics (notification_id, user_id, event)
    VALUES (v_notification.id, v_notification.user_id, 'sent');

    v_processed_count := v_processed_count + 1;
  END LOOP;

  -- Clean up old expired notifications
  DELETE FROM notification_queue
  WHERE status = 'expired'
    AND created_at < now() - INTERVAL '7 days';

  DELETE FROM notification_queue
  WHERE status = 'failed'
    AND delivery_attempts >= 3
    AND last_attempt_at < now() - INTERVAL '1 day';

  RETURN v_processed_count;
END;
$$;

-- ── 4. Track Notification Interaction RPC ─────────────────────────
CREATE OR REPLACE FUNCTION public.track_notification_interaction(
  p_notification_id UUID,
  p_event TEXT, -- 'opened', 'clicked', 'dismissed'
  p_device_info JSONB DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_notification RECORD;
BEGIN
  -- Get notification
  SELECT * INTO v_notification
  FROM notification_queue
  WHERE id = p_notification_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Insert analytics record
  INSERT INTO notification_analytics (
    notification_id, user_id, event, device_info, user_agent, ip_address
  )
  VALUES (
    p_notification_id, v_notification.user_id, p_event, 
    p_device_info, p_user_agent, p_ip_address
  );

  -- Update notification status based on event
  CASE p_event
    WHEN 'opened' THEN
      UPDATE notification_queue SET opened_at = now() WHERE id = p_notification_id;
    WHEN 'clicked' THEN
      UPDATE notification_queue SET clicked_at = now() WHERE id = p_notification_id;
  END CASE;

  RETURN TRUE;
END;
$$;

-- ── 5. Get Notification Analytics RPC ─────────────────────────────
CREATE OR REPLACE FUNCTION public.get_notification_analytics(
  p_user_id UUID DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  total_sent BIGINT,
  total_delivered BIGINT,
  total_opened BIGINT,
  total_clicked BIGINT,
  open_rate NUMERIC,
  click_rate NUMERIC,
  event_type TEXT,
  event_date DATE
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start_date DATE := CURRENT_DATE - p_days;
BEGIN
  RETURN QUERY
  WITH notification_events AS (
    SELECT 
      nq.user_id,
      nq.event,
      DATE(nq.created_at) as event_date,
      COUNT(*) FILTER (WHERE na.event = 'sent') as sent_count,
      COUNT(*) FILTER (WHERE na.event = 'delivered') as delivered_count,
      COUNT(*) FILTER (WHERE na.event = 'opened') as opened_count,
      COUNT(*) FILTER (WHERE na.event = 'clicked') as clicked_count
    FROM notification_queue nq
    LEFT JOIN notification_analytics na ON nq.id = na.notification_id
    WHERE DATE(nq.created_at) >= v_start_date
      AND (p_user_id IS NULL OR nq.user_id = p_user_id)
    GROUP BY nq.user_id, nq.event, DATE(nq.created_at)
  )
  SELECT 
    sent_count as total_sent,
    delivered_count as total_delivered,
    opened_count as total_opened,
    clicked_count as total_clicked,
    CASE 
      WHEN sent_count > 0 THEN (opened_count::NUMERIC / sent_count::NUMERIC) * 100 
      ELSE 0 
    END as open_rate,
    CASE 
      WHEN sent_count > 0 THEN (clicked_count::NUMERIC / sent_count::NUMERIC) * 100 
      ELSE 0 
    END as click_rate,
    event as event_type,
    event_date
  FROM notification_events
  ORDER BY event_date DESC, event_type;
END;
$$;

-- ── 6. Schedule Contest Reminders RPC ─────────────────────────────
CREATE OR REPLACE FUNCTION public.schedule_contest_reminders()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_scheduled_count INTEGER := 0;
  v_contest RECORD;
  v_participant RECORD;
BEGIN
  -- Find contests starting in the next 15 minutes
  FOR v_contest IN 
    SELECT * FROM contests
    WHERE start_time BETWEEN now() AND now() + INTERVAL '15 minutes'
      AND status = 'upcoming'
  LOOP
    -- Get all participants for this contest
    FOR v_participant IN 
      SELECT user_id FROM contest_participants
      WHERE contest_id = v_contest.id
    LOOP
      -- Schedule reminder notification
      IF send_notification(
        v_participant.user_id,
        'push',
        'contest_reminder',
        jsonb_build_object(
          'contest_name', v_contest.name,
          'minutes', '15'
        ),
        ARRAY['push', 'in_app'],
        v_contest.start_time - INTERVAL '15 minutes'
      ) THEN
        v_scheduled_count := v_scheduled_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN v_scheduled_count;
END;
$$;

-- ── 7. Schedule Giving Hour Reminders RPC ─────────────────────────
CREATE OR REPLACE FUNCTION public.schedule_giving_hour_reminders()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_scheduled_count INTEGER := 0;
  v_giving_hour RECORD;
  v_user RECORD;
BEGIN
  -- Find next giving hour
  SELECT * INTO v_giving_hour
  FROM giving_hours
  WHERE start_time > now()
    AND status = 'active'
  ORDER BY start_time ASC
  LIMIT 1;

  IF FOUND THEN
    -- Get all users who have giving hour reminders enabled
    FOR v_user IN 
      SELECT user_id FROM user_notification_settings
      WHERE giving_hour_reminders = TRUE
    LOOP
      -- Schedule reminder notification
      IF send_notification(
        v_user.user_id,
        'push',
        'giving_hour_reminder',
        jsonb_build_object(
          'minutes', '15'
        ),
        ARRAY['push', 'in_app'],
        v_giving_hour.start_time - INTERVAL '15 minutes'
      ) THEN
        v_scheduled_count := v_scheduled_count + 1;
      END IF;
    END LOOP;
  END IF;

  RETURN v_scheduled_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.send_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_notification_queue TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_notification_interaction TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_notification_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_contest_reminders TO authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_giving_hour_reminders TO authenticated;
