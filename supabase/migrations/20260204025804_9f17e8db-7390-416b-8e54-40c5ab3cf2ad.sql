-- Drop the unique constraint on agent_role to allow multiple agents per role
ALTER TABLE public.ai_agents DROP CONSTRAINT IF EXISTS ai_agents_agent_role_key;