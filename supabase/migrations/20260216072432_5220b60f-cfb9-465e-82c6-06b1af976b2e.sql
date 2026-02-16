
-- Fix the guard trigger to auto-detect SECURITY DEFINER context
-- This is the CRITICAL fix that makes ALL existing RPCs work without modification.
-- In PostgREST, direct API calls have current_user = role GUC (both 'authenticated').
-- SECURITY DEFINER functions change current_user to the function owner (e.g. 'supabase_admin').
-- So: if current_user != role, we're inside a trusted function context.

CREATE OR REPLACE FUNCTION public.guard_wallet_balance_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow bypass if explicitly set by a trusted function
  IF current_setting('app.bypass_wallet_guard', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Allow non-authenticated roles (service_role, postgres, supabase_admin)
  IF current_setting('role', true) NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  -- CRITICAL: Allow SECURITY DEFINER function context.
  -- When a SECURITY DEFINER function runs, current_user becomes the function owner
  -- (typically 'supabase_admin'), while the role GUC stays 'authenticated'.
  -- Direct PostgREST calls have current_user matching the role.
  IF current_user::text IS DISTINCT FROM current_setting('role', true) THEN
    RETURN NEW;
  END IF;

  -- Block direct authenticated user mutations on balance columns
  IF NEW.nova_balance IS DISTINCT FROM OLD.nova_balance
     OR NEW.aura_balance IS DISTINCT FROM OLD.aura_balance
     OR NEW.locked_nova_balance IS DISTINCT FROM OLD.locked_nova_balance THEN
    RAISE EXCEPTION 'Direct balance mutation is forbidden. Use authorized transaction services.';
  END IF;

  RETURN NEW;
END;
$function$;
