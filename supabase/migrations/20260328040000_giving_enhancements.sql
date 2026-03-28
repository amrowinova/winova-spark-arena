-- ============================================================
-- GIVING SYSTEM ENHANCEMENTS: Custom Amounts & Progress
-- ============================================================

-- ── 1. Add goal_amount to families table ───────────────────────
ALTER TABLE public.families 
ADD COLUMN goal_amount DECIMAL(18,2) DEFAULT 0,
ADD COLUMN progress_percentage INTEGER GENERATED ALWAYS AS (
  CASE 
    WHEN goal_amount > 0 THEN LEAST(100, ROUND((total_received / goal_amount) * 100))
    ELSE 0
  END
) STORED;

-- ── 2. Add donation card sharing table ─────────────────────────
CREATE TABLE IF NOT EXISTS public.donation_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID NOT NULL REFERENCES public.family_supports(id) ON DELETE CASCADE,
  share_token TEXT UNIQUE NOT NULL, -- Unique token for sharing
  donor_name TEXT NOT NULL, -- Can be anonymous or real name
  family_name TEXT NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
  view_count INTEGER DEFAULT 0
);

-- ── 3. Add family thank you messages table ───────────────────────
CREATE TABLE IF NOT EXISTS public.family_thank_you_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  donor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  donation_id UUID REFERENCES public.family_supports(id) ON DELETE CASCADE,
  
  -- Message content
  message TEXT,
  media_type TEXT CHECK (media_type IN ('text', 'image', 'video')),
  media_url TEXT,
  thumbnail_url TEXT, -- For videos
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Admin or family member
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ
);

-- ── 4. Enhanced donation RPC with custom amount ───────────────────
CREATE OR REPLACE FUNCTION public.donate_to_family(
  p_family_id UUID,
  p_amount DECIMAL(18,2),
  p_anonymous BOOLEAN DEFAULT false,
  p_message TEXT DEFAULT NULL,
  p_donor_name TEXT DEFAULT NULL -- For sharing cards
)
RETURNS TABLE(
  success BOOLEAN,
  donation_id UUID,
  share_token TEXT,
  error_message TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_family RECORD;
  v_donation_id UUID;
  v_share_token TEXT;
  v_nova_balance DECIMAL(18,2);
  v_final_donor_name TEXT;
BEGIN
  -- Validate user
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'User not authenticated'::TEXT;
    RETURN;
  END IF;

  -- Get family info
  SELECT * INTO v_family
  FROM families
  WHERE id = p_family_id AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'Family not found or inactive'::TEXT;
    RETURN;
  END IF;

  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'Invalid amount'::TEXT;
    RETURN;
  END IF;

  -- Check user's Nova balance
  SELECT nova_balance INTO v_nova_balance
  FROM profiles
  WHERE user_id = v_user_id;
  
  IF v_nova_balance < p_amount THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'Insufficient Nova balance'::TEXT;
    RETURN;
  END IF;

  -- Determine donor name for sharing
  v_final_donor_name := COALESCE(
    p_donor_name,
    CASE 
      WHEN p_anonymous THEN 'Generous Donor'
      ELSE (SELECT name FROM profiles WHERE user_id = v_user_id LIMIT 1)
    END,
    'Anonymous'
  );

  -- Start transaction
  BEGIN
    -- Deduct from user's balance
    UPDATE profiles
    SET nova_balance = nova_balance - p_amount
    WHERE user_id = v_user_id;

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
    ADD COLUMN donation_confirmations BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN goal_achievements BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN deadline_warnings BOOLEAN NOT NULL DEFAULT true;

    -- Create donation record
    INSERT INTO family_supports (
      user_id, family_id, amount, status, message, anonymous
    )
    VALUES (
      v_user_id, p_family_id, p_amount, 'completed', p_message, p_anonymous
    )
    RETURNING id INTO v_donation_id;

    -- Update family total
    UPDATE families
    SET total_received = total_received + p_amount,
        updated_at = now()
    WHERE id = p_family_id;

    -- Create ledger entry
    INSERT INTO ledger (
      user_id, amount, type, reference_id, description
    )
    VALUES (
      v_user_id, -p_amount, 'giving_donation', v_donation_id, 
      'Donation to ' || v_family.head_name
    );

    -- Generate share token
    v_share_token := encode(
      v_donation_id::TEXT || '|' || 
      v_family.head_name || '|' || 
      p_amount::TEXT || '|' || 
      v_final_donor_name,
      'base64'
    );

    -- Create donation share record
    INSERT INTO donation_shares (
      donation_id, share_token, donor_name, family_name, amount, message, is_anonymous
    )
    VALUES (
      v_donation_id, v_share_token, v_final_donor_name, v_family.head_name, p_amount, p_message, p_anonymous
    );

    -- Send notification to donor
    PERFORM send_notification(
      v_user_id,
      'push',
      'donation_received',
      jsonb_build_object(
        'amount', p_amount::TEXT,
        'family_name', v_family.head_name
      )
    );

    -- Send notification to family if they have an account
    PERFORM send_notification(
      (SELECT user_id FROM family_supports WHERE family_id = p_family_id AND user_id IS NOT NULL LIMIT 1),
      'push',
      'donation_received',
      jsonb_build_object(
        'amount', p_amount::TEXT,
        'donor_name', v_final_donor_name
      )
    );

  EXCEPTION
    WHEN OTHERS THEN
      ROLLBACK;
      RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, SQLERRM::TEXT;
      RETURN;
  END;

  RETURN QUERY SELECT true, v_donation_id, v_share_token, NULL::TEXT;
END;
$$;

-- ── 5. Get donation share by token RPC ───────────────────────────
CREATE OR REPLACE FUNCTION public.get_donation_share(
  p_token TEXT
)
RETURNS TABLE(
  found BOOLEAN,
  donor_name TEXT,
  family_name TEXT,
  amount DECIMAL(18,2),
  message TEXT,
  is_anonymous BOOLEAN,
  created_at TIMESTAMPTZ,
  family_story TEXT,
  family_members_count INTEGER
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_share RECORD;
  v_family RECORD;
BEGIN
  -- Get share record
  SELECT * INTO v_share
  FROM donation_shares
  WHERE share_token = p_token 
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, 0::DECIMAL(18,2), NULL::TEXT, false, NULL::TIMESTAMPTZ, NULL::TEXT, 0;
    RETURN;
  END IF;

  -- Get family info
  SELECT story, members_count INTO v_family
  FROM families
  WHERE head_name = v_share.family_name
  LIMIT 1;

  -- Increment view count
  UPDATE donation_shares
  SET view_count = view_count + 1
  WHERE id = v_share.id;

  RETURN QUERY SELECT 
    true,
    v_share.donor_name,
    v_share.family_name,
    v_share.amount,
    v_share.message,
    v_share.is_anonymous,
    v_share.created_at,
    COALESCE(v_family.story, ''),
    COALESCE(v_family.members_count, 1);
END;
$$;

-- ── 6. Submit family thank you message RPC ───────────────────────
CREATE OR REPLACE FUNCTION public.submit_family_thank_you(
  p_family_id UUID,
  p_donor_id UUID DEFAULT NULL,
  p_message TEXT,
  p_media_type TEXT DEFAULT 'text',
  p_media_url TEXT DEFAULT NULL,
  p_thumbnail_url TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message_id UUID,
  error_message TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_message_id UUID;
BEGIN
  -- Validate user (admin or family member)
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'User not authenticated'::TEXT;
    RETURN;
  END IF;

  -- Check if user is admin or family member
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = v_user_id AND role IN ('admin', 'support')
  ) AND NOT EXISTS (
    SELECT 1 FROM families 
    WHERE id = p_family_id AND user_id = v_user_id
  ) THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Unauthorized: Only admin or family members can submit thank you messages'::TEXT;
    RETURN;
  END;

  -- Validate family
  IF NOT EXISTS (SELECT 1 FROM families WHERE id = p_family_id) THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Family not found'::TEXT;
    RETURN;
  END;

  -- Create thank you message
  INSERT INTO family_thank_you_messages (
    family_id, donor_id, message, media_type, media_url, thumbnail_url, submitted_by
  )
  VALUES (
    p_family_id, p_donor_id, p_message, p_media_type, p_media_url, p_thumbnail_url, v_user_id
  )
  RETURNING id INTO v_message_id;

  RETURN QUERY SELECT true, v_message_id, NULL::TEXT;
END;
$$;

-- ── 7. Get user's donation impact RPC ───────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_donation_impact(
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
  total_donated DECIMAL(18,2),
  families_supported INTEGER,
  total_shares INTEGER,
  recent_donations JSONB
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID := COALESCE(p_user_id, auth.uid());
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT 0::DECIMAL(18,2), 0, 0, '[]'::JSONB;
    RETURN;
  END IF;

  RETURN QUERY
  WITH donation_stats AS (
    SELECT
      COALESCE(SUM(amount), 0) as total,
      COUNT(DISTINCT family_id) as families,
      COUNT(*) as donations
    FROM family_supports
    WHERE user_id = v_user_id AND status = 'completed'
  ),
  recent_donations AS (
    SELECT
      fs.amount,
      f.head_name as family_name,
      fs.created_at,
      fs.anonymous,
      COALESCE(ds.share_token, '') as share_token
    FROM family_supports fs
    JOIN families f ON fs.family_id = f.id
    LEFT JOIN donation_shares ds ON fs.id = ds.donation_id
    WHERE fs.user_id = v_user_id 
      AND fs.status = 'completed'
    ORDER BY fs.created_at DESC
    LIMIT 10
  )
  SELECT 
    ds.total,
    ds.families,
    (SELECT COUNT(*) FROM donation_shares WHERE donation_id IN (
      SELECT id FROM family_supports WHERE user_id = v_user_id AND status = 'completed'
    )) as total_shares,
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'amount', rd.amount,
        'family_name', rd.family_name,
        'created_at', rd.created_at,
        'anonymous', rd.anonymous,
        'share_token', rd.share_token
      )
    ), '[]'::JSONB) as recent_donations
  FROM donation_stats ds, recent_donations rd
  GROUP BY ds.total, ds.families;
END;
$$;

-- ── 8. Indexes ───────────────────────────────────────────────────
CREATE INDEX idx_donation_shares_token ON donation_shares(share_token);
CREATE INDEX idx_donation_shares_donation_id ON donation_shares(donation_id);
CREATE INDEX idx_family_thank_you_family_id ON family_thank_you_messages(family_id);
CREATE INDEX idx_family_thank_you_donor_id ON family_thank_you_messages(donor_id);
CREATE INDEX idx_families_goal_amount ON families(goal_amount) WHERE goal_amount > 0;

-- ── 9. RLS Policies ───────────────────────────────────────────────
ALTER TABLE donation_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view donation shares" ON donation_shares
  FOR SELECT USING (true);

ALTER TABLE family_thank_you_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view approved thank you messages" ON family_thank_you_messages
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Admin and family members can insert thank you messages" ON family_thank_you_messages
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE role IN ('admin', 'support')
    ) OR
    auth.uid() IN (
      SELECT user_id FROM families WHERE id = family_id
    )
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.donate_to_family TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_donation_share TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_family_thank_you TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_donation_impact TO authenticated;
