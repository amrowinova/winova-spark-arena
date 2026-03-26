-- ══════════════════════════════════════════════════════════════════════════════
-- Phase 4: Save favorites in DB + team earnings in DB
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. save_user_favorites RPC ────────────────────────────────────────────────
-- Stores giving favorites list in profiles.metadata->giving_favorites
CREATE OR REPLACE FUNCTION public.save_user_favorites(p_family_ids text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;

  UPDATE public.profiles
  SET metadata = COALESCE(metadata, '{}'::jsonb) ||
                 jsonb_build_object('giving_favorites', to_jsonb(p_family_ids))
  WHERE user_id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_user_favorites(text[]) TO authenticated;

-- ── 2. get_user_favorites RPC ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_favorites()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(metadata->'giving_favorites')),
    '{}'::text[]
  )
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_favorites() TO authenticated;

-- ── 3. get_team_earnings_summary RPC ─────────────────────────────────────────
-- Replaces frontend calculation of team commissions from wallet_ledger
CREATE OR REPLACE FUNCTION public.get_team_earnings_summary(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid := COALESCE(p_user_id, auth.uid());
  v_today        date := (NOW() AT TIME ZONE 'Asia/Riyadh')::date;
  v_week_start   date := v_today - EXTRACT(DOW FROM v_today)::int;
  v_month_start  date := DATE_TRUNC('month', v_today)::date;
  v_result       jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_earned',   COALESCE(SUM(amount), 0),
    'today_earned',   COALESCE(SUM(CASE WHEN created_at::date = v_today THEN amount ELSE 0 END), 0),
    'week_earned',    COALESCE(SUM(CASE WHEN created_at::date >= v_week_start THEN amount ELSE 0 END), 0),
    'month_earned',   COALESCE(SUM(CASE WHEN created_at::date >= v_month_start THEN amount ELSE 0 END), 0),
    'tx_count',       COUNT(*)
  ) INTO v_result
  FROM public.wallet_ledger
  WHERE user_id = v_user_id
    AND entry_type IN ('team_commission', 'referral_commission')
    AND amount > 0;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_earnings_summary(uuid) TO authenticated;
