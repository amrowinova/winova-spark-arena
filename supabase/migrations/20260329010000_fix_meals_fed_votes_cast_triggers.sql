-- ═══════════════════════════════════════════════════════════════════════
-- Fix meals_fed + votes_cast on profiles
-- These columns were added but never updated. Two triggers fix this:
--   1. After a vote is inserted → increment voter's votes_cast
--   2. After a donation is inserted → increment donor's meals_fed
--      (1 Nova donated ≈ 1 meal, configurable)
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. votes_cast — increment when user casts a vote ─────────────────
CREATE OR REPLACE FUNCTION public.trg_increment_votes_cast()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET votes_cast = COALESCE(votes_cast, 0) + NEW.vote_count
  WHERE user_id = NEW.voter_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_votes_cast_on_vote ON votes;
CREATE TRIGGER trg_votes_cast_on_vote
  AFTER INSERT ON votes
  FOR EACH ROW EXECUTE FUNCTION trg_increment_votes_cast();

-- ── 2. meals_fed — increment when a family donation is inserted ───────
-- Uses 1 Nova = 1 meal (simple, adjustable)
CREATE OR REPLACE FUNCTION public.trg_increment_meals_fed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meals INTEGER;
BEGIN
  v_meals := GREATEST(1, FLOOR(NEW.amount)::INTEGER);
  UPDATE profiles
  SET meals_fed = COALESCE(meals_fed, 0) + v_meals
  WHERE user_id = NEW.donor_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_meals_fed_on_donation ON family_donations;
CREATE TRIGGER trg_meals_fed_on_donation
  AFTER INSERT ON family_donations
  FOR EACH ROW EXECUTE FUNCTION trg_increment_meals_fed();

-- ── 3. RPC: get_user_donation_impact — fix to return correct values ───
CREATE OR REPLACE FUNCTION public.get_user_donation_impact(p_user_id UUID)
RETURNS TABLE (
  total_donated       NUMERIC,
  families_supported  BIGINT,
  meals_fed           INTEGER,
  votes_cast          INTEGER,
  donations_count     BIGINT,
  recent_donations    JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(fd.amount), 0)::NUMERIC                        AS total_donated,
    COUNT(DISTINCT fd.family_id)                                AS families_supported,
    COALESCE(p.meals_fed, 0)                                    AS meals_fed,
    COALESCE(p.votes_cast, 0)                                   AS votes_cast,
    COUNT(fd.id)                                                AS donations_count,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id',          fd.id,
          'family_id',   fd.family_id,
          'amount',      fd.amount,
          'created_at',  fd.created_at,
          'share_token', fd.share_token
        ) ORDER BY fd.created_at DESC
      ) FILTER (WHERE fd.id IS NOT NULL),
      '[]'::jsonb
    )                                                           AS recent_donations
  FROM profiles p
  LEFT JOIN family_donations fd ON fd.donor_id = p.user_id
  WHERE p.user_id = p_user_id
  GROUP BY p.meals_fed, p.votes_cast;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_donation_impact TO authenticated;
