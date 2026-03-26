-- ══════════════════════════════════════════════════════════════════════════════
-- get_spotlight_data — unified RPC replacing 3 separate queries in useSpotlight
-- Returns cycle info + user points + user rank in a single round-trip.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_spotlight_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle          record;
  v_today          date := (NOW() AT TIME ZONE 'Asia/Riyadh')::date;
  v_yesterday      date := v_today - INTERVAL '1 day';
  v_daily_points   numeric := 0;
  v_cycle_points   numeric := 0;
  v_rank_position  int := 0;
  v_total_in_rank  int := 0;
  v_user_rank      text;
  v_today_draw     jsonb := null;
  v_yesterday_draw jsonb := null;
  v_weekly_data    jsonb := '[]'::jsonb;
BEGIN
  -- 1. Get active cycle
  SELECT * INTO v_cycle
  FROM spotlight_cycles
  WHERE start_date <= v_today AND end_date >= v_today
  LIMIT 1;

  IF v_cycle IS NULL THEN
    RETURN jsonb_build_object(
      'cycle_id', null,
      'current_day', 0,
      'total_days', 98,
      'current_week', 0,
      'total_weeks', 14,
      'days_remaining', 0,
      'progress_pct', 0,
      'daily_points', 0,
      'cycle_points', 0,
      'rank_position', 0,
      'total_in_rank', 0,
      'today_draw', null,
      'yesterday_draw', null,
      'weekly_data', '[]'::jsonb
    );
  END IF;

  -- 2. User points (today + cycle total)
  IF p_user_id IS NOT NULL THEN
    SELECT
      COALESCE(SUM(CASE WHEN points_date = v_today THEN daily_points ELSE 0 END), 0),
      COALESCE(SUM(daily_points), 0)
    INTO v_daily_points, v_cycle_points
    FROM spotlight_user_points
    WHERE user_id = p_user_id AND cycle_id = v_cycle.id;

    -- 3. Weekly breakdown (for chart)
    SELECT jsonb_agg(
      jsonb_build_object('week', week_number, 'points', total_pts)
      ORDER BY week_number
    ) INTO v_weekly_data
    FROM (
      SELECT week_number, SUM(daily_points) AS total_pts
      FROM spotlight_user_points
      WHERE user_id = p_user_id AND cycle_id = v_cycle.id
      GROUP BY week_number
    ) w;

    -- 4. User rank tier
    SELECT rank INTO v_user_rank
    FROM profiles WHERE user_id = p_user_id;

    -- 5. Position within same rank tier
    SELECT
      COUNT(*) FILTER (
        WHERE total > v_cycle_points OR (total = v_cycle_points AND uid < p_user_id)
      ) + 1,
      COUNT(*)
    INTO v_rank_position, v_total_in_rank
    FROM (
      SELECT p.user_id AS uid, COALESCE(SUM(s.daily_points), 0) AS total
      FROM profiles p
      LEFT JOIN spotlight_user_points s
        ON s.user_id = p.user_id AND s.cycle_id = v_cycle.id
      WHERE p.rank = v_user_rank
      GROUP BY p.user_id
    ) sub;
  END IF;

  -- 6. Today's draw
  SELECT jsonb_build_object(
    'total_pool', total_pool,
    'first_user_id', first_place_user_id,
    'first_prize', first_place_prize,
    'first_pct', first_place_percentage,
    'second_user_id', second_place_user_id,
    'second_prize', second_place_prize,
    'second_pct', second_place_percentage,
    'is_announced', is_announced
  ) INTO v_today_draw
  FROM spotlight_daily_draws
  WHERE cycle_id = v_cycle.id AND draw_date = v_today
  LIMIT 1;

  -- 7. Yesterday's draw
  SELECT jsonb_build_object(
    'total_pool', total_pool,
    'first_user_id', first_place_user_id,
    'first_prize', first_place_prize,
    'first_pct', first_place_percentage,
    'second_user_id', second_place_user_id,
    'second_prize', second_place_prize,
    'second_pct', second_place_percentage,
    'is_announced', is_announced
  ) INTO v_yesterday_draw
  FROM spotlight_daily_draws
  WHERE cycle_id = v_cycle.id AND draw_date = v_yesterday
  LIMIT 1;

  RETURN jsonb_build_object(
    'cycle_id',       v_cycle.id,
    'current_day',    (v_today - v_cycle.start_date) + 1,
    'total_days',     (v_cycle.end_date - v_cycle.start_date) + 1,
    'current_week',   CEIL(((v_today - v_cycle.start_date) + 1)::numeric / 7),
    'total_weeks',    14,
    'days_remaining', (v_cycle.end_date - v_today),
    'progress_pct',   ROUND(((v_today - v_cycle.start_date) + 1)::numeric /
                            NULLIF((v_cycle.end_date - v_cycle.start_date) + 1, 0) * 100, 1),
    'daily_points',   v_daily_points,
    'cycle_points',   v_cycle_points,
    'rank_position',  v_rank_position,
    'total_in_rank',  v_total_in_rank,
    'today_draw',     v_today_draw,
    'yesterday_draw', v_yesterday_draw,
    'weekly_data',    COALESCE(v_weekly_data, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_spotlight_data(uuid) TO anon, authenticated;
