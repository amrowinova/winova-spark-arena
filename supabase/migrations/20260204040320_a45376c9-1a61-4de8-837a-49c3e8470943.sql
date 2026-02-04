-- Add new AI agent roles for the full engineering organization
ALTER TYPE ai_agent_role ADD VALUE IF NOT EXISTS 'system_sentinel';
ALTER TYPE ai_agent_role ADD VALUE IF NOT EXISTS 'chaos_engineer';
ALTER TYPE ai_agent_role ADD VALUE IF NOT EXISTS 'implementation_engineer';
ALTER TYPE ai_agent_role ADD VALUE IF NOT EXISTS 'product_owner';
ALTER TYPE ai_agent_role ADD VALUE IF NOT EXISTS 'fintech_specialist';
ALTER TYPE ai_agent_role ADD VALUE IF NOT EXISTS 'integrations_specialist';
ALTER TYPE ai_agent_role ADD VALUE IF NOT EXISTS 'security_specialist';
ALTER TYPE ai_agent_role ADD VALUE IF NOT EXISTS 'growth_analyst';