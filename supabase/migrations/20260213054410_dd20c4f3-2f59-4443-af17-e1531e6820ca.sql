
-- Drop the OLD permissive "true" ALL policies that weren't removed 
-- (migration partially applied before failure, policies were created but old ones weren't dropped)
DROP POLICY IF EXISTS "Service role full access to agent_performance_metrics" ON public.agent_performance_metrics;
DROP POLICY IF EXISTS "Service role full access to commander_reviews" ON public.commander_reviews;
DROP POLICY IF EXISTS "Service role full access on EUL" ON public.executive_understanding_reports;
DROP POLICY IF EXISTS "Service role can manage intelligence metrics" ON public.intelligence_metrics;
DROP POLICY IF EXISTS "Service role manages learning signals" ON public.learning_signals;
DROP POLICY IF EXISTS "Service can manage project_activity" ON public.project_activity;
DROP POLICY IF EXISTS "Service can manage project_agents" ON public.project_agents;
DROP POLICY IF EXISTS "Service can manage project_artifacts" ON public.project_artifacts;
DROP POLICY IF EXISTS "Service can manage project_files" ON public.project_files;
DROP POLICY IF EXISTS "Service can manage project_phases" ON public.project_phases;
