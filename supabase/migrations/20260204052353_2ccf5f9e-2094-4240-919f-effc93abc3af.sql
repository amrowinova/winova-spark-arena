-- Step 1: Add screen owner roles to the enum only
ALTER TYPE public.ai_agent_role ADD VALUE IF NOT EXISTS 'screen_home_owner';
ALTER TYPE public.ai_agent_role ADD VALUE IF NOT EXISTS 'screen_wallet_owner';
ALTER TYPE public.ai_agent_role ADD VALUE IF NOT EXISTS 'screen_p2p_owner';
ALTER TYPE public.ai_agent_role ADD VALUE IF NOT EXISTS 'screen_p2p_chat_owner';
ALTER TYPE public.ai_agent_role ADD VALUE IF NOT EXISTS 'screen_dm_chat_owner';
ALTER TYPE public.ai_agent_role ADD VALUE IF NOT EXISTS 'screen_contests_owner';
ALTER TYPE public.ai_agent_role ADD VALUE IF NOT EXISTS 'screen_profile_owner';
ALTER TYPE public.ai_agent_role ADD VALUE IF NOT EXISTS 'screen_team_owner';
ALTER TYPE public.ai_agent_role ADD VALUE IF NOT EXISTS 'screen_admin_owner';