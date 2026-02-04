-- =====================================================
-- AI SIMULATION SYSTEM FOR WINOVA
-- Read-only analysis, clearly flagged, excluded from KPIs
-- =====================================================

-- 1. AI Agent Role Enum
CREATE TYPE public.ai_agent_role AS ENUM (
  'user_tester',
  'marketer_growth', 
  'leader_team',
  'manager_stats',
  'backend_engineer',
  'system_architect'
);

-- 2. AI Agents Registry Table
CREATE TABLE public.ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  agent_role ai_agent_role NOT NULL,
  agent_name TEXT NOT NULL,
  agent_name_ar TEXT NOT NULL,
  focus_areas TEXT[] NOT NULL DEFAULT '{}',
  behavior_description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_analysis_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_role)
);

-- 3. AI Analysis Logs (what the AI found)
CREATE TABLE public.ai_analysis_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE NOT NULL,
  analysis_type TEXT NOT NULL, -- 'finding', 'bug', 'risk', 'recommendation'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT NOT NULL,
  description_ar TEXT,
  technical_reason TEXT, -- WHY it happens
  suggested_fix TEXT, -- description only
  affected_area TEXT, -- 'auth', 'team', 'wallet', 'p2p', 'contest', etc.
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'acknowledged', 'fixed', 'wontfix'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. AI Internal Chat Room
CREATE TABLE public.ai_chat_room (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  content_ar TEXT, -- Primary language is Arabic
  message_type TEXT NOT NULL DEFAULT 'discussion', -- 'discussion', 'finding', 'question', 'response'
  reply_to_id UUID REFERENCES ai_chat_room(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Add is_ai flag to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_ai BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_role TEXT;

-- 6. Enable RLS
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_room ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies - Only admins can manage AI system
CREATE POLICY "Admins can manage AI agents"
ON ai_agents FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Support staff can view AI agents"
ON ai_agents FOR SELECT
USING (is_support_staff(auth.uid()));

CREATE POLICY "Admins can manage AI analysis logs"
ON ai_analysis_logs FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Support staff can view AI analysis"
ON ai_analysis_logs FOR SELECT
USING (is_support_staff(auth.uid()));

CREATE POLICY "Admins can manage AI chat"
ON ai_chat_room FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Support staff can view AI chat"
ON ai_chat_room FOR SELECT
USING (is_support_staff(auth.uid()));

-- 8. Index for efficient queries
CREATE INDEX idx_ai_analysis_severity ON ai_analysis_logs(severity);
CREATE INDEX idx_ai_analysis_status ON ai_analysis_logs(status);
CREATE INDEX idx_ai_analysis_area ON ai_analysis_logs(affected_area);
CREATE INDEX idx_ai_chat_created ON ai_chat_room(created_at DESC);
CREATE INDEX idx_profiles_is_ai ON profiles(is_ai) WHERE is_ai = true;

-- 9. Function to exclude AI users from real stats
CREATE OR REPLACE FUNCTION public.is_real_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT COALESCE(
    (SELECT is_ai FROM profiles WHERE user_id = p_user_id),
    false
  )
$$;

-- 10. Trigger to update ai_agents.updated_at
CREATE OR REPLACE FUNCTION update_ai_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ai_agents_updated_at
BEFORE UPDATE ON ai_agents
FOR EACH ROW
EXECUTE FUNCTION update_ai_agents_updated_at();