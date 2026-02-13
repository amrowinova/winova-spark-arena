-- PATCH: Drop the OLD admin_adjust_balance overload that does NOT check auth.uid()
-- This version trusts p_admin_id parameter without verifying the caller
DROP FUNCTION IF EXISTS public.admin_adjust_balance(uuid, uuid, numeric, currency_type, boolean, text);