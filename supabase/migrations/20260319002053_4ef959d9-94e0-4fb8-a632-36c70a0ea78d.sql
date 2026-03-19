-- Fix audit_logs.entity_id to accept text values (wallet IDs, user IDs, etc.)
ALTER TABLE public.audit_logs ALTER COLUMN entity_id TYPE text USING entity_id::text;