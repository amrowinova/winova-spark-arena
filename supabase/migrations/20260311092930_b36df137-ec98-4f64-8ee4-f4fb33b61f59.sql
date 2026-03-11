-- ISSUE 4: Add notification/language settings columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notifications_contest boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notifications_earnings boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notifications_p2p boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notifications_chat boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notifications_team boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notifications_system boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en';