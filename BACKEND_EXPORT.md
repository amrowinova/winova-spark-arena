# WINOVA Backend Export
## Complete Database Schema, RPC Functions, RLS Policies, Triggers & Edge Functions
### Generated: 2026-03-12

---

# TABLE OF CONTENTS
1. [Custom Types (Enums)](#1-custom-types)
2. [Database Schema (CREATE TABLE)](#2-database-schema)
3. [RPC Functions](#3-rpc-functions)
4. [Triggers](#4-triggers)
5. [RLS Policies](#5-rls-policies)
6. [Edge Functions](#6-edge-functions)
7. [Migration Files List](#7-migrations)

---

# 1. CUSTOM TYPES

```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'support');

CREATE TYPE public.user_rank AS ENUM ('subscriber', 'marketer', 'leader', 'manager', 'president');

CREATE TYPE public.currency_type AS ENUM ('nova', 'aura');

CREATE TYPE public.transaction_type AS ENUM ('deposit', 'withdrawal', 'transfer', 'contest_entry', 'contest_win', 'vote', 'p2p_buy', 'p2p_sell', 'referral_bonus', 'team_earnings');

CREATE TYPE public.ledger_entry_type AS ENUM ('transfer_out', 'transfer_in', 'p2p_buy', 'p2p_sell', 'p2p_escrow_lock', 'p2p_escrow_release', 'contest_entry', 'contest_win', 'vote_spend', 'vote_receive', 'referral_bonus', 'team_earnings', 'admin_credit', 'admin_debit', 'conversion', 'genesis_credit');

CREATE TYPE public.engagement_status AS ENUM ('both', 'contest', 'vote', 'none');

CREATE TYPE public.p2p_order_type AS ENUM ('buy', 'sell');

CREATE TYPE public.p2p_order_status AS ENUM ('open', 'matched', 'awaiting_payment', 'payment_sent', 'completed', 'cancelled', 'disputed');

CREATE TYPE public.execution_task_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'cancelled');

CREATE TYPE public.ai_decision_type AS ENUM ('approve', 'defer', 'reject');

CREATE TYPE public.ai_agent_role AS ENUM (
  'user_tester', 'marketer_growth', 'leader_team', 'manager_stats', 'backend_engineer',
  'system_architect', 'qa_breaker', 'fraud_analyst', 'support_agent', 'power_user',
  'contest_judge', 'p2p_moderator', 'android_engineer', 'ios_engineer', 'web_engineer',
  'challenger_ai', 'system_sentinel', 'chaos_engineer', 'implementation_engineer',
  'product_owner', 'fintech_specialist', 'integrations_specialist', 'security_specialist',
  'growth_analyst', 'backend_core_engineer', 'database_integrity_engineer',
  'security_fraud_engineer', 'wallet_p2p_engineer', 'frontend_systems_engineer',
  'admin_panel_engineer', 'screen_home_owner', 'screen_wallet_owner', 'screen_p2p_owner',
  'screen_p2p_chat_owner', 'screen_dm_chat_owner', 'screen_contests_owner',
  'screen_profile_owner', 'screen_team_owner', 'screen_admin_owner',
  'engineering_lead', 'performance_analyst'
);
```

---

# 2. DATABASE SCHEMA

## Core Business Tables

```sql
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  rank user_rank NOT NULL DEFAULT 'subscriber',
  country TEXT NOT NULL DEFAULT 'Saudi Arabia',
  city TEXT,
  wallet_country TEXT NOT NULL DEFAULT 'Saudi Arabia',
  referral_code TEXT,
  referred_by UUID,
  engagement_status engagement_status NOT NULL DEFAULT 'none',
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
  preferred_language TEXT DEFAULT 'en'
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
  frozen_reason TEXT
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  leader_id UUID NOT NULL,
  member_id UUID NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.follows (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  title_ar TEXT,
  message TEXT NOT NULL,
  message_ar TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Contest Tables

```sql
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
  status TEXT NOT NULL DEFAULT 'upcoming',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  contest_date DATE NOT NULL
);

CREATE TABLE public.contest_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL,
  user_id UUID NOT NULL,
  votes_received INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  prize_won NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  free_vote_used BOOLEAN DEFAULT false
);

CREATE TABLE public.votes (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL,
  voter_id UUID NOT NULL,
  contestant_id UUID NOT NULL,
  aura_spent NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## P2P Trading Tables

```sql
CREATE TABLE public.p2p_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  executor_id UUID,
  order_type p2p_order_type NOT NULL,
  status p2p_order_status NOT NULL DEFAULT 'open',
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
  assigned_at TIMESTAMPTZ
);

CREATE TABLE public.p2p_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  content_ar TEXT,
  is_system_message BOOLEAN NOT NULL DEFAULT false,
  message_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.p2p_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  rater_id UUID NOT NULL,
  rated_id UUID NOT NULL,
  rating SMALLINT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.p2p_dispute_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  note TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.p2p_dispute_files (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  uploaded_by UUID NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  type TEXT NOT NULL DEFAULT 'bank',
  notes TEXT
);
```

## Chat & Messaging Tables

```sql
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  participant1_id UUID NOT NULL,
  participant2_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ
);

CREATE TABLE public.direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  content_ar TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  transfer_amount NUMERIC,
  transfer_recipient_id UUID,
  delivered_at TIMESTAMPTZ
);

CREATE TABLE public.team_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  leader_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.team_conversation_members (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.team_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Spotlight & Rewards Tables

```sql
CREATE TABLE public.spotlight_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  cycle_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL DEFAULT 98,
  total_weeks INTEGER NOT NULL DEFAULT 14,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.spotlight_user_points (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cycle_id UUID NOT NULL,
  points_date DATE NOT NULL,
  week_number INTEGER NOT NULL,
  daily_points INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'activity',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.spotlight_daily_draws (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL,
  draw_date DATE NOT NULL,
  total_pool NUMERIC NOT NULL DEFAULT 0,
  first_place_user_id UUID,
  first_place_prize NUMERIC DEFAULT 0,
  first_place_percentage INTEGER DEFAULT 65,
  second_place_user_id UUID,
  second_place_prize NUMERIC DEFAULT 0,
  second_place_percentage INTEGER DEFAULT 35,
  is_announced BOOLEAN NOT NULL DEFAULT false,
  announced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Support Tables

```sql
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  assigned_to UUID,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  rating INTEGER
);

CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  is_locked BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE public.wallet_freeze_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  performed_by UUID NOT NULL,
  performed_by_role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.system_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  actor_user_id UUID,
  target_user_id UUID,
  actor_username TEXT,
  target_username TEXT,
  is_ghost BOOLEAN DEFAULT false,
  screen TEXT,
  feature TEXT,
  action_type TEXT NOT NULL,
  error_message TEXT,
  error_code TEXT,
  severity TEXT NOT NULL DEFAULT 'low',
  category TEXT,
  endpoint TEXT,
  flow TEXT,
  root_cause TEXT,
  frequency INTEGER DEFAULT 1,
  latency_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## AI System Tables

```sql
CREATE TABLE public.ai_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID,
  profile_id UUID,
  agent_role ai_agent_role NOT NULL,
  agent_name TEXT NOT NULL,
  agent_name_ar TEXT NOT NULL,
  focus_areas TEXT[] NOT NULL DEFAULT '{}',
  behavior_description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_analysis_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  specialty TEXT,
  rank TEXT NOT NULL DEFAULT 'trainee',
  status TEXT NOT NULL DEFAULT 'training',
  confidence INTEGER DEFAULT 0,
  trust_score NUMERIC NOT NULL DEFAULT 50,
  success_rate NUMERIC DEFAULT 0,
  failure_rate NUMERIC DEFAULT 0,
  total_operations INTEGER DEFAULT 0,
  demotions INTEGER DEFAULT 0,
  supervisor_agent_id UUID,
  last_evaluation_date TIMESTAMPTZ,
  auto_execute_level INTEGER DEFAULT 0,
  lifecycle_state TEXT NOT NULL DEFAULT 'healthy',
  lifecycle_changed_at TIMESTAMPTZ DEFAULT now(),
  probation_started_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  lifecycle_reason TEXT
);

CREATE TABLE public.ai_activity_stream (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID,
  role TEXT,
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  before_state JSONB,
  after_state JSONB,
  duration_ms INTEGER,
  success BOOLEAN,
  error_code TEXT
);

CREATE TABLE public.ai_failures (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rpc_name TEXT NOT NULL,
  user_id UUID,
  error_message TEXT,
  parameters JSONB
);

CREATE TABLE public.ai_money_flow (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  operation TEXT NOT NULL,
  from_user UUID,
  to_user UUID,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'nova',
  reference_type TEXT,
  reference_id UUID
);

CREATE TABLE public.ai_chat_room (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  content TEXT NOT NULL,
  content_ar TEXT,
  message_type TEXT NOT NULL DEFAULT 'discussion',
  reply_to_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id UUID,
  is_summary BOOLEAN DEFAULT false,
  ai_session_id UUID,
  human_sender_id UUID,
  turn_order INTEGER,
  previous_context TEXT,
  is_proposal BOOLEAN DEFAULT false,
  message_category TEXT DEFAULT 'discussion'
);

CREATE TABLE public.ai_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  session_id UUID,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT NOT NULL,
  description_ar TEXT,
  proposal_type TEXT NOT NULL DEFAULT 'enhancement',
  priority TEXT NOT NULL DEFAULT 'medium',
  affected_area TEXT,
  proposed_by UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  risk_level TEXT DEFAULT 'medium',
  impact_scope TEXT,
  rollback_plan TEXT,
  code_snippet TEXT,
  estimated_effort TEXT,
  confidence_score INTEGER,
  risk_label TEXT DEFAULT 'low',
  github_pr_url TEXT,
  github_pr_number INTEGER,
  source TEXT DEFAULT 'ai_discussion',
  report_id UUID
);

CREATE TABLE public.ai_analysis_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  analysis_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT NOT NULL,
  description_ar TEXT,
  technical_reason TEXT,
  suggested_fix TEXT,
  affected_area TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NOTE: There are ~60+ additional AI tables (ai_agent_skills, ai_agent_lifecycle,
-- ai_build_projects, ai_capability_metrics, ai_ci_reports, ai_code_changes,
-- ai_core_conversations, ai_core_messages, ai_core_memory, ai_core_files,
-- ai_core_executions, ai_core_evaluations, ai_discussion_sessions,
-- ai_engineer_reports, ai_evaluations, ai_evolution_proposals, 
-- ai_execution_permissions, ai_execution_requests, ai_execution_results,
-- ai_forecasts, ai_human_sessions, ai_memory, ai_priorities,
-- ai_product_proposals, ai_projects, ai_project_executions, ai_files,
-- ai_promotion_requests, ai_promotions, ai_retirement_proposals, 
-- ai_retirements, ai_self_evaluations, ai_self_evolution_proposals,
-- ai_shadow_simulations, ai_strategic_insights, ai_training_history,
-- ai_training_sessions, ai_trust_changes, ai_agent_comparisons,
-- ai_agent_creation_proposals, agent_command_queue, agent_health_checks,
-- agent_memory, agent_performance_metrics, agent_schedules,
-- orchestrator_state, decision_history, execution_tasks, 
-- knowledge_memory, knowledge_patterns, knowledge_rules, knowledge_decisions,
-- learning_signals, commander_reviews, authority_levels, authority_tier_state,
-- authority_promotion_log, autonomy_caps, emergency_controls, freeze_controls,
-- governance_rules, intelligence_metrics, veto_events, owner_constitution,
-- owner_corrections, owner_preferences, ceo_behavioral_model,
-- ceo_communication_profile, ceo_decision_history, ceo_decision_patterns,
-- ceo_prediction_scores, external_access_requests, external_access_usage_log,
-- external_credentials, external_knowledge, sandbox_executions,
-- system_incidents, research_* tables, project_* tables)
-- 
-- Full DDL for all these tables is available by running:
-- SELECT pg_get_tabledef(c.oid) FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relkind = 'r';
```

---

# 3. RPC FUNCTIONS

> **Note:** All financial RPCs use `SECURITY DEFINER` and `SET search_path TO 'public'` for security. All verify `auth.uid()` matches the caller.

## 3.1 Core Financial RPCs

### execute_transfer
```sql
CREATE OR REPLACE FUNCTION public.execute_transfer(
  p_sender_id uuid, p_recipient_id uuid, p_amount numeric,
  p_currency currency_type DEFAULT 'nova', p_reference_type text DEFAULT 'transfer',
  p_reference_id uuid DEFAULT NULL, p_description text DEFAULT NULL,
  p_description_ar text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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

  IF auth.uid() IS NULL THEN
    INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
    VALUES ('transfer_failed', 'wallet_transfer', NULL, coalesce(auth.uid(), p_sender_id),
      jsonb_build_object('sender_id', p_sender_id, 'recipient_id', p_recipient_id, 'amount', p_amount, 'currency', p_currency,
        'error_code', 'AUTH_REQUIRED', 'error', 'Authentication required', 'reference_type', p_reference_type, 'reference_id', p_reference_id));
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required', 'error_code', 'AUTH_REQUIRED');
  END IF;

  IF auth.uid() <> p_sender_id THEN
    INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
    VALUES ('transfer_failed', 'wallet_transfer', NULL, auth.uid(),
      jsonb_build_object('sender_id', p_sender_id, 'recipient_id', p_recipient_id, 'amount', p_amount, 'currency', p_currency,
        'error_code', 'UNAUTHORIZED', 'error', 'You can only transfer from your own wallet'));
    RETURN jsonb_build_object('success', false, 'error', 'You can only transfer from your own wallet', 'error_code', 'UNAUTHORIZED');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive', 'error_code', 'INVALID_AMOUNT');
  END IF;
  IF p_sender_id = p_recipient_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot transfer to yourself', 'error_code', 'SELF_TRANSFER');
  END IF;

  -- Duplicate detection
  IF p_reference_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.wallet_ledger wl WHERE wl.user_id = p_sender_id
      AND wl.entry_type = 'transfer_out' AND wl.reference_type = p_reference_type
      AND wl.reference_id = p_reference_id LIMIT 1) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Duplicate request', 'error_code', 'DUPLICATE_REQUEST');
    END IF;
  END IF;

  -- Daily limit check
  SELECT NULLIF(public.app_settings.value::text, 'null')::numeric INTO v_daily_limit
  FROM public.app_settings WHERE key = 'transfer_daily_limit_nova' LIMIT 1;
  IF v_daily_limit IS NOT NULL THEN
    SELECT COALESCE(SUM(ABS(wl.amount)), 0) INTO v_daily_used
    FROM public.wallet_ledger wl WHERE wl.user_id = p_sender_id
      AND wl.entry_type = 'transfer_out' AND wl.currency = p_currency
      AND wl.created_at >= date_trunc('day', now()) AND wl.created_at < date_trunc('day', now()) + interval '1 day';
    IF (v_daily_used + p_amount) > v_daily_limit THEN
      RETURN jsonb_build_object('success', false, 'error', format('Daily transfer limit exceeded'), 'error_code', 'DAILY_LIMIT_EXCEEDED');
    END IF;
  END IF;

  -- Deadlock-safe locking
  v_low_id := LEAST(p_sender_id, p_recipient_id);
  v_high_id := GREATEST(p_sender_id, p_recipient_id);
  SELECT * INTO v_wallet_low FROM public.wallets WHERE user_id = v_low_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Wallet not found'); END IF;
  SELECT * INTO v_wallet_high FROM public.wallets WHERE user_id = v_high_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Wallet not found'); END IF;

  IF v_wallet_low.user_id = p_sender_id THEN
    v_sender_wallet := v_wallet_low; v_recipient_wallet := v_wallet_high;
  ELSE
    v_sender_wallet := v_wallet_high; v_recipient_wallet := v_wallet_low;
  END IF;

  IF v_sender_wallet.is_frozen THEN RETURN jsonb_build_object('success', false, 'error', 'Your wallet is frozen', 'error_code', 'SENDER_FROZEN'); END IF;
  IF v_recipient_wallet.is_frozen THEN RETURN jsonb_build_object('success', false, 'error', 'Recipient wallet is frozen', 'error_code', 'RECIPIENT_FROZEN'); END IF;

  IF p_currency = 'nova' THEN
    v_sender_balance_before := v_sender_wallet.nova_balance; v_recipient_balance_before := v_recipient_wallet.nova_balance;
  ELSE
    v_sender_balance_before := v_sender_wallet.aura_balance; v_recipient_balance_before := v_recipient_wallet.aura_balance;
  END IF;

  IF v_sender_balance_before < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance', 'error_code', 'INSUFFICIENT_BALANCE',
      'available_balance', v_sender_balance_before, 'requested_amount', p_amount);
  END IF;

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

  INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
  VALUES ('transfer_success', 'wallet_transfer', v_sender_ledger_id, auth.uid(),
    jsonb_build_object('sender_id', p_sender_id, 'recipient_id', p_recipient_id, 'amount', p_amount, 'currency', p_currency));

  RETURN jsonb_build_object('success', true, 'sender_ledger_id', v_sender_ledger_id, 'recipient_ledger_id', v_recipient_ledger_id,
    'sender_balance_after', v_sender_balance_after, 'recipient_balance_after', v_recipient_balance_after);

EXCEPTION
  WHEN deadlock_detected THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'error_code', 'DEADLOCK');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'error_code', 'UNEXPECTED_ERROR');
END;
$$;
```

### admin_adjust_balance
```sql
-- See full source above in function listing. Key points:
-- - Requires admin role via has_role()
-- - Sets app.bypass_wallet_guard
-- - Creates ledger + transaction + audit entries
```

### convert_nova_aura
```sql
-- Converts Nova to Aura at 1:2 ratio
-- Checks balance, freezes, sets bypass_wallet_guard
```

### join_contest
```sql
-- Allows joining from 00:00 KSA to 19:00 KSA
-- Deducts entry_fee from Nova balance
-- Creates contest_entry, ledger entry, transaction
-- Prize pool = participants × 6
```

### cast_vote / cast_free_vote
```sql
-- cast_vote: costs 1 Aura per vote (or 0.5 Nova if insufficient Aura)
-- cast_free_vote: one free vote per contest entry
-- Both increment votes_received on contest_entries
```

## 3.2 P2P Trading RPCs

```sql
-- p2p_create_sell_order: Lock Nova in escrow, create order
-- p2p_create_buy_order: Create buy order (no escrow needed)
-- p2p_execute_order: Match executor to order, lock escrow for buy orders
-- p2p_confirm_payment: Buyer confirms payment sent
-- p2p_release_escrow: Seller releases Nova to buyer
-- p2p_cancel_order: Cancel + unlock escrow
-- p2p_relist_order: Return matched order to marketplace
-- p2p_expire_order: Auto-expire expired orders
-- p2p_open_dispute: Open dispute after payment_sent
-- p2p_resolve_dispute: Support resolves (release_to_buyer or return_to_seller)
-- p2p_extend_time: Seller extends timer (max once, 5-30 min)
-- p2p_submit_rating: Rate other party (+1/-1)
-- p2p_delete_order: Delete open order + refund escrow
-- p2p_cleanup_stale_orders: Cancel unmatched buy orders >72h
```

## 3.3 Team & Referral RPCs

```sql
-- assign_upline_auto: Auto-assign leader by priority (referral_code > district > city > country > global)
-- assign_referral_auto: Legacy auto-assignment
-- process_referral_signup: Process referral code signup
-- get_team_stats: Team counts, activity rates, points
-- get_team_hierarchy: Full team tree
-- get_team_level_breakdown: Members per level
-- get_team_ranking: Country + global rank
-- get_team_conversations: Team chat list
-- get_referral_stats: Referral metrics
-- get_my_direct_leader: Find direct upline
-- emit_team_event: Broadcast event to team chats
-- team_chat_enroll_member: Add member to team chat
```

## 3.4 Utility RPCs

```sql
-- has_role(_user_id, _role): Check if user has role
-- is_admin_user(): Check if current user is admin
-- is_support_staff(_user_id): Check for support/admin/moderator role
-- is_wallet_frozen(_user_id): Check wallet freeze status
-- is_team_member(user_id, conv_id): Check team membership
-- is_team_leader(user_id, conv_id): Check team leader role
-- is_real_user(user_id): Check not AI profile
-- can_access_ai_control_room(user_id): Admin/support/president/manager
-- get_dm_conversations(): User's DM list with unread counts
-- search_messages: Full-text search in DMs
-- mark_messages_delivered: Mark messages as delivered
-- get_wallet_history: Paginated ledger with counterparty info
-- get_cycle_progress: Spotlight cycle progress
-- get_active_cycle_info: Current cycle ID + week
-- get_weekly_points_chart: Points by day for current week
-- record_spotlight_points: Add points for activities
-- update_last_seen: Update profile last_seen_at
-- generate_referral_code_v2: Generate WINOVA-{username}-{CC} code
-- guard_wallet_balance_mutation: Trigger to block direct wallet updates
-- handle_new_user: Auth trigger to create profile + wallet + role
-- send_ai_alert_to_admins: DM alerts to all admins
-- support_claim_dispute / support_get_dispute_case / support_log_dispute_action
-- submit_support_agent_rating: Rate dispute resolution staff
-- run_load_simulation: Stress test with transfer storm
-- get_database_size_overview / get_table_performance_stats / get_index_usage_stats / get_slow_query_stats
```

---

# 4. TRIGGERS

```sql
-- profiles
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_assign_upline_on_profile_create AFTER INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION trigger_assign_upline_on_profile_create();
CREATE TRIGGER on_profile_insert_handle_referral AFTER INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION handle_referral_on_profile_insert();
CREATE TRIGGER trg_build_team_on_insert AFTER INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION trigger_build_team_on_insert();
CREATE TRIGGER trg_build_team_hierarchy AFTER UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION trigger_build_team_hierarchy();
CREATE TRIGGER team_event_rank_promotion AFTER UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION trg_team_event_rank_promotion();

-- wallets
CREATE TRIGGER guard_wallet_balance BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION guard_wallet_balance_mutation();

-- wallet_ledger
CREATE TRIGGER trg_transfer_points_safe AFTER INSERT ON wallet_ledger FOR EACH ROW EXECUTE FUNCTION trigger_transfer_points_safe();
CREATE TRIGGER trg_prize_earned_event AFTER INSERT ON wallet_ledger FOR EACH ROW EXECUTE FUNCTION trg_team_event_prize_earned();

-- contest_entries
CREATE TRIGGER team_event_contest_join AFTER INSERT ON contest_entries FOR EACH ROW EXECUTE FUNCTION trg_team_event_contest_join();
CREATE TRIGGER team_event_contest_rank AFTER UPDATE ON contest_entries FOR EACH ROW EXECUTE FUNCTION trg_team_event_contest_rank();
CREATE TRIGGER trg_contest_entry_points_safe AFTER INSERT ON contest_entries FOR EACH ROW EXECUTE FUNCTION trigger_contest_points_safe();

-- votes
CREATE TRIGGER trg_vote_points_safe AFTER INSERT ON votes FOR EACH ROW EXECUTE FUNCTION trigger_vote_points_safe();

-- p2p_orders
CREATE TRIGGER tr_set_p2p_order_matched_at BEFORE UPDATE ON p2p_orders FOR EACH ROW EXECUTE FUNCTION set_p2p_order_matched_at();
CREATE TRIGGER trg_p2p_complete_points_safe AFTER UPDATE ON p2p_orders FOR EACH ROW EXECUTE FUNCTION trigger_p2p_points_safe();
CREATE TRIGGER update_p2p_orders_updated_at BEFORE UPDATE ON p2p_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- team_members
CREATE TRIGGER trg_team_chat_auto_enroll AFTER INSERT ON team_members FOR EACH ROW EXECUTE FUNCTION trg_team_chat_auto_enroll();
CREATE TRIGGER team_event_new_referral AFTER INSERT ON team_members FOR EACH ROW EXECUTE FUNCTION trg_team_event_new_referral();

-- follows
CREATE TRIGGER on_follow_notify AFTER INSERT ON follows FOR EACH ROW EXECUTE FUNCTION notify_on_follow();

-- AI triggers
CREATE TRIGGER trg_agent_birth AFTER INSERT ON ai_agents FOR EACH ROW EXECUTE FUNCTION log_agent_birth();
CREATE TRIGGER trg_agent_status_change AFTER UPDATE ON ai_agents FOR EACH ROW EXECUTE FUNCTION log_agent_status_change();
CREATE TRIGGER on_ai_failure_spike_to_dm AFTER INSERT ON ai_failures FOR EACH ROW EXECUTE FUNCTION trg_ai_failure_spike_to_dm();
CREATE TRIGGER on_ai_engineer_report_to_dm AFTER INSERT ON ai_engineer_reports FOR EACH ROW EXECUTE FUNCTION trg_ai_engineer_report_to_dm();
CREATE TRIGGER on_ai_insight_to_dm AFTER INSERT ON ai_strategic_insights FOR EACH ROW EXECUTE FUNCTION trg_ai_insight_to_dm();
CREATE TRIGGER on_ai_priority_to_dm AFTER INSERT ON ai_priorities FOR EACH ROW EXECUTE FUNCTION trg_ai_priority_to_dm();
CREATE TRIGGER on_ai_product_proposal_to_dm AFTER INSERT ON ai_product_proposals FOR EACH ROW EXECUTE FUNCTION trg_ai_product_proposal_to_dm();
CREATE TRIGGER on_ai_question_to_dm AFTER INSERT ON ai_human_sessions FOR EACH ROW EXECUTE FUNCTION trg_ai_question_to_dm();
CREATE TRIGGER on_ai_external_knowledge_to_dm AFTER INSERT ON external_knowledge FOR EACH ROW EXECUTE FUNCTION trg_ai_external_knowledge_to_dm();
CREATE TRIGGER trg_route_chat_command AFTER INSERT ON ai_chat_room FOR EACH ROW EXECUTE FUNCTION fn_route_chat_command();
CREATE TRIGGER trg_decision_learning_loop AFTER INSERT ON decision_history FOR EACH ROW EXECUTE FUNCTION trg_decision_to_knowledge();
CREATE TRIGGER trg_execution_task_status_update AFTER UPDATE ON execution_tasks FOR EACH ROW EXECUTE FUNCTION trg_execution_task_status_to_dm();
CREATE TRIGGER trg_spotlight_winner_event AFTER UPDATE ON spotlight_daily_draws FOR EACH ROW EXECUTE FUNCTION trg_team_event_spotlight_winner();
CREATE TRIGGER trg_lock_old_ratings BEFORE UPDATE ON support_agent_ratings FOR EACH ROW EXECUTE FUNCTION lock_old_agent_ratings();
```

---

# 5. RLS POLICIES

## Core Tables

```sql
-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can search minimal profile data" ON profiles FOR SELECT USING (auth.uid() IS NOT NULL AND username IS NOT NULL AND length(username) >= 3);
CREATE POLICY "Users can view team member profiles" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM team_members WHERE (leader_id = auth.uid() AND member_id = profiles.user_id) OR (member_id = auth.uid() AND leader_id = profiles.user_id)));
CREATE POLICY "Users can view profiles for open P2P orders" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM p2p_orders WHERE status = 'open' AND creator_id = profiles.user_id));
CREATE POLICY "Users can view profiles in their P2P orders" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM p2p_orders WHERE (creator_id = auth.uid() OR executor_id = auth.uid()) AND (creator_id = profiles.user_id OR executor_id = profiles.user_id)));
CREATE POLICY "Support staff can view all profiles" ON profiles FOR SELECT USING (is_support_staff(auth.uid()));

-- wallets
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own wallet" ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own wallet" ON wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update any wallet" ON wallets FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Support staff can view all wallets" ON wallets FOR SELECT USING (is_support_staff(auth.uid()));

-- wallet_ledger
ALTER TABLE wallet_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own ledger entries" ON wallet_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all ledger entries" ON wallet_ledger FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all transactions" ON transactions FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert transactions for any user" ON transactions FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own roles" ON user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert user roles" ON user_roles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete user roles" ON user_roles FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Support staff can view all user roles" ON user_roles FOR SELECT USING (is_support_staff(auth.uid()));

-- p2p_orders
ALTER TABLE p2p_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create orders" ON p2p_orders FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can view their own orders" ON p2p_orders FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = executor_id);
CREATE POLICY "Users can view open orders for marketplace" ON p2p_orders FOR SELECT USING (status = 'open' AND auth.uid() IS NOT NULL AND auth.uid() <> creator_id);
CREATE POLICY "Users can execute open orders" ON p2p_orders FOR UPDATE USING (status = 'open' AND auth.uid() <> creator_id) WITH CHECK (status IN ('matched', 'awaiting_payment') AND executor_id = auth.uid());
CREATE POLICY "Buyer can confirm payment" ON p2p_orders FOR UPDATE USING (status = 'awaiting_payment' AND auth.uid() = CASE WHEN order_type = 'buy' THEN creator_id ELSE executor_id END) WITH CHECK (status = 'payment_sent');
CREATE POLICY "Seller can complete order" ON p2p_orders FOR UPDATE USING (status = 'payment_sent' AND auth.uid() = CASE WHEN order_type = 'sell' THEN creator_id ELSE executor_id END) WITH CHECK (status = 'completed');
CREATE POLICY "Creators can cancel open orders" ON p2p_orders FOR UPDATE USING (auth.uid() = creator_id AND status = 'open') WITH CHECK (status = 'cancelled' AND cancelled_by = auth.uid());
CREATE POLICY "Participants can dispute after payment" ON p2p_orders FOR UPDATE USING (status = 'payment_sent' AND (auth.uid() = creator_id OR auth.uid() = executor_id)) WITH CHECK (status = 'disputed');
CREATE POLICY "Participants can relist before payment" ON p2p_orders FOR UPDATE USING (status = 'awaiting_payment' AND (auth.uid() = creator_id OR auth.uid() = executor_id)) WITH CHECK (status = 'open' AND executor_id IS NULL AND matched_at IS NULL);
CREATE POLICY "Support staff can resolve disputes" ON p2p_orders FOR UPDATE USING (status = 'disputed' AND is_support_staff(auth.uid())) WITH CHECK (is_support_staff(auth.uid()));
CREATE POLICY "Support staff can view all orders" ON p2p_orders FOR SELECT USING (is_support_staff(auth.uid()));

-- contests / contest_entries / votes
ALTER TABLE contests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contests are viewable by everyone" ON contests FOR SELECT USING (true);
ALTER TABLE contest_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Entries are viewable by everyone" ON contest_entries FOR SELECT USING (true);
CREATE POLICY "Users can create their own entries" ON contest_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Votes are viewable by everyone" ON votes FOR SELECT USING (true);
CREATE POLICY "Users can create their own votes" ON votes FOR INSERT WITH CHECK (auth.uid() = voter_id);

-- conversations / direct_messages
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their conversations" ON conversations FOR SELECT USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);
CREATE POLICY "Users can create conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);
CREATE POLICY "Participants can update conversation" ON conversations FOR UPDATE USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view messages" ON direct_messages FOR SELECT USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_id AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())));
CREATE POLICY "Participants can send messages" ON direct_messages FOR INSERT WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_id AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())));
CREATE POLICY "Participants can update read status" ON direct_messages FOR UPDATE USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_id AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())));

-- team chat
ALTER TABLE team_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view their team conversations" ON team_conversations FOR SELECT USING (is_team_member(auth.uid(), id));
ALTER TABLE team_conversation_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view conversation members" ON team_conversation_members FOR SELECT USING (is_team_member(auth.uid(), conversation_id));
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read team messages" ON team_messages FOR SELECT USING (is_team_member(auth.uid(), conversation_id));
CREATE POLICY "Members can send text messages" ON team_messages FOR INSERT WITH CHECK (auth.uid() = sender_id AND is_team_member(auth.uid(), conversation_id) AND message_type = 'text');
CREATE POLICY "Leaders can send announcements" ON team_messages FOR INSERT WITH CHECK (auth.uid() = sender_id AND is_team_leader(auth.uid(), conversation_id) AND message_type = 'announcement');

-- follows / notifications / team_members
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows are viewable by everyone" ON follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON follows FOR DELETE USING (auth.uid() = follower_id);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their team" ON team_members FOR SELECT USING (auth.uid() = leader_id OR auth.uid() = member_id);

-- All AI tables: admin-only with support read access
-- Pattern: has_role(auth.uid(), 'admin') for ALL, is_support_staff(auth.uid()) for SELECT
-- Some AI tables allow auth.uid() IS NOT NULL for INSERT (observability logging)
```

---

# 6. EDGE FUNCTIONS

## contest-scheduler/index.ts
```typescript
// See full source in supabase/functions/contest-scheduler/index.ts
// - Validates admin/service-role auth
// - Creates daily contest at 10 AM KSA if not exists
// - Transitions: active → stage1 (2 PM) → final (8 PM) → completed (10 PM)
```

## p2p-auto-expire/index.ts
```typescript
// See full source in supabase/functions/p2p-auto-expire/index.ts
// - Validates admin/service-role auth
// - Finds expired matched orders (awaiting_payment/payment_sent)
// - Calls p2p_expire_order RPC for each
// - Cleans up stale unmatched orders >72h
```

---

# 7. MIGRATION FILES (139 files, chronological order)

```
supabase/migrations/
├── 20260131215812_*.sql  (initial schema)
├── 20260131221011_*.sql
├── ... (137 more migration files)
└── 20260312062122_*.sql  (latest: updated join_contest RPC)
```

Full list available in `supabase/migrations/` directory.

---

# NOTES FOR NODE.JS DEVELOPER

1. **Auth System**: Uses Supabase Auth (auth.users table). Profile creation is handled by `handle_new_user()` trigger on `auth.users`.

2. **Wallet Guard**: The `guard_wallet_balance_mutation()` trigger prevents direct wallet balance updates. All balance changes MUST go through RPCs that set `app.bypass_wallet_guard = 'true'`.

3. **Wallet CHECK Constraints**: `nova_balance >= 0`, `aura_balance >= 0`, `locked_nova_balance >= 0` on the wallets table.

4. **Realtime**: Some tables have realtime enabled via `ALTER PUBLICATION supabase_realtime ADD TABLE`.

5. **Views**: The schema includes database views: `p2p_orders_with_profiles`, `p2p_marketplace_orders`, `p2p_user_reputation`, `profiles_search`, `ai_control_room_messages`, `ai_control_room_findings`, `support_staff_metrics`.

6. **All times are KSA (UTC+3)** for contest scheduling. The `join_contest` RPC uses `timezone('Asia/Riyadh', now())`.
