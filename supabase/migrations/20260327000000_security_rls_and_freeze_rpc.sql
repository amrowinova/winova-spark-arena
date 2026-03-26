-- ═══════════════════════════════════════════════════════════════════════
-- SECURITY PATCH — Phase 1
-- 1. RLS on families + family_media
-- 2. admin_freeze_wallet RPC (replaces direct table update from frontend)
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. RLS on families ────────────────────────────────────────────────
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved families (for Giving page listing)
CREATE POLICY "families_select_approved"
  ON public.families FOR SELECT
  USING (status = 'approved' OR auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role IN ('admin', 'support')
  ));

-- Only admins can insert/update/delete
CREATE POLICY "families_admin_all"
  ON public.families FOR ALL
  USING (auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  ));

-- ── 2. RLS on family_media ────────────────────────────────────────────
ALTER TABLE public.family_media ENABLE ROW LEVEL SECURITY;

-- Anyone can view media for approved families
CREATE POLICY "family_media_select"
  ON public.family_media FOR SELECT
  USING (
    family_id IN (
      SELECT id FROM families WHERE status = 'approved'
    )
    OR auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role IN ('admin', 'support')
    )
  );

-- Only admins can manage media
CREATE POLICY "family_media_admin_all"
  ON public.family_media FOR ALL
  USING (auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  ));

-- ── 3. admin_freeze_wallet RPC ────────────────────────────────────────
-- Replaces the direct supabase.from('wallets').update() in OrderInspector.tsx
-- Validates caller is admin before freezing/unfreezing any wallet.

CREATE OR REPLACE FUNCTION public.admin_freeze_wallet(
  p_target_user_id  UUID,
  p_reason          TEXT,
  p_unfreeze        BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_admin BOOLEAN;
BEGIN
  -- Must be authenticated
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated');
  END IF;

  -- Must have admin role
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = v_caller AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Target wallet must exist
  IF NOT EXISTS (SELECT 1 FROM wallets WHERE user_id = p_target_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF p_unfreeze THEN
    UPDATE wallets
    SET
      is_frozen    = false,
      frozen_at    = NULL,
      frozen_by    = NULL,
      frozen_reason = NULL
    WHERE user_id = p_target_user_id;

    -- Audit log
    INSERT INTO audit_logs (action, entity_type, entity_id, performed_by, metadata)
    VALUES (
      'admin_unfreeze_wallet',
      'wallet',
      p_target_user_id,
      v_caller,
      jsonb_build_object('reason', p_reason)
    );
  ELSE
    UPDATE wallets
    SET
      is_frozen     = true,
      frozen_at     = now(),
      frozen_by     = v_caller,
      frozen_reason = p_reason
    WHERE user_id = p_target_user_id;

    -- Audit log
    INSERT INTO audit_logs (action, entity_type, entity_id, performed_by, metadata)
    VALUES (
      'admin_freeze_wallet',
      'wallet',
      p_target_user_id,
      v_caller,
      jsonb_build_object('reason', p_reason)
    );

    -- Notify the frozen user
    INSERT INTO notifications (user_id, type, title_ar, title_en, body_ar, body_en, metadata)
    VALUES (
      p_target_user_id,
      'wallet_frozen',
      'محفظتك مجمّدة',
      'Wallet Frozen',
      'تم تجميد محفظتك من قِبل الإدارة. تواصل مع الدعم.',
      'Your wallet has been frozen by admin. Please contact support.',
      jsonb_build_object('frozen_by', v_caller, 'reason', p_reason)
    );
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── 4. cron job — award_monthly_referral_prizes on 1st of each month ──
-- Requires pg_cron extension (enabled on Supabase Pro/Team)
SELECT cron.schedule(
  'award-monthly-referral-prizes',
  '0 0 1 * *',  -- midnight on the 1st of every month (UTC)
  $$SELECT award_monthly_referral_prizes()$$
) ON CONFLICT (jobname) DO UPDATE SET schedule = '0 0 1 * *';
