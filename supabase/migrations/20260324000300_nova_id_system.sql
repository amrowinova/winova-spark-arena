-- ============================================================
-- NOVA ID SYSTEM
-- Format: {ISO2}-{NNNNNN} e.g. EG-000001, SA-000042
-- Auto-expands digits when country exceeds 999999 users
-- ============================================================

-- ── Country → ISO 2-letter code ───────────────────────────

CREATE OR REPLACE FUNCTION public.country_to_iso2(p_country TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    -- Arab World
    WHEN p_country ILIKE '%egypt%'                                        THEN 'EG'
    WHEN p_country ILIKE '%saudi%'                                        THEN 'SA'
    WHEN p_country ILIKE '%uae%' OR p_country ILIKE '%emirates%'          THEN 'AE'
    WHEN p_country ILIKE '%kuwait%'                                       THEN 'KW'
    WHEN p_country ILIKE '%qatar%'                                        THEN 'QA'
    WHEN p_country ILIKE '%bahrain%'                                      THEN 'BH'
    WHEN p_country ILIKE '%oman%'                                         THEN 'OM'
    WHEN p_country ILIKE '%jordan%'                                       THEN 'JO'
    WHEN p_country ILIKE '%lebanon%'                                      THEN 'LB'
    WHEN p_country ILIKE '%iraq%'                                         THEN 'IQ'
    WHEN p_country ILIKE '%syria%'                                        THEN 'SY'
    WHEN p_country ILIKE '%yemen%'                                        THEN 'YE'
    WHEN p_country ILIKE '%libya%'                                        THEN 'LY'
    WHEN p_country ILIKE '%tunisia%'                                      THEN 'TN'
    WHEN p_country ILIKE '%algeria%'                                      THEN 'DZ'
    WHEN p_country ILIKE '%morocco%'                                      THEN 'MA'
    WHEN p_country ILIKE '%sudan%'                                        THEN 'SD'
    WHEN p_country ILIKE '%mauritania%'                                   THEN 'MR'
    WHEN p_country ILIKE '%somalia%'                                      THEN 'SO'
    WHEN p_country ILIKE '%comoros%'                                      THEN 'KM'
    WHEN p_country ILIKE '%djibouti%'                                     THEN 'DJ'
    -- South & SE Asia
    WHEN p_country ILIKE '%pakistan%'                                     THEN 'PK'
    WHEN p_country ILIKE '%india%'                                        THEN 'IN'
    WHEN p_country ILIKE '%bangladesh%'                                   THEN 'BD'
    WHEN p_country ILIKE '%indonesia%'                                    THEN 'ID'
    WHEN p_country ILIKE '%malaysia%'                                     THEN 'MY'
    WHEN p_country ILIKE '%philippines%'                                  THEN 'PH'
    WHEN p_country ILIKE '%sri lanka%'                                    THEN 'LK'
    WHEN p_country ILIKE '%nepal%'                                        THEN 'NP'
    WHEN p_country ILIKE '%myanmar%' OR p_country ILIKE '%burma%'         THEN 'MM'
    WHEN p_country ILIKE '%thailand%'                                     THEN 'TH'
    WHEN p_country ILIKE '%vietnam%'                                      THEN 'VN'
    -- Europe
    WHEN p_country ILIKE '%germany%'                                      THEN 'DE'
    WHEN p_country ILIKE '%france%'                                       THEN 'FR'
    WHEN p_country ILIKE '%netherlands%'                                  THEN 'NL'
    WHEN p_country ILIKE '%spain%'                                        THEN 'ES'
    WHEN p_country ILIKE '%italy%'                                        THEN 'IT'
    WHEN p_country ILIKE '%turkey%' OR p_country ILIKE '%türkiye%'        THEN 'TR'
    WHEN p_country ILIKE '%uk%' OR p_country ILIKE '%united kingdom%'
         OR p_country ILIKE '%britain%'                                   THEN 'GB'
    WHEN p_country ILIKE '%russia%'                                       THEN 'RU'
    WHEN p_country ILIKE '%poland%'                                       THEN 'PL'
    WHEN p_country ILIKE '%sweden%'                                       THEN 'SE'
    WHEN p_country ILIKE '%norway%'                                       THEN 'NO'
    WHEN p_country ILIKE '%denmark%'                                      THEN 'DK'
    WHEN p_country ILIKE '%belgium%'                                      THEN 'BE'
    WHEN p_country ILIKE '%switzerland%'                                  THEN 'CH'
    WHEN p_country ILIKE '%austria%'                                      THEN 'AT'
    WHEN p_country ILIKE '%greece%'                                       THEN 'GR'
    WHEN p_country ILIKE '%portugal%'                                     THEN 'PT'
    -- Americas
    WHEN p_country ILIKE '%usa%' OR p_country ILIKE '%united states%'     THEN 'US'
    WHEN p_country ILIKE '%canada%'                                       THEN 'CA'
    WHEN p_country ILIKE '%brazil%'                                       THEN 'BR'
    WHEN p_country ILIKE '%mexico%'                                       THEN 'MX'
    WHEN p_country ILIKE '%argentina%'                                    THEN 'AR'
    WHEN p_country ILIKE '%colombia%'                                     THEN 'CO'
    WHEN p_country ILIKE '%chile%'                                        THEN 'CL'
    -- Africa
    WHEN p_country ILIKE '%nigeria%'                                      THEN 'NG'
    WHEN p_country ILIKE '%kenya%'                                        THEN 'KE'
    WHEN p_country ILIKE '%ghana%'                                        THEN 'GH'
    WHEN p_country ILIKE '%ethiopia%'                                     THEN 'ET'
    WHEN p_country ILIKE '%south africa%'                                 THEN 'ZA'
    WHEN p_country ILIKE '%tanzania%'                                     THEN 'TZ'
    WHEN p_country ILIKE '%uganda%'                                       THEN 'UG'
    WHEN p_country ILIKE '%cameroon%'                                     THEN 'CM'
    -- Other
    WHEN p_country ILIKE '%iran%'                                         THEN 'IR'
    WHEN p_country ILIKE '%afghanistan%'                                  THEN 'AF'
    WHEN p_country ILIKE '%china%'                                        THEN 'CN'
    WHEN p_country ILIKE '%japan%'                                        THEN 'JP'
    WHEN p_country ILIKE '%south korea%' OR p_country ILIKE '%korea%'     THEN 'KR'
    WHEN p_country ILIKE '%australia%'                                    THEN 'AU'
    WHEN p_country ILIKE '%new zealand%'                                  THEN 'NZ'
    ELSE 'XX'
  END
$$;

-- ── Counter table (one row per country code) ──────────────

CREATE TABLE IF NOT EXISTS public.nova_id_counters (
  country_code TEXT    PRIMARY KEY,
  last_value   BIGINT  NOT NULL DEFAULT 0
);

ALTER TABLE public.nova_id_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nova_id_counters_admin_only" ON public.nova_id_counters
  USING (public.has_role(auth.uid(), 'admin'));

-- ── Atomic ID generator ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.next_nova_id(p_country TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code   TEXT   := public.country_to_iso2(p_country);
  v_next   BIGINT;
  v_digits INT;
BEGIN
  INSERT INTO public.nova_id_counters (country_code, last_value)
    VALUES (v_code, 1)
    ON CONFLICT (country_code) DO UPDATE
      SET last_value = nova_id_counters.last_value + 1
    RETURNING last_value INTO v_next;

  -- Auto-expand digit width as needed (min 6)
  v_digits := GREATEST(6, length(v_next::TEXT));

  RETURN v_code || '-' || lpad(v_next::TEXT, v_digits, '0');
END;
$$;

-- ── Add nova_id column to profiles ───────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nova_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_nova_id
  ON public.profiles (UPPER(nova_id));

-- ── Trigger: auto-assign on INSERT ───────────────────────

CREATE OR REPLACE FUNCTION public.trg_assign_nova_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.nova_id IS NULL THEN
    NEW.nova_id := public.next_nova_id(COALESCE(NEW.country, 'Unknown'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_nova_id ON public.profiles;
CREATE TRIGGER trg_assign_nova_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_assign_nova_id();

-- ── Backfill existing profiles ────────────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, country
      FROM public.profiles
     WHERE nova_id IS NULL
     ORDER BY created_at ASC
  LOOP
    UPDATE public.profiles
       SET nova_id = public.next_nova_id(COALESCE(r.country, 'Unknown'))
     WHERE id = r.id
       AND nova_id IS NULL;   -- guard against concurrent update
  END LOOP;
END;
$$;

-- ── RPC: search by Nova ID (for PayUser / transfers) ─────

CREATE OR REPLACE FUNCTION public.find_user_by_nova_id(p_nova_id TEXT)
RETURNS TABLE (
  user_id    UUID,
  username   TEXT,
  full_name  TEXT,
  avatar_url TEXT,
  nova_id    TEXT,
  country    TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.username,
    p.name    AS full_name,
    p.avatar_url,
    p.nova_id,
    p.country
  FROM public.profiles p
  WHERE UPPER(TRIM(p.nova_id)) = UPPER(TRIM(p_nova_id))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_user_by_nova_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_by_nova_id TO anon;

-- ── RPC: lookup by referral code OR nova_id ───────────────
-- Used by ReferralLanding to accept both old codes and nova_id

CREATE OR REPLACE FUNCTION public.find_referrer_by_code(p_code TEXT)
RETURNS TABLE (
  id           UUID,
  user_id      UUID,
  name         TEXT,
  username     TEXT,
  avatar_url   TEXT,
  country      TEXT,
  rank         TEXT,
  active_weeks INTEGER,
  referral_code TEXT,
  nova_id      TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.user_id, p.name, p.username, p.avatar_url,
    p.country, p.rank::TEXT, p.active_weeks, p.referral_code, p.nova_id
  FROM public.profiles p
  WHERE UPPER(TRIM(p.referral_code)) = UPPER(TRIM(p_code))
     OR UPPER(TRIM(p.nova_id))       = UPPER(TRIM(p_code))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_referrer_by_code TO anon;
GRANT EXECUTE ON FUNCTION public.find_referrer_by_code TO authenticated;
