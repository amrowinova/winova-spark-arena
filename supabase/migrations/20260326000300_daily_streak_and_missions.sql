-- ══════════════════════════════════════════════════════════════════════════════
-- Phase 3: Daily Streak + Daily Missions (Quests) + Mystery Box
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. user_streaks table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak    INTEGER     NOT NULL DEFAULT 0,
  longest_streak    INTEGER     NOT NULL DEFAULT 0,
  last_activity_date DATE,
  total_nova_earned DECIMAL(18,2) DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_streaks_user ON public.user_streaks(user_id);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streaks_own" ON public.user_streaks
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "streaks_admin" ON public.user_streaks
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_user_streaks_updated_at
  BEFORE UPDATE ON public.user_streaks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── 2. check_and_award_streak RPC ────────────────────────────────────────────
-- Called on every login. Idempotent for the same day.
-- Rewards: Day 1→1, Day 2→2, Day 3→3, Day 4→4, Day 5→5, Day 6→7, Day 7→10 Nova
CREATE OR REPLACE FUNCTION public.check_and_award_streak()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid := auth.uid();
  v_today      date := (NOW() AT TIME ZONE 'Asia/Riyadh')::date;
  v_yesterday  date := v_today - INTERVAL '1 day';
  v_streak     record;
  v_new_streak int;
  v_reward     decimal := 0;
  v_milestone  bool := false;
  v_wallet_id  uuid;
  v_balance    decimal;
  -- Daily reward schedule (capped at 7 then resets each week cycle)
  v_rewards    int[] := ARRAY[1,2,3,4,5,7,10];
  v_day_idx    int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get or create streak record
  INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_activity_date)
  VALUES (v_user_id, 0, 0, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_streak FROM public.user_streaks WHERE user_id = v_user_id;

  -- Already recorded today
  IF v_streak.last_activity_date = v_today THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_done', true,
      'current_streak', v_streak.current_streak,
      'reward', 0
    );
  END IF;

  -- Calculate new streak
  IF v_streak.last_activity_date = v_yesterday THEN
    v_new_streak := v_streak.current_streak + 1;
  ELSE
    v_new_streak := 1; -- broken or first time
  END IF;

  -- Day index within 7-day cycle (0-based)
  v_day_idx := ((v_new_streak - 1) % 7) + 1;
  v_reward  := v_rewards[v_day_idx];

  -- Milestone: completed a full 7-day cycle
  v_milestone := (v_new_streak % 7 = 0);

  -- Update streak record
  UPDATE public.user_streaks SET
    current_streak    = v_new_streak,
    longest_streak    = GREATEST(longest_streak, v_new_streak),
    last_activity_date = v_today,
    total_nova_earned = total_nova_earned + v_reward
  WHERE user_id = v_user_id;

  -- Credit Nova reward
  SELECT id, nova_balance INTO v_wallet_id, v_balance
  FROM public.wallets WHERE user_id = v_user_id LIMIT 1;

  IF FOUND AND v_reward > 0 THEN
    UPDATE public.wallets
    SET nova_balance = nova_balance + v_reward
    WHERE id = v_wallet_id;

    INSERT INTO public.wallet_ledger (
      user_id, wallet_id, amount, currency,
      entry_type, description, description_ar,
      balance_before, balance_after,
      reference_type, reference_id
    ) VALUES (
      v_user_id, v_wallet_id, v_reward, 'nova',
      'streak_reward',
      'Daily streak reward — day ' || v_new_streak,
      'مكافأة الحضور اليومي — اليوم ' || v_new_streak,
      v_balance, v_balance + v_reward,
      'streak', v_user_id::text
    );
  END IF;

  RETURN jsonb_build_object(
    'success',         true,
    'already_done',    false,
    'current_streak',  v_new_streak,
    'longest_streak',  GREATEST(v_streak.longest_streak, v_new_streak),
    'reward',          v_reward,
    'day_in_cycle',    v_day_idx,
    'milestone',       v_milestone
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_award_streak() TO authenticated;

-- ── 3. daily_missions table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_missions (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT    NOT NULL UNIQUE,  -- 'vote_5', 'transfer_nova', 'join_contest', 'share_link'
  title_ar      TEXT    NOT NULL,
  title_en      TEXT    NOT NULL,
  description_ar TEXT   NOT NULL,
  description_en TEXT   NOT NULL,
  target        INTEGER NOT NULL DEFAULT 1,
  reward_nova   DECIMAL(18,2) DEFAULT 0,
  reward_aura   DECIMAL(18,2) DEFAULT 0,
  icon          TEXT    DEFAULT '⭐',
  is_active     BOOLEAN DEFAULT true,
  sort_order    INTEGER DEFAULT 0
);

ALTER TABLE public.daily_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_missions_read_all" ON public.daily_missions FOR SELECT USING (true);
CREATE POLICY "daily_missions_admin"    ON public.daily_missions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Seed the 4 default missions
INSERT INTO public.daily_missions (code, title_ar, title_en, description_ar, description_en, target, reward_nova, reward_aura, icon, sort_order)
VALUES
  ('vote_5',        'المصوّت النشط',       'Active Voter',       'صوّت لـ 5 مشاركين في المسابقة',    'Vote for 5 participants in the contest',   5, 0, 5, '🗳️', 1),
  ('transfer_nova', 'محوّل Nova',           'Nova Sender',        'حوّل Nova لأي مستخدم',               'Transfer Nova to any user',                1, 2, 0, '💸', 2),
  ('join_contest',  'المنافس اليومي',       'Daily Competitor',   'انضم للمسابقة اليومية',              'Join the daily contest',                   1, 3, 0, '🏆', 3),
  ('share_link',    'الناشر الأمين',        'Link Sharer',        'شارك رابط الإحالة مع صديق',         'Share your referral link with a friend',   1, 1, 0, '🔗', 4)
ON CONFLICT (code) DO NOTHING;

-- ── 4. user_mission_progress table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_mission_progress (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id   UUID        NOT NULL REFERENCES public.daily_missions(id) ON DELETE CASCADE,
  mission_date DATE        NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Riyadh')::date,
  progress     INTEGER     NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  reward_given BOOLEAN     DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, mission_id, mission_date)
);

CREATE INDEX idx_mission_progress_user_date ON public.user_mission_progress(user_id, mission_date);

ALTER TABLE public.user_mission_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mission_progress_own"
  ON public.user_mission_progress FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "mission_progress_insert"
  ON public.user_mission_progress FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "mission_progress_admin"
  ON public.user_mission_progress FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ── 5. mystery_box_rewards table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mystery_box_rewards (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_date  DATE        NOT NULL,
  nova_amount  DECIMAL(18,2) NOT NULL DEFAULT 0,
  aura_amount  DECIMAL(18,2) NOT NULL DEFAULT 0,
  opened_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, reward_date)
);

ALTER TABLE public.mystery_box_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mystery_box_own" ON public.mystery_box_rewards FOR SELECT USING (user_id = auth.uid());

-- ── 6. get_daily_missions RPC ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_daily_missions()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   uuid := auth.uid();
  v_today     date := (NOW() AT TIME ZONE 'Asia/Riyadh')::date;
  v_result    jsonb;
  v_box_open  bool := false;
  v_completed int;
BEGIN
  -- Get missions with user progress
  SELECT jsonb_agg(
    jsonb_build_object(
      'id',           m.id,
      'code',         m.code,
      'title_ar',     m.title_ar,
      'title_en',     m.title_en,
      'desc_ar',      m.description_ar,
      'desc_en',      m.description_en,
      'target',       m.target,
      'reward_nova',  m.reward_nova,
      'reward_aura',  m.reward_aura,
      'icon',         m.icon,
      'progress',     COALESCE(p.progress, 0),
      'completed',    (p.completed_at IS NOT NULL),
      'reward_given', COALESCE(p.reward_given, false)
    ) ORDER BY m.sort_order
  ) INTO v_result
  FROM public.daily_missions m
  LEFT JOIN public.user_mission_progress p
    ON p.mission_id = m.id AND p.user_id = v_user_id AND p.mission_date = v_today
  WHERE m.is_active = true;

  -- Count completed missions today
  SELECT COUNT(*) INTO v_completed
  FROM public.user_mission_progress p
  JOIN public.daily_missions m ON m.id = p.mission_id
  WHERE p.user_id = v_user_id
    AND p.mission_date = v_today
    AND p.completed_at IS NOT NULL
    AND m.is_active = true;

  -- Check if mystery box was already opened today
  SELECT EXISTS (
    SELECT 1 FROM public.mystery_box_rewards
    WHERE user_id = v_user_id AND reward_date = v_today
  ) INTO v_box_open;

  RETURN jsonb_build_object(
    'missions',          COALESCE(v_result, '[]'::jsonb),
    'completed_count',   v_completed,
    'box_available',     (v_completed >= 3 AND NOT v_box_open),
    'box_opened',        v_box_open
  );
END;
$$;

-- ── 7. record_mission_progress RPC ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_mission_progress(
  p_mission_code text,
  p_increment    int DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   uuid := auth.uid();
  v_today     date := (NOW() AT TIME ZONE 'Asia/Riyadh')::date;
  v_mission   record;
  v_prog      record;
  v_new_prog  int;
  v_completed bool := false;
  v_wallet_id uuid;
  v_balance   decimal;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_mission FROM public.daily_missions
  WHERE code = p_mission_code AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission not found');
  END IF;

  -- Upsert progress record
  INSERT INTO public.user_mission_progress (user_id, mission_id, mission_date, progress)
  VALUES (v_user_id, v_mission.id, v_today, p_increment)
  ON CONFLICT (user_id, mission_id, mission_date)
  DO UPDATE SET progress = LEAST(
    user_mission_progress.progress + p_increment,
    (SELECT target FROM daily_missions WHERE id = v_mission.id)
  )
  RETURNING * INTO v_prog;

  v_new_prog  := v_prog.progress;
  v_completed := (v_new_prog >= v_mission.target);

  -- Award reward if just completed and not yet rewarded
  IF v_completed AND NOT v_prog.reward_given THEN
    UPDATE public.user_mission_progress
    SET completed_at = NOW(), reward_given = true
    WHERE id = v_prog.id;

    SELECT id, nova_balance INTO v_wallet_id, v_balance
    FROM public.wallets WHERE user_id = v_user_id LIMIT 1;

    IF FOUND THEN
      IF v_mission.reward_nova > 0 THEN
        UPDATE public.wallets SET nova_balance = nova_balance + v_mission.reward_nova WHERE id = v_wallet_id;
        INSERT INTO public.wallet_ledger (
          user_id, wallet_id, amount, currency, entry_type,
          description, description_ar, balance_before, balance_after, reference_type, reference_id
        ) VALUES (
          v_user_id, v_wallet_id, v_mission.reward_nova, 'nova', 'mission_reward',
          'Daily mission reward: ' || v_mission.title_en,
          'مكافأة مهمة: ' || v_mission.title_ar,
          v_balance, v_balance + v_mission.reward_nova,
          'mission', v_mission.id::text
        );
      END IF;

      IF v_mission.reward_aura > 0 THEN
        UPDATE public.wallets SET aura_balance = aura_balance + v_mission.reward_aura WHERE id = v_wallet_id;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success',   true,
    'progress',  v_new_prog,
    'target',    v_mission.target,
    'completed', v_completed
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ── 8. open_mystery_box RPC ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.open_mystery_box()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid    := auth.uid();
  v_today       date    := (NOW() AT TIME ZONE 'Asia/Riyadh')::date;
  v_completed   int;
  v_nova_reward decimal;
  v_aura_reward decimal;
  v_wallet_id   uuid;
  v_balance     decimal;
  v_roll        float;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Must have completed ≥ 3 missions today
  SELECT COUNT(*) INTO v_completed
  FROM public.user_mission_progress p
  JOIN public.daily_missions m ON m.id = p.mission_id
  WHERE p.user_id = v_user_id AND p.mission_date = v_today
    AND p.completed_at IS NOT NULL AND m.is_active = true;

  IF v_completed < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Complete 3 missions first');
  END IF;

  -- Already opened today?
  IF EXISTS (SELECT 1 FROM public.mystery_box_rewards WHERE user_id = v_user_id AND reward_date = v_today) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Box already opened today');
  END IF;

  -- Random reward pool
  v_roll := random();
  IF    v_roll < 0.05 THEN v_nova_reward := 50; v_aura_reward := 0;   -- 5%  jackpot
  ELSIF v_roll < 0.15 THEN v_nova_reward := 20; v_aura_reward := 0;   -- 10%
  ELSIF v_roll < 0.35 THEN v_nova_reward := 10; v_aura_reward := 0;   -- 20%
  ELSIF v_roll < 0.60 THEN v_nova_reward := 5;  v_aura_reward := 0;   -- 25%
  ELSIF v_roll < 0.80 THEN v_nova_reward := 2;  v_aura_reward := 5;   -- 20%
  ELSE                      v_nova_reward := 1;  v_aura_reward := 10;  -- 20% common
  END IF;

  -- Record box opening
  INSERT INTO public.mystery_box_rewards (user_id, reward_date, nova_amount, aura_amount)
  VALUES (v_user_id, v_today, v_nova_reward, v_aura_reward);

  -- Credit rewards
  SELECT id, nova_balance INTO v_wallet_id, v_balance
  FROM public.wallets WHERE user_id = v_user_id LIMIT 1;

  IF FOUND THEN
    UPDATE public.wallets SET
      nova_balance = nova_balance + v_nova_reward,
      aura_balance = aura_balance + v_aura_reward
    WHERE id = v_wallet_id;

    INSERT INTO public.wallet_ledger (
      user_id, wallet_id, amount, currency, entry_type,
      description, description_ar, balance_before, balance_after, reference_type, reference_id
    ) VALUES (
      v_user_id, v_wallet_id, v_nova_reward, 'nova', 'mystery_box',
      'Mystery box reward',
      'مكافأة صندوق الغموض',
      v_balance, v_balance + v_nova_reward,
      'mystery_box', v_today::text
    );
  END IF;

  RETURN jsonb_build_object(
    'success',    true,
    'nova',       v_nova_reward,
    'aura',       v_aura_reward
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_daily_missions()                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_mission_progress(text, int)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_mystery_box()                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_award_streak()                TO authenticated;

-- ── 9. Add ledger_entry_type values ──────────────────────────────────────────
ALTER TYPE public.ledger_entry_type ADD VALUE IF NOT EXISTS 'streak_reward';
ALTER TYPE public.ledger_entry_type ADD VALUE IF NOT EXISTS 'mission_reward';
ALTER TYPE public.ledger_entry_type ADD VALUE IF NOT EXISTS 'mystery_box';
ALTER TYPE public.ledger_entry_type ADD VALUE IF NOT EXISTS 'referral_prize';
