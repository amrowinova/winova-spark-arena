/**
 * Streak Nova Reward System
 * ──────────────────────────
 * Rewards users with Nova bonuses at streak milestones.
 * weekly_streak is already tracked in profiles via update_weekly_streaks().
 *
 * Milestones:
 *   4 weeks  → +5 Nova   (first month of consistency)
 *   12 weeks → +20 Nova  (quarterly achiever)
 *   26 weeks → +50 Nova  (half-year champion)
 *
 * Awarded once per milestone per user (idempotent).
 * Called from update_weekly_streaks() after every weekly update.
 */

-- ── 1. Add streak_milestones_awarded column ───────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS streak_milestones_awarded JSONB NOT NULL DEFAULT '{}';

-- ── 2. award_streak_bonus — checks milestones and credits wallet ──────────────
CREATE OR REPLACE FUNCTION public.award_streak_bonus(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak        INTEGER;
  v_awarded       JSONB;
  v_wallet_id     UUID;

  -- milestone → nova reward mapping
  MILESTONES      INTEGER[] := ARRAY[4, 12, 26];
  REWARDS         INTEGER[] := ARRAY[5, 20, 50];

  v_milestone     INTEGER;
  v_reward        INTEGER;
  v_milestone_key TEXT;
BEGIN
  -- Fetch current streak and already-awarded milestones
  SELECT weekly_streak, streak_milestones_awarded
    INTO v_streak, v_awarded
    FROM public.profiles
   WHERE user_id = p_user_id;

  IF NOT FOUND THEN RETURN; END IF;

  -- Fetch wallet id
  SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Check each milestone
  FOR i IN 1 .. array_length(MILESTONES, 1) LOOP
    v_milestone     := MILESTONES[i];
    v_reward        := REWARDS[i];
    v_milestone_key := v_milestone::TEXT;

    -- Skip if streak hasn't reached this milestone yet
    CONTINUE WHEN v_streak < v_milestone;

    -- Skip if already awarded
    CONTINUE WHEN (v_awarded ->> v_milestone_key) IS NOT NULL;

    -- Credit wallet: insert into wallet_ledger
    INSERT INTO public.wallet_ledger (
      wallet_id, user_id, entry_type, currency,
      amount, balance_after, description
    )
    SELECT
      v_wallet_id,
      p_user_id,
      'streak_reward',
      'nova',
      v_reward,
      nova_balance + v_reward,
      'مكافأة streak ' || v_milestone || ' أسابيع / ' || v_milestone || '-week streak reward'
    FROM public.wallets
    WHERE id = v_wallet_id;

    -- Update wallet balance
    UPDATE public.wallets
       SET nova_balance = nova_balance + v_reward
     WHERE id = v_wallet_id;

    -- Mark milestone as awarded
    UPDATE public.profiles
       SET streak_milestones_awarded = streak_milestones_awarded || jsonb_build_object(v_milestone_key, true)
     WHERE user_id = p_user_id;

    -- Send in-app notification
    INSERT INTO public.notifications (user_id, type, title, description, is_read, action_path)
    VALUES (
      p_user_id,
      'streak_reward',
      '🔥 مكافأة الـ Streak!',
      'حافظت على نشاطك ' || v_milestone || ' أسابيع متواصلة — ربحت ' || v_reward || ' Nova!',
      false,
      '/wallet'
    );

  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_streak_bonus(UUID) TO service_role;

-- ── 3. Hook award_streak_bonus into update_weekly_streaks ────────────────────
-- Replace update_weekly_streaks to call award_streak_bonus for users whose
-- streak increased (weekly_active = true in the just-completed week).
CREATE OR REPLACE FUNCTION public.update_weekly_streaks(
  p_cycle_id        UUID,
  p_week_just_completed INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_setting_key TEXT := 'last_streak_updated_week';
  v_last_week   TEXT;
  v_week_str    TEXT := p_week_just_completed::TEXT;
  r             RECORD;
BEGIN
  -- Idempotency guard
  SELECT value::TEXT INTO v_last_week
    FROM public.app_settings
   WHERE key = v_setting_key;

  IF v_last_week = v_week_str THEN
    RAISE NOTICE 'Streaks already updated for week %. Skipping.', p_week_just_completed;
    RETURN;
  END IF;

  -- Update streaks for all profiles
  -- active this week → streak + 1
  -- missed this week  → streak = 0
  FOR r IN
    SELECT p.user_id, p.weekly_streak, p.weekly_active
      FROM public.profiles p
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.spotlight_user_points sup
       WHERE sup.user_id      = r.user_id
         AND sup.cycle_id     = p_cycle_id
         AND sup.week_number  = p_week_just_completed
    ) THEN
      UPDATE public.profiles
         SET weekly_streak  = weekly_streak + 1,
             weekly_active  = true
       WHERE user_id = r.user_id;

      -- Check and award streak milestones
      PERFORM public.award_streak_bonus(r.user_id);
    ELSE
      UPDATE public.profiles
         SET weekly_streak = 0,
             weekly_active  = false
       WHERE user_id = r.user_id;
    END IF;
  END LOOP;

  -- Record that we processed this week
  INSERT INTO public.app_settings (key, value, description)
  VALUES (
    v_setting_key,
    to_jsonb(v_week_str),
    'آخر أسبوع تم تحديث الـ streak فيه — يُحدَّث تلقائياً بواسطة contest-scheduler'
  )
  ON CONFLICT (key) DO UPDATE SET value = to_jsonb(v_week_str);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_weekly_streaks(UUID, INTEGER) TO service_role;
