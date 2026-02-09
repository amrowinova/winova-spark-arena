
-- ─── Performance Stats Functions for AI Agent ───────────────

-- 1) Table-level performance stats
CREATE OR REPLACE FUNCTION public.get_table_performance_stats()
RETURNS TABLE(
  schema_name text,
  table_name text,
  row_estimate bigint,
  total_size text,
  table_size text,
  index_size text,
  seq_scan bigint,
  seq_tup_read bigint,
  idx_scan bigint,
  n_live_tup bigint,
  n_dead_tup bigint,
  last_vacuum timestamptz,
  last_autovacuum timestamptz,
  last_analyze timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    schemaname::text AS schema_name,
    relname::text AS table_name,
    n_live_tup AS row_estimate,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || relname)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname || '.' || relname)) AS table_size,
    pg_size_pretty(pg_indexes_size(schemaname || '.' || relname)) AS index_size,
    seq_scan,
    seq_tup_read,
    COALESCE(idx_scan, 0) AS idx_scan,
    n_live_tup,
    n_dead_tup,
    last_vacuum,
    last_autovacuum,
    last_analyze
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname || '.' || relname) DESC
  LIMIT 50;
$$;

-- 2) Index usage stats
CREATE OR REPLACE FUNCTION public.get_index_usage_stats()
RETURNS TABLE(
  schema_name text,
  table_name text,
  index_name text,
  index_size text,
  idx_scan bigint,
  idx_tup_read bigint,
  idx_tup_fetch bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    schemaname::text AS schema_name,
    relname::text AS table_name,
    indexrelname::text AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
  ORDER BY idx_scan ASC
  LIMIT 50;
$$;

-- 3) Slow/heavy query patterns from pg_stat_statements (if available)
CREATE OR REPLACE FUNCTION public.get_slow_query_stats()
RETURNS TABLE(
  query_text text,
  calls bigint,
  total_exec_time double precision,
  mean_exec_time double precision,
  rows_returned bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if pg_stat_statements extension is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
    RETURN QUERY
    SELECT
      left(s.query, 200) AS query_text,
      s.calls,
      s.total_exec_time,
      s.mean_exec_time,
      s.rows AS rows_returned
    FROM pg_stat_statements s
    WHERE s.calls > 5
    ORDER BY s.mean_exec_time DESC
    LIMIT 20;
  ELSE
    -- Return empty if extension not available
    RETURN;
  END IF;
END;
$$;

-- 4) Database size overview
CREATE OR REPLACE FUNCTION public.get_database_size_overview()
RETURNS TABLE(
  total_db_size text,
  total_tables int,
  largest_table text,
  largest_table_size text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pg_size_pretty(pg_database_size(current_database())) AS total_db_size,
    (SELECT count(*)::int FROM pg_stat_user_tables WHERE schemaname = 'public') AS total_tables,
    (SELECT relname FROM pg_stat_user_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname || '.' || relname) DESC LIMIT 1) AS largest_table,
    (SELECT pg_size_pretty(pg_total_relation_size(schemaname || '.' || relname)) FROM pg_stat_user_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname || '.' || relname) DESC LIMIT 1) AS largest_table_size;
$$;
