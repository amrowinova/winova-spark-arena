-- Part 1: Add new AI agent roles for specialized engineers
ALTER TYPE public.ai_agent_role ADD VALUE IF NOT EXISTS 'android_engineer';
ALTER TYPE public.ai_agent_role ADD VALUE IF NOT EXISTS 'ios_engineer';
ALTER TYPE public.ai_agent_role ADD VALUE IF NOT EXISTS 'web_engineer';
ALTER TYPE public.ai_agent_role ADD VALUE IF NOT EXISTS 'challenger_ai';