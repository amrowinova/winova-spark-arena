-- ============================================================
-- إزالة نسبة 20% من الأصوات للمتسابقين
-- ============================================================
-- التغييرات:
-- 1. تعديل RPC grant_vote_earnings لإعطاء 0% بدلاً من 20%
-- 2. كل الأموال تذهب بالكامل إلى صندوق الجوائز
-- ============================================================

-- تعديل RPC grant_vote_earnings لإعطاء 0% بدلاً من 20%
DROP FUNCTION IF EXISTS public.grant_vote_earnings(uuid, text);

CREATE OR REPLACE FUNCTION public.grant_vote_earnings(
  p_contest_id UUID,
  p_stage      TEXT   -- 'stage1' or 'final'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rebate_pct      NUMERIC := 0.00; -- تغيير من 0.20 إلى 0.00
  v_processed       INTEGER := 0;
  v_skipped         INTEGER := 0;
  v_contestant      RECORD;
  v_wallet          public.wallets%ROWTYPE;
  v_rebate_amount   NUMERIC;
  v_already_granted BOOLEAN;
BEGIN
  PERFORM set_config('app.bypass_wallet_guard', 'true', true);

  -- لن يتم منح أي مكافآت للمتسابقين بعد الآن
  -- كل الأموال تذهب إلى صندوق الجوائز
  
  RETURN jsonb_build_object(
    'success',   true,
    'stage',     p_stage,
    'processed', 0, -- لا يتم معالجة أي متسابقين
    'skipped',   0,
    'message',   'Contestant vote earnings disabled - all funds go to prize pool'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION public.grant_vote_earnings(uuid, text) TO authenticated;

-- تحديث الإعدادات لتعكس التغيير
UPDATE public.app_settings
SET value = jsonb_set(
  value, 
  '{contestConfig,voteEarningsPct}', 
  '0'::jsonb
)
WHERE key = 'appSettings';

-- إذا لم يوجد الإعداد، أضفه
INSERT INTO public.app_settings (key, value, description)
SELECT
  'appSettings',
  '{"contestConfig": {"voteEarningsPct": 0}}'::jsonb,
  'Application settings - vote earnings set to 0%'
WHERE NOT EXISTS (
  SELECT 1 FROM public.app_settings 
  WHERE key = 'appSettings' AND value->'contestConfig'->>'voteEarningsPct' IS NOT NULL
);

-- إضافة سجل تدقيق للتغيير
INSERT INTO public.audit_logs (
  action, 
  entity_type, 
  entity_id, 
  performed_by, 
  metadata
) VALUES (
  'vote_earnings_disabled',
  'system',
  'contest_system',
  'system',
  jsonb_build_object(
    'old_percentage', 20,
    'new_percentage', 0,
    'reason', 'All vote funds now go to prize pool instead of contestants',
    'timestamp', now()
  )
);

COMMENT ON FUNCTION public.grant_vote_earnings IS 'Disabled - contestants now receive 0% of vote earnings. All funds go to prize pool.';
