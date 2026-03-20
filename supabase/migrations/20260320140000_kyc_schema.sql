-- ══════════════════════════════════════════════════════════════════════════════
-- KYC (Know Your Customer) Schema
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Add kyc_status column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (kyc_status IN ('unverified', 'pending', 'verified', 'rejected'));

-- 2. KYC requests table
CREATE TABLE IF NOT EXISTS public.kyc_requests (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name      TEXT        NOT NULL,
  birth_date     DATE        NOT NULL,
  id_image_url   TEXT        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'verified', 'rejected')),
  admin_notes    TEXT,
  reviewed_by    UUID        REFERENCES auth.users(id),
  reviewed_at    TIMESTAMPTZ,
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast admin queries
CREATE INDEX IF NOT EXISTS kyc_requests_status_idx
  ON public.kyc_requests (status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS kyc_requests_user_id_idx
  ON public.kyc_requests (user_id);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.kyc_requests ENABLE ROW LEVEL SECURITY;

-- Users: see only their own requests
CREATE POLICY "kyc_requests_select_own"
  ON public.kyc_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Users: insert only for themselves (one pending at a time enforced below)
CREATE POLICY "kyc_requests_insert_own"
  ON public.kyc_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins: see all
CREATE POLICY "kyc_requests_admin_select"
  ON public.kyc_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

-- Admins: update status, admin_notes, reviewed_by, reviewed_at
CREATE POLICY "kyc_requests_admin_update"
  ON public.kyc_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

-- ── Function: submit KYC request ─────────────────────────────────────────────
-- Prevents duplicate pending submissions and enforces 18+ age check.
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

-- ── Function: admin review KYC ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_review_kyc(
  p_request_id UUID,
  p_decision   TEXT,   -- 'verified' | 'rejected'
  p_notes      TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_profile_id UUID;
BEGIN
  -- Admin check
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_admin_id
      AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_decision NOT IN ('verified', 'rejected') THEN
    RAISE EXCEPTION 'Decision must be verified or rejected';
  END IF;

  -- Get profile_id from request
  SELECT profile_id INTO v_profile_id
  FROM public.kyc_requests
  WHERE id = p_request_id AND status = 'pending';

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Request not found or already reviewed';
  END IF;

  -- Update the request
  UPDATE public.kyc_requests
  SET
    status      = p_decision,
    admin_notes = p_notes,
    reviewed_by = v_admin_id,
    reviewed_at = NOW()
  WHERE id = p_request_id;

  -- Update profile kyc_status
  UPDATE public.profiles
  SET kyc_status = p_decision, updated_at = NOW()
  WHERE id = v_profile_id;
END;
$$;

-- ── Storage: kyc-documents bucket ────────────────────────────────────────────
-- Create private bucket for ID images (run via Supabase dashboard if needed)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  false,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users upload to their own folder
CREATE POLICY "kyc_storage_upload_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "kyc_storage_read_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyc-documents'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- Admins can read all KYC documents
CREATE POLICY "kyc_storage_admin_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyc-documents'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );
