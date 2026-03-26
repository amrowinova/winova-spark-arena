-- ══════════════════════════════════════════════════════════════════════════════
-- get_referral_leaders RPC
-- Replaces the heavy frontend query that fetched ALL profiles just to count
-- referrals. This runs entirely in Postgres with a single efficient query.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_referral_leaders(
  p_country  text    DEFAULT NULL,
  p_limit    int     DEFAULT 50
)
RETURNS TABLE (
  user_id        uuid,
  display_name   text,
  avatar_url     text,
  country        text,
  referral_count bigint,
  rank           bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.display_name,
    p.avatar_url,
    p.country,
    COUNT(r.user_id) AS referral_count,
    RANK() OVER (ORDER BY COUNT(r.user_id) DESC) AS rank
  FROM profiles p
  INNER JOIN profiles r ON r.referred_by = p.user_id
  WHERE
    (p_country IS NULL OR p.country = p_country)
  GROUP BY p.user_id, p.display_name, p.avatar_url, p.country
  ORDER BY referral_count DESC
  LIMIT p_limit;
$$;

-- get_top_referral_countries — used for the country picker dropdown
CREATE OR REPLACE FUNCTION get_top_referral_countries(p_limit int DEFAULT 20)
RETURNS TABLE (country text, ref_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.country, COUNT(*) AS ref_count
  FROM profiles p
  WHERE p.referred_by IS NOT NULL
    AND p.country IS NOT NULL
  GROUP BY p.country
  ORDER BY ref_count DESC
  LIMIT p_limit;
$$;

-- Grant public access (anon and authenticated)
GRANT EXECUTE ON FUNCTION get_referral_leaders(text, int)           TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_top_referral_countries(int)           TO anon, authenticated;
