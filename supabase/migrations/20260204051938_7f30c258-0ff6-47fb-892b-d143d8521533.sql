-- Step 1: Add new engineering roles to the enum only
ALTER TYPE ai_agent_role ADD VALUE IF NOT EXISTS 'system_architect';
ALTER TYPE ai_agent_role ADD VALUE IF NOT EXISTS 'backend_core_engineer';
ALTER TYPE ai_agent_role ADD VALUE IF NOT EXISTS 'database_integrity_engineer';
ALTER TYPE ai_agent_role ADD VALUE IF NOT EXISTS 'security_fraud_engineer';
ALTER TYPE ai_agent_role ADD VALUE IF NOT EXISTS 'wallet_p2p_engineer';
ALTER TYPE ai_agent_role ADD VALUE IF NOT EXISTS 'frontend_systems_engineer';
ALTER TYPE ai_agent_role ADD VALUE IF NOT EXISTS 'admin_panel_engineer';