
-- ═══════════════════════════════════════════════════════
-- STRONG AUTONOMY MODE
-- ═══════════════════════════════════════════════════════

-- 1) Expand valid_category to include development, testing, simulation, security, financial
ALTER TABLE public.ai_execution_permissions DROP CONSTRAINT valid_category;
ALTER TABLE public.ai_execution_permissions ADD CONSTRAINT valid_category 
  CHECK (category = ANY (ARRAY['infra', 'performance', 'fraud', 'p2p', 'general', 'development', 'testing', 'simulation', 'security', 'financial']));

-- 2) Raise global autonomy cap from 3 → 5
UPDATE public.autonomy_caps 
SET max_auto_execute_level = 5, updated_at = now()
WHERE cap_key = 'global_cap' AND is_active = true;

-- 3) Ensure critical domain caps remain locked
UPDATE public.autonomy_caps 
SET is_active = true, updated_at = now()
WHERE cap_key IN ('financial_ops', 'security_policies', 'infrastructure_ops', 'external_integrations', 'agent_lifecycle');

-- 4) Autonomous execution permissions (NO approval needed)
INSERT INTO public.ai_execution_permissions (
  permission_key, permission_key_ar, description, description_ar,
  category, is_enabled, requires_approval, max_risk_level,
  auto_execute_threshold, max_daily_executions, cooldown_minutes,
  allowed_operations, required_auto_execute_level
) VALUES 
('code_generation', 'توليد الكود',
 'Generate new code modules, components, and utilities', 'إنشاء وحدات كود ومكونات وأدوات جديدة',
 'development', true, false, 'medium', 60, 100, 1,
 ARRAY['generate_component','generate_module','generate_utility','generate_hook','generate_test'], 1),
('code_refactoring', 'إعادة هيكلة الكود',
 'Refactor and optimize existing code', 'إعادة هيكلة وتحسين الكود الحالي',
 'development', true, false, 'medium', 60, 80, 1,
 ARRAY['refactor_function','optimize_query','split_module','reduce_complexity','fix_lint'], 1),
('database_design', 'تصميم قاعدة البيانات',
 'Design database schemas, indexes, and views in test environments', 'تصميم مخططات قواعد البيانات في بيئات الاختبار',
 'development', true, false, 'medium', 65, 50, 5,
 ARRAY['create_table_draft','create_index_draft','create_view_draft','propose_migration','optimize_schema'], 2),
('test_environment', 'بيئة الاختبار',
 'Create, manage, and run test environments and test suites', 'إنشاء وإدارة وتشغيل بيئات الاختبار',
 'testing', true, false, 'medium', 55, 200, 1,
 ARRAY['run_tests','create_test_suite','setup_test_env','mock_data','validate_output'], 1),
('simulation_ops', 'عمليات المحاكاة',
 'Run shadow simulations and synthetic scenario testing', 'تشغيل محاكاة الظل واختبار السيناريوهات',
 'simulation', true, false, 'medium', 50, 100, 2,
 ARRAY['run_simulation','create_scenario','evaluate_simulation','compare_outcomes','stress_test'], 1),
('performance_optimization', 'تحسين الأداء',
 'Optimize queries, caching, and system performance', 'تحسين الاستعلامات والتخزين المؤقت وأداء النظام',
 'performance', true, false, 'medium', 65, 40, 5,
 ARRAY['optimize_query','add_cache','reduce_latency','batch_operations','cleanup_stale'], 2)
ON CONFLICT (permission_key) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled, requires_approval = EXCLUDED.requires_approval,
  max_risk_level = EXCLUDED.max_risk_level, auto_execute_threshold = EXCLUDED.auto_execute_threshold,
  max_daily_executions = EXCLUDED.max_daily_executions, required_auto_execute_level = EXCLUDED.required_auto_execute_level,
  allowed_operations = EXCLUDED.allowed_operations, updated_at = now();

-- 5) Critical operations remain LOCKED (level 99, requires approval)
INSERT INTO public.ai_execution_permissions (
  permission_key, permission_key_ar, description, description_ar,
  category, is_enabled, requires_approval, max_risk_level,
  auto_execute_threshold, max_daily_executions, cooldown_minutes,
  allowed_operations, required_auto_execute_level
) VALUES
('financial_operations', 'العمليات المالية',
 'Money movement, balance changes, escrow operations', 'حركة أموال أو تغيير أرصدة أو عمليات ضمان',
 'financial', true, true, 'critical', 99, 10, 30,
 ARRAY['transfer_funds','adjust_balance','escrow_release'], 99),
('auth_permissions', 'صلاحيات المصادقة',
 'Authentication, authorization, and permission changes', 'تغييرات المصادقة والتفويض والصلاحيات',
 'security', true, true, 'critical', 99, 5, 60,
 ARRAY['modify_auth','change_rls','update_roles'], 99),
('external_integration', 'التكامل الخارجي',
 'External API connections, webhooks, third-party integrations', 'اتصالات API خارجية وإعدادات webhook',
 'security', true, true, 'critical', 99, 5, 60,
 ARRAY['setup_webhook','connect_api','configure_oauth'], 99),
('credential_management', 'إدارة بيانات الاعتماد',
 'API keys, secrets, tokens, and credential management', 'مفاتيح API والأسرار والرموز',
 'security', true, true, 'critical', 99, 3, 120,
 ARRAY['rotate_key','create_secret','revoke_token'], 99),
('production_deployment', 'النشر على الإنتاج',
 'Production releases, migrations, and public deployments', 'إصدارات الإنتاج والنشر العام',
 'infra', true, true, 'critical', 99, 3, 120,
 ARRAY['deploy_production','run_migration_prod','publish_release'], 99)
ON CONFLICT (permission_key) DO UPDATE SET
  requires_approval = EXCLUDED.requires_approval, max_risk_level = EXCLUDED.max_risk_level,
  auto_execute_threshold = EXCLUDED.auto_execute_threshold,
  required_auto_execute_level = EXCLUDED.required_auto_execute_level, updated_at = now();

-- 6) Governance rule: No hidden execution
INSERT INTO public.governance_rules (rule_key, rule_key_ar, description, description_ar, severity, is_active)
VALUES (
  'NO_HIDDEN_EXECUTION', 'لا تنفيذ مخفي',
  'Every autonomous action MUST stream to WINOVA Intelligence chat with agent name, rank, risk, confidence, and rollback status. If it is not visible in chat, it does not exist.',
  'يجب أن تُبث كل عملية تلقائية إلى محادثة WINOVA Intelligence مع اسم الوكيل والرتبة والمخاطر والثقة وحالة التراجع. إذا لم تكن مرئية في المحادثة، فهي غير موجودة.',
  'critical', true
)
ON CONFLICT (rule_key) DO UPDATE SET
  description = EXCLUDED.description, description_ar = EXCLUDED.description_ar,
  is_active = true, updated_at = now();
