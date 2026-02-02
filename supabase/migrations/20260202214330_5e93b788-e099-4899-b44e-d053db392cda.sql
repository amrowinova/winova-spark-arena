-- Create spotlight_cycles table to track 98-day cycles
CREATE TABLE public.spotlight_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL DEFAULT 98,
  total_weeks INTEGER NOT NULL DEFAULT 14,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'upcoming')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create spotlight_daily_draws table for daily lucky winners
CREATE TABLE public.spotlight_daily_draws (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.spotlight_cycles(id) ON DELETE CASCADE,
  draw_date DATE NOT NULL,
  total_pool NUMERIC NOT NULL DEFAULT 0,
  first_place_user_id UUID REFERENCES auth.users(id),
  first_place_prize NUMERIC DEFAULT 0,
  first_place_percentage INTEGER DEFAULT 65,
  second_place_user_id UUID REFERENCES auth.users(id),
  second_place_prize NUMERIC DEFAULT 0,
  second_place_percentage INTEGER DEFAULT 35,
  is_announced BOOLEAN NOT NULL DEFAULT false,
  announced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create spotlight_user_points table to track daily and weekly points per user
CREATE TABLE public.spotlight_user_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES public.spotlight_cycles(id) ON DELETE CASCADE,
  points_date DATE NOT NULL,
  week_number INTEGER NOT NULL,
  daily_points INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'activity' CHECK (source IN ('activity', 'contest', 'vote', 'p2p', 'referral', 'bonus')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, cycle_id, points_date, source)
);

-- Create index for faster queries
CREATE INDEX idx_spotlight_user_points_user_cycle ON public.spotlight_user_points(user_id, cycle_id);
CREATE INDEX idx_spotlight_user_points_date ON public.spotlight_user_points(points_date);
CREATE INDEX idx_spotlight_daily_draws_date ON public.spotlight_daily_draws(draw_date);
CREATE INDEX idx_spotlight_cycles_status ON public.spotlight_cycles(status);

-- Enable RLS
ALTER TABLE public.spotlight_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spotlight_daily_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spotlight_user_points ENABLE ROW LEVEL SECURITY;

-- RLS Policies for spotlight_cycles (readable by everyone)
CREATE POLICY "Anyone can view spotlight cycles"
ON public.spotlight_cycles FOR SELECT
USING (true);

-- RLS Policies for spotlight_daily_draws (readable by everyone)
CREATE POLICY "Anyone can view daily draws"
ON public.spotlight_daily_draws FOR SELECT
USING (true);

-- RLS Policies for spotlight_user_points
CREATE POLICY "Users can view their own points"
ON public.spotlight_user_points FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view points for rankings"
ON public.spotlight_user_points FOR SELECT
USING (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.spotlight_daily_draws;

-- Insert initial active cycle (starting from today, 98 days)
INSERT INTO public.spotlight_cycles (cycle_number, start_date, end_date, total_days, total_weeks, status)
VALUES (1, CURRENT_DATE, CURRENT_DATE + INTERVAL '97 days', 98, 14, 'active');