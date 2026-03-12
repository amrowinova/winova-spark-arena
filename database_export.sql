-- ============================================================
-- WINOVA COMPLETE DATABASE EXPORT
-- Generated: 2026-03-12
-- ============================================================

-- ============================================================
-- SECTION 1: ENUM TYPES
-- ============================================================

CREATE TYPE public.ai_agent_role AS ENUM ('user_tester', 'marketer_growth', 'leader_team', 'manager_stats', 'backend_engineer', 'system_architect', 'qa_breaker', 'fraud_analyst', 'support_agent', 'power_user', 'contest_judge', 'p2p_moderator', 'android_engineer', 'ios_engineer', 'web_engineer', 'challenger_ai', 'system_sentinel', 'chaos_engineer', 'implementation_engineer', 'product_owner', 'fintech_specialist', 'integrations_specialist', 'security_specialist', 'growth_analyst', 'backend_core_engineer', 'database_integrity_engineer', 'security_fraud_engineer', 'wallet_p2p_engineer', 'frontend_systems_engineer', 'admin_panel_engineer', 'screen_home_owner', 'screen_wallet_owner', 'screen_p2p_owner', 'screen_p2p_chat_owner', 'screen_dm_chat_owner', 'screen_contests_owner', 'screen_profile_owner', 'screen_team_owner', 'screen_admin_owner', 'engineering_lead', 'performance_analyst');

CREATE TYPE public.ai_decision_type AS ENUM ('approve', 'defer', 'reject');

CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'support');

CREATE TYPE public.currency_type AS ENUM ('nova', 'aura');

CREATE TYPE public.engagement_status AS ENUM ('both', 'contest', 'vote', 'none');

CREATE TYPE public.execution_task_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'cancelled');

CREATE TYPE public.ledger_entry_type AS ENUM ('transfer_out', 'transfer_in', 'p2p_buy', 'p2p_sell', 'p2p_escrow_lock', 'p2p_escrow_release', 'contest_entry', 'contest_win', 'vote_spend', 'vote_receive', 'referral_bonus', 'team_earnings', 'admin_credit', 'admin_debit', 'conversion', 'genesis_credit');

CREATE TYPE public.p2p_order_status AS ENUM ('open', 'matched', 'awaiting_payment', 'payment_sent', 'completed', 'cancelled', 'disputed');

CREATE TYPE public.p2p_order_type AS ENUM ('buy', 'sell');

CREATE TYPE public.transaction_type AS ENUM ('deposit', 'withdrawal', 'transfer', 'contest_entry', 'contest_win', 'vote', 'p2p_buy', 'p2p_sell', 'referral_bonus', 'team_earnings');

CREATE TYPE public.user_rank AS ENUM ('subscriber', 'marketer', 'leader', 'manager', 'president');

-- ============================================================
-- SECTION 2: CORE BUSINESS TABLES
-- ============================================================

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'user'::app_role,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (user_id, role),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  rank user_rank NOT NULL DEFAULT 'subscriber'::user_rank,
  country TEXT NOT NULL DEFAULT 'Saudi Arabia'::text,
  city TEXT,
  wallet_country TEXT NOT NULL DEFAULT 'Saudi Arabia'::text,
  referral_code TEXT,
  referred_by UUID,
  engagement_status engagement_status NOT NULL DEFAULT 'none'::engagement_status,
  weekly_active BOOLEAN NOT NULL DEFAULT false,
  activity_percentage INTEGER NOT NULL DEFAULT 0,
  team_activity_percentage INTEGER NOT NULL DEFAULT 0,
  spotlight_points INTEGER NOT NULL DEFAULT 0,
  active_weeks INTEGER NOT NULL DEFAULT 0,
  current_week INTEGER NOT NULL DEFAULT 1,
  has_joined_with_nova BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ,
  district TEXT,
  is_ai BOOLEAN NOT NULL DEFAULT false,
  ai_role TEXT,
  notifications_contest BOOLEAN DEFAULT true,
  notifications_earnings BOOLEAN DEFAULT true,
  notifications_p2p BOOLEAN DEFAULT true,
  notifications_chat BOOLEAN DEFAULT true,
  notifications_team BOOLEAN DEFAULT true,
  notifications_system BOOLEAN DEFAULT true,
  preferred_language TEXT DEFAULT 'en'::text,
  PRIMARY KEY (id),
  UNIQUE (user_id),
  UNIQUE (username),
  UNIQUE (referral_code),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_by) REFERENCES profiles(id)
);

CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nova_balance NUMERIC NOT NULL DEFAULT 0,
  locked_nova_balance NUMERIC NOT NULL DEFAULT 0,
  aura_balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_frozen BOOLEAN NOT NULL DEFAULT false,
  frozen_at TIMESTAMPTZ,
  frozen_by UUID,
  frozen_reason TEXT,
  PRIMARY KEY (id),
  UNIQUE (user_id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (frozen_by) REFERENCES auth.users(id),
  CHECK (nova_balance >= 0),
  CHECK (aura_balance >= 0),
  CHECK (locked_nova_balance >= 0)
);

CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type transaction_type NOT NULL,
  currency currency_type NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  description_ar TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.wallet_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  wallet_id UUID NOT NULL,
  entry_type ledger_entry_type NOT NULL,
  currency currency_type NOT NULL,
  amount NUMERIC NOT NULL,
  balance_before NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  counterparty_id UUID,
  description TEXT,
  description_ar TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.wallet_freeze_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  performed_by UUID NOT NULL,
  performed_by_role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CHECK (action = ANY (ARRAY['freeze'::text, 'unfreeze'::text]))
);

CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider_name TEXT NOT NULL,
  provider_name_ar TEXT,
  account_number TEXT,
  iban TEXT,
  phone_number TEXT,
  full_name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  country TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  type TEXT NOT NULL DEFAULT 'bank'::text,
  notes TEXT,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ============================================================
-- P2P TABLES
-- ============================================================

CREATE TABLE public.p2p_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  executor_id UUID,
  order_type p2p_order_type NOT NULL,
  status p2p_order_status NOT NULL DEFAULT 'open'::p2p_order_status,
  nova_amount NUMERIC NOT NULL,
  local_amount NUMERIC NOT NULL,
  exchange_rate NUMERIC NOT NULL,
  country TEXT NOT NULL,
  payment_method_id UUID,
  time_limit_minutes INTEGER NOT NULL DEFAULT 15,
  cancellation_reason TEXT,
  cancelled_by UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  matched_at TIMESTAMPTZ,
  extension_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  assigned_to UUID,
  assigned_at TIMESTAMPTZ,
  PRIMARY KEY (id),
  FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (executor_id) REFERENCES auth.users(id),
  FOREIGN KEY (cancelled_by) REFERENCES auth.users(id),
  FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
);

CREATE TABLE public.p2p_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  content_ar TEXT,
  is_system_message BOOLEAN NOT NULL DEFAULT false,
  message_type TEXT NOT NULL DEFAULT 'text'::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (order_id) REFERENCES p2p_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.p2p_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  rater_id UUID NOT NULL,
  rated_id UUID NOT NULL,
  rating smallint NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.p2p_dispute_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  note TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.p2p_dispute_files (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  uploaded_by UUID NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- ============================================================
-- CONTEST TABLES
-- ============================================================

CREATE TABLE public.contests (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  description_ar TEXT,
  entry_fee NUMERIC NOT NULL,
  prize_pool NUMERIC NOT NULL DEFAULT 0,
  max_participants INTEGER,
  current_participants INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'upcoming'::text,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  contest_date date NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE public.contest_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL,
  user_id UUID NOT NULL,
  votes_received INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  prize_won NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  free_vote_used BOOLEAN DEFAULT false,
  PRIMARY KEY (id),
  UNIQUE (contest_id, user_id),
  FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.votes (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL,
  voter_id UUID NOT NULL,
  contestant_id UUID NOT NULL,
  aura_spent NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
  FOREIGN KEY (voter_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (contestant_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ============================================================
-- TEAM TABLES
-- ============================================================

CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  leader_id UUID NOT NULL,
  member_id UUID NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (leader_id, member_id),
  FOREIGN KEY (leader_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.team_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  leader_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.team_conversation_members (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member'::text,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.team_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text'::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- ============================================================
-- MESSAGING TABLES
-- ============================================================

CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  participant1_id UUID NOT NULL,
  participant2_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ,
  PRIMARY KEY (id)
);

CREATE TABLE public.direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  content_ar TEXT,
  message_type TEXT NOT NULL DEFAULT 'text'::text,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  transfer_amount NUMERIC,
  transfer_recipient_id UUID,
  delivered_at TIMESTAMPTZ,
  PRIMARY KEY (id)
);

CREATE TABLE public.follows (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  title_ar TEXT,
  message TEXT NOT NULL,
  message_ar TEXT,
  type TEXT NOT NULL DEFAULT 'info'::text,
  is_read BOOLEAN NOT NULL DEFAULT false,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ============================================================
-- SUPPORT TABLES
-- ============================================================

CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  assigned_to UUID,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general'::text,
  status TEXT NOT NULL DEFAULT 'open'::text,
  priority TEXT NOT NULL DEFAULT 'normal'::text,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  rating INTEGER,
  PRIMARY KEY (id),
  CHECK (rating >= 1 AND rating <= 5)
);

CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
);

CREATE TABLE public.support_agent_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  rater_id UUID NOT NULL,
  rating TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_locked BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (id)
);

-- ============================================================
-- SPOTLIGHT TABLES
-- ============================================================

CREATE TABLE public.spotlight_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  cycle_number INTEGER NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_days INTEGER NOT NULL DEFAULT 98,
  total_weeks INTEGER NOT NULL DEFAULT 14,
  status TEXT NOT NULL DEFAULT 'active'::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.spotlight_user_points (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cycle_id UUID NOT NULL,
  points_date date NOT NULL,
  week_number INTEGER NOT NULL,
  daily_points INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'activity'::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.spotlight_daily_draws (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL,
  draw_date date NOT NULL,
  total_pool NUMERIC NOT NULL DEFAULT 0,
  first_place_user_id UUID,
  first_place_prize NUMERIC DEFAULT 0,
  first_place_percentage INTEGER DEFAULT 65,
  second_place_user_id UUID,
  second_place_prize NUMERIC DEFAULT 0,
  second_place_percentage INTEGER DEFAULT 35,
  is_announced BOOLEAN NOT NULL DEFAULT false,
  announced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- ============================================================
-- APP SETTINGS & AUDIT
-- ============================================================

CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (key),
  FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);

CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB,
  performed_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- ============================================================
-- AI AGENT TABLES
-- ============================================================

CREATE TABLE public.ai_agents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  profile_id uuid,
  agent_role ai_agent_role NOT NULL,
  agent_name text NOT NULL,
  agent_name_ar text NOT NULL,
  focus_areas text[] NOT NULL DEFAULT '{}'::text[],
  behavior_description text,
  is_active boolean NOT NULL DEFAULT true,
  last_analysis_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  specialty text,
  rank text NOT NULL DEFAULT 'trainee'::text,
  status text NOT NULL DEFAULT 'training'::text,
  confidence integer DEFAULT 0,
  trust_score numeric NOT NULL DEFAULT 50,
  success_rate numeric DEFAULT 0,
  failure_rate numeric DEFAULT 0,
  total_operations integer DEFAULT 0,
  demotions integer DEFAULT 0,
  supervisor_agent_id uuid,
  last_evaluation_date timestamp with time zone,
  auto_execute_level integer DEFAULT 0,
  lifecycle_state text NOT NULL DEFAULT 'healthy'::text,
  lifecycle_changed_at timestamp with time zone DEFAULT now(),
  probation_started_at timestamp with time zone,
  disabled_at timestamp with time zone,
  lifecycle_reason text,
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_analysis_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  analysis_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium'::text,
  title text NOT NULL,
  title_ar text,
  description text NOT NULL,
  description_ar text,
  technical_reason text,
  suggested_fix text,
  affected_area text,
  status text NOT NULL DEFAULT 'open'::text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (agent_id) REFERENCES ai_agents(id)
);

CREATE TABLE public.ai_chat_room (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  content text NOT NULL,
  content_ar text,
  message_type text NOT NULL DEFAULT 'discussion'::text,
  reply_to_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  session_id uuid,
  is_summary boolean DEFAULT false,
  ai_session_id uuid,
  human_sender_id uuid,
  turn_order integer,
  previous_context text,
  is_proposal boolean DEFAULT false,
  message_category text DEFAULT 'discussion'::text,
  PRIMARY KEY (id),
  FOREIGN KEY (agent_id) REFERENCES ai_agents(id)
);

CREATE TABLE public.ai_proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid,
  title text NOT NULL,
  title_ar text,
  description text NOT NULL,
  description_ar text,
  proposal_type text NOT NULL DEFAULT 'enhancement'::text,
  priority text NOT NULL DEFAULT 'medium'::text,
  affected_area text,
  proposed_by uuid,
  status text NOT NULL DEFAULT 'pending'::text,
  admin_notes text,
  approved_by uuid,
  approved_at timestamp with time zone,
  rejected_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  risk_level text DEFAULT 'medium'::text,
  impact_scope text,
  rollback_plan text,
  code_snippet text,
  estimated_effort text,
  confidence_score integer,
  risk_label text DEFAULT 'low'::text,
  github_pr_url text,
  github_pr_number integer,
  source text DEFAULT 'ai_discussion'::text,
  report_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_discussion_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  trigger_type text NOT NULL DEFAULT 'scheduled'::text,
  participants_count integer DEFAULT 0,
  messages_count integer DEFAULT 0,
  summary text,
  summary_ar text,
  action_items jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'in_progress'::text,
  discussion_topic text,
  discussion_topic_ar text,
  findings_count integer DEFAULT 0,
  proposals_generated integer DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_failures (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  rpc_name text NOT NULL,
  user_id uuid,
  error_message text,
  parameters jsonb,
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_activity_stream (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  role text,
  action_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  duration_ms integer,
  success boolean,
  error_code text,
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_money_flow (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  operation text NOT NULL,
  from_user uuid,
  to_user uuid,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'nova'::text,
  reference_type text,
  reference_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE public.agent_command_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_message_id uuid,
  sender_id uuid,
  raw_text text NOT NULL,
  detected_intent text,
  target_agent text,
  dispatch_status text DEFAULT 'pending'::text,
  dispatch_result jsonb,
  dispatched_at timestamp with time zone,
  completed_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.agent_health_checks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_function text NOT NULL,
  check_type text NOT NULL DEFAULT 'heartbeat'::text,
  status text NOT NULL DEFAULT 'healthy'::text,
  response_time_ms integer,
  error_count_1h integer DEFAULT 0,
  error_count_24h integer DEFAULT 0,
  avg_duration_ms integer,
  last_success_at timestamp with time zone,
  last_failure_at timestamp with time zone,
  last_error text,
  token_usage_24h integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  checked_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.agent_memory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_function text NOT NULL,
  memory_type text NOT NULL,
  content text NOT NULL,
  importance integer DEFAULT 5,
  tags text[] DEFAULT '{}'::text[],
  reference_id uuid,
  expires_at timestamp with time zone,
  recalled_count integer DEFAULT 0,
  last_recalled_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.agent_performance_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_function text NOT NULL,
  measured_at timestamp with time zone NOT NULL DEFAULT now(),
  success_rate numeric DEFAULT 0,
  failures_1h integer DEFAULT 0,
  failures_24h integer DEFAULT 0,
  consecutive_failures integer DEFAULT 0,
  avg_duration_ms numeric DEFAULT 0,
  tasks_completed integer DEFAULT 0,
  time_since_last_success_minutes numeric DEFAULT 0,
  lifecycle_state text DEFAULT 'healthy'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.agent_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_function text NOT NULL,
  schedule_cron text NOT NULL,
  schedule_label text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  last_run_at timestamp with time zone,
  last_status text DEFAULT 'never_run'::text,
  last_duration_ms integer,
  last_error text,
  run_count integer DEFAULT 0,
  fail_count integer DEFAULT 0,
  consecutive_failures integer DEFAULT 0,
  max_consecutive_failures integer DEFAULT 3,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_agent_comparisons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  specialty text NOT NULL,
  agents_compared jsonb NOT NULL,
  winner_agent_id uuid,
  recommendation text,
  recommendation_ar text,
  details text,
  details_ar text,
  conversation_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_agent_creation_proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  proposed_by_agent uuid NOT NULL,
  proposed_name text NOT NULL,
  proposed_name_ar text,
  mission text NOT NULL,
  mission_ar text,
  expected_improvement text,
  expected_improvement_ar text,
  risk_level text DEFAULT 'low'::text,
  supervision_model text,
  supervisor_agent_id uuid,
  required_skills text[],
  conversation_id text,
  status text NOT NULL DEFAULT 'pending'::text,
  decided_by uuid,
  decided_at timestamp with time zone,
  decision_reason text,
  created_agent_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_agent_lifecycle (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  event_type text NOT NULL,
  from_state jsonb,
  to_state jsonb,
  reason text,
  reason_ar text,
  approved_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (agent_id) REFERENCES ai_agents(id)
);

CREATE TABLE public.ai_agent_skills (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  skill_name text NOT NULL,
  skill_name_ar text,
  skill_category text NOT NULL DEFAULT 'general'::text,
  proficiency_level integer NOT NULL DEFAULT 0,
  acquired_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (agent_id) REFERENCES ai_agents(id)
);

CREATE TABLE public.ai_build_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL,
  title text NOT NULL,
  title_ar text,
  description text NOT NULL,
  description_ar text,
  conversation_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'clarifying'::text,
  current_phase text NOT NULL DEFAULT 'clarification'::text,
  phase_progress jsonb DEFAULT '{}'::jsonb,
  architecture jsonb DEFAULT '{}'::jsonb,
  stack_choices jsonb DEFAULT '{}'::jsonb,
  db_schemas jsonb DEFAULT '[]'::jsonb,
  backend_services jsonb DEFAULT '[]'::jsonb,
  frontend_components jsonb DEFAULT '[]'::jsonb,
  infra_config jsonb DEFAULT '{}'::jsonb,
  env_variables jsonb DEFAULT '[]'::jsonb,
  api_docs jsonb DEFAULT '{}'::jsonb,
  run_instructions text,
  risk_level text NOT NULL DEFAULT 'medium'::text,
  simulation_id uuid,
  simulation_verdict text,
  execution_request_id uuid,
  clarification_questions jsonb DEFAULT '[]'::jsonb,
  clarification_answers jsonb DEFAULT '[]'::jsonb,
  model_used text DEFAULT 'google/gemini-2.5-pro'::text,
  total_tokens_used integer DEFAULT 0,
  duration_ms integer,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_capability_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  total_agents integer NOT NULL DEFAULT 0,
  active_agents integer NOT NULL DEFAULT 0,
  skills_coverage integer DEFAULT 0,
  avg_confidence integer DEFAULT 0,
  solved_without_human integer DEFAULT 0,
  escalations integer DEFAULT 0,
  improvement_rate numeric(5,2) DEFAULT 0,
  forecasts_generated integer DEFAULT 0,
  forecasts_accurate integer DEFAULT 0,
  proposals_approved integer DEFAULT 0,
  proposals_rejected integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_ci_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  pr_number integer NOT NULL,
  branch text NOT NULL,
  repository text,
  build_status text NOT NULL DEFAULT 'unknown'::text,
  lint_status text NOT NULL DEFAULT 'unknown'::text,
  test_status text NOT NULL DEFAULT 'unknown'::text,
  risk_level text NOT NULL DEFAULT 'unknown'::text,
  raw_logs jsonb DEFAULT '{}'::jsonb,
  report_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_code_changes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_function text NOT NULL DEFAULT 'ai-code-engineer'::text,
  branch_name text NOT NULL,
  pr_number integer,
  pr_url text,
  pr_title text NOT NULL,
  pr_body text,
  files_changed jsonb NOT NULL DEFAULT '[]'::jsonb,
  diff_summary text,
  diff_summary_ar text,
  source_request_id uuid,
  source_command text,
  status text NOT NULL DEFAULT 'branch_created'::text,
  risk_level text NOT NULL DEFAULT 'low'::text,
  confidence_score numeric DEFAULT 0,
  approved_by uuid,
  approved_at timestamp with time zone,
  merged_at timestamp with time zone,
  closed_at timestamp with time zone,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_core_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New Conversation'::text,
  system_prompt text,
  model text DEFAULT 'default'::text,
  status text NOT NULL DEFAULT 'active'::text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_core_evaluations (
  id bigint NOT NULL DEFAULT nextval('ai_core_evaluations_id_seq'::regclass),
  conversation_id text,
  message_id text,
  relevance double precision NOT NULL DEFAULT 0,
  clarity double precision NOT NULL DEFAULT 0,
  technical_depth double precision NOT NULL DEFAULT 0,
  hallucination_risk double precision NOT NULL DEFAULT 0,
  composite_score double precision NOT NULL DEFAULT 0,
  improvement_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_core_executions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid,
  action_type text NOT NULL,
  input jsonb DEFAULT '{}'::jsonb,
  output jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'::text,
  error_message text,
  requires_approval boolean DEFAULT true,
  approved_by uuid,
  approved_at timestamp with time zone,
  duration_ms integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (conversation_id) REFERENCES ai_core_conversations(id)
);

CREATE TABLE public.ai_core_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid,
  message_id uuid,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (conversation_id) REFERENCES ai_core_conversations(id)
);

CREATE TABLE public.ai_core_memory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'general'::text,
  key text NOT NULL,
  content text NOT NULL,
  embedding_id text,
  importance integer DEFAULT 5,
  tags text[] DEFAULT '{}'::text[],
  source text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_core_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  tokens_used integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (conversation_id) REFERENCES ai_core_conversations(id)
);

CREATE TABLE public.ai_engineer_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  analysis_type text NOT NULL DEFAULT 'hourly_scan'::text,
  status text NOT NULL DEFAULT 'completed'::text,
  failures_scanned integer NOT NULL DEFAULT 0,
  activities_scanned integer NOT NULL DEFAULT 0,
  money_flows_scanned integer NOT NULL DEFAULT 0,
  findings_count integer NOT NULL DEFAULT 0,
  patches_proposed integer NOT NULL DEFAULT 0,
  critical_issues integer NOT NULL DEFAULT 0,
  summary text,
  summary_ar text,
  raw_analysis jsonb DEFAULT '{}'::jsonb,
  github_pr_url text,
  github_pr_number integer,
  github_branch text,
  duration_ms integer,
  model_used text,
  tokens_used integer,
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_evaluations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  evaluation_type text NOT NULL DEFAULT 'periodic'::text,
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  overall_score integer,
  accuracy_score integer,
  speed_score integer,
  reliability_score integer,
  insight_quality_score integer,
  false_positive_rate numeric,
  tasks_completed integer DEFAULT 0,
  tasks_failed integer DEFAULT 0,
  findings_accepted integer DEFAULT 0,
  findings_rejected integer DEFAULT 0,
  evaluator text NOT NULL DEFAULT 'system'::text,
  summary text,
  summary_ar text,
  recommendations text,
  recommendations_ar text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (agent_id) REFERENCES ai_agents(id)
);

CREATE TABLE public.ai_evolution_proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  missing_capability text NOT NULL,
  missing_capability_ar text,
  reason text NOT NULL,
  reason_ar text,
  expected_impact text,
  expected_impact_ar text,
  urgency text NOT NULL DEFAULT 'medium'::text,
  suggested_agent_type text,
  suggested_agent_type_ar text,
  skills_required text[],
  confidence integer DEFAULT 50,
  metadata jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'proposed'::text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_execution_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  permission_key text NOT NULL,
  permission_key_ar text,
  description text NOT NULL,
  description_ar text,
  category text NOT NULL DEFAULT 'general'::text,
  max_risk_level text NOT NULL DEFAULT 'low'::text,
  requires_approval boolean NOT NULL DEFAULT true,
  auto_execute_threshold integer NOT NULL DEFAULT 90,
  is_enabled boolean NOT NULL DEFAULT false,
  allowed_operations text[] NOT NULL DEFAULT '{}'::text[],
  cooldown_minutes integer NOT NULL DEFAULT 5,
  max_daily_executions integer NOT NULL DEFAULT 10,
  daily_executions_used integer NOT NULL DEFAULT 0,
  last_reset_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  granted_by uuid,
  required_auto_execute_level integer NOT NULL DEFAULT 99,
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_execution_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  permission_id uuid,
  request_type text NOT NULL,
  title text NOT NULL,
  title_ar text,
  description text NOT NULL,
  description_ar text,
  risk_score integer NOT NULL DEFAULT 50,
  risk_level text NOT NULL DEFAULT 'medium'::text,
  confidence_score integer NOT NULL DEFAULT 50,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  rollback_plan text NOT NULL,
  rollback_plan_ar text,
  rollback_data jsonb DEFAULT '{}'::jsonb,
  estimated_impact text,
  estimated_impact_ar text,
  affected_entities text[] DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'pending'::text,
  approved_by uuid,
  approved_at timestamp with time zone,
  rejected_by uuid,
  rejected_at timestamp with time zone,
  rejection_reason text,
  expires_at timestamp with time zone DEFAULT (now() + '01:00:00'::interval),
  source_forecast_id uuid,
  source_proposal_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  simulation_id uuid,
  simulation_required boolean NOT NULL DEFAULT false,
  simulation_verdict text,
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_execution_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  execution_status text NOT NULL DEFAULT 'success'::text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  duration_ms integer,
  output jsonb DEFAULT '{}'::jsonb,
  error_message text,
  was_rolled_back boolean NOT NULL DEFAULT false,
  rolled_back_at timestamp with time zone,
  rollback_reason text,
  before_state jsonb DEFAULT '{}'::jsonb,
  after_state jsonb DEFAULT '{}'::jsonb,
  confidence_delta integer DEFAULT 0,
  human_feedback text,
  human_feedback_score integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (request_id) REFERENCES ai_execution_requests(id)
);

CREATE TABLE public.ai_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  path text NOT NULL,
  content text,
  language text,
  last_modified timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_forecasts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  forecast_type text NOT NULL DEFAULT 'risk'::text,
  title text NOT NULL,
  title_ar text,
  description text NOT NULL,
  description_ar text,
  probability integer NOT NULL DEFAULT 50,
  impact_range text,
  impact_range_ar text,
  time_window text,
  recommended_action text,
  recommended_action_ar text,
  confidence_score integer DEFAULT 50,
  metadata jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'new'::text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_human_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question text NOT NULL,
  asked_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  summary text,
  summary_ar text,
  response_mode text DEFAULT 'sequential'::text,
  agents_order jsonb DEFAULT '[]'::jsonb,
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_memory (
  id bigint NOT NULL DEFAULT nextval('ai_memory_id_seq'::regclass),
  category text NOT NULL DEFAULT 'general'::text,
  key text NOT NULL,
  content text NOT NULL,
  importance double precision NOT NULL DEFAULT 0.5,
  last_used timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_priorities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  title text,
  title_ar text,
  description text,
  description_ar text,
  category text,
  severity text,
  confidence_score integer,
  estimated_impact text,
  requires_approval boolean DEFAULT true,
  source text,
  reference_id text,
  status text DEFAULT 'pending'::text,
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_product_proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  title text,
  title_ar text,
  description text,
  description_ar text,
  opportunity_type text,
  confidence_score integer,
  estimated_impact text,
  based_on_events integer,
  data_window text,
  status text DEFAULT 'pending'::text,
  generated_by text DEFAULT 'product_brain'::text,
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_project_executions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  code text NOT NULL,
  language text DEFAULT 'typescript'::text,
  status text DEFAULT 'pending'::text,
  output text,
  error_message text,
  requested_by uuid,
  approved_by uuid,
  approved_at timestamp with time zone,
  duration_ms integer,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text DEFAULT 'active'::text,
  stack text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_promotion_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  current_rank text NOT NULL,
  requested_rank text NOT NULL,
  justification text NOT NULL,
  justification_ar text,
  impact_summary text,
  impact_summary_ar text,
  trust_score_at_request numeric,
  success_rate_at_request numeric,
  total_ops_at_request integer,
  conversation_id text,
  status text NOT NULL DEFAULT 'pending'::text,
  decided_by uuid,
  decided_at timestamp with time zone,
  decision_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (agent_id) REFERENCES ai_agents(id)
);

CREATE TABLE public.ai_promotions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  from_rank text,
  to_rank text,
  reason text,
  approved_by uuid,
  promoted_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (agent_id) REFERENCES ai_agents(id)
);

CREATE TABLE public.ai_retirement_proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  reason text NOT NULL,
  reason_ar text,
  performance_summary jsonb,
  recommendation text NOT NULL,
  recommendation_ar text,
  conversation_id text,
  status text NOT NULL DEFAULT 'pending'::text,
  decided_by uuid,
  decided_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (agent_id) REFERENCES ai_agents(id)
);

CREATE TABLE public.ai_retirements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  reason text,
  retired_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (agent_id) REFERENCES ai_agents(id)
);

CREATE TABLE public.ai_self_evaluations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  evaluation_period_start timestamp with time zone NOT NULL,
  evaluation_period_end timestamp with time zone NOT NULL,
  operations_reviewed integer DEFAULT 0,
  correct_predictions integer DEFAULT 0,
  incorrect_predictions integer DEFAULT 0,
  human_agreements integer DEFAULT 0,
  human_overrides integer DEFAULT 0,
  errors_analyzed integer DEFAULT 0,
  improvement_hypotheses jsonb DEFAULT '[]'::jsonb,
  strengths text[],
  weaknesses text[],
  summary text,
  summary_ar text,
  trust_score_at_evaluation numeric,
  recommended_action text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (agent_id) REFERENCES ai_agents(id)
);

CREATE TABLE public.ai_self_evolution_proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  proposing_agent_id uuid,
  proposal_type text NOT NULL,
  title text NOT NULL,
  title_ar text,
  description text NOT NULL,
  description_ar text,
  current_state text,
  current_state_ar text,
  proposed_change text NOT NULL,
  proposed_change_ar text,
  expected_impact text,
  expected_impact_ar text,
  risk_assessment text NOT NULL DEFAULT 'low'::text,
  risk_details text,
  risk_details_ar text,
  simulation_id uuid,
  simulation_verdict text,
  simulation_report text,
  lifecycle_status text NOT NULL DEFAULT 'draft'::text,
  draft_at timestamp with time zone NOT NULL DEFAULT now(),
  simulated_at timestamp with time zone,
  submitted_at timestamp with time zone,
  decided_at timestamp with time zone,
  decided_by text,
  decision_reason text,
  decision_reason_ar text,
  conversation_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_shadow_simulations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid,
  proposal_id uuid,
  trigger_source text NOT NULL DEFAULT 'execution_request'::text,
  status text NOT NULL DEFAULT 'pending'::text,
  snapshot_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot_tables text[] NOT NULL DEFAULT '{}'::text[],
  simulation_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  scenarios_run integer NOT NULL DEFAULT 0,
  scenarios_passed integer NOT NULL DEFAULT 0,
  scenarios_failed integer NOT NULL DEFAULT 0,
  results jsonb NOT NULL DEFAULT '{}'::jsonb,
  success_delta numeric DEFAULT 0,
  risk_delta numeric DEFAULT 0,
  affected_systems text[] NOT NULL DEFAULT '{}'::text[],
  financial_deviation numeric DEFAULT 0,
  logical_deviations integer DEFAULT 0,
  rollback_ready boolean NOT NULL DEFAULT false,
  cto_report text,
  cto_report_ar text,
  verdict text NOT NULL DEFAULT 'pending'::text,
  duration_ms integer,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_strategic_insights (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  insight_type text NOT NULL DEFAULT 'general'::text,
  category text NOT NULL DEFAULT 'general'::text,
  title text NOT NULL,
  title_ar text,
  description text NOT NULL,
  description_ar text,
  severity text NOT NULL DEFAULT 'medium'::text,
  confidence_score integer DEFAULT 50,
  impact_estimation text,
  impact_estimation_ar text,
  source_knowledge_ids uuid[] DEFAULT '{}'::uuid[],
  recommended_action text,
  recommended_action_ar text,
  status text NOT NULL DEFAULT 'new'::text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  admin_notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.ai_training_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  training_type text NOT NULL DEFAULT 'observation'::text,
  topic text NOT NULL,
  topic_ar text,
  data_source text,
  samples_processed integer DEFAULT 0,
  accuracy_before numeric,
  accuracy_after numeric,
  duration_ms integer,
  notes text,
  status text NOT NULL DEFAULT 'completed'::text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (agent_id) REFERENCES ai_agents(id)
);

CREATE TABLE public.ai_training_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  topic text,
  sources_count integer,
  confidence_gain integer,
  weaknesses text,
  trained_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (agent_id) REFERENCES ai_agents(id)
);

CREATE TABLE public.ai_trust_changes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  delta numeric NOT NULL,
  previous_score numeric NOT NULL,
  new_score numeric NOT NULL,
  reason text NOT NULL,
  reason_ar text,
  source_type text NOT NULL,
  source_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (agent_id) REFERENCES ai_agents(id)
);

-- ============================================================
-- GOVERNANCE & AUTHORITY TABLES
-- ============================================================

CREATE TABLE public.authority_levels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  level_name text NOT NULL,
  level_name_ar text,
  level_rank integer NOT NULL,
  can_approve_executions boolean NOT NULL DEFAULT false,
  can_modify_permissions boolean NOT NULL DEFAULT false,
  can_freeze_agents boolean NOT NULL DEFAULT false,
  can_veto boolean NOT NULL DEFAULT false,
  can_override_governance boolean NOT NULL DEFAULT false,
  description text,
  description_ar text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.authority_promotion_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  from_level integer NOT NULL,
  to_level integer NOT NULL,
  action text NOT NULL,
  reason text NOT NULL,
  reason_ar text,
  triggered_by text NOT NULL DEFAULT 'system'::text,
  approved_by uuid,
  accuracy_trend numeric,
  reversal_rate numeric,
  override_frequency numeric,
  decision_similarity numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.authority_tier_state (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  current_level integer NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT 'System initialized'::text,
  reason_ar text DEFAULT 'النظام مُهيّأ'::text,
  last_promoted_at timestamp with time zone,
  last_demoted_at timestamp with time zone,
  promoted_by uuid,
  accuracy_at_change numeric,
  reversal_rate_at_change numeric,
  override_count_at_change integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.autonomy_caps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cap_key text NOT NULL,
  cap_key_ar text,
  max_auto_execute_level integer NOT NULL DEFAULT 3,
  description text NOT NULL,
  description_ar text,
  set_by text NOT NULL DEFAULT 'owner'::text,
  requires_human text[] NOT NULL DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.ceo_behavioral_model (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dimension text NOT NULL,
  dimension_ar text,
  current_value numeric NOT NULL DEFAULT 0.5,
  historical_values jsonb DEFAULT '[]'::jsonb,
  sample_count integer NOT NULL DEFAULT 0,
  confidence numeric NOT NULL DEFAULT 0.0,
  description_en text,
  description_ar text,
  last_updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.ceo_communication_profile (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  preference_key text NOT NULL,
  preference_key_ar text,
  value text NOT NULL,
  evidence jsonb DEFAULT '[]'::jsonb,
  confidence numeric NOT NULL DEFAULT 0.5,
  sample_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.ceo_decision_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid,
  request_type text NOT NULL,
  request_title text NOT NULL,
  request_title_ar text,
  risk_level text NOT NULL DEFAULT 'medium'::text,
  urgency text NOT NULL DEFAULT 'normal'::text,
  services_affected text[] DEFAULT '{}'::text[],
  suggested_fix text,
  decision text NOT NULL,
  modification_notes text,
  decision_reason text,
  response_time_ms bigint,
  context_snapshot jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  emotional_signal text,
  was_modified boolean DEFAULT false,
  prediction_was_correct boolean,
  predicted_probability numeric,
  PRIMARY KEY (id)
);

CREATE TABLE public.ceo_decision_patterns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pattern_key text NOT NULL,
  pattern_description text NOT NULL,
  pattern_description_ar text,
  pattern_type text NOT NULL DEFAULT 'preference'::text,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric NOT NULL DEFAULT 0.5,
  sample_count integer NOT NULL DEFAULT 0,
  last_validated_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.ceo_prediction_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  predicted_decision text NOT NULL,
  approval_probability numeric NOT NULL DEFAULT 0.5,
  reasoning text NOT NULL,
  reasoning_ar text,
  similar_past_decisions uuid[] DEFAULT '{}'::uuid[],
  matching_patterns text[] DEFAULT '{}'::text[],
  fast_track_eligible boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.commander_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  review_type text NOT NULL DEFAULT 'hourly'::text,
  agents_scanned integer DEFAULT 0,
  healthy_count integer DEFAULT 0,
  watch_count integer DEFAULT 0,
  warning_count integer DEFAULT 0,
  probation_count integer DEFAULT 0,
  disabled_count integer DEFAULT 0,
  escalations jsonb DEFAULT '[]'::jsonb,
  report_content text,
  report_content_ar text,
  duration_ms integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.decision_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  conversation_id uuid,
  decision ai_decision_type NOT NULL,
  decided_by uuid NOT NULL,
  reason text,
  alert_title text,
  alert_type text,
  alert_severity text,
  task_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.emergency_controls (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  control_key text NOT NULL,
  control_key_ar text,
  is_active boolean NOT NULL DEFAULT false,
  description text NOT NULL,
  description_ar text,
  activated_by text,
  activated_at timestamp with time zone,
  deactivated_by text,
  deactivated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.execution_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_ar text,
  description text,
  description_ar text,
  category text NOT NULL DEFAULT 'general'::text,
  severity text DEFAULT 'medium'::text,
  status execution_task_status NOT NULL DEFAULT 'pending'::execution_task_status,
  assigned_to uuid,
  created_by uuid NOT NULL,
  source_message_id uuid,
  source_alert_type text,
  conversation_id uuid,
  progress_notes text,
  completion_report text,
  completion_report_ar text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  PRIMARY KEY (id)
);

CREATE TABLE public.executive_understanding_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  run_id text NOT NULL,
  agent_function text NOT NULL,
  trigger_type text NOT NULL DEFAULT 'scheduled'::text,
  patterns_discovered text NOT NULL DEFAULT 'None detected'::text,
  owner_model_changes text NOT NULL DEFAULT 'No changes'::text,
  future_decision_impact text NOT NULL DEFAULT 'No impact identified'::text,
  risk_delta text NOT NULL DEFAULT 'Unchanged'::text,
  executive_summary text NOT NULL,
  executive_summary_ar text,
  is_valid boolean NOT NULL DEFAULT true,
  validation_errors text[],
  confidence_score integer DEFAULT 70,
  duration_ms integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.external_access_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}'::text[],
  reason text NOT NULL,
  reason_ar text,
  risk_level text NOT NULL DEFAULT 'medium'::text,
  duration_minutes integer NOT NULL DEFAULT 60,
  requested_by_agent uuid,
  conversation_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  approved_by uuid,
  approved_at timestamp with time zone,
  rejected_by uuid,
  rejected_at timestamp with time zone,
  rejection_reason text,
  credential_id uuid,
  expires_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.external_access_usage_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid,
  credential_id uuid,
  agent_id uuid,
  service_name text NOT NULL,
  action text NOT NULL,
  scopes_used text[] DEFAULT '{}'::text[],
  result text NOT NULL DEFAULT 'success'::text,
  error_message text,
  duration_ms integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  used_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.external_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  encrypted_reference text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  max_uses integer DEFAULT 100,
  uses_count integer NOT NULL DEFAULT 0,
  rate_limit_per_minute integer DEFAULT 10,
  expires_at timestamp with time zone,
  granted_by uuid,
  revoked_at timestamp with time zone,
  revoked_by uuid,
  revocation_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.external_knowledge (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_url text,
  source_category text NOT NULL DEFAULT 'general'::text,
  title text NOT NULL,
  title_ar text,
  content text NOT NULL,
  content_ar text,
  relevance_score integer DEFAULT 50,
  tags text[] DEFAULT '{}'::text[],
  metadata jsonb DEFAULT '{}'::jsonb,
  is_processed boolean DEFAULT false,
  collected_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.freeze_controls (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  target_type text NOT NULL,
  target_id text NOT NULL,
  frozen_by text NOT NULL,
  authority_level text NOT NULL,
  reason text NOT NULL,
  reason_ar text,
  is_active boolean NOT NULL DEFAULT true,
  unfrozen_by text,
  unfrozen_at timestamp with time zone,
  conversation_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.governance_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rule_key text NOT NULL,
  rule_key_ar text,
  description text NOT NULL,
  description_ar text,
  category text NOT NULL DEFAULT 'security'::text,
  severity text NOT NULL DEFAULT 'critical'::text,
  is_active boolean NOT NULL DEFAULT true,
  enforced_by text NOT NULL DEFAULT 'system'::text,
  override_requires text NOT NULL DEFAULT 'owner'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.intelligence_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  prediction_accuracy numeric DEFAULT 0,
  confidence_vs_correctness numeric DEFAULT 0,
  reversal_rate numeric DEFAULT 0,
  auto_approval_success_rate numeric DEFAULT 0,
  total_predictions integer DEFAULT 0,
  correct_predictions integer DEFAULT 0,
  total_auto_actions integer DEFAULT 0,
  successful_auto_actions integer DEFAULT 0,
  total_reversals integer DEFAULT 0,
  total_escalations integer DEFAULT 0,
  total_ignored integer DEFAULT 0,
  top_mistakes jsonb DEFAULT '[]'::jsonb,
  misunderstood_areas jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.knowledge_decisions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  proposal_id uuid,
  decision text,
  decided_by uuid,
  notes text,
  PRIMARY KEY (id)
);

CREATE TABLE public.knowledge_memory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  source text,
  event_type text,
  area text,
  reference_id text,
  payload jsonb,
  PRIMARY KEY (id)
);

CREATE TABLE public.knowledge_patterns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  pattern_type text,
  problem text,
  solution text,
  confidence integer DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE TABLE public.knowledge_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  rule_key text,
  description text,
  description_ar text,
  is_active boolean DEFAULT true,
  confidence_score integer DEFAULT 0,
  generated_from_events uuid[] DEFAULT '{}'::uuid[],
  status text DEFAULT 'pending_review'::text,
  pattern_type text,
  sample_count integer DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE TABLE public.learning_signals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  signal_type text NOT NULL,
  source_entity text,
  source_id text,
  context jsonb DEFAULT '{}'::jsonb,
  weight numeric DEFAULT 1.0,
  processed boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.orchestrator_state (
  id text NOT NULL DEFAULT 'singleton'::text,
  last_heartbeat timestamp with time zone DEFAULT now(),
  status text DEFAULT 'active'::text,
  tick_count bigint DEFAULT 0,
  commands_processed bigint DEFAULT 0,
  schedules_triggered bigint DEFAULT 0,
  health_checks_run bigint DEFAULT 0,
  auto_executions bigint DEFAULT 0,
  errors_caught bigint DEFAULT 0,
  started_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  PRIMARY KEY (id)
);

CREATE TABLE public.owner_constitution (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rule_key text NOT NULL,
  rule_en text NOT NULL,
  rule_ar text NOT NULL,
  category text NOT NULL DEFAULT 'general'::text,
  severity text NOT NULL DEFAULT 'mandatory'::text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.owner_corrections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  source_id uuid,
  original_output text NOT NULL,
  correction text NOT NULL,
  correction_ar text,
  correction_type text NOT NULL DEFAULT 'edit'::text,
  lesson_learned text,
  lesson_learned_ar text,
  preferences_updated text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.owner_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  preference_key text NOT NULL,
  category text NOT NULL DEFAULT 'general'::text,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric NOT NULL DEFAULT 0.5,
  sample_count integer NOT NULL DEFAULT 0,
  description_en text,
  description_ar text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.project_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  activity_type text NOT NULL,
  title text NOT NULL,
  title_ar text,
  description text,
  description_ar text,
  agent_id uuid,
  user_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  risk_level text DEFAULT 'low'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.project_agents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'contributor'::text,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  tasks_completed integer DEFAULT 0,
  last_activity_at timestamp with time zone,
  PRIMARY KEY (id)
);

CREATE TABLE public.project_artifacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  artifact_type text NOT NULL,
  title text NOT NULL,
  title_ar text,
  content text,
  content_json jsonb,
  file_url text,
  file_size integer,
  mime_type text,
  generated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.project_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  file_type text NOT NULL,
  file_name text NOT NULL,
  file_url text,
  storage_path text,
  file_size integer,
  mime_type text DEFAULT 'application/octet-stream'::text,
  description text,
  description_ar text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.project_phases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  phase_name text NOT NULL,
  phase_name_ar text,
  status text NOT NULL DEFAULT 'pending'::text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  duration_ms integer,
  agent_id uuid,
  output_summary text,
  output_summary_ar text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.research_concept_relations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  concept_id uuid NOT NULL,
  related_concept_id uuid NOT NULL,
  relation_type text NOT NULL,
  strength_score integer NOT NULL DEFAULT 50,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.research_concepts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  definition text NOT NULL,
  confidence_score integer NOT NULL DEFAULT 50,
  first_detected_at timestamp with time zone NOT NULL DEFAULT now(),
  last_updated_at timestamp with time zone NOT NULL DEFAULT now(),
  contradiction_flag boolean NOT NULL DEFAULT false,
  PRIMARY KEY (id)
);

CREATE TABLE public.research_contradictions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  concept_id uuid NOT NULL,
  previous_statement text NOT NULL,
  conflicting_statement text NOT NULL,
  detected_at timestamp with time zone NOT NULL DEFAULT now(),
  resolution_status text NOT NULL DEFAULT 'open'::text,
  PRIMARY KEY (id)
);

CREATE TABLE public.research_integrity_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  simulation_id uuid,
  mathematical_consistency numeric NOT NULL DEFAULT 0,
  regulatory_feasibility numeric NOT NULL DEFAULT 0,
  attack_resistance numeric NOT NULL DEFAULT 0,
  liquidity_robustness numeric NOT NULL DEFAULT 0,
  overall_score numeric NOT NULL DEFAULT 0,
  failure_report text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.research_outputs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  content text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.research_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active'::text,
  created_by text NOT NULL DEFAULT 'admin'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.research_simulations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  scenario text NOT NULL,
  parameters jsonb DEFAULT '{}'::jsonb,
  results jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'::text,
  duration_ms integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.research_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  output_id uuid,
  source_type text NOT NULL DEFAULT 'official_doc'::text,
  title text NOT NULL,
  url text,
  citation text,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.sandbox_executions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid,
  sql_statement text NOT NULL,
  execution_mode text DEFAULT 'dry_run'::text,
  result jsonb,
  rows_affected integer DEFAULT 0,
  error_message text,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  approved_for_production boolean DEFAULT false,
  approved_by uuid,
  approved_at timestamp with time zone,
  PRIMARY KEY (id)
);

CREATE TABLE public.system_incidents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  target_user_id uuid,
  actor_username text,
  target_username text,
  is_ghost boolean DEFAULT false,
  screen text,
  feature text,
  action_type text NOT NULL,
  error_message text,
  error_code text,
  severity text NOT NULL DEFAULT 'low'::text,
  category text,
  endpoint text,
  flow text,
  root_cause text,
  frequency integer DEFAULT 1,
  latency_ms integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.veto_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vetoed_by text NOT NULL,
  authority_level text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  reason text NOT NULL,
  reason_ar text,
  original_action text,
  conversation_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- ============================================================
-- SECTION 3: FUNCTIONS (RPC + TRIGGER FUNCTIONS)
-- ============================================================

-- NOTE: Due to the massive size, functions are provided as extracted from pg_get_functiondef().
-- Each function below is a complete CREATE OR REPLACE FUNCTION statement.

-- === SECURITY HELPER FUNCTIONS ===

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = check_user_id AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_support_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role IN ('support', 'admin', 'moderator')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_real_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT NOT COALESCE(
    (SELECT is_ai FROM profiles WHERE user_id = p_user_id),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.is_wallet_frozen(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT is_frozen FROM public.wallets WHERE user_id = _user_id LIMIT 1),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.is_team_leader(p_user_id uuid, p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_conversation_members
    WHERE user_id = p_user_id AND conversation_id = p_conversation_id AND role = 'leader'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_member(p_user_id uuid, p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_conversation_members
    WHERE user_id = p_user_id AND conversation_id = p_conversation_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_ai_control_room(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    has_role(p_user_id, 'admin') OR 
    has_role(p_user_id, 'support') OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = p_user_id 
      AND rank IN ('president', 'manager')
    )
$$;

-- === UTILITY FUNCTIONS ===

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_last_seen(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles 
  SET last_seen_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  RETURN 'WINOVA-' || upper(substr(md5(random()::text), 1, 6));
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_referral_code_v2(p_username text, p_country text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code TEXT;
  v_country_code TEXT;
  v_attempts INT := 0;
BEGIN
  v_country_code := UPPER(LEFT(REGEXP_REPLACE(p_country, '[^a-zA-Z]', '', 'g'), 2));
  IF LENGTH(v_country_code) < 2 THEN v_country_code := 'XX'; END IF;
  LOOP
    v_code := 'WINOVA-' || UPPER(p_username) || '-' || v_country_code;
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = v_code) THEN RETURN v_code; END IF;
    v_attempts := v_attempts + 1;
    v_code := 'WINOVA-' || UPPER(p_username) || v_attempts::TEXT || '-' || v_country_code;
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = v_code) THEN RETURN v_code; END IF;
    EXIT WHEN v_attempts > 100;
  END LOOP;
  RETURN 'WINOVA-' || UPPER(LEFT(p_username, 4)) || '-' || UPPER(LEFT(MD5(RANDOM()::TEXT), 4));
END;
$$;

-- === WALLET GUARD ===

CREATE OR REPLACE FUNCTION public.guard_wallet_balance_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('app.bypass_wallet_guard', true) = 'true' THEN RETURN NEW; END IF;
  IF current_setting('role', true) NOT IN ('authenticated', 'anon') THEN RETURN NEW; END IF;
  IF current_user::text IS DISTINCT FROM current_setting('role', true) THEN RETURN NEW; END IF;
  IF NEW.nova_balance IS DISTINCT FROM OLD.nova_balance
     OR NEW.aura_balance IS DISTINCT FROM OLD.aura_balance
     OR NEW.locked_nova_balance IS DISTINCT FROM OLD.locked_nova_balance THEN
    RAISE EXCEPTION 'Direct balance mutation is forbidden. Use authorized transaction services.';
  END IF;
  RETURN NEW;
END;
$$;

-- === AUTH TRIGGER ===

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referral_code TEXT;
  v_referrer_id UUID;
  v_username TEXT;
  v_name TEXT;
  v_country TEXT;
  v_city TEXT;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', 'User');
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || SUBSTRING(NEW.id::text FROM 1 FOR 8));
  v_country := COALESCE(NEW.raw_user_meta_data->>'country', 'Saudi Arabia');
  v_city := NEW.raw_user_meta_data->>'city';
  INSERT INTO public.profiles (user_id, name, username, country, city, wallet_country, referral_code)
  VALUES (NEW.id, v_name, v_username, v_country, v_city, v_country,
    'WINOVA-' || UPPER(v_username) || '-' || 
    CASE v_country WHEN 'Saudi Arabia' THEN 'SA' WHEN 'Egypt' THEN 'EG' WHEN 'UAE' THEN 'AE'
      WHEN 'Qatar' THEN 'QA' WHEN 'Jordan' THEN 'JO' WHEN 'Palestine' THEN 'PS'
      WHEN 'Kuwait' THEN 'KW' WHEN 'Bahrain' THEN 'BH' WHEN 'Oman' THEN 'OM' ELSE 'XX' END);
  INSERT INTO public.wallets (user_id, nova_balance, aura_balance, locked_nova_balance) VALUES (NEW.id, 0, 0, 0);
  BEGIN INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user'); EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- === FINANCIAL RPCs ===

CREATE OR REPLACE FUNCTION public.execute_transfer(p_sender_id uuid, p_recipient_id uuid, p_amount numeric, p_currency currency_type DEFAULT 'nova'::currency_type, p_reference_type text DEFAULT 'transfer'::text, p_reference_id uuid DEFAULT NULL::uuid, p_description text DEFAULT NULL::text, p_description_ar text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sender_wallet public.wallets%ROWTYPE;
  v_recipient_wallet public.wallets%ROWTYPE;
  v_wallet_low public.wallets%ROWTYPE;
  v_wallet_high public.wallets%ROWTYPE;
  v_low_id uuid; v_high_id uuid;
  v_sender_balance_before numeric; v_sender_balance_after numeric;
  v_recipient_balance_before numeric; v_recipient_balance_after numeric;
  v_sender_ledger_id uuid; v_recipient_ledger_id uuid;
  v_daily_limit numeric; v_daily_used numeric; v_sqlstate text;
BEGIN
  PERFORM set_config('app.bypass_wallet_guard', 'true', true);
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Authentication required', 'error_code', 'AUTH_REQUIRED'); END IF;
  IF auth.uid() <> p_sender_id THEN RETURN jsonb_build_object('success', false, 'error', 'You can only transfer from your own wallet', 'error_code', 'UNAUTHORIZED'); END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive', 'error_code', 'INVALID_AMOUNT'); END IF;
  IF p_sender_id = p_recipient_id THEN RETURN jsonb_build_object('success', false, 'error', 'Cannot transfer to yourself', 'error_code', 'SELF_TRANSFER'); END IF;
  IF p_reference_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.wallet_ledger wl WHERE wl.user_id = p_sender_id AND wl.entry_type = 'transfer_out'::public.ledger_entry_type AND wl.reference_type = p_reference_type AND wl.reference_id = p_reference_id LIMIT 1) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Duplicate request', 'error_code', 'DUPLICATE_REQUEST');
    END IF;
  END IF;
  v_low_id := LEAST(p_sender_id, p_recipient_id); v_high_id := GREATEST(p_sender_id, p_recipient_id);
  SELECT * INTO v_wallet_low FROM public.wallets WHERE user_id = v_low_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Wallet not found'); END IF;
  SELECT * INTO v_wallet_high FROM public.wallets WHERE user_id = v_high_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Wallet not found'); END IF;
  IF v_wallet_low.user_id = p_sender_id THEN v_sender_wallet := v_wallet_low; v_recipient_wallet := v_wallet_high;
  ELSE v_sender_wallet := v_wallet_high; v_recipient_wallet := v_wallet_low; END IF;
  IF v_sender_wallet.is_frozen THEN RETURN jsonb_build_object('success', false, 'error', 'Your wallet is frozen'); END IF;
  IF v_recipient_wallet.is_frozen THEN RETURN jsonb_build_object('success', false, 'error', 'Recipient wallet is frozen'); END IF;
  IF p_currency = 'nova' THEN v_sender_balance_before := v_sender_wallet.nova_balance; v_recipient_balance_before := v_recipient_wallet.nova_balance;
  ELSE v_sender_balance_before := v_sender_wallet.aura_balance; v_recipient_balance_before := v_recipient_wallet.aura_balance; END IF;
  IF v_sender_balance_before < p_amount THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance'); END IF;
  v_sender_balance_after := v_sender_balance_before - p_amount;
  v_recipient_balance_after := v_recipient_balance_before + p_amount;
  IF p_currency = 'nova' THEN
    UPDATE public.wallets SET nova_balance = v_sender_balance_after, updated_at = now() WHERE id = v_sender_wallet.id;
    UPDATE public.wallets SET nova_balance = v_recipient_balance_after, updated_at = now() WHERE id = v_recipient_wallet.id;
  ELSE
    UPDATE public.wallets SET aura_balance = v_sender_balance_after, updated_at = now() WHERE id = v_sender_wallet.id;
    UPDATE public.wallets SET aura_balance = v_recipient_balance_after, updated_at = now() WHERE id = v_recipient_wallet.id;
  END IF;
  INSERT INTO public.wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, counterparty_id, description, description_ar)
  VALUES (p_sender_id, v_sender_wallet.id, 'transfer_out', p_currency, -p_amount, v_sender_balance_before, v_sender_balance_after, p_reference_type, p_reference_id, p_recipient_id, p_description, p_description_ar)
  RETURNING id INTO v_sender_ledger_id;
  INSERT INTO public.wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, counterparty_id, description, description_ar)
  VALUES (p_recipient_id, v_recipient_wallet.id, 'transfer_in', p_currency, p_amount, v_recipient_balance_before, v_recipient_balance_after, p_reference_type, p_reference_id, p_sender_id, p_description, p_description_ar)
  RETURNING id INTO v_recipient_ledger_id;
  INSERT INTO public.transactions (user_id, type, currency, amount, reference_id, description, description_ar) VALUES
    (p_sender_id, 'transfer', p_currency, -p_amount, v_sender_ledger_id, p_description, p_description_ar),
    (p_recipient_id, 'transfer', p_currency, p_amount, v_recipient_ledger_id, p_description, p_description_ar);
  RETURN jsonb_build_object('success', true, 'sender_ledger_id', v_sender_ledger_id, 'recipient_ledger_id', v_recipient_ledger_id, 'sender_balance_after', v_sender_balance_after, 'recipient_balance_after', v_recipient_balance_after);
EXCEPTION
  WHEN deadlock_detected THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'error_code', 'DEADLOCK');
  WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'error_code', 'UNEXPECTED_ERROR');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_adjust_balance(p_admin_id uuid, p_target_user_id uuid, p_currency text, p_amount numeric, p_is_credit boolean, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wallet wallets%ROWTYPE; v_balance_before NUMERIC; v_balance_after NUMERIC;
  v_ledger_id UUID; v_entry_type ledger_entry_type; v_actual_amount NUMERIC;
BEGIN
  PERFORM set_config('app.bypass_wallet_guard', 'true', true);
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Authentication required'); END IF;
  IF auth.uid() <> p_admin_id THEN RETURN jsonb_build_object('success', false, 'error', 'Identity mismatch'); END IF;
  IF NOT has_role(auth.uid(), 'admin') THEN RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin role required'); END IF;
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_target_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Target wallet not found'); END IF;
  IF p_currency = 'nova' THEN v_balance_before := v_wallet.nova_balance; ELSE v_balance_before := v_wallet.aura_balance; END IF;
  IF p_is_credit THEN v_balance_after := v_balance_before + p_amount; v_actual_amount := p_amount; v_entry_type := 'admin_credit';
  ELSE IF v_balance_before < p_amount THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance'); END IF;
    v_balance_after := v_balance_before - p_amount; v_actual_amount := -p_amount; v_entry_type := 'admin_debit'; END IF;
  IF p_currency = 'nova' THEN UPDATE wallets SET nova_balance = v_balance_after, updated_at = now() WHERE id = v_wallet.id;
  ELSE UPDATE wallets SET aura_balance = v_balance_after, updated_at = now() WHERE id = v_wallet.id; END IF;
  INSERT INTO wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, counterparty_id, description, metadata)
  VALUES (p_target_user_id, v_wallet.id, v_entry_type, p_currency, v_actual_amount, v_balance_before, v_balance_after, 'admin_action', p_admin_id, p_reason, jsonb_build_object('admin_id', p_admin_id, 'reason', p_reason))
  RETURNING id INTO v_ledger_id;
  RETURN jsonb_build_object('success', true, 'ledger_id', v_ledger_id, 'balance_before', v_balance_before, 'balance_after', v_balance_after);
END;
$$;

CREATE OR REPLACE FUNCTION public.convert_nova_aura(p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid(); v_aura_amount numeric; v_current_nova numeric;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF p_amount <= 0 THEN RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive'); END IF;
  v_aura_amount := p_amount * 2;
  SELECT nova_balance INTO v_current_nova FROM wallets WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Wallet not found'); END IF;
  IF v_current_nova < p_amount THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient Nova balance'); END IF;
  IF EXISTS (SELECT 1 FROM wallets WHERE user_id = v_user_id AND is_frozen = true) THEN RETURN jsonb_build_object('success', false, 'error', 'Wallet is frozen'); END IF;
  PERFORM set_config('app.bypass_wallet_guard', 'true', true);
  UPDATE wallets SET nova_balance = nova_balance - p_amount, updated_at = now() WHERE user_id = v_user_id;
  UPDATE wallets SET aura_balance = aura_balance + v_aura_amount, updated_at = now() WHERE user_id = v_user_id;
  PERFORM set_config('app.bypass_wallet_guard', 'false', true);
  INSERT INTO wallet_ledger (user_id, entry_type, amount, currency) VALUES (v_user_id, 'conversion', -p_amount, 'NOVA'), (v_user_id, 'conversion', v_aura_amount, 'AURA');
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.bypass_wallet_guard', 'false', true);
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- === CONTEST RPCs ===

CREATE OR REPLACE FUNCTION public.join_contest(p_user_id uuid, p_contest_id uuid, p_entry_fee numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wallet wallets%ROWTYPE; v_contest contests%ROWTYPE;
  v_balance_before numeric; v_balance_after numeric;
  v_entry_id uuid; v_ledger_id uuid;
  v_new_prize_pool numeric; v_new_participants integer;
  v_ksa_now timestamp; v_ksa_today date; v_join_close timestamp;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Authentication required'); END IF;
  IF auth.uid() <> p_user_id THEN RETURN jsonb_build_object('success', false, 'error', 'You can only join contests as yourself'); END IF;
  v_ksa_now := timezone('Asia/Riyadh', now());
  v_ksa_today := (v_ksa_now)::date;
  v_join_close := date_trunc('day', v_ksa_now) + interval '19 hours';
  IF v_ksa_now >= v_join_close THEN RETURN jsonb_build_object('success', false, 'error', 'Joining is closed'); END IF;
  SELECT * INTO v_contest FROM contests WHERE id = p_contest_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Contest not found'); END IF;
  IF v_contest.contest_date <> v_ksa_today THEN RETURN jsonb_build_object('success', false, 'error', 'No contest for today'); END IF;
  IF v_contest.max_participants IS NOT NULL AND v_contest.current_participants >= v_contest.max_participants THEN RETURN jsonb_build_object('success', false, 'error', 'Contest is full'); END IF;
  IF EXISTS (SELECT 1 FROM contest_entries WHERE contest_id = p_contest_id AND user_id = p_user_id) THEN RETURN jsonb_build_object('success', false, 'error', 'Already joined this contest'); END IF;
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Wallet not found'); END IF;
  IF v_wallet.is_frozen THEN RETURN jsonb_build_object('success', false, 'error', 'Wallet is frozen'); END IF;
  v_balance_before := v_wallet.nova_balance;
  IF v_balance_before < p_entry_fee THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient Nova balance'); END IF;
  v_balance_after := v_balance_before - p_entry_fee;
  UPDATE wallets SET nova_balance = v_balance_after, updated_at = now() WHERE id = v_wallet.id;
  INSERT INTO contest_entries (contest_id, user_id, votes_received) VALUES (p_contest_id, p_user_id, 0) RETURNING id INTO v_entry_id;
  v_new_participants := v_contest.current_participants + 1;
  v_new_prize_pool := v_new_participants * 6;
  UPDATE contests SET current_participants = v_new_participants, prize_pool = v_new_prize_pool WHERE id = p_contest_id;
  INSERT INTO wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, description, description_ar)
  VALUES (p_user_id, v_wallet.id, 'contest_entry', 'nova', -p_entry_fee, v_balance_before, v_balance_after, 'contest', p_contest_id, 'Contest entry fee', 'رسوم دخول المسابقة')
  RETURNING id INTO v_ledger_id;
  INSERT INTO transactions (user_id, type, currency, amount, reference_id, description, description_ar)
  VALUES (p_user_id, 'contest_entry', 'nova', -p_entry_fee, v_entry_id, 'Contest entry fee', 'رسوم دخول المسابقة');
  RETURN jsonb_build_object('success', true, 'entry_id', v_entry_id, 'ledger_id', v_ledger_id, 'balance_after', v_balance_after, 'new_participants', v_new_participants, 'new_prize_pool', v_new_prize_pool);
END;
$$;

CREATE OR REPLACE FUNCTION public.cast_vote(p_voter_id uuid, p_contestant_id uuid, p_contest_id uuid, p_vote_count integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wallet wallets%ROWTYPE; v_aura_cost NUMERIC; v_aura_balance NUMERIC; v_nova_balance NUMERIC;
  v_aura_to_use NUMERIC; v_nova_to_use NUMERIC; v_vote_id UUID;
BEGIN
  IF p_vote_count < 1 OR p_vote_count > 100 THEN RETURN jsonb_build_object('success', false, 'error', 'Vote count must be between 1 and 100'); END IF;
  IF p_voter_id = p_contestant_id THEN RETURN jsonb_build_object('success', false, 'error', 'Cannot vote for yourself'); END IF;
  IF NOT EXISTS (SELECT 1 FROM contest_entries WHERE contest_id = p_contest_id AND user_id = p_contestant_id) THEN RETURN jsonb_build_object('success', false, 'error', 'Contestant not found in this contest'); END IF;
  v_aura_cost := p_vote_count;
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_voter_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Wallet not found'); END IF;
  IF v_wallet.is_frozen THEN RETURN jsonb_build_object('success', false, 'error', 'Wallet is frozen'); END IF;
  v_aura_balance := v_wallet.aura_balance; v_nova_balance := v_wallet.nova_balance;
  IF v_aura_balance >= v_aura_cost THEN v_aura_to_use := v_aura_cost; v_nova_to_use := 0;
  ELSE v_aura_to_use := v_aura_balance; v_nova_to_use := (v_aura_cost - v_aura_to_use) * 0.5;
    IF v_nova_balance < v_nova_to_use THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance for voting'); END IF;
  END IF;
  UPDATE wallets SET aura_balance = aura_balance - v_aura_to_use, nova_balance = nova_balance - v_nova_to_use, updated_at = now() WHERE id = v_wallet.id;
  INSERT INTO votes (voter_id, contestant_id, contest_id, aura_spent) VALUES (p_voter_id, p_contestant_id, p_contest_id, v_aura_cost) RETURNING id INTO v_vote_id;
  UPDATE contest_entries SET votes_received = votes_received + p_vote_count WHERE contest_id = p_contest_id AND user_id = p_contestant_id;
  RETURN jsonb_build_object('success', true, 'vote_id', v_vote_id, 'votes_cast', p_vote_count, 'aura_spent', v_aura_to_use, 'nova_spent', v_nova_to_use);
END;
$$;

CREATE OR REPLACE FUNCTION public.cast_free_vote(p_voter_id uuid, p_contestant_id uuid, p_contest_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_vote_id UUID; v_voter_entry contest_entries%ROWTYPE;
BEGIN
  IF p_voter_id = p_contestant_id THEN RETURN jsonb_build_object('success', false, 'error', 'Cannot vote for yourself'); END IF;
  SELECT * INTO v_voter_entry FROM contest_entries WHERE contest_id = p_contest_id AND user_id = p_voter_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'You must join the contest first'); END IF;
  IF v_voter_entry.free_vote_used THEN RETURN jsonb_build_object('success', false, 'error', 'Free vote already used'); END IF;
  IF NOT EXISTS (SELECT 1 FROM contest_entries WHERE contest_id = p_contest_id AND user_id = p_contestant_id) THEN RETURN jsonb_build_object('success', false, 'error', 'Contestant not found in this contest'); END IF;
  UPDATE contest_entries SET free_vote_used = TRUE WHERE id = v_voter_entry.id;
  INSERT INTO votes (voter_id, contestant_id, contest_id, aura_spent) VALUES (p_voter_id, p_contestant_id, p_contest_id, 0) RETURNING id INTO v_vote_id;
  UPDATE contest_entries SET votes_received = votes_received + 1 WHERE contest_id = p_contest_id AND user_id = p_contestant_id;
  RETURN jsonb_build_object('success', true, 'vote_id', v_vote_id, 'is_free_vote', true);
END;
$$;

-- === P2P RPCs ===

CREATE OR REPLACE FUNCTION public.p2p_create_sell_order(p_creator_id uuid, p_nova_amount numeric, p_local_amount numeric, p_exchange_rate numeric, p_country text, p_time_limit_minutes integer DEFAULT 15, p_payment_method_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wallet wallets%ROWTYPE; v_order_id UUID; v_ledger_id UUID;
  v_balance_before NUMERIC; v_balance_after NUMERIC; v_locked_before NUMERIC; v_locked_after NUMERIC;
BEGIN
  IF p_nova_amount <= 0 THEN RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive'); END IF;
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_creator_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Wallet not found'); END IF;
  IF v_wallet.is_frozen THEN RETURN jsonb_build_object('success', false, 'error', 'Wallet is frozen'); END IF;
  IF v_wallet.nova_balance < p_nova_amount THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient Nova balance'); END IF;
  v_balance_before := v_wallet.nova_balance; v_locked_before := v_wallet.locked_nova_balance;
  v_balance_after := v_balance_before - p_nova_amount; v_locked_after := v_locked_before + p_nova_amount;
  UPDATE wallets SET nova_balance = v_balance_after, locked_nova_balance = v_locked_after, updated_at = NOW() WHERE id = v_wallet.id;
  INSERT INTO p2p_orders (creator_id, order_type, nova_amount, local_amount, exchange_rate, country, time_limit_minutes, payment_method_id, status)
  VALUES (p_creator_id, 'sell', p_nova_amount, p_local_amount, p_exchange_rate, p_country, p_time_limit_minutes, p_payment_method_id, 'open') RETURNING id INTO v_order_id;
  INSERT INTO wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, description, description_ar, metadata)
  VALUES (p_creator_id, v_wallet.id, 'p2p_escrow_lock', 'nova', -p_nova_amount, v_balance_before, v_balance_after, 'p2p_order', v_order_id, 'Nova locked for P2P sell order', 'حجز Nova لطلب بيع P2P',
    jsonb_build_object('locked_balance_before', v_locked_before, 'locked_balance_after', v_locked_after, 'order_type', 'sell'))
  RETURNING id INTO v_ledger_id;
  RETURN jsonb_build_object('success', true, 'order_id', v_order_id, 'ledger_id', v_ledger_id, 'nova_balance', v_balance_after, 'locked_balance', v_locked_after);
END;
$$;

CREATE OR REPLACE FUNCTION public.p2p_create_buy_order(p_creator_id uuid, p_nova_amount numeric, p_local_amount numeric, p_exchange_rate numeric, p_country text, p_time_limit_minutes integer DEFAULT 15, p_payment_method_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_wallet wallets%ROWTYPE; v_order_id UUID;
BEGIN
  IF p_nova_amount <= 0 THEN RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive'); END IF;
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_creator_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Wallet not found'); END IF;
  IF v_wallet.is_frozen THEN RETURN jsonb_build_object('success', false, 'error', 'Wallet is frozen'); END IF;
  INSERT INTO p2p_orders (creator_id, order_type, nova_amount, local_amount, exchange_rate, country, time_limit_minutes, payment_method_id, status)
  VALUES (p_creator_id, 'buy', p_nova_amount, p_local_amount, p_exchange_rate, p_country, p_time_limit_minutes, p_payment_method_id, 'open') RETURNING id INTO v_order_id;
  RETURN jsonb_build_object('success', true, 'order_id', v_order_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.p2p_execute_order(p_order_id uuid, p_executor_id uuid, p_payment_method_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order p2p_orders%ROWTYPE; v_executor_wallet wallets%ROWTYPE; v_seller_id UUID; v_ledger_id UUID;
  v_balance_before NUMERIC; v_balance_after NUMERIC; v_locked_before NUMERIC; v_locked_after NUMERIC; v_executor_country TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Authentication required'); END IF;
  IF auth.uid() <> p_executor_id THEN RETURN jsonb_build_object('success', false, 'error', 'Identity mismatch'); END IF;
  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;
  IF v_order.creator_id = p_executor_id THEN RETURN jsonb_build_object('success', false, 'error', 'Cannot execute your own order'); END IF;
  IF v_order.status != 'open' THEN RETURN jsonb_build_object('success', false, 'error', 'Order is not available'); END IF;
  SELECT * INTO v_executor_wallet FROM wallets WHERE user_id = p_executor_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Executor wallet not found'); END IF;
  IF v_executor_wallet.is_frozen THEN RETURN jsonb_build_object('success', false, 'error', 'Your wallet is frozen'); END IF;
  IF v_order.order_type = 'buy' THEN
    IF v_executor_wallet.nova_balance < v_order.nova_amount THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient Nova balance to sell'); END IF;
    v_balance_before := v_executor_wallet.nova_balance; v_locked_before := v_executor_wallet.locked_nova_balance;
    v_balance_after := v_balance_before - v_order.nova_amount; v_locked_after := v_locked_before + v_order.nova_amount;
    UPDATE wallets SET nova_balance = v_balance_after, locked_nova_balance = v_locked_after, updated_at = NOW() WHERE id = v_executor_wallet.id;
    INSERT INTO wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, description, description_ar, metadata)
    VALUES (p_executor_id, v_executor_wallet.id, 'p2p_escrow_lock', 'nova', -v_order.nova_amount, v_balance_before, v_balance_after, 'p2p_order', p_order_id,
      'Nova locked for P2P order execution', 'حجز Nova لتنفيذ طلب P2P',
      jsonb_build_object('locked_balance_before', v_locked_before, 'locked_balance_after', v_locked_after)) RETURNING id INTO v_ledger_id;
  END IF;
  UPDATE p2p_orders SET executor_id = p_executor_id, status = 'awaiting_payment', matched_at = NOW(),
    payment_method_id = COALESCE(p_payment_method_id, v_order.payment_method_id), updated_at = NOW() WHERE id = p_order_id;
  INSERT INTO p2p_messages (order_id, sender_id, content, content_ar, message_type, is_system_message)
  VALUES (p_order_id, p_executor_id, 'Order matched. Buyer should send payment within ' || v_order.time_limit_minutes || ' minutes.',
    'تم مطابقة الطلب. يجب على المشتري إرسال الدفع خلال ' || v_order.time_limit_minutes || ' دقيقة.', 'system', true);
  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'matched_at', NOW(), 'ledger_id', v_ledger_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.p2p_confirm_payment(p_order_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_order p2p_orders%ROWTYPE; v_buyer_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Authentication required'); END IF;
  IF auth.uid() <> p_user_id THEN RETURN jsonb_build_object('success', false, 'error', 'Identity mismatch'); END IF;
  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;
  IF v_order.status != 'awaiting_payment' THEN RETURN jsonb_build_object('success', false, 'error', 'Order is not awaiting payment'); END IF;
  IF v_order.order_type = 'buy' THEN v_buyer_id := v_order.creator_id; ELSE v_buyer_id := v_order.executor_id; END IF;
  IF p_user_id != v_buyer_id THEN RETURN jsonb_build_object('success', false, 'error', 'Only buyer can confirm payment'); END IF;
  UPDATE p2p_orders SET status = 'payment_sent', updated_at = NOW() WHERE id = p_order_id;
  INSERT INTO p2p_messages (order_id, sender_id, content, content_ar, message_type, is_system_message)
  VALUES (p_order_id, p_user_id, 'Buyer has confirmed payment. Seller should verify and release Nova.', 'المشتري أكد الدفع. يجب على البائع التحقق وتحرير Nova.', 'system', true);
  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'status', 'payment_sent');
END;
$$;

CREATE OR REPLACE FUNCTION public.p2p_release_escrow(p_order_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order p2p_orders%ROWTYPE; v_seller_id UUID; v_buyer_id UUID;
  v_seller_wallet wallets%ROWTYPE; v_buyer_wallet wallets%ROWTYPE;
  v_seller_locked_before NUMERIC; v_seller_locked_after NUMERIC;
  v_buyer_balance_before NUMERIC; v_buyer_balance_after NUMERIC;
  v_seller_ledger_id UUID; v_buyer_ledger_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Authentication required'); END IF;
  IF auth.uid() <> p_user_id THEN RETURN jsonb_build_object('success', false, 'error', 'Identity mismatch'); END IF;
  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;
  IF v_order.status != 'payment_sent' THEN RETURN jsonb_build_object('success', false, 'error', 'Order is not ready for release'); END IF;
  IF v_order.order_type = 'sell' THEN v_seller_id := v_order.creator_id; v_buyer_id := v_order.executor_id;
  ELSE v_seller_id := v_order.executor_id; v_buyer_id := v_order.creator_id; END IF;
  IF auth.uid() != v_seller_id THEN RETURN jsonb_build_object('success', false, 'error', 'Only seller can release escrow'); END IF;
  SELECT * INTO v_seller_wallet FROM wallets WHERE user_id = v_seller_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Seller wallet not found'); END IF;
  IF v_seller_wallet.locked_nova_balance < v_order.nova_amount THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient locked balance'); END IF;
  SELECT * INTO v_buyer_wallet FROM wallets WHERE user_id = v_buyer_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Buyer wallet not found'); END IF;
  v_seller_locked_before := v_seller_wallet.locked_nova_balance;
  v_seller_locked_after := v_seller_locked_before - v_order.nova_amount;
  v_buyer_balance_before := v_buyer_wallet.nova_balance;
  v_buyer_balance_after := v_buyer_balance_before + v_order.nova_amount;
  UPDATE wallets SET locked_nova_balance = v_seller_locked_after, updated_at = NOW() WHERE id = v_seller_wallet.id;
  UPDATE wallets SET nova_balance = v_buyer_balance_after, updated_at = NOW() WHERE id = v_buyer_wallet.id;
  UPDATE p2p_orders SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = p_order_id;
  INSERT INTO wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, counterparty_id, description, description_ar, metadata)
  VALUES (v_seller_id, v_seller_wallet.id, 'p2p_escrow_release', 'nova', -v_order.nova_amount, v_seller_locked_before, v_seller_locked_after, 'p2p_order', p_order_id, v_buyer_id, 'Nova released to buyer', 'تم تحرير Nova للمشتري', jsonb_build_object('is_locked_balance', true))
  RETURNING id INTO v_seller_ledger_id;
  INSERT INTO wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, counterparty_id, description, description_ar, metadata)
  VALUES (v_buyer_id, v_buyer_wallet.id, 'p2p_buy', 'nova', v_order.nova_amount, v_buyer_balance_before, v_buyer_balance_after, 'p2p_order', p_order_id, v_seller_id, 'Nova received from P2P purchase', 'تم استلام Nova من شراء P2P', jsonb_build_object('seller_id', v_seller_id))
  RETURNING id INTO v_buyer_ledger_id;
  INSERT INTO p2p_messages (order_id, sender_id, content, content_ar, message_type, is_system_message)
  VALUES (p_order_id, v_seller_id, 'Nova has been released. Transaction completed successfully!', 'تم تحرير Nova. اكتملت المعاملة بنجاح!', 'system', true);
  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'seller_ledger_id', v_seller_ledger_id, 'buyer_ledger_id', v_buyer_ledger_id, 'buyer_new_balance', v_buyer_balance_after);
END;
$$;

CREATE OR REPLACE FUNCTION public.p2p_cancel_order(p_order_id uuid, p_user_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order p2p_orders%ROWTYPE; v_seller_id UUID; v_seller_wallet wallets%ROWTYPE;
  v_balance_before NUMERIC; v_balance_after NUMERIC; v_locked_before NUMERIC; v_locked_after NUMERIC;
  v_ledger_id UUID; v_is_participant BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Authentication required'); END IF;
  IF auth.uid() <> p_user_id THEN RETURN jsonb_build_object('success', false, 'error', 'Identity mismatch'); END IF;
  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;
  v_is_participant := (v_order.creator_id = p_user_id OR v_order.executor_id = p_user_id);
  IF NOT v_is_participant THEN RETURN jsonb_build_object('success', false, 'error', 'Not authorized to cancel this order'); END IF;
  IF v_order.order_type = 'sell' THEN v_seller_id := v_order.creator_id; ELSE v_seller_id := v_order.executor_id; END IF;
  CASE v_order.status
    WHEN 'open' THEN
      IF v_order.order_type = 'sell' THEN
        SELECT * INTO v_seller_wallet FROM wallets WHERE user_id = v_seller_id FOR UPDATE;
        v_balance_before := v_seller_wallet.nova_balance; v_locked_before := v_seller_wallet.locked_nova_balance;
        v_balance_after := v_balance_before + v_order.nova_amount; v_locked_after := v_locked_before - v_order.nova_amount;
        UPDATE wallets SET nova_balance = v_balance_after, locked_nova_balance = v_locked_after, updated_at = NOW() WHERE id = v_seller_wallet.id;
        INSERT INTO wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, description, description_ar, metadata)
        VALUES (v_seller_id, v_seller_wallet.id, 'p2p_escrow_release', 'nova', v_order.nova_amount, v_balance_before, v_balance_after, 'p2p_order', p_order_id, 'Nova refunded - order cancelled', 'استرداد Nova - تم إلغاء الطلب', jsonb_build_object('action', 'cancel_refund')) RETURNING id INTO v_ledger_id;
      END IF;
      UPDATE p2p_orders SET status = 'cancelled', cancelled_by = p_user_id, cancellation_reason = p_reason, updated_at = NOW() WHERE id = p_order_id;
    WHEN 'awaiting_payment' THEN
      IF v_seller_id IS NOT NULL THEN
        SELECT * INTO v_seller_wallet FROM wallets WHERE user_id = v_seller_id FOR UPDATE;
        v_balance_before := v_seller_wallet.nova_balance; v_locked_before := v_seller_wallet.locked_nova_balance;
        v_balance_after := v_balance_before + v_order.nova_amount; v_locked_after := v_locked_before - v_order.nova_amount;
        UPDATE wallets SET nova_balance = v_balance_after, locked_nova_balance = v_locked_after, updated_at = NOW() WHERE id = v_seller_wallet.id;
        INSERT INTO wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, description, description_ar, metadata)
        VALUES (v_seller_id, v_seller_wallet.id, 'p2p_escrow_release', 'nova', v_order.nova_amount, v_balance_before, v_balance_after, 'p2p_order', p_order_id, 'Nova refunded - order cancelled during payment', 'استرداد Nova - إلغاء أثناء الدفع', jsonb_build_object('action', 'cancel_refund_awaiting')) RETURNING id INTO v_ledger_id;
      END IF;
      UPDATE p2p_orders SET status = 'cancelled', cancelled_by = p_user_id, cancellation_reason = p_reason, updated_at = NOW() WHERE id = p_order_id;
    ELSE RETURN jsonb_build_object('success', false, 'error', 'Cannot cancel in current status: ' || v_order.status);
  END CASE;
  INSERT INTO p2p_messages (order_id, sender_id, content, content_ar, message_type, is_system_message)
  VALUES (p_order_id, p_user_id, 'Order cancelled' || COALESCE(': ' || p_reason, ''), 'تم إلغاء الطلب' || COALESCE(': ' || p_reason, ''), 'system', true);
  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'status', 'cancelled', 'ledger_id', v_ledger_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.p2p_delete_order(p_order_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order p2p_orders%ROWTYPE; v_wallet wallets%ROWTYPE;
  v_balance_before NUMERIC; v_balance_after NUMERIC; v_locked_before NUMERIC; v_locked_after NUMERIC;
BEGIN
  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;
  IF v_order.creator_id != p_user_id THEN RETURN jsonb_build_object('success', false, 'error', 'Only order creator can delete'); END IF;
  IF v_order.status != 'open' THEN RETURN jsonb_build_object('success', false, 'error', 'Only open orders can be deleted'); END IF;
  IF v_order.order_type = 'sell' THEN
    SELECT * INTO v_wallet FROM wallets WHERE user_id = v_order.creator_id FOR UPDATE;
    v_balance_before := v_wallet.nova_balance; v_locked_before := v_wallet.locked_nova_balance;
    v_balance_after := v_balance_before + v_order.nova_amount; v_locked_after := v_locked_before - v_order.nova_amount;
    UPDATE wallets SET nova_balance = v_balance_after, locked_nova_balance = v_locked_after, updated_at = NOW() WHERE id = v_wallet.id;
    INSERT INTO wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, description, description_ar, metadata)
    VALUES (v_order.creator_id, v_wallet.id, 'p2p_escrow_release', 'nova', v_order.nova_amount, v_balance_before, v_balance_after, 'p2p_order', p_order_id, 'Nova refunded - order deleted', 'استرداد Nova - حذف الطلب', jsonb_build_object('action', 'delete_refund'));
  END IF;
  DELETE FROM p2p_orders WHERE id = p_order_id;
  RETURN jsonb_build_object('success', true, 'refunded', v_order.order_type = 'sell', 'amount', v_order.nova_amount);
END;
$$;

CREATE OR REPLACE FUNCTION public.p2p_expire_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order p2p_orders%ROWTYPE; v_seller_id UUID; v_seller_wallet wallets%ROWTYPE;
  v_balance_before NUMERIC; v_balance_after NUMERIC; v_locked_before NUMERIC; v_locked_after NUMERIC;
BEGIN
  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;
  IF v_order.status = 'awaiting_payment' THEN
    IF v_order.order_type = 'buy' AND v_order.executor_id IS NOT NULL THEN
      v_seller_id := v_order.executor_id;
      SELECT * INTO v_seller_wallet FROM wallets WHERE user_id = v_seller_id FOR UPDATE;
      IF FOUND THEN
        v_balance_before := v_seller_wallet.nova_balance; v_locked_before := v_seller_wallet.locked_nova_balance;
        v_balance_after := v_balance_before + v_order.nova_amount; v_locked_after := v_locked_before - v_order.nova_amount;
        UPDATE wallets SET nova_balance = v_balance_after, locked_nova_balance = v_locked_after, updated_at = NOW() WHERE id = v_seller_wallet.id;
        INSERT INTO wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, description, description_ar, metadata)
        VALUES (v_seller_id, v_seller_wallet.id, 'p2p_escrow_release', 'nova', v_order.nova_amount, v_balance_before, v_balance_after, 'p2p_order', p_order_id, 'Nova unlocked - order expired', 'تم فك حجز Nova - انتهى الطلب', jsonb_build_object('action', 'expire_escrow_unlock'));
      END IF;
    END IF;
    UPDATE p2p_orders SET status = 'open', executor_id = NULL, matched_at = NULL, updated_at = NOW() WHERE id = p_order_id;
    RETURN jsonb_build_object('success', true, 'action', 'returned_to_market');
  END IF;
  IF v_order.status = 'payment_sent' THEN
    UPDATE p2p_orders SET status = 'disputed', cancellation_reason = 'Timer expired during payment confirmation', updated_at = NOW() WHERE id = p_order_id;
    RETURN jsonb_build_object('success', true, 'action', 'auto_disputed');
  END IF;
  RETURN jsonb_build_object('success', false, 'error', 'Order not eligible for expiration');
END;
$$;

CREATE OR REPLACE FUNCTION public.p2p_open_dispute(p_order_id uuid, p_user_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_order RECORD;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RETURN jsonb_build_object('success', false, 'error', 'Identity mismatch'); END IF;
  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id FOR UPDATE;
  IF v_order IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;
  IF v_order.status != 'payment_sent' THEN RETURN jsonb_build_object('success', false, 'error', 'You must confirm payment before opening a dispute'); END IF;
  IF p_user_id != v_order.creator_id AND p_user_id != v_order.executor_id THEN RETURN jsonb_build_object('success', false, 'error', 'Not a participant'); END IF;
  UPDATE p2p_orders SET status = 'disputed', updated_at = now() WHERE id = p_order_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.p2p_resolve_dispute(p_order_id uuid, p_staff_id uuid, p_resolution text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order p2p_orders%ROWTYPE; v_seller_id UUID; v_buyer_id UUID;
  v_seller_wallet wallets%ROWTYPE; v_buyer_wallet wallets%ROWTYPE;
  v_seller_balance_before NUMERIC; v_seller_balance_after NUMERIC;
  v_seller_locked_before NUMERIC; v_seller_locked_after NUMERIC;
  v_buyer_balance_before NUMERIC; v_buyer_balance_after NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Authentication required'); END IF;
  IF auth.uid() <> p_staff_id THEN RETURN jsonb_build_object('success', false, 'error', 'Identity mismatch'); END IF;
  IF NOT is_support_staff(p_staff_id) THEN RETURN jsonb_build_object('success', false, 'error', 'Unauthorized'); END IF;
  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;
  IF v_order.status != 'disputed' THEN RETURN jsonb_build_object('success', false, 'error', 'Order is not disputed'); END IF;
  IF v_order.order_type = 'sell' THEN v_seller_id := v_order.creator_id; v_buyer_id := v_order.executor_id;
  ELSE v_seller_id := v_order.executor_id; v_buyer_id := v_order.creator_id; END IF;
  IF p_resolution = 'release_to_buyer' THEN
    SELECT * INTO v_seller_wallet FROM wallets WHERE user_id = v_seller_id FOR UPDATE;
    SELECT * INTO v_buyer_wallet FROM wallets WHERE user_id = v_buyer_id FOR UPDATE;
    v_seller_locked_before := v_seller_wallet.locked_nova_balance; v_seller_locked_after := v_seller_locked_before - v_order.nova_amount;
    v_buyer_balance_before := v_buyer_wallet.nova_balance; v_buyer_balance_after := v_buyer_balance_before + v_order.nova_amount;
    UPDATE wallets SET locked_nova_balance = v_seller_locked_after, updated_at = NOW() WHERE id = v_seller_wallet.id;
    UPDATE wallets SET nova_balance = v_buyer_balance_after, updated_at = NOW() WHERE id = v_buyer_wallet.id;
    UPDATE p2p_orders SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = p_order_id;
  ELSIF p_resolution = 'return_to_seller' THEN
    SELECT * INTO v_seller_wallet FROM wallets WHERE user_id = v_seller_id FOR UPDATE;
    v_seller_balance_before := v_seller_wallet.nova_balance; v_seller_locked_before := v_seller_wallet.locked_nova_balance;
    v_seller_balance_after := v_seller_balance_before + v_order.nova_amount; v_seller_locked_after := v_seller_locked_before - v_order.nova_amount;
    UPDATE wallets SET nova_balance = v_seller_balance_after, locked_nova_balance = v_seller_locked_after, updated_at = NOW() WHERE id = v_seller_wallet.id;
    UPDATE p2p_orders SET status = 'cancelled', cancelled_by = p_staff_id, cancellation_reason = 'Dispute resolved in seller favor', updated_at = NOW() WHERE id = p_order_id;
  ELSE RETURN jsonb_build_object('success', false, 'error', 'Invalid resolution type');
  END IF;
  INSERT INTO p2p_messages (order_id, sender_id, content, content_ar, message_type, is_system_message)
  VALUES (p_order_id, p_staff_id, 'Dispute resolved by support: ' || p_resolution, 'تم حل النزاع بواسطة الدعم: ' || p_resolution, 'system', true);
  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'resolution', p_resolution);
END;
$$;

CREATE OR REPLACE FUNCTION public.p2p_extend_time(p_order_id uuid, p_minutes integer DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_order p2p_orders%ROWTYPE; v_seller_id UUID; v_new_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  IF p_minutes < 5 OR p_minutes > 30 THEN RETURN jsonb_build_object('success', false, 'error', 'Extension must be between 5 and 30 minutes'); END IF;
  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;
  IF v_order.order_type = 'sell' THEN v_seller_id := v_order.creator_id; ELSE v_seller_id := v_order.executor_id; END IF;
  IF auth.uid() != v_seller_id THEN RETURN jsonb_build_object('success', false, 'error', 'Only seller can extend time'); END IF;
  IF v_order.status != 'payment_sent' THEN RETURN jsonb_build_object('success', false, 'error', 'Can only extend time after payment confirmation'); END IF;
  IF v_order.extension_count >= 1 THEN RETURN jsonb_build_object('success', false, 'error', 'Time can only be extended once'); END IF;
  v_new_expires_at := COALESCE(v_order.expires_at, v_order.matched_at + (v_order.time_limit_minutes * interval '1 minute')) + (p_minutes * interval '1 minute');
  UPDATE p2p_orders SET extension_count = extension_count + 1, expires_at = v_new_expires_at, time_limit_minutes = time_limit_minutes + p_minutes, updated_at = now() WHERE id = p_order_id;
  INSERT INTO p2p_messages (order_id, sender_id, content, content_ar, message_type, is_system_message)
  VALUES (p_order_id, auth.uid(), 'Seller extended the wait time by ' || p_minutes || ' minutes.', 'قام البائع بتمديد وقت الانتظار ' || p_minutes || ' دقائق.', 'system', true);
  RETURN jsonb_build_object('success', true, 'new_expires_at', v_new_expires_at, 'extension_count', v_order.extension_count + 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.p2p_submit_rating(p_order_id uuid, p_rated_id uuid, p_rating smallint, p_comment text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_order p2p_orders%ROWTYPE; v_rating_id UUID;
BEGIN
  IF p_rating NOT IN (1, -1) THEN RETURN jsonb_build_object('success', false, 'error', 'Rating must be 1 or -1'); END IF;
  IF auth.uid() = p_rated_id THEN RETURN jsonb_build_object('success', false, 'error', 'Cannot rate yourself'); END IF;
  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;
  IF v_order.status != 'completed' THEN RETURN jsonb_build_object('success', false, 'error', 'Order must be completed to rate'); END IF;
  IF auth.uid() NOT IN (v_order.creator_id, v_order.executor_id) THEN RETURN jsonb_build_object('success', false, 'error', 'You are not a participant'); END IF;
  IF EXISTS (SELECT 1 FROM p2p_ratings WHERE order_id = p_order_id AND rater_id = auth.uid()) THEN RETURN jsonb_build_object('success', false, 'error', 'You have already rated this order'); END IF;
  INSERT INTO p2p_ratings (order_id, rater_id, rated_id, rating, comment) VALUES (p_order_id, auth.uid(), p_rated_id, p_rating, p_comment) RETURNING id INTO v_rating_id;
  RETURN jsonb_build_object('success', true, 'rating_id', v_rating_id);
END;
$$;

-- === TEAM & REFERRAL RPCs ===

CREATE OR REPLACE FUNCTION public.get_team_stats(p_user_id uuid) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_result JSON; v_direct_count INT; v_indirect_count INT; v_active_direct INT; v_active_indirect INT; v_team_points BIGINT; v_cycle_id UUID; v_current_week INT; v_user_profile RECORD;
BEGIN
  SELECT * INTO v_user_profile FROM profiles WHERE user_id = p_user_id;
  SELECT cycle_id, week_number INTO v_cycle_id, v_current_week FROM get_active_cycle_info();
  SELECT COUNT(*) INTO v_direct_count FROM team_members WHERE leader_id = p_user_id AND level = 1;
  SELECT COUNT(*) INTO v_indirect_count FROM team_members WHERE leader_id = p_user_id AND level > 1;
  SELECT COUNT(*) INTO v_active_direct FROM team_members tm JOIN profiles p ON p.user_id = tm.member_id WHERE tm.leader_id = p_user_id AND tm.level = 1 AND p.weekly_active = true;
  SELECT COUNT(*) INTO v_active_indirect FROM team_members tm JOIN profiles p ON p.user_id = tm.member_id WHERE tm.leader_id = p_user_id AND tm.level > 1 AND p.weekly_active = true;
  SELECT COALESCE(SUM(daily_points), 0) INTO v_team_points FROM spotlight_user_points sup JOIN team_members tm ON tm.member_id = sup.user_id WHERE tm.leader_id = p_user_id AND (v_cycle_id IS NULL OR sup.cycle_id = v_cycle_id);
  v_result := json_build_object('direct_count', COALESCE(v_direct_count, 0), 'indirect_count', COALESCE(v_indirect_count, 0), 'total_count', COALESCE(v_direct_count, 0) + COALESCE(v_indirect_count, 0), 'active_direct', COALESCE(v_active_direct, 0), 'active_indirect', COALESCE(v_active_indirect, 0), 'total_active', COALESCE(v_active_direct, 0) + COALESCE(v_active_indirect, 0), 'team_points', COALESCE(v_team_points, 0), 'current_week', COALESCE(v_current_week, 1), 'user_rank', COALESCE(v_user_profile.rank::TEXT, 'subscriber'));
  RETURN v_result;
END; $$;

CREATE OR REPLACE FUNCTION public.get_dm_conversations() RETURNS TABLE(conversation_id uuid, partner_id uuid, partner_name text, partner_username text, partner_avatar text, partner_country text, last_message text, last_message_at timestamptz, unread_count bigint, created_at timestamptz) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT c.id, CASE WHEN c.participant1_id = v_uid THEN c.participant2_id ELSE c.participant1_id END, COALESCE(p.name, 'Unknown'), COALESCE(p.username, 'user'), p.avatar_url, COALESCE(p.country, ''), lm.content, lm.created_at, COALESCE(ur.cnt, 0), c.created_at
  FROM conversations c LEFT JOIN profiles p ON p.user_id = (CASE WHEN c.participant1_id = v_uid THEN c.participant2_id ELSE c.participant1_id END) LEFT JOIN LATERAL (SELECT dm.content, dm.created_at FROM direct_messages dm WHERE dm.conversation_id = c.id ORDER BY dm.created_at DESC LIMIT 1) lm ON true LEFT JOIN LATERAL (SELECT count(*) AS cnt FROM direct_messages dm2 WHERE dm2.conversation_id = c.id AND dm2.is_read = false AND dm2.sender_id <> v_uid) ur ON true
  WHERE c.participant1_id = v_uid OR c.participant2_id = v_uid ORDER BY COALESCE(lm.created_at, c.created_at) DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.get_wallet_history(p_user_id uuid, p_currency text DEFAULT NULL, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, entry_type text, currency text, amount numeric, balance_before numeric, balance_after numeric, description text, description_ar text, reference_type text, reference_id uuid, counterparty_id uuid, counterparty_name text, counterparty_username text, created_at timestamptz, metadata jsonb) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN QUERY SELECT wl.id, wl.entry_type::TEXT, wl.currency::TEXT, wl.amount, wl.balance_before, wl.balance_after, wl.description, wl.description_ar, wl.reference_type, wl.reference_id, wl.counterparty_id, p.name, p.username, wl.created_at, wl.metadata
  FROM wallet_ledger wl LEFT JOIN profiles p ON p.user_id = wl.counterparty_id WHERE wl.user_id = p_user_id AND (p_currency IS NULL OR wl.currency::TEXT = p_currency) ORDER BY wl.created_at DESC LIMIT p_limit OFFSET p_offset;
END; $$;

CREATE OR REPLACE FUNCTION public.record_spotlight_points(p_user_id uuid, p_points integer, p_source text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_cycle_id UUID; v_week_number INT; v_today DATE := CURRENT_DATE;
BEGIN
  BEGIN SELECT cycle_id, week_number INTO v_cycle_id, v_week_number FROM get_active_cycle_info(); EXCEPTION WHEN OTHERS THEN RETURN; END;
  IF v_cycle_id IS NULL THEN RETURN; END IF;
  BEGIN
    INSERT INTO spotlight_user_points (user_id, cycle_id, points_date, week_number, daily_points, source) VALUES (p_user_id, v_cycle_id, v_today, v_week_number, p_points, p_source)
    ON CONFLICT (user_id, cycle_id, points_date, source) DO UPDATE SET daily_points = spotlight_user_points.daily_points + EXCLUDED.daily_points;
    UPDATE profiles SET spotlight_points = spotlight_points + p_points WHERE user_id = p_user_id;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END; $$;

CREATE OR REPLACE FUNCTION public.set_p2p_order_matched_at() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.executor_id IS NOT NULL AND OLD.executor_id IS NULL AND NEW.matched_at IS NULL THEN NEW.matched_at = NOW(); END IF;
  RETURN NEW;
END; $$;

-- === REFERRAL TRIGGER FUNCTIONS ===

CREATE OR REPLACE FUNCTION public.handle_referral_on_profile_insert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_referrer_user_id UUID; v_current_leader UUID; v_level INT; v_exists BOOLEAN;
BEGIN
  IF NEW.referred_by IS NULL THEN RETURN NEW; END IF;
  SELECT user_id INTO v_referrer_user_id FROM profiles WHERE id = NEW.referred_by;
  IF v_referrer_user_id IS NULL OR v_referrer_user_id = NEW.user_id THEN RETURN NEW; END IF;
  SELECT EXISTS(SELECT 1 FROM team_members WHERE leader_id = v_referrer_user_id AND member_id = NEW.user_id) INTO v_exists;
  IF NOT v_exists THEN BEGIN INSERT INTO team_members (leader_id, member_id, level) VALUES (v_referrer_user_id, NEW.user_id, 1); EXCEPTION WHEN OTHERS THEN NULL; END; END IF;
  v_current_leader := v_referrer_user_id; v_level := 2;
  WHILE v_level <= 5 LOOP
    SELECT tm.leader_id INTO v_current_leader FROM team_members tm WHERE tm.member_id = v_current_leader AND tm.level = 1 LIMIT 1;
    EXIT WHEN v_current_leader IS NULL; EXIT WHEN v_current_leader = NEW.user_id;
    SELECT EXISTS(SELECT 1 FROM team_members WHERE leader_id = v_current_leader AND member_id = NEW.user_id) INTO v_exists;
    IF NOT v_exists THEN BEGIN INSERT INTO team_members (leader_id, member_id, level) VALUES (v_current_leader, NEW.user_id, v_level); EXCEPTION WHEN OTHERS THEN NULL; END; END IF;
    v_level := v_level + 1;
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END; $$;

-- === SPOTLIGHT TRIGGER FUNCTIONS ===

CREATE OR REPLACE FUNCTION public.trigger_contest_points_safe() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN BEGIN PERFORM record_spotlight_points(NEW.user_id, 5, 'contest_join'); EXCEPTION WHEN OTHERS THEN NULL; END; RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.trigger_vote_points_safe() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN BEGIN PERFORM record_spotlight_points(NEW.voter_id, 1, 'vote_cast'); PERFORM record_spotlight_points(NEW.contestant_id, 1, 'vote_received'); EXCEPTION WHEN OTHERS THEN NULL; END; RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.trigger_p2p_points_safe() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    BEGIN PERFORM record_spotlight_points(NEW.creator_id, 3, 'p2p_completed'); IF NEW.executor_id IS NOT NULL THEN PERFORM record_spotlight_points(NEW.executor_id, 3, 'p2p_completed'); END IF; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF; RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trigger_transfer_points_safe() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.currency != 'nova' THEN RETURN NEW; END IF;
  BEGIN IF NEW.entry_type IN ('transfer_out', 'transfer_in') THEN PERFORM record_spotlight_points(NEW.user_id, 2, 'transfer'); END IF; EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN NEW;
END; $$;

-- === TEAM CHAT FUNCTIONS ===

CREATE OR REPLACE FUNCTION public.team_chat_enroll_member(p_new_user_id uuid, p_leader_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_conv_id UUID;
BEGIN
  SELECT id INTO v_conv_id FROM public.team_conversations WHERE leader_id = p_leader_id;
  IF v_conv_id IS NULL THEN
    INSERT INTO public.team_conversations (leader_id) VALUES (p_leader_id) RETURNING id INTO v_conv_id;
    INSERT INTO public.team_conversation_members (conversation_id, user_id, role) VALUES (v_conv_id, p_leader_id, 'leader') ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
  INSERT INTO public.team_conversation_members (conversation_id, user_id, role) VALUES (v_conv_id, p_new_user_id, 'member') ON CONFLICT (conversation_id, user_id) DO NOTHING;
  INSERT INTO public.team_messages (conversation_id, sender_id, content, message_type) VALUES (v_conv_id, p_leader_id, 'New member joined the team / انضم عضو جديد للفريق', 'system');
END; $$;

CREATE OR REPLACE FUNCTION public.trg_team_chat_auto_enroll() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN IF NEW.level = 1 THEN PERFORM public.team_chat_enroll_member(NEW.member_id, NEW.leader_id); END IF; RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.emit_team_event(p_user_id uuid, p_event_type text, p_message text, p_message_ar text DEFAULT NULL, p_notify boolean DEFAULT false, p_notif_title text DEFAULT NULL, p_notif_title_ar text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_conv RECORD; v_member RECORD; v_user_name TEXT; v_final_message TEXT; v_final_message_ar TEXT;
BEGIN
  SELECT name INTO v_user_name FROM profiles WHERE user_id = p_user_id; IF v_user_name IS NULL THEN v_user_name := 'Member'; END IF;
  v_final_message := REPLACE(p_message, '{name}', v_user_name);
  v_final_message_ar := CASE WHEN p_message_ar IS NOT NULL THEN REPLACE(p_message_ar, '{name}', v_user_name) ELSE NULL END;
  FOR v_conv IN SELECT tc.id AS conversation_id FROM team_conversation_members tcm JOIN team_conversations tc ON tc.id = tcm.conversation_id WHERE tcm.user_id = p_user_id LOOP
    INSERT INTO team_messages (conversation_id, sender_id, content, message_type) VALUES (v_conv.conversation_id, p_user_id, v_final_message, 'system');
    IF p_notify THEN
      FOR v_member IN SELECT tcm2.user_id FROM team_conversation_members tcm2 WHERE tcm2.conversation_id = v_conv.conversation_id AND tcm2.user_id != p_user_id LOOP
        INSERT INTO notifications (user_id, type, title, title_ar, message, message_ar, reference_id) VALUES (v_member.user_id, 'team_' || p_event_type, COALESCE(p_notif_title, v_final_message), p_notif_title_ar, v_final_message, v_final_message_ar, p_user_id::text);
      END LOOP;
    END IF;
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_team_event_new_referral() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN IF NEW.level = 1 THEN PERFORM emit_team_event(NEW.member_id, 'new_referral', '🤝 {name} joined the team. Welcome!', '🤝 {name} انضم للفريق. أهلاً وسهلاً!'); END IF; RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.trg_team_event_contest_join() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN PERFORM emit_team_event(NEW.user_id, 'contest_join', '🎯 {name} joined today''s contest. Support them with your votes!', '🎯 {name} انضم لمسابقة اليوم. ادعمه بتصويتك!'); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.trg_team_event_rank_promotion() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_rank_label TEXT;
BEGIN
  IF NEW.rank IS DISTINCT FROM OLD.rank AND NEW.rank::text != 'subscriber' THEN
    v_rank_label := INITCAP(REPLACE(NEW.rank::text, '_', ' '));
    PERFORM emit_team_event(NEW.user_id, 'rank_promotion', '👑 {name} has been promoted to ' || v_rank_label || '.', '👑 {name} ترقّى إلى ' || v_rank_label || '.', TRUE, '👑 Team member promoted!', '👑 عضو في فريقك ترقّى!');
  END IF; RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_team_event_prize_earned() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.entry_type IN ('contest_win', 'referral_bonus', 'team_earnings') AND NEW.amount > 0 THEN
    PERFORM emit_team_event(NEW.user_id, 'prize_earned', '💰 {name} earned ' || NEW.amount || ' Nova.', '💰 {name} ربح ' || NEW.amount || ' Nova.');
  END IF; RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.get_active_cycle_info() RETURNS TABLE(cycle_id uuid, week_number integer) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_cycle RECORD; v_today DATE := CURRENT_DATE; v_current_day INT; v_current_week INT;
BEGIN
  SELECT * INTO v_cycle FROM spotlight_cycles sc WHERE sc.status = 'active' LIMIT 1;
  IF v_cycle IS NULL THEN
    INSERT INTO spotlight_cycles (cycle_number, start_date, end_date, total_days, total_weeks, status)
    VALUES (1, CURRENT_DATE, CURRENT_DATE + INTERVAL '98 days', 98, 14, 'active') RETURNING * INTO v_cycle;
  END IF;
  v_current_day := GREATEST(1, LEAST(v_cycle.total_days, (v_today - v_cycle.start_date)::INT + 1));
  v_current_week := GREATEST(1, CEIL(v_current_day::NUMERIC / 7));
  RETURN QUERY SELECT v_cycle.id, v_current_week;
END; $$;

-- ============================================================
-- SECTION 4: TRIGGERS
-- ============================================================

-- Profiles triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER on_profile_insert_handle_referral AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION handle_referral_on_profile_insert();
CREATE TRIGGER team_event_rank_promotion AFTER UPDATE OF rank ON public.profiles FOR EACH ROW EXECUTE FUNCTION trg_team_event_rank_promotion();
CREATE TRIGGER trg_build_team_hierarchy AFTER UPDATE OF referred_by ON public.profiles FOR EACH ROW EXECUTE FUNCTION trigger_build_team_hierarchy();
CREATE TRIGGER trg_build_team_on_insert AFTER INSERT ON public.profiles FOR EACH ROW WHEN (NEW.referred_by IS NOT NULL) EXECUTE FUNCTION trigger_build_team_on_insert();

-- Wallets triggers
CREATE TRIGGER guard_wallet_direct_mutation BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION guard_wallet_balance_mutation();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- P2P triggers
CREATE TRIGGER tr_set_p2p_order_matched_at BEFORE UPDATE ON public.p2p_orders FOR EACH ROW EXECUTE FUNCTION set_p2p_order_matched_at();
CREATE TRIGGER trg_p2p_complete_points_safe AFTER UPDATE ON public.p2p_orders FOR EACH ROW EXECUTE FUNCTION trigger_p2p_points_safe();
CREATE TRIGGER update_p2p_orders_updated_at BEFORE UPDATE ON public.p2p_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Contest triggers
CREATE TRIGGER team_event_contest_join AFTER INSERT ON public.contest_entries FOR EACH ROW EXECUTE FUNCTION trg_team_event_contest_join();
CREATE TRIGGER team_event_contest_rank AFTER UPDATE ON public.contest_entries FOR EACH ROW EXECUTE FUNCTION trg_team_event_contest_rank();
CREATE TRIGGER trg_contest_entry_points_safe AFTER INSERT ON public.contest_entries FOR EACH ROW EXECUTE FUNCTION trigger_contest_points_safe();

-- Votes trigger
CREATE TRIGGER trg_vote_points_safe AFTER INSERT ON public.votes FOR EACH ROW EXECUTE FUNCTION trigger_vote_points_safe();

-- Team triggers
CREATE TRIGGER team_chat_auto_enroll_on_team_member AFTER INSERT ON public.team_members FOR EACH ROW EXECUTE FUNCTION trg_team_chat_auto_enroll();
CREATE TRIGGER team_event_z_new_referral AFTER INSERT ON public.team_members FOR EACH ROW EXECUTE FUNCTION trg_team_event_new_referral();

-- Wallet ledger triggers
CREATE TRIGGER team_event_prize_earned AFTER INSERT ON public.wallet_ledger FOR EACH ROW EXECUTE FUNCTION trg_team_event_prize_earned();
CREATE TRIGGER trg_transfer_points_safe AFTER INSERT ON public.wallet_ledger FOR EACH ROW WHEN (NEW.entry_type = ANY (ARRAY['transfer_out'::ledger_entry_type, 'transfer_in'::ledger_entry_type])) EXECUTE FUNCTION trigger_transfer_points_safe();

-- Support triggers
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Other triggers
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SECTION 5: ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_freeze_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_dispute_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_dispute_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_agent_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spotlight_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spotlight_user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spotlight_daily_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_room ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_discussion_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_activity_stream ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_money_flow ENABLE ROW LEVEL SECURITY;

-- === PROFILES POLICIES ===
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can search minimal profile data" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL AND username IS NOT NULL AND length(username) >= 3);
CREATE POLICY "Support staff can view all profiles" ON public.profiles FOR SELECT USING (is_support_staff(auth.uid()));
CREATE POLICY "Users can view profiles for open P2P orders" ON public.profiles FOR SELECT USING (EXISTS (SELECT 1 FROM p2p_orders WHERE p2p_orders.status = 'open' AND p2p_orders.creator_id = profiles.user_id));
CREATE POLICY "Users can view profiles in their P2P orders" ON public.profiles FOR SELECT USING (EXISTS (SELECT 1 FROM p2p_orders WHERE (p2p_orders.creator_id = auth.uid() OR p2p_orders.executor_id = auth.uid()) AND (p2p_orders.creator_id = profiles.user_id OR p2p_orders.executor_id = profiles.user_id)));
CREATE POLICY "Users can view team member profiles" ON public.profiles FOR SELECT USING (EXISTS (SELECT 1 FROM team_members WHERE (team_members.leader_id = auth.uid() AND team_members.member_id = profiles.user_id) OR (team_members.member_id = auth.uid() AND team_members.leader_id = profiles.user_id)));

-- === WALLET POLICIES ===
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all wallets" ON public.wallets FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Support can view wallets" ON public.wallets FOR SELECT USING (is_support_staff(auth.uid()));

-- === P2P ORDER POLICIES ===
CREATE POLICY "Users can create orders" ON public.p2p_orders FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can view their own orders" ON public.p2p_orders FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = executor_id);
CREATE POLICY "Users can view open orders for marketplace" ON public.p2p_orders FOR SELECT USING (status = 'open' AND auth.uid() IS NOT NULL AND auth.uid() <> creator_id);
CREATE POLICY "Users can execute open orders" ON public.p2p_orders FOR UPDATE USING (status = 'open' AND auth.uid() <> creator_id) WITH CHECK (status IN ('matched', 'awaiting_payment') AND executor_id = auth.uid());
CREATE POLICY "Buyer can confirm payment" ON public.p2p_orders FOR UPDATE USING (status = 'awaiting_payment' AND auth.uid() = CASE WHEN order_type = 'buy' THEN creator_id ELSE executor_id END) WITH CHECK (status = 'payment_sent');
CREATE POLICY "Seller can complete order" ON public.p2p_orders FOR UPDATE USING (status = 'payment_sent' AND auth.uid() = CASE WHEN order_type = 'sell' THEN creator_id ELSE executor_id END) WITH CHECK (status = 'completed');
CREATE POLICY "Creators can cancel open orders" ON public.p2p_orders FOR UPDATE USING (auth.uid() = creator_id AND status = 'open') WITH CHECK (status = 'cancelled' AND cancelled_by = auth.uid());
CREATE POLICY "Participants can relist before payment" ON public.p2p_orders FOR UPDATE USING (status = 'awaiting_payment' AND (auth.uid() = creator_id OR auth.uid() = executor_id)) WITH CHECK (status = 'open' AND executor_id IS NULL AND matched_at IS NULL);
CREATE POLICY "Participants can dispute after payment" ON public.p2p_orders FOR UPDATE USING (status = 'payment_sent' AND (auth.uid() = creator_id OR auth.uid() = executor_id)) WITH CHECK (status = 'disputed');
CREATE POLICY "Support staff can view all orders" ON public.p2p_orders FOR SELECT USING (is_support_staff(auth.uid()));
CREATE POLICY "Support staff can resolve disputes" ON public.p2p_orders FOR UPDATE USING (status = 'disputed' AND is_support_staff(auth.uid())) WITH CHECK (is_support_staff(auth.uid()));

-- === P2P MESSAGES POLICIES ===
CREATE POLICY "Order participants can view messages" ON public.p2p_messages FOR SELECT USING (EXISTS (SELECT 1 FROM p2p_orders WHERE p2p_orders.id = p2p_messages.order_id AND (p2p_orders.creator_id = auth.uid() OR p2p_orders.executor_id = auth.uid())));
CREATE POLICY "Order participants can send messages" ON public.p2p_messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM p2p_orders WHERE p2p_orders.id = p2p_messages.order_id AND (p2p_orders.creator_id = auth.uid() OR p2p_orders.executor_id = auth.uid())));
CREATE POLICY "Support can read disputed order messages" ON public.p2p_messages FOR SELECT USING (is_support_staff(auth.uid()) AND EXISTS (SELECT 1 FROM p2p_orders WHERE p2p_orders.id = p2p_messages.order_id AND p2p_orders.status = 'disputed'));
CREATE POLICY "Support can send messages to disputed orders" ON public.p2p_messages FOR INSERT WITH CHECK (is_support_staff(auth.uid()) AND sender_id = auth.uid() AND EXISTS (SELECT 1 FROM p2p_orders WHERE p2p_orders.id = p2p_messages.order_id AND p2p_orders.status = 'disputed'));

-- === PAYMENT METHODS POLICIES ===
CREATE POLICY "Users can view their own payment methods" ON public.payment_methods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own payment methods" ON public.payment_methods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own payment methods" ON public.payment_methods FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own payment methods" ON public.payment_methods FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Buyers can view seller payment method in active P2P orders" ON public.payment_methods FOR SELECT USING (EXISTS (SELECT 1 FROM p2p_orders o WHERE o.payment_method_id = payment_methods.id AND o.status IN ('awaiting_payment', 'payment_sent') AND ((o.order_type = 'buy' AND o.creator_id = auth.uid()) OR (o.order_type = 'sell' AND o.executor_id = auth.uid()))));

-- === CONTEST POLICIES ===
CREATE POLICY "Contests are viewable by everyone" ON public.contests FOR SELECT USING (true);
CREATE POLICY "Entries are viewable by everyone" ON public.contest_entries FOR SELECT USING (true);
CREATE POLICY "Users can create their own entries" ON public.contest_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- === CONVERSATIONS POLICIES ===
CREATE POLICY "Users can view their conversations" ON public.conversations FOR SELECT USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);
CREATE POLICY "Participants can update conversation" ON public.conversations FOR UPDATE USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- === DIRECT MESSAGES POLICIES ===
CREATE POLICY "Participants can view messages" ON public.direct_messages FOR SELECT USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = direct_messages.conversation_id AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())));
CREATE POLICY "Participants can send messages" ON public.direct_messages FOR INSERT WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM conversations c WHERE c.id = direct_messages.conversation_id AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())));
CREATE POLICY "Participants can update read status" ON public.direct_messages FOR UPDATE USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = direct_messages.conversation_id AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())));

-- === FOLLOWS POLICIES ===
CREATE POLICY "Follows are viewable by everyone" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- === NOTIFICATIONS POLICIES ===
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- === P2P RATINGS POLICIES ===
CREATE POLICY "Users can view all ratings" ON public.p2p_ratings FOR SELECT USING (true);
CREATE POLICY "Users can rate in their completed orders" ON public.p2p_ratings FOR INSERT WITH CHECK (auth.uid() = rater_id AND EXISTS (SELECT 1 FROM p2p_orders o WHERE o.id = p2p_ratings.order_id AND o.status = 'completed' AND (o.creator_id = auth.uid() OR o.executor_id = auth.uid())));

-- === P2P DISPUTE FILES POLICIES ===
CREATE POLICY "Participants can upload files in disputed orders" ON public.p2p_dispute_files FOR INSERT WITH CHECK (auth.uid() = uploaded_by AND EXISTS (SELECT 1 FROM p2p_orders o WHERE o.id = p2p_dispute_files.order_id AND o.status = 'disputed' AND (o.creator_id = auth.uid() OR o.executor_id = auth.uid())));
CREATE POLICY "Participants can view dispute files" ON public.p2p_dispute_files FOR SELECT USING (EXISTS (SELECT 1 FROM p2p_orders o WHERE o.id = p2p_dispute_files.order_id AND (o.creator_id = auth.uid() OR o.executor_id = auth.uid())) OR is_support_staff(auth.uid()));

-- === P2P DISPUTE ACTIONS POLICIES ===
CREATE POLICY "Support staff can insert dispute actions" ON public.p2p_dispute_actions FOR INSERT WITH CHECK (is_support_staff(auth.uid()));
CREATE POLICY "Support staff can view dispute actions" ON public.p2p_dispute_actions FOR SELECT USING (is_support_staff(auth.uid()));

-- === SUPPORT POLICIES ===
CREATE POLICY "Users can create support tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own tickets" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Support staff can view all tickets" ON public.support_tickets FOR SELECT USING (is_support_staff(auth.uid()));
CREATE POLICY "Support staff can update tickets" ON public.support_tickets FOR UPDATE USING (is_support_staff(auth.uid()));

CREATE POLICY "Users can send messages on their tickets" ON public.support_messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = support_messages.ticket_id AND support_tickets.user_id = auth.uid()) AND is_internal = false);
CREATE POLICY "Users can view messages on their tickets" ON public.support_messages FOR SELECT USING (EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = support_messages.ticket_id AND support_tickets.user_id = auth.uid()) AND is_internal = false);
CREATE POLICY "Support staff can send messages" ON public.support_messages FOR INSERT WITH CHECK (is_support_staff(auth.uid()));
CREATE POLICY "Support staff can view all messages" ON public.support_messages FOR SELECT USING (is_support_staff(auth.uid()));

-- === SPOTLIGHT POLICIES ===
CREATE POLICY "Anyone can view spotlight cycles" ON public.spotlight_cycles FOR SELECT USING (true);
CREATE POLICY "Anyone can view daily draws" ON public.spotlight_daily_draws FOR SELECT USING (true);
CREATE POLICY "Anyone can view points for rankings" ON public.spotlight_user_points FOR SELECT USING (true);
CREATE POLICY "Users can view their own points" ON public.spotlight_user_points FOR SELECT USING (auth.uid() = user_id);

-- === APP SETTINGS POLICIES ===
CREATE POLICY "Anyone can read app settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Admins can insert app settings" ON public.app_settings FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update app settings" ON public.app_settings FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- === AUDIT LOGS POLICIES ===
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Support staff can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (is_support_staff(auth.uid()));

-- === AI AGENT POLICIES ===
CREATE POLICY "Admins can manage AI agents" ON public.ai_agents FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Support staff can view AI agents" ON public.ai_agents FOR SELECT USING (is_support_staff(auth.uid()));
CREATE POLICY "Admins can manage AI analysis logs" ON public.ai_analysis_logs FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Support staff can view AI analysis" ON public.ai_analysis_logs FOR SELECT USING (is_support_staff(auth.uid()));
CREATE POLICY "Admins can manage AI chat" ON public.ai_chat_room FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Support staff can view AI chat" ON public.ai_chat_room FOR SELECT USING (is_support_staff(auth.uid()));
CREATE POLICY "Admins can manage all proposals" ON public.ai_proposals FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view AI sessions" ON public.ai_discussion_sessions FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Support can view AI sessions" ON public.ai_discussion_sessions FOR SELECT USING (is_support_staff(auth.uid()));
CREATE POLICY "Admins can read failures" ON public.ai_failures FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can insert failures" ON public.ai_failures FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can read activity stream" ON public.ai_activity_stream FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can insert activity" ON public.ai_activity_stream FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can read money flow" ON public.ai_money_flow FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can insert money flow" ON public.ai_money_flow FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- === SUPPORT AGENT RATINGS POLICIES ===
CREATE POLICY "Users can rate their own disputes" ON public.support_agent_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = rater_id AND EXISTS (SELECT 1 FROM p2p_orders o WHERE o.id = support_agent_ratings.order_id AND (o.creator_id = auth.uid() OR o.executor_id = auth.uid()) AND o.status IN ('completed', 'cancelled')));
CREATE POLICY "Users can update own unlocked ratings" ON public.support_agent_ratings FOR UPDATE TO authenticated USING (rater_id = auth.uid() AND is_locked = false);
CREATE POLICY "Users can view own ratings" ON public.support_agent_ratings FOR SELECT TO authenticated USING (rater_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'));

-- ============================================================
-- SECTION 6: VIEWS
-- ============================================================

CREATE OR REPLACE VIEW public.p2p_marketplace_orders AS
SELECT o.id, o.order_type, o.nova_amount, o.local_amount, o.exchange_rate, o.country, o.time_limit_minutes, o.status, o.created_at, o.expires_at,
  p.name AS creator_name, p.username AS creator_username, p.avatar_url AS creator_avatar_url, p.country AS creator_country,
  COALESCE(r.positive_ratings, 0) AS positive_ratings, COALESCE(r.negative_ratings, 0) AS negative_ratings,
  COALESCE(r.total_trades, 0) AS total_trades, COALESCE(r.reputation_score, 100) AS reputation_score,
  (o.creator_id = auth.uid()) AS is_own_order
FROM p2p_orders o JOIN profiles p ON p.user_id = o.creator_id LEFT JOIN p2p_user_reputation r ON r.user_id = o.creator_id
WHERE o.status = 'open';

CREATE OR REPLACE VIEW public.p2p_orders_with_profiles AS
SELECT o.id, o.creator_id, o.executor_id, o.order_type, o.status, o.nova_amount, o.local_amount, o.exchange_rate, o.country, o.payment_method_id, o.time_limit_minutes, o.cancelled_by, o.cancellation_reason, o.completed_at, o.created_at, o.updated_at,
  cp.id AS creator_profile_id, cp.name AS creator_name, cp.username AS creator_username, cp.avatar_url AS creator_avatar_url, cp.country AS creator_country,
  ep.id AS executor_profile_id, ep.name AS executor_name, ep.username AS executor_username, ep.avatar_url AS executor_avatar_url, ep.country AS executor_country
FROM p2p_orders o LEFT JOIN profiles cp ON o.creator_id = cp.user_id LEFT JOIN profiles ep ON o.executor_id = ep.user_id;

CREATE OR REPLACE VIEW public.p2p_user_reputation AS
SELECT u.user_id,
  count(DISTINCT o.id) AS total_trades,
  COALESCE(sum(CASE WHEN r.rating = 1 THEN 1 ELSE 0 END), 0) AS positive_ratings,
  COALESCE(sum(CASE WHEN r.rating = -1 THEN 1 ELSE 0 END), 0) AS negative_ratings,
  CASE WHEN count(r.id) = 0 THEN 100 ELSE round((sum(CASE WHEN r.rating = 1 THEN 1 ELSE 0 END)::numeric / NULLIF(count(r.id), 0)::numeric) * 100, 1) END AS reputation_score
FROM profiles u LEFT JOIN p2p_orders o ON ((o.creator_id = u.user_id OR o.executor_id = u.user_id) AND o.status = 'completed') LEFT JOIN p2p_ratings r ON r.rated_id = u.user_id
GROUP BY u.user_id;

CREATE OR REPLACE VIEW public.profiles_search AS
SELECT id, user_id, username, name, avatar_url, country FROM profiles WHERE username IS NOT NULL AND length(username) >= 3;

CREATE OR REPLACE VIEW public.ai_control_room_messages AS
SELECT c.id, c.agent_id, a.agent_name, a.agent_name_ar, a.agent_role, a.profile_id, c.content, c.content_ar, c.message_type, c.is_summary, c.session_id, c.created_at, c.metadata, c.human_sender_id,
  COALESCE(c.message_category, CASE WHEN c.message_type = 'human_question' THEN 'human' WHEN c.is_summary = true THEN 'success' WHEN c.message_type = 'analysis' THEN 'info' ELSE 'discussion' END) AS message_category
FROM ai_chat_room c JOIN ai_agents a ON c.agent_id = a.id ORDER BY c.created_at;

CREATE OR REPLACE VIEW public.ai_control_room_findings AS
SELECT aal.id, aal.agent_id, ag.agent_name, ag.agent_name_ar, ag.agent_role, ag.profile_id, aal.title, aal.title_ar, aal.description, aal.description_ar, aal.severity, aal.affected_area, aal.suggested_fix, aal.technical_reason, aal.status, aal.created_at,
  CASE WHEN aal.severity = 'critical' THEN 'critical' WHEN aal.severity = 'high' THEN 'warning' WHEN aal.severity = 'medium' THEN 'info' ELSE 'discussion' END AS message_category
FROM ai_analysis_logs aal JOIN ai_agents ag ON ag.id = aal.agent_id ORDER BY aal.created_at DESC;

CREATE OR REPLACE VIEW public.support_staff_metrics AS
SELECT s.staff_id, p.name AS staff_name, count(DISTINCT s.order_id) AS total_ratings,
  count(*) FILTER (WHERE s.rating = 'up') AS positive_ratings,
  count(*) FILTER (WHERE s.rating = 'down') AS negative_ratings,
  round((count(*) FILTER (WHERE s.rating = 'up')::numeric * 100.0) / NULLIF(count(*), 0)::numeric, 1) AS positive_pct,
  (SELECT count(DISTINCT da.order_id) FROM p2p_dispute_actions da WHERE da.staff_id = s.staff_id AND da.action_type IN ('release_to_buyer', 'refund_seller')) AS cases_handled,
  (SELECT count(DISTINCT da.order_id) FROM p2p_dispute_actions da WHERE da.staff_id = s.staff_id AND da.action_type = 'escalate') AS escalations,
  (SELECT count(DISTINCT da.order_id) FROM p2p_dispute_actions da WHERE da.staff_id = s.staff_id AND da.action_type = 'mark_fraud') AS fraud_flags
FROM support_agent_ratings s LEFT JOIN profiles p ON p.user_id = s.staff_id GROUP BY s.staff_id, p.name;

-- ============================================================
-- SECTION 7: REALTIME PUBLICATIONS
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.p2p_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.p2p_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contest_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contests;

-- ============================================================
-- NOTE: The auth.users trigger (handle_new_user) must be created
-- separately as it attaches to the auth schema:
--
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- ============================================================
