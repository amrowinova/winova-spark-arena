
INSERT INTO public.owner_constitution (rule_key, rule_en, rule_ar, category, severity, is_active)
VALUES (
  'MANDATORY_EUL',
  'Every agent run MUST produce an Executive Understanding Report. Runs without cognitive summaries are considered FAILED. Operational logs are NOT answers.',
  'كل تشغيل وكيل يجب أن ينتج تقرير فهم تنفيذي. التشغيل بدون ملخص معرفي يعتبر فاشلاً. السجلات التشغيلية ليست إجابات.',
  'governance',
  'critical',
  true
)
ON CONFLICT (rule_key) DO NOTHING;
