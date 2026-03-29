-- ============================================================
-- WEEKLY STREAK + DRAW WINNER EXCLUSION
--
-- 1. profiles.weekly_streak — consecutive active-week counter
--    increments on each completed active week, resets on miss
-- 2. update_weekly_streaks() — called by contest-scheduler when
--    a new cycle week is detected
-- 3. get_team_hierarchy() — updated to expose weekly_streak
-- 4. run_daily_spotlight_draw() — updated to exclude users who
--    already won in the current cycle (resets on new cycle)
-- ============================================================

-- ── 1. Add weekly_streak column ─────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weekly_streak INTEGER NOT NULL DEFAULT 0;

-- Seed setting key used by contest-scheduler to track the
-- last week for which streaks were already computed.
INSERT INTO public.app_settings (key, value, description)
VALUES (
  'last_streak_updated_week',
  '{"cycle_id": null, "week": 0}'::jsonb,
  'آخر أسبوع تم تحديث الـ streak فيه — يُحدَّث تلقائياً بواسطة contest-scheduler'
)
ON CONFLICT (key) DO NOTHING;

-- ── 2. Batch streak updater ──────────────────────────────────
-- Called once per week (by contest-scheduler on week transition).
-- For every user who has appeared in this cycle:
--   active in p_week_just_completed → streak + 1
--   missed p_week_just_completed    → streak = 0
CREATE OR REPLACE FUNCTION public.update_weekly_streaks(
  p_cycle_id            UUID,
  p_week_just_completed INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles p
  SET
    weekly_streak = CASE
      WHEN EXISTS (
        SELECT 1
        FROM   spotlight_user_points sup
        WHERE  sup.user_id    = p.user_id
          AND  sup.cycle_id   = p_cycle_id
          AND  sup.week_number = p_week_just_completed
          AND  sup.daily_points > 0
      ) THEN p.weekly_streak + 1
      ELSE 0
    END,
    updated_at = now()
  WHERE p.user_id IN (
    -- Only touch users who have ever earned points in this cycle
    SELECT DISTINCT user_id
    FROM   spotlight_user_points
    WHERE  cycle_id = p_cycle_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_weekly_streaks(UUID, INTEGER) TO service_role;

-- ── 3. get_team_hierarchy — add weekly_streak column ────────
DROP FUNCTION IF EXISTS public.get_team_hierarchy(UUID, INT) CASCADE;
CREATE OR REPLACE FUNCTION public.get_team_hierarchy(
  p_leader_id UUID,
  p_max_depth INT DEFAULT 5
)
RETURNS TABLE(
  member_id    UUID,
  level        INT,
  name         TEXT,
  username     TEXT,
  avatar_url   TEXT,
  rank         TEXT,
  weekly_active BOOLEAN,
  active_weeks  INT,
  weekly_streak INT,
  direct_count  BIGINT,
  parent_id     UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH member_direct_counts AS (
    SELECT tm2.leader_id AS member_user_id, COUNT(*) AS cnt
    FROM   team_members tm2
    WHERE  tm2.level = 1
    GROUP  BY tm2.leader_id
  )
  SELECT
    tm.member_id,
    tm.level,
    p.name,
    p.username,
    p.avatar_url,
    p.rank::TEXT,
    p.weekly_active,
    p.active_weeks,
    p.weekly_streak,
    COALESCE(mdc.cnt, 0) AS direct_count,
    CASE
      WHEN tm.level = 1 THEN p_leader_id
      ELSE (
        SELECT tm2.leader_id
        FROM   team_members tm2
        WHERE  tm2.member_id = tm.member_id AND tm2.level = 1
        LIMIT  1
      )
    END AS parent_id
  FROM  team_members tm
  JOIN  profiles p ON p.user_id = tm.member_id
  LEFT  JOIN member_direct_counts mdc ON mdc.member_user_id = tm.member_id
  WHERE tm.leader_id = p_leader_id AND tm.level <= p_max_depth
  ORDER BY tm.level, p.name;
END;
$$;

-- ── 4. run_daily_spotlight_draw — exclude cycle winners ──────
-- Users who have already won (1st or 2nd place) in any draw
-- within the current cycle are excluded from today's draw.
-- Their points continue to accumulate normally; exclusion ends
-- automatically when a new cycle (new cycle_id) begins.
CREATE OR REPLACE FUNCTION public.run_daily_spotlight_draw(
  p_draw_date  DATE    DEFAULT CURRENT_DATE,
  p_total_pool NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle_id           UUID;
  v_week_number        INTEGER;
  v_existing_draw_id   UUID;
  v_draw_id            UUID;
  v_first_user_id      UUID;
  v_second_user_id     UUID;
  v_pool               NUMERIC;
  v_first_prize        NUMERIC;
  v_second_prize       NUMERIC;
BEGIN
  -- ── Step 1: Get active spotlight cycle ───────────────────
  SELECT cycle_id, week_number
  INTO   v_cycle_id, v_week_number
  FROM   get_active_cycle_info();

  IF v_cycle_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_active_cycle');
  END IF;

  -- ── Step 2: Idempotency check ────────────────────────────
  SELECT id INTO v_existing_draw_id
  FROM   spotlight_daily_draws
  WHERE  cycle_id  = v_cycle_id
    AND  draw_date = p_draw_date;

  IF v_existing_draw_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason',  'draw_already_exists',
      'draw_id', v_existing_draw_id
    );
  END IF;

  -- ── Step 3: Resolve prize pool ───────────────────────────
  IF p_total_pool IS NOT NULL THEN
    v_pool := p_total_pool;
  ELSE
    SELECT COALESCE((value->>'daily_pool')::NUMERIC, 0)
    INTO   v_pool
    FROM   app_settings
    WHERE  key = 'spotlight_draw_config';

    IF NOT FOUND THEN v_pool := 0; END IF;
  END IF;

  -- ── Step 4: First place — highest cumulative cycle points
  --           excluding anyone who has already won in this cycle
  SELECT user_id
  INTO   v_first_user_id
  FROM (
    SELECT   user_id, SUM(daily_points) AS total_pts
    FROM     spotlight_user_points
    WHERE    cycle_id    = v_cycle_id
      AND    points_date <= p_draw_date
    GROUP BY user_id
    HAVING   SUM(daily_points) > 0
    -- Exclude prior winners in this cycle
    AND user_id NOT IN (
      SELECT first_place_user_id  FROM spotlight_daily_draws
      WHERE  cycle_id = v_cycle_id AND first_place_user_id IS NOT NULL
      UNION ALL
      SELECT second_place_user_id FROM spotlight_daily_draws
      WHERE  cycle_id = v_cycle_id AND second_place_user_id IS NOT NULL
    )
    ORDER BY total_pts DESC
    LIMIT 1
  ) ranked;

  IF v_first_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_eligible_users');
  END IF;

  -- ── Step 5: Second place — weighted random ───────────────
  --           also excluding prior winners AND the 1st place winner
  SELECT user_id
  INTO   v_second_user_id
  FROM (
    SELECT   user_id, SUM(daily_points) AS total_pts
    FROM     spotlight_user_points
    WHERE    cycle_id    = v_cycle_id
      AND    points_date <= p_draw_date
    GROUP BY user_id
    HAVING   SUM(daily_points) > 0
    AND user_id <> v_first_user_id
    AND user_id NOT IN (
      SELECT first_place_user_id  FROM spotlight_daily_draws
      WHERE  cycle_id = v_cycle_id AND first_place_user_id IS NOT NULL
      UNION ALL
      SELECT second_place_user_id FROM spotlight_daily_draws
      WHERE  cycle_id = v_cycle_id AND second_place_user_id IS NOT NULL
    )
  ) eligible
  ORDER BY random() * total_pts DESC
  LIMIT 1;

  -- ── Step 6: Prize split (65 / 35) ────────────────────────
  v_first_prize  := ROUND(v_pool * 0.65, 2);
  v_second_prize := v_pool - v_first_prize;

  -- ── Step 7: Persist draw record ──────────────────────────
  INSERT INTO spotlight_daily_draws (
    cycle_id, draw_date, total_pool,
    first_place_user_id,  first_place_prize,  first_place_percentage,
    second_place_user_id, second_place_prize, second_place_percentage,
    is_announced, announced_at
  ) VALUES (
    v_cycle_id, p_draw_date, v_pool,
    v_first_user_id,  v_first_prize,  65,
    v_second_user_id, v_second_prize, 35,
    true, now()
  )
  RETURNING id INTO v_draw_id;

  -- ── Step 8: Award prizes when pool > 0 ───────────────────
  IF v_pool > 0 THEN
    PERFORM _award_spotlight_prize(v_first_user_id, v_first_prize, v_draw_id, 1);

    IF v_second_user_id IS NOT NULL AND v_second_prize > 0 THEN
      PERFORM _award_spotlight_prize(v_second_user_id, v_second_prize, v_draw_id, 2);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success',               true,
    'draw_id',               v_draw_id,
    'draw_date',             p_draw_date,
    'total_pool',            v_pool,
    'first_place_user_id',   v_first_user_id,
    'first_place_prize',     v_first_prize,
    'second_place_user_id',  v_second_user_id,
    'second_place_prize',    v_second_prize
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_daily_spotlight_draw(DATE, NUMERIC) TO service_role;
