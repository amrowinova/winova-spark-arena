
-- Add performance_analyst role to ai_agent_role enum
ALTER TYPE public.ai_agent_role ADD VALUE IF NOT EXISTS 'performance_analyst';
