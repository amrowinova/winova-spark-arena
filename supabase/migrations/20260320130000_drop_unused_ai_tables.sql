-- ══════════════════════════════════════════════════════════════════════════════
-- DROP UNUSED AI / GOVERNANCE / RESEARCH TABLES
-- These 72 tables are not referenced anywhere in the application source code
-- (src/) and have no FK relationships to active tables.
-- Using CASCADE to drop any orphan FKs or dependent views.
--
-- KEPT (actively used or recently created):
--   ai_agents, ai_chat_room, ai_proposals  → used in admin panel
--   execution_tasks, decision_history       → used in src/
--   team_conversations                      → FK parent for team_conversation_members
--   freeze_controls                         → used in types.ts / wallet freeze
--   login_attempts                          → created for brute force protection
-- ══════════════════════════════════════════════════════════════════════════════

-- ── AI Agent infrastructure (unused) ─────────────────────────────────────────
DROP TABLE IF EXISTS public.agent_command_queue         CASCADE;
DROP TABLE IF EXISTS public.agent_health_checks         CASCADE;
DROP TABLE IF EXISTS public.agent_memory                CASCADE;
DROP TABLE IF EXISTS public.agent_performance_metrics   CASCADE;
DROP TABLE IF EXISTS public.agent_schedules             CASCADE;

-- ── AI Activity / Analysis (unused) ──────────────────────────────────────────
DROP TABLE IF EXISTS public.ai_activity_stream          CASCADE;
DROP TABLE IF EXISTS public.ai_agent_comparisons        CASCADE;
DROP TABLE IF EXISTS public.ai_agent_creation_proposals CASCADE;
DROP TABLE IF EXISTS public.ai_agent_lifecycle          CASCADE;
DROP TABLE IF EXISTS public.ai_agent_skills             CASCADE;
DROP TABLE IF EXISTS public.ai_analysis_logs            CASCADE;

-- ── AI Build / Code / CI (unused) ────────────────────────────────────────────
DROP TABLE IF EXISTS public.ai_build_projects           CASCADE;
DROP TABLE IF EXISTS public.ai_capability_metrics       CASCADE;
DROP TABLE IF EXISTS public.ai_ci_reports               CASCADE;
DROP TABLE IF EXISTS public.ai_code_changes             CASCADE;

-- ── AI Core subsystem (unused) ───────────────────────────────────────────────
DROP TABLE IF EXISTS public.ai_core_conversations       CASCADE;
DROP TABLE IF EXISTS public.ai_core_evaluations         CASCADE;
DROP TABLE IF EXISTS public.ai_core_executions          CASCADE;
DROP TABLE IF EXISTS public.ai_core_files               CASCADE;
DROP TABLE IF EXISTS public.ai_core_memory              CASCADE;
DROP TABLE IF EXISTS public.ai_core_messages            CASCADE;

-- ── AI Discussion / Evaluation (unused) ──────────────────────────────────────
DROP TABLE IF EXISTS public.ai_discussion_sessions      CASCADE;
DROP TABLE IF EXISTS public.ai_engineer_reports         CASCADE;
DROP TABLE IF EXISTS public.ai_evaluations              CASCADE;
DROP TABLE IF EXISTS public.ai_evolution_proposals      CASCADE;

-- ── AI Execution subsystem (unused) ──────────────────────────────────────────
DROP TABLE IF EXISTS public.ai_execution_permissions    CASCADE;
DROP TABLE IF EXISTS public.ai_execution_requests       CASCADE;
DROP TABLE IF EXISTS public.ai_execution_results        CASCADE;

-- ── AI Failures / Files / Forecasts (unused) ─────────────────────────────────
DROP TABLE IF EXISTS public.ai_failures                 CASCADE;
DROP TABLE IF EXISTS public.ai_files                    CASCADE;
DROP TABLE IF EXISTS public.ai_forecasts                CASCADE;

-- ── AI Human sessions / Memory / Money (unused) ──────────────────────────────
DROP TABLE IF EXISTS public.ai_human_sessions           CASCADE;
DROP TABLE IF EXISTS public.ai_memory                   CASCADE;
DROP TABLE IF EXISTS public.ai_money_flow               CASCADE;

-- ── AI Priorities / Products / Projects (unused) ─────────────────────────────
DROP TABLE IF EXISTS public.ai_priorities               CASCADE;
DROP TABLE IF EXISTS public.ai_product_proposals        CASCADE;
DROP TABLE IF EXISTS public.ai_project_executions       CASCADE;
DROP TABLE IF EXISTS public.ai_projects                 CASCADE;

-- ── AI Promotions / Retirements (unused) ─────────────────────────────────────
DROP TABLE IF EXISTS public.ai_promotion_requests       CASCADE;
DROP TABLE IF EXISTS public.ai_promotions               CASCADE;
DROP TABLE IF EXISTS public.ai_retirement_proposals     CASCADE;
DROP TABLE IF EXISTS public.ai_retirements              CASCADE;

-- ── AI Self-evaluation / Shadow / Strategic (unused) ─────────────────────────
DROP TABLE IF EXISTS public.ai_self_evaluations         CASCADE;
DROP TABLE IF EXISTS public.ai_self_evolution_proposals CASCADE;
DROP TABLE IF EXISTS public.ai_shadow_simulations       CASCADE;
DROP TABLE IF EXISTS public.ai_strategic_insights       CASCADE;

-- ── AI Training / Trust (unused) ─────────────────────────────────────────────
DROP TABLE IF EXISTS public.ai_training_history         CASCADE;
DROP TABLE IF EXISTS public.ai_training_sessions        CASCADE;
DROP TABLE IF EXISTS public.ai_trust_changes            CASCADE;

-- ── Authority / Autonomy governance (unused) ─────────────────────────────────
DROP TABLE IF EXISTS public.authority_levels            CASCADE;
DROP TABLE IF EXISTS public.authority_promotion_log     CASCADE;
DROP TABLE IF EXISTS public.authority_tier_state        CASCADE;
DROP TABLE IF EXISTS public.autonomy_caps               CASCADE;

-- ── CEO decision model (unused) ──────────────────────────────────────────────
DROP TABLE IF EXISTS public.ceo_behavioral_model        CASCADE;
DROP TABLE IF EXISTS public.ceo_communication_profile   CASCADE;
DROP TABLE IF EXISTS public.ceo_decision_history        CASCADE;
DROP TABLE IF EXISTS public.ceo_decision_patterns       CASCADE;
DROP TABLE IF EXISTS public.ceo_prediction_scores       CASCADE;

-- ── Commander / Emergency / Governance (unused) ──────────────────────────────
DROP TABLE IF EXISTS public.commander_reviews           CASCADE;
DROP TABLE IF EXISTS public.emergency_controls          CASCADE;
DROP TABLE IF EXISTS public.governance_rules            CASCADE;

-- ── Intelligence / Knowledge (unused) ────────────────────────────────────────
DROP TABLE IF EXISTS public.intelligence_metrics        CASCADE;
DROP TABLE IF EXISTS public.knowledge_decisions         CASCADE;
DROP TABLE IF EXISTS public.knowledge_memory            CASCADE;
DROP TABLE IF EXISTS public.knowledge_patterns          CASCADE;
DROP TABLE IF EXISTS public.knowledge_rules             CASCADE;

-- ── Learning / Orchestrator / Owner (unused) ─────────────────────────────────
DROP TABLE IF EXISTS public.learning_signals            CASCADE;
DROP TABLE IF EXISTS public.orchestrator_state          CASCADE;
DROP TABLE IF EXISTS public.owner_constitution          CASCADE;
DROP TABLE IF EXISTS public.owner_corrections           CASCADE;
DROP TABLE IF EXISTS public.owner_preferences           CASCADE;

-- ── Project subsystem (unused) ───────────────────────────────────────────────
DROP TABLE IF EXISTS public.project_activity            CASCADE;
DROP TABLE IF EXISTS public.project_agents              CASCADE;
DROP TABLE IF EXISTS public.project_artifacts           CASCADE;
DROP TABLE IF EXISTS public.project_files               CASCADE;
DROP TABLE IF EXISTS public.project_phases              CASCADE;

-- ── Research subsystem (unused) ──────────────────────────────────────────────
DROP TABLE IF EXISTS public.research_concept_relations  CASCADE;
DROP TABLE IF EXISTS public.research_concepts           CASCADE;
DROP TABLE IF EXISTS public.research_contradictions     CASCADE;
DROP TABLE IF EXISTS public.research_integrity_scores   CASCADE;
DROP TABLE IF EXISTS public.research_outputs            CASCADE;
DROP TABLE IF EXISTS public.research_projects           CASCADE;
DROP TABLE IF EXISTS public.research_simulations        CASCADE;
DROP TABLE IF EXISTS public.research_sources            CASCADE;

-- ── Sandbox / System incidents / Veto (unused) ───────────────────────────────
DROP TABLE IF EXISTS public.sandbox_executions          CASCADE;
DROP TABLE IF EXISTS public.system_incidents            CASCADE;
DROP TABLE IF EXISTS public.veto_events                 CASCADE;
