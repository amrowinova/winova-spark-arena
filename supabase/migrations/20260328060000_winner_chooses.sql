-- Winner Chooses Feature Migration
-- Add functionality for winners to donate 10% of their prize to families

-- Add winner_donations table
CREATE TABLE IF NOT EXISTS public.winner_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  winner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  prize_amount DECIMAL(15,2) NOT NULL,
  donation_amount DECIMAL(15,2) NOT NULL,
  donation_percentage DECIMAL(5,2) NOT NULL DEFAULT 10.0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  share_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Add impact tracking for voice feeds child feature
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS meals_fed INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS votes_cast INTEGER NOT NULL DEFAULT 0;

-- Add country goodness war tracking
CREATE TABLE IF NOT EXISTS public.country_goodness_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL,
  total_donations DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_votes INTEGER NOT NULL DEFAULT 0,
  total_families_supported INTEGER NOT NULL DEFAULT 0,
  weekly_rank INTEGER,
  last_rank_update TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code)
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_winner_donations_contest_id ON winner_donations(contest_id);
CREATE INDEX IF NOT EXISTS idx_winner_donations_winner_id ON winner_donations(winner_id);
CREATE INDEX IF NOT EXISTS idx_country_goodness_stats_rank ON country_goodness_stats(weekly_rank);
CREATE INDEX IF NOT EXISTS idx_country_goodness_stats_code ON country_goodness_stats(country_code);

-- RLS Policies
ALTER TABLE public.winner_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_goodness_stats ENABLE ROW LEVEL SECURITY;

-- Winner donations policies
CREATE POLICY "Users can view their own winner donations" ON public.winner_donations
  FOR SELECT USING (winner_id = auth.uid());

CREATE POLICY "Users can insert their own winner donations" ON public.winner_donations
  FOR INSERT WITH CHECK (winner_id = auth.uid());

-- Country goodness stats policies (read-only for all users)
CREATE POLICY "All users can view country goodness stats" ON public.country_goodness_stats
  FOR SELECT USING (true);

-- RPC for winner to donate 10% of prize
CREATE OR REPLACE FUNCTION winner_donate_to_family(
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
AS $$
DECLARE
  v_winner_id UUID;
  v_prize_amount DECIMAL;
  v_donation_amount DECIMAL;
  v_donation_id UUID;
  v_share_token TEXT;
  v_contest_status TEXT;
  v_family_name TEXT;
BEGIN
  -- Get current user
  v_winner_id := auth.uid();
  
  -- Validate inputs
  IF v_winner_id IS NULL THEN
    RETURN QUERY SELECT false, NULL, NULL, 'Not authenticated'::TEXT;
    RETURN;
  END IF;
  
  IF p_contest_id IS NULL OR p_family_id IS NULL THEN
    RETURN QUERY SELECT false, NULL, NULL, 'Missing required parameters'::TEXT;
    RETURN;
  END IF;
  
  -- Validate donation percentage
  IF p_donation_percentage <= 0 OR p_donation_percentage > 100 THEN
    RETURN QUERY SELECT false, NULL, NULL, 'Invalid donation percentage'::TEXT;
    RETURN;
  END IF;
  
  -- Get contest info and verify winner
  SELECT 
    prize_pool, 
    status INTO v_prize_amount, v_contest_status
  FROM contests 
  WHERE id = p_contest_id 
  AND winner_id = v_winner_id;
  
  IF v_contest_status IS NULL THEN
    RETURN QUERY SELECT false, NULL, NULL, 'Contest not found or not winner'::TEXT;
    RETURN;
  END IF;
  
  IF v_contest_status != 'completed' THEN
    RETURN QUERY SELECT false, NULL, NULL, 'Contest not completed yet'::TEXT;
    RETURN;
  END IF;
  
  -- Calculate donation amount
  v_donation_amount := (v_prize_amount * p_donation_percentage) / 100;
  
  -- Get family name for notification
  SELECT head_name INTO v_family_name
  FROM families 
  WHERE id = p_family_id;
  
  IF v_family_name IS NULL THEN
    RETURN QUERY SELECT false, NULL, NULL, 'Family not found'::TEXT;
    RETURN;
  END IF;
  
  -- Start transaction
  BEGIN
    -- Create winner donation record
    INSERT INTO winner_donations (
      contest_id,
      winner_id,
      family_id,
      prize_amount,
      donation_amount,
      donation_percentage,
      status
    ) VALUES (
      p_contest_id,
      v_winner_id,
      p_family_id,
      v_prize_amount,
      v_donation_amount,
      p_donation_percentage,
      'pending'
    ) RETURNING id INTO v_donation_id;
    
    -- Generate share token
    v_share_token := encode(
      convert_to(
        v_donation_id::TEXT || '|' || 
        extract(epoch from now())::TEXT,
        'UTF-8'
      ),
      'base64'
    );
    
    -- Update share token
    UPDATE winner_donations 
    SET share_token = v_share_token 
    WHERE id = v_donation_id;
    
    -- Create notification to winner
    INSERT INTO notification_queue (
      user_id,
      type,
      title,
      message,
      data,
      scheduled_at
    ) VALUES (
      v_winner_id,
      'winner_donation_confirmation',
      'Thank you for your generosity!',
      format('You donated %s Nova (%s%% of your prize) to %s family. Your kindness will make a real difference!', 
             v_donation_amount, p_donation_percentage, v_family_name),
      json_build_object(
        'donation_id', v_donation_id,
        'family_id', p_family_id,
        'amount', v_donation_amount,
        'share_token', v_share_token
      ),
      NOW()
    );
    
    -- Create notification to family (if they have an account)
    INSERT INTO notification_queue (
      user_id,
      type,
      title,
      message,
      data,
      scheduled_at
    ) SELECT 
      user_id,
      'winner_donation_received',
      'Special Donation Received!',
      format('A contest winner donated %s Nova to your family from their prize! This is a special honor.', v_donation_amount),
      json_build_object(
        'donation_id', v_donation_id,
        'contest_id', p_contest_id,
        'amount', v_donation_amount
      ),
      NOW()
    FROM families 
    WHERE id = p_family_id 
    AND user_id IS NOT NULL
    AND user_id != v_winner_id;
    
    -- Update winner donation status to completed
    UPDATE winner_donations 
    SET status = 'completed', 
        completed_at = NOW() 
    WHERE id = v_donation_id;
    
    RETURN QUERY SELECT true, v_donation_id, v_share_token, NULL::TEXT;
    
  EXCEPTION WHEN OTHERS THEN
    -- Update donation status to failed
    IF v_donation_id IS NOT NULL THEN
      UPDATE winner_donations 
      SET status = 'failed', 
          error_message = SQLERRM 
      WHERE id = v_donation_id;
    END IF;
    
    RETURN QUERY SELECT false, NULL, NULL, SQLERRM;
  END;
END;
$$;

-- RPC for tracking meal impact from votes
CREATE OR REPLACE FUNCTION track_vote_meal_impact(
  p_user_id UUID DEFAULT auth.uid(),
  p_votes_count INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_meals INTEGER;
  v_current_votes INTEGER;
  v_new_meals INTEGER;
BEGIN
  -- Get current stats
  SELECT meals_fed, votes_cast INTO v_current_meals, v_current_votes
  FROM profiles 
  WHERE user_id = p_user_id;
  
  -- Calculate new meals (1 meal per 10 votes)
  v_new_meals := FLOOR((v_current_votes + p_votes_count) / 10) - FLOOR(v_current_votes / 10);
  
  -- Update profile
  UPDATE profiles 
  SET meals_fed = meals_fed + v_new_meals,
      votes_cast = votes_cast + p_votes_count
  WHERE user_id = p_user_id;
  
  RETURN true;
END;
$$;

-- RPC for updating country goodness stats
CREATE OR REPLACE FUNCTION update_country_goodness_stats()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_country RECORD;
  v_total_donations DECIMAL;
  v_total_votes INTEGER;
  v_total_families INTEGER;
  v_rank INTEGER := 1;
BEGIN
  -- Calculate stats for each country
  FOR v_country IN 
    SELECT 
      COALESCE(u.country_code, 'UNKNOWN') as country_code,
      COALESCE(u.country_name, 'Unknown') as country_name,
      COALESCE(SUM(fs.amount), 0) as total_donations,
      COALESCE(COUNT(DISTINCT cv.id), 0) as total_votes,
      COALESCE(COUNT(DISTINCT f.id), 0) as total_families_supported
    FROM users u
    LEFT JOIN family_supports fs ON u.user_id = fs.user_id
    LEFT JOIN contest_votes cv ON u.user_id = cv.user_id
    LEFT JOIN families f ON fs.family_id = f.id
    WHERE u.country_code IS NOT NULL
    GROUP BY u.country_code, u.country_name
    ORDER BY total_donations DESC
  LOOP
    -- Update or insert country stats
    INSERT INTO country_goodness_stats (
      country_code,
      country_name,
      total_donations,
      total_votes,
      total_families_supported,
      weekly_rank,
      last_rank_update
    ) VALUES (
      v_country.country_code,
      v_country.country_name,
      v_country.total_donations,
      v_country.total_votes,
      v_country.total_families_supported,
      v_rank,
      NOW()
    )
    ON CONFLICT (country_code) 
    DO UPDATE SET
      total_donations = EXCLUDED.total_donations,
      total_votes = EXCLUDED.total_votes,
      total_families_supported = EXCLUDED.total_families_supported,
      weekly_rank = v_rank,
      last_rank_update = NOW();
    
    v_rank := v_rank + 1;
  END LOOP;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION winner_donate_to_family TO authenticated;
GRANT EXECUTE ON FUNCTION track_vote_meal_impact TO authenticated;
GRANT EXECUTE ON FUNCTION update_country_goodness_stats TO authenticated;

-- Add notification templates
INSERT INTO notification_templates (event_type, language, title_template, message_template, icon, action_url) VALUES
-- Winner donation confirmation
('winner_donation_confirmation', 'en', 'Thank you for your generosity!', 'You donated {{amount}} Nova ({{percentage}}% of your prize) to {{family_name}} family. Your kindness will make a real difference!', 'heart', '/my-impact'),
('winner_donation_confirmation', 'ar', 'شكراً لكرمك!', 'تبرعت بمبلغ {{amount}} Nova ({{percentage}}% من جائزتك) لعائلة {{family_name}}. كرمك سيحدث فرقاً حقيقياً!', 'heart', '/my-impact'),

-- Winner donation received by family
('winner_donation_received', 'en', 'Special Donation Received!', 'A contest winner donated {{amount}} Nova to your family from their prize! This is a special honor.', 'trophy', '/giving/thank-you'),
('winner_donation_received', 'ar', 'تبرع خاص تم استلامه!', 'تبرع فائز مسابقة بمبلغ {{amount}} Nova لعائلتك من جائزته! هذا شرف خاص.', 'trophy', '/giving/thank-you'),

-- Country ranking changed
('country_ranking_changed', 'en', 'Country Ranking Updated! 🏆', 'Your country is now ranked #{{rank}} in the Country Goodness War! Keep up the great work!', 'flag', '/giving'),
('country_ranking_changed', 'ar', 'تحديث ترتيب الدولة! 🏆', 'دولتك الآن في المرتبة #{{rank}} في حرب الخير بين الدول! استمر في العمل الرائع!', 'flag', '/giving'),

-- Weekly country winner
('weekly_country_winner', 'en', 'Your Country Won! 🎉', 'Congratulations! Your country won this week''s Country Goodness War and will support 10 additional families!', 'trophy', '/giving'),
('weekly_country_winner', 'ar', 'دولتك فازت! 🎉', 'مبارك! دولتك فازت في حرب الخير بين الدول هذا الأسبوع وستدعم 10 عائلات إضافية!', 'trophy', '/giving');
