-- City & Country Leaderboard RPCs
-- Returns top cities ranked by total Nova won in contests

CREATE OR REPLACE FUNCTION public.get_city_leaderboard()
RETURNS TABLE(
  city        text,
  country     text,
  total_nova  numeric,
  winner_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.city,
    p.country,
    COALESCE(SUM(wl.amount), 0) AS total_nova,
    COUNT(DISTINCT p.user_id)   AS winner_count
  FROM public.profiles p
  JOIN public.wallet_ledger wl ON wl.user_id = p.user_id
  WHERE wl.entry_type = 'contest_win'
    AND wl.amount > 0
    AND p.city IS NOT NULL
    AND p.city <> ''
  GROUP BY p.city, p.country
  ORDER BY total_nova DESC
  LIMIT 20;
$$;

-- Returns top countries ranked by total Nova won in contests

CREATE OR REPLACE FUNCTION public.get_country_leaderboard()
RETURNS TABLE(
  country      text,
  total_nova   numeric,
  winner_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.country,
    COALESCE(SUM(wl.amount), 0) AS total_nova,
    COUNT(DISTINCT p.user_id)   AS winner_count
  FROM public.profiles p
  JOIN public.wallet_ledger wl ON wl.user_id = p.user_id
  WHERE wl.entry_type = 'contest_win'
    AND wl.amount > 0
    AND p.country IS NOT NULL
    AND p.country <> ''
  GROUP BY p.country
  ORDER BY total_nova DESC
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.get_city_leaderboard()    TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_country_leaderboard() TO authenticated, anon;
