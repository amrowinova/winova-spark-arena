create schema if not exists extensions;

-- Reinstall extensions in a non-public schema to satisfy linter
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    EXECUTE 'DROP EXTENSION pg_net CASCADE';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    EXECUTE 'DROP EXTENSION pg_cron CASCADE';
  END IF;
END $$;

create extension pg_net with schema extensions;
create extension pg_cron with schema extensions;