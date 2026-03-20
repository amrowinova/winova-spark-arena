-- ══════════════════════════════════════════════════════════════════════════════
-- KYC Security Fixes
-- 1. Validate image URL ownership in submit_kyc_request
-- 2. Expose safe get_my_kyc_request() that hides admin_notes from users
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Fix 1: Rebuild submit_kyc_request with path ownership check ───────────────
CREATE OR REPLACE FUNCTION public.submit_kyc_request(
  p_full_name    TEXT,
  p_birth_date   DATE,
  p_id_image_url TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_profile_id UUID;
  v_request_id UUID;
BEGIN
  -- Must be authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the image URL belongs to this user's storage folder
  -- The storage path structure is: kyc-documents/{user_id}/filename
  -- The signed URL will always contain the user's UUID as a path segment
  IF POSITION(v_user_id::TEXT IN p_id_image_url) = 0 THEN
    RAISE EXCEPTION 'Image does not belong to your account';
  END IF;

  -- Age check: must be 18+
  IF (CURRENT_DATE - p_birth_date) < INTERVAL '18 years' THEN
    RAISE EXCEPTION 'You must be at least 18 years old to verify your account';
  END IF;

  -- Get profile id
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE user_id = v_user_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Block if already verified
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_profile_id AND kyc_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Account is already verified';
  END IF;

  -- Cancel any existing pending request (allow resubmission after rejection)
  UPDATE public.kyc_requests
  SET status = 'rejected', admin_notes = 'Superseded by new submission'
  WHERE user_id = v_user_id AND status = 'pending';

  -- Insert new request
  INSERT INTO public.kyc_requests (user_id, profile_id, full_name, birth_date, id_image_url)
  VALUES (v_user_id, v_profile_id, p_full_name, p_birth_date, p_id_image_url)
  RETURNING id INTO v_request_id;

  -- Update profile status to pending
  UPDATE public.profiles
  SET kyc_status = 'pending', updated_at = NOW()
  WHERE id = v_profile_id;

  RETURN v_request_id;
END;
$$;

-- ── Fix 2: Safe KYC request reader — no admin_notes exposed ──────────────────
CREATE OR REPLACE FUNCTION public.get_my_kyc_request()
RETURNS TABLE (
  id           UUID,
  full_name    TEXT,
  birth_date   DATE,
  id_image_url TEXT,
  status       TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at  TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kr.id,
    kr.full_name,
    kr.birth_date,
    kr.id_image_url,
    kr.status,
    kr.submitted_at,
    kr.reviewed_at
  FROM public.kyc_requests kr
  WHERE kr.user_id = auth.uid()
  ORDER BY kr.submitted_at DESC
  LIMIT 1;
END;
$$;
