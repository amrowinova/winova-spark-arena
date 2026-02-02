-- RPC: Get weekly points for a user grouped by day (for weekly chart)
-- Returns daily points for current week from spotlight_user_points
CREATE OR REPLACE FUNCTION public.get_weekly_points_chart(
  p_user_id UUID,
  p_cycle_id UUID
)
RETURNS TABLE(
  day_of_week INTEGER,
  points_date DATE,
  total_points INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_week INTEGER;
  v_week_start DATE;
  v_week_end DATE;
  v_cycle_start DATE;
BEGIN
  -- Get cycle start date
  SELECT start_date INTO v_cycle_start
  FROM spotlight_cycles
  WHERE id = p_cycle_id;
  
  IF v_cycle_start IS NULL THEN
    RETURN;
  END IF;
  
  -- Calculate current week number (1-indexed)
  v_current_week := GREATEST(1, CEIL((CURRENT_DATE - v_cycle_start + 1)::NUMERIC / 7));
  
  -- Calculate week start/end dates
  v_week_start := v_cycle_start + ((v_current_week - 1) * 7);
  v_week_end := v_week_start + 6;
  
  -- Return points grouped by day for current week
  RETURN QUERY
  SELECT 
    EXTRACT(ISODOW FROM sup.points_date)::INTEGER AS day_of_week,
    sup.points_date,
    COALESCE(SUM(sup.daily_points), 0)::INTEGER AS total_points
  FROM spotlight_user_points sup
  WHERE sup.user_id = p_user_id
    AND sup.cycle_id = p_cycle_id
    AND sup.points_date >= v_week_start
    AND sup.points_date <= v_week_end
  GROUP BY sup.points_date
  ORDER BY sup.points_date;
END;
$function$;

-- RPC: Get cycle progress info (days elapsed, remaining, percentage)
CREATE OR REPLACE FUNCTION public.get_cycle_progress(p_cycle_id UUID DEFAULT NULL)
RETURNS TABLE(
  cycle_id UUID,
  cycle_number INTEGER,
  start_date DATE,
  end_date DATE,
  total_days INTEGER,
  current_day INTEGER,
  days_remaining INTEGER,
  progress_percentage NUMERIC,
  current_week INTEGER,
  total_weeks INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cycle spotlight_cycles%ROWTYPE;
  v_current_day INTEGER;
  v_days_remaining INTEGER;
  v_progress NUMERIC;
  v_current_week INTEGER;
BEGIN
  -- Get active cycle or specific cycle
  IF p_cycle_id IS NULL THEN
    SELECT * INTO v_cycle
    FROM spotlight_cycles
    WHERE status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
  ELSE
    SELECT * INTO v_cycle
    FROM spotlight_cycles
    WHERE id = p_cycle_id;
  END IF;
  
  IF v_cycle.id IS NULL THEN
    RETURN;
  END IF;
  
  -- Calculate progress
  v_current_day := GREATEST(1, LEAST(
    v_cycle.total_days,
    (CURRENT_DATE - v_cycle.start_date + 1)::INTEGER
  ));
  
  v_days_remaining := GREATEST(0, v_cycle.total_days - v_current_day);
  v_progress := ROUND((v_current_day::NUMERIC / v_cycle.total_days::NUMERIC) * 100, 1);
  v_current_week := CEIL(v_current_day::NUMERIC / 7);
  
  RETURN QUERY
  SELECT 
    v_cycle.id,
    v_cycle.cycle_number,
    v_cycle.start_date,
    v_cycle.end_date,
    v_cycle.total_days,
    v_current_day,
    v_days_remaining,
    v_progress,
    v_current_week,
    v_cycle.total_weeks;
END;
$function$;