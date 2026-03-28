-- ============================================================
-- NOTIFICATION SYSTEM: User Settings and Templates
-- ============================================================

-- ── 1. user_notification_settings ───────────────────────────
CREATE TABLE IF NOT EXISTS public.user_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- General notification settings
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Specific notification types
  contest_wins BOOLEAN NOT NULL DEFAULT true,
  contest_reminders BOOLEAN NOT NULL DEFAULT true,
  agent_requests BOOLEAN NOT NULL DEFAULT true,
  agent_approvals BOOLEAN NOT NULL DEFAULT true,
  donations_received BOOLEAN NOT NULL DEFAULT true,
  donation_confirmations BOOLEAN NOT NULL DEFAULT true,
  giving_hour_reminders BOOLEAN NOT NULL DEFAULT true,
  team_activities BOOLEAN NOT NULL DEFAULT true,
  p2p_orders BOOLEAN NOT NULL DEFAULT true,
  p2p_disputes BOOLEAN NOT NULL DEFAULT true,
  system_updates BOOLEAN NOT NULL DEFAULT false,
  
  -- Quiet hours (do not disturb)
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  
  -- Frequency controls
  daily_limit INTEGER DEFAULT 20,
  hourly_limit INTEGER DEFAULT 5,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- ── 2. notification_templates ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  event TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  
  -- Template content with variables
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_text TEXT,
  action_url TEXT,
  
  -- Template metadata
  variables TEXT[], -- Array of variable names like ['user_name', 'amount']
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER DEFAULT 5, -- 1=high, 5=normal, 10=low
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (type, event, language)
);

-- ── 3. notification_queue ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL,
  event TEXT NOT NULL,
  
  -- Delivery options
  channels TEXT[] DEFAULT ARRAY['in_app'], -- 'push', 'email', 'in_app'
  scheduled_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'expired')),
  delivery_attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Analytics
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  -- Data for template rendering
  data JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 4. notification_analytics ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notification_queue(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Event tracking
  event TEXT NOT NULL, -- 'sent', 'delivered', 'opened', 'clicked', 'dismissed'
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Additional data
  device_info JSONB,
  user_agent TEXT,
  ip_address INET,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 5. Indexes ───────────────────────────────────────────────────
CREATE INDEX idx_user_notification_settings_user_id ON user_notification_settings(user_id);
CREATE INDEX idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX idx_notification_queue_status ON notification_queue(status);
CREATE INDEX idx_notification_queue_scheduled_at ON notification_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_notification_analytics_notification_id ON notification_analytics(notification_id);
CREATE INDEX idx_notification_analytics_user_id ON notification_analytics(user_id);
CREATE INDEX idx_notification_analytics_event ON notification_analytics(event);

-- ── 6. RLS Policies ───────────────────────────────────────────────
-- Users can view and update their own notification settings
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notification settings" ON user_notification_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings" ON user_notification_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings" ON user_notification_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notification queue - system access only
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System full access to notification queue" ON notification_queue
  FOR ALL USING (true); -- In production, restrict to service role

-- Templates - read access for all, write for system
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All users can view active templates" ON notification_templates
  FOR SELECT USING (is_active = true);

-- Analytics - users can view their own analytics
ALTER TABLE notification_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notification analytics" ON notification_analytics
  FOR SELECT USING (auth.uid() = user_id);

-- ── 7. Triggers for updated_at ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_notification_settings_updated_at 
  BEFORE UPDATE ON user_notification_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at 
  BEFORE UPDATE ON notification_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_queue_updated_at 
  BEFORE UPDATE ON notification_queue 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 8. Insert default notification templates ──────────────────────
INSERT INTO notification_templates (type, event, language, title, body, variables, priority) VALUES
-- Contest notifications
('push', 'contest_win', 'en', '🎉 Congratulations! You Won!', 'Hi {{user_name}}, you won {{prize_amount}} Nova in the {{contest_name}} contest! Claim your prize now.', ARRAY['user_name', 'prize_amount', 'contest_name'], 1),
('push', 'contest_win', 'ar', '🎉 مبروك! لقد فزت!', 'مرحباً {{user_name}}، لقد فزت بـ {{prize_amount}} Nova في مسابقة {{contest_name}}! استلم جائزتك الآن.', ARRAY['user_name', 'prize_amount', 'contest_name'], 1),

('push', 'contest_reminder', 'en', '🏆 Contest Starting Soon', 'The {{contest_name}} contest starts in {{minutes}} minutes. Don''t miss out!', ARRAY['contest_name', 'minutes'], 3),
('push', 'contest_reminder', 'ar', '🏆 المسابقة تبدأ قريباً', 'مسابقة {{contest_name}} تبدأ خلال {{minutes}} دقائق. لا تفوت الفرصة!', ARRAY['contest_name', 'minutes'], 3),

-- Agent notifications
('push', 'agent_request_received', 'en', '📬 New Agent Application', '{{shop_name}} has applied to become an agent. Review their application now.', ARRAY['shop_name'], 2),
('push', 'agent_request_received', 'ar', '📬 طلب وكيل جديد', '{{shop_name}} تقدم بطلب ليصبح وكيلاً. راجع طلبه الآن.', ARRAY['shop_name'], 2),

('push', 'agent_approved', 'en', '✅ Agent Application Approved', 'Congratulations! Your agent application has been approved. Start earning now!', ARRAY['shop_name'], 1),
('push', 'agent_approved', 'ar', '✅ طلب الوكيل موافق عليه', 'تهانينا! تم الموافقة على طلبك كوكيل. ابدأ الربح الآن!', ARRAY['shop_name'], 1),

-- Giving notifications
('push', 'donation_received', 'en', '💝 Thank You for Your Donation', 'Thank you for donating {{amount}} Nova to {{family_name}}. Your generosity makes a difference!', ARRAY['amount', 'family_name'], 2),
('push', 'donation_received', 'ar', '💝 شكراً لتبرعك', 'شكراً لتبرعك بـ {{amount}} Nova لأسرة {{family_name}}. كرمك يحدث فرقاً!', ARRAY['amount', 'family_name'], 2),

('push', 'giving_hour_reminder', 'en', '🕐 Giving Hour Starting Soon', 'Giving Hour starts in {{minutes}} minutes. Get ready to make an impact!', ARRAY['minutes'], 3),
('push', 'giving_hour_reminder', 'ar', '🕐 ساعة العطاء تبدأ قريباً', 'ساعة العطاء تبدأ خلال {{minutes}} دقائق. استعد لإحداث تأثير!', ARRAY['minutes'], 3),

-- P2P notifications
('push', 'p2p_order_created', 'en', '💱 New P2P Order', 'You have a new {{order_type}} order for {{amount}} Nova. Check it now!', ARRAY['order_type', 'amount'], 2),
('push', 'p2p_order_created', 'ar', '💱 طلب P2P جديد', 'لديك طلب {{order_type}} جديد لـ {{amount}} Nova. تحقق منه الآن!', ARRAY['order_type', 'amount'], 2),

-- Team notifications
('push', 'team_member_joined', 'en', '👋 New Team Member', '{{member_name}} has joined your team! Welcome them!', ARRAY['member_name'], 4),
('push', 'team_member_joined', 'ar', '👋 عضو جديد في الفريق', '{{member_name}} انضم إلى فريقك! رحب به!', ARRAY['member_name'], 4)

ON CONFLICT (type, event, language) DO NOTHING;
