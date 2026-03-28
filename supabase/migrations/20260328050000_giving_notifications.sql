-- Giving System Notifications Migration
-- Add notification templates and settings for the giving system

-- Insert notification templates for giving system
INSERT INTO notification_templates (event_type, language, title_template, message_template, icon, action_url) VALUES
-- Donation confirmation to donor
('donation_confirmation', 'en', 'Thank you for your donation!', 'You donated {{amount}} Nova to {{family_name}}. Thank you for your generosity!', 'heart', '/my-impact'),
('donation_confirmation', 'ar', 'شكراً لتبرعك!', 'تبرعت بمبلغ {{amount}} Nova لـ {{family_name}}. شكراً لكرمك!', 'heart', '/my-impact'),

-- Donation received notification to family
('donation_received', 'en', 'New Donation Received!', 'You received a donation of {{amount}} Nova from {{donor_name}}. Thank you for trusting us!', 'heart', '/giving/thank-you'),
('donation_received', 'ar', 'استلمت تبرعاً جديداً!', 'استلمت تبرعاً بمبلغ {{amount}} Nova من {{donor_name}}. شكراً لثقتك!', 'heart', '/giving/thank-you'),

-- Goal achieved notification
('goal_achieved', 'en', 'Goal Achieved! 🎉', 'Congratulations! Your family goal of {{goal_amount}} Nova has been achieved. Thank you to all donors!', 'target', '/giving/goals'),
('goal_achieved', 'ar', 'تم تحقيق الهدف! 🎉', 'مبارك! تم تحقيق هدف عائلتك البالغ {{goal_amount}} Nova. شكراً لجميع المتبرعين!', 'target', '/giving/goals'),

-- Goal deadline warning
('goal_deadline_warning', 'en', 'Goal Deadline Approaching', 'Your donation goal deadline is in {{days_left}} days. {{progress_percentage}}% achieved so far!', 'alert', '/giving/goals'),
('goal_deadline_warning', 'ar', 'موعد الهدف يقترب', 'موعد هدف التبرع المتبقي {{days_left}} أيام. تم تحقيق {{progress_percentage}}% حتى الآن!', 'alert', '/giving/goals'),

-- Thank you message received
('thank_you_received', 'en', 'Thank You Message Received', '{{family_name}} sent you a thank you message. View it now!', 'message', '/giving/share/{{share_token}}'),
('thank_you_received', 'ar', 'استلمت رسالة شكر', '{{family_name}} أرسل لك رسالة شكر. شاهدها الآن!', 'message', '/giving/share/{{share_token}}');

-- Add notification types to user_notification_settings
ALTER TABLE user_notification_settings 
ADD COLUMN IF NOT EXISTS donation_confirmations BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS goal_achievements BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS deadline_warnings BOOLEAN NOT NULL DEFAULT true;

-- Create RPC for sending donation notifications
CREATE OR REPLACE FUNCTION send_donation_notifications(
  p_donor_id UUID,
  p_family_id UUID,
  p_amount DECIMAL,
  p_anonymous BOOLEAN DEFAULT false,
  p_donor_name TEXT DEFAULT NULL,
  p_share_token TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_family_user_id UUID;
  v_family_name TEXT;
  v_donor_display_name TEXT;
BEGIN
  -- Get family user_id and name
  SELECT user_id, head_name INTO v_family_user_id, v_family_name
  FROM families
  WHERE id = p_family_id;
  
  IF v_family_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Set donor display name
  v_donor_display_name := CASE 
    WHEN p_anonymous THEN 'Anonymous'
    WHEN p_donor_name IS NOT NULL THEN p_donor_name
    ELSE 'Generous Donor'
  END;
  
  -- Send notification to donor
  INSERT INTO notification_queue (
    user_id, type, title, message, data, scheduled_at
  ) VALUES (
    p_donor_id,
    'donation_confirmation',
    'Thank you for your donation!',
    format('You donated %s Nova to %s. Thank you for your generosity!', p_amount, v_family_name),
    json_build_object(
      'family_id', p_family_id,
      'amount', p_amount,
      'share_token', p_share_token
    ),
    NOW()
  );
  
  -- Send notification to family (if different from donor)
  IF v_family_user_id != p_donor_id THEN
    INSERT INTO notification_queue (
      user_id, type, title, message, data, scheduled_at
    ) VALUES (
      v_family_user_id,
      'donation_received',
      'New Donation Received!',
      format('You received a donation of %s Nova from %s. Thank you for trusting us!', p_amount, v_donor_display_name),
      json_build_object(
        'donor_id', p_donor_id,
        'family_id', p_family_id,
        'amount', p_amount,
        'anonymous', p_anonymous
      ),
      NOW()
    );
  END IF;
  
  RETURN true;
END;
$$;

-- Create RPC for checking and sending goal notifications
CREATE OR REPLACE FUNCTION check_goal_notifications()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_family RECORD;
  v_days_left INTEGER;
  v_progress_percentage DECIMAL;
BEGIN
  -- Check all active families with goals
  FOR v_family IN 
    SELECT 
      id, 
      user_id, 
      head_name, 
      goal_amount, 
      total_received, 
      deadline
    FROM families 
    WHERE goal_amount > 0 
    AND status = 'active'
    AND deadline IS NOT NULL
  LOOP
    -- Calculate progress
    v_progress_percentage := (v_family.total_received / v_family.goal_amount) * 100;
    
    -- Calculate days left
    v_days_left := EXTRACT(DAYS FROM (v_family.deadline::date - CURRENT_DATE));
    
    -- Check if goal achieved
    IF v_family.total_received >= v_family.goal_amount THEN
      INSERT INTO notification_queue (
        user_id, type, title, message, data, scheduled_at
      ) VALUES (
        v_family.user_id,
        'goal_achieved',
        'Goal Achieved! 🎉',
        format('Congratulations! Your family goal of %s Nova has been achieved. Thank you to all donors!', v_family.goal_amount),
        json_build_object(
          'family_id', v_family.id,
          'goal_amount', v_family.goal_amount,
          'total_received', v_family.total_received
        ),
        NOW()
      );
      
      -- Update family status
      UPDATE families 
      SET status = 'supported' 
      WHERE id = v_family.id;
    
    -- Check deadline warnings
    ELSIF v_days_left IN (7, 3, 1) AND v_progress_percentage < 100 THEN
      INSERT INTO notification_queue (
        user_id, type, title, message, data, scheduled_at
      ) VALUES (
        v_family.user_id,
        'goal_deadline_warning',
        'Goal Deadline Approaching',
        format('Your donation goal deadline is in %s days. %.1f%% achieved so far!', v_days_left, v_progress_percentage),
        json_build_object(
          'family_id', v_family.id,
          'days_left', v_days_left,
          'progress_percentage', v_progress_percentage,
          'goal_amount', v_family.goal_amount,
          'total_received', v_family.total_received
        ),
        NOW()
      );
    END IF;
  END LOOP;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION send_donation_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION check_goal_notifications TO authenticated;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_queue_type ON notification_queue(type);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled_at ON notification_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_families_goal_deadline ON families(deadline) WHERE goal_amount > 0;
