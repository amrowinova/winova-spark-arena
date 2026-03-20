-- ══════════════════════════════════════════════════════════════════════════════
-- Social Proof: Platform Stats + Public Leaderboard
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Platform Stats ─────────────────────────────────────────────────────────
-- Returns three live counters:
--   active_users        → profiles with last_seen_at in the past 15 minutes
--   completed_contests  → contests with status = 'completed'
--   total_nova_prizes   → sum of all contest_win entries in wallet_ledger
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS TABLE (
  active_users       BIGINT,
  completed_contests BIGINT,
  total_nova_prizes  NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (
      SELECT COUNT(*)
      FROM public.profiles
      WHERE last_seen_at >= NOW() - INTERVAL '15 minutes'
    )                                                  AS active_users,

    (
      SELECT COUNT(*)
      FROM public.contests
      WHERE status = 'completed'
    )                                                  AS completed_contests,

    (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.wallet_ledger
      WHERE entry_type = 'contest_win'
        AND amount > 0
    )                                                  AS total_nova_prizes;
$$;

-- ── 2. Public Leaderboard ─────────────────────────────────────────────────────
-- Top users by total Nova won from contests. Visible to everyone (no auth required).
CREATE OR REPLACE FUNCTION public.get_public_leaderboard(p_limit INT DEFAULT 10)
RETURNS TABLE (
  rank          BIGINT,
  user_id       UUID,
  name          TEXT,
  username      TEXT,
  avatar_url    TEXT,
  country       TEXT,
  total_nova    NUMERIC,
  contest_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH agg AS (
    SELECT
      wl.user_id,
      SUM(wl.amount)  AS total_nova,
      COUNT(*)        AS contest_count
    FROM public.wallet_ledger wl
    WHERE wl.entry_type = 'contest_win'
      AND wl.amount > 0
    GROUP BY wl.user_id
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY agg.total_nova DESC) AS rank,
    p.user_id,
    p.name,
    p.username,
    p.avatar_url,
    p.country,
    agg.total_nova,
    agg.contest_count
  FROM agg
  JOIN public.profiles p ON p.user_id = agg.user_id
  WHERE p.is_ai = FALSE
  ORDER BY agg.total_nova DESC
  LIMIT p_limit;
$$;

-- Grant execution to anonymous users (public leaderboard)
GRANT EXECUTE ON FUNCTION public.get_platform_stats()            TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_leaderboard(INT)     TO anon;
GRANT EXECUTE ON FUNCTION public.get_platform_stats()            TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_leaderboard(INT)     TO authenticated;
