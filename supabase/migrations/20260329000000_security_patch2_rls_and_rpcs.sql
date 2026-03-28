-- ═══════════════════════════════════════════════════════════════════════
-- SECURITY PATCH 2 — notification_queue RLS + winner_donate_to_family
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Fix notification_queue RLS — was open to everyone ─────────────
DROP POLICY IF EXISTS "System full access to notification queue" ON notification_queue;

-- Users can only read their own notifications from the queue
CREATE POLICY "notification_queue_user_select"
  ON notification_queue FOR SELECT
  USING (user_id = auth.uid());

-- Only admins and the system (service role) can insert/update/delete
CREATE POLICY "notification_queue_admin_all"
  ON notification_queue FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );

-- ── 2. Fix winner_donate_to_family — add SET search_path ─────────────
CREATE OR REPLACE FUNCTION public.winner_donate_to_family(
  p_contest_id UUID,
  p_family_id UUID,
  p_donation_percentage DECIMAL DEFAULT 10.0
)
RETURNS TABLE (
  success BOOLEAN,
  donation_id UUID,
  share_token TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_winner_id UUID;
  v_prize_amount DECIMAL;
  v_donation_amount DECIMAL;
  v_donation_id UUID;
  v_share_token TEXT;
BEGIN
  -- Validate percentage
  IF p_donation_percentage < 1 OR p_donation_percentage > 100 THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'Donation percentage must be between 1 and 100';
    RETURN;
  END IF;

  -- Get the contest winner and prize amount
  SELECT ce.user_id, ce.prize_amount
  INTO v_winner_id, v_prize_amount
  FROM contest_entries ce
  JOIN contests c ON c.id = ce.contest_id
  WHERE ce.contest_id = p_contest_id
    AND c.status = 'completed'
    AND ce.prize_amount > 0
  ORDER BY ce.prize_amount DESC
  LIMIT 1;

  -- Validate: caller must be the winner
  IF v_winner_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'Contest not found or not completed';
    RETURN;
  END IF;

  IF v_winner_id != auth.uid() THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'Only the winner can donate their prize';
    RETURN;
  END IF;

  -- Validate family exists and is approved
  IF NOT EXISTS (SELECT 1 FROM families WHERE id = p_family_id AND status = 'approved') THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'Family not found or not approved';
    RETURN;
  END IF;

  -- Calculate donation amount
  v_donation_amount := ROUND((v_prize_amount * p_donation_percentage / 100.0)::NUMERIC, 2);

  IF v_donation_amount <= 0 THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'Donation amount too small';
    RETURN;
  END IF;

  -- Generate share token
  v_share_token := encode(gen_random_bytes(16), 'hex');

  -- Insert donation record
  INSERT INTO family_donations (
    family_id, donor_id, amount, share_token,
    source_type, source_id, created_at
  ) VALUES (
    p_family_id, v_winner_id, v_donation_amount, v_share_token,
    'contest_win', p_contest_id, now()
  ) RETURNING id INTO v_donation_id;

  -- Update family total received
  UPDATE families
  SET total_received = COALESCE(total_received, 0) + v_donation_amount
  WHERE id = p_family_id;

  -- Notify family admin
  INSERT INTO notifications (user_id, type, title_ar, title_en, body_ar, body_en, metadata)
  SELECT ur.user_id, 'new_donation',
    'تبرع جديد للعائلة', 'New Family Donation',
    format('تلقّت العائلة تبرعاً بقيمة %s Nova من فائز المسابقة.', v_donation_amount),
    format('The family received a donation of %s Nova from the contest winner.', v_donation_amount),
    jsonb_build_object('donation_id', v_donation_id, 'amount', v_donation_amount)
  FROM user_roles ur WHERE ur.role = 'admin';

  RETURN QUERY SELECT true, v_donation_id, v_share_token, NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.winner_donate_to_family TO authenticated;
