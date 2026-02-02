-- Drop and recreate get_cycle_progress with updated signature
DROP FUNCTION IF EXISTS public.get_cycle_progress(UUID);

-- IMPROVED get_cycle_progress with fallback to create cycle if needed
CREATE OR REPLACE FUNCTION public.get_cycle_progress(p_cycle_id UUID DEFAULT NULL)
RETURNS TABLE(
  cycle_id UUID,
  cycle_number INT,
  start_date DATE,
  end_date DATE,
  total_days INT,
  total_weeks INT,
  current_day INT,
  current_week INT,
  days_remaining INT,
  progress_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle RECORD;
  v_today DATE := CURRENT_DATE;
  v_current_day INT;
  v_current_week INT;
  v_days_remaining INT;
  v_progress NUMERIC;
BEGIN
  -- Find the active cycle
  IF p_cycle_id IS NOT NULL THEN
    SELECT * INTO v_cycle FROM spotlight_cycles sc WHERE sc.id = p_cycle_id;
  ELSE
    SELECT * INTO v_cycle FROM spotlight_cycles sc WHERE sc.status = 'active' LIMIT 1;
  END IF;
  
  -- If no cycle exists, create a default one
  IF v_cycle IS NULL THEN
    INSERT INTO spotlight_cycles (
      cycle_number,
      start_date,
      end_date,
      total_days,
      total_weeks,
      status
    )
    VALUES (
      1,
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '98 days',
      98,
      14,
      'active'
    )
    RETURNING * INTO v_cycle;
  END IF;
  
  -- Calculate progress
  v_current_day := GREATEST(1, LEAST(v_cycle.total_days, 
    (v_today - v_cycle.start_date)::INT + 1));
  v_current_week := GREATEST(1, CEIL(v_current_day::NUMERIC / 7));
  v_days_remaining := GREATEST(0, v_cycle.total_days - v_current_day);
  v_progress := ROUND((v_current_day::NUMERIC / v_cycle.total_days) * 100, 2);
  
  RETURN QUERY SELECT 
    v_cycle.id,
    v_cycle.cycle_number,
    v_cycle.start_date,
    v_cycle.end_date,
    v_cycle.total_days,
    v_cycle.total_weeks,
    v_current_day,
    v_current_week,
    v_days_remaining,
    v_progress;
END;
$$;

-- Add unique constraint to prevent duplicate team entries
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'team_members_unique_relationship'
  ) THEN
    ALTER TABLE team_members 
    ADD CONSTRAINT team_members_unique_relationship 
    UNIQUE (leader_id, member_id);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;