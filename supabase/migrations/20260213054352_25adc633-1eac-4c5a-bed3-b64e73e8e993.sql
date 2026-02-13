
-- Fix remaining policies that failed due to conflict

-- system_incidents - drop existing then recreate
DROP POLICY IF EXISTS "Service role can insert incidents" ON public.system_incidents;
DROP POLICY IF EXISTS "Admins can insert incidents" ON public.system_incidents;
DROP POLICY IF EXISTS "Admins can read incidents" ON public.system_incidents;
CREATE POLICY "Admins can insert incidents" ON public.system_incidents FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can read incidents" ON public.system_incidents FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- authority_promotion_log
DROP POLICY IF EXISTS "System can insert promotion log" ON public.authority_promotion_log;
DROP POLICY IF EXISTS "Admins can insert promotion log" ON public.authority_promotion_log;
DROP POLICY IF EXISTS "Anyone can read promotion log" ON public.authority_promotion_log;
DROP POLICY IF EXISTS "Admins read authority_promotion_log" ON public.authority_promotion_log;
CREATE POLICY "Admins can insert promotion log" ON public.authority_promotion_log FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins read authority_promotion_log" ON public.authority_promotion_log FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- authority_tier_state
DROP POLICY IF EXISTS "System can insert authority tier" ON public.authority_tier_state;
DROP POLICY IF EXISTS "Admins can insert authority tier" ON public.authority_tier_state;
DROP POLICY IF EXISTS "Admins can read authority tier" ON public.authority_tier_state;
DROP POLICY IF EXISTS "Admins read authority_tier_state" ON public.authority_tier_state;
CREATE POLICY "Admins can insert authority tier" ON public.authority_tier_state FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins read authority_tier_state" ON public.authority_tier_state FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- CEO behavioral model
DROP POLICY IF EXISTS "ceo_behavioral_model_read" ON public.ceo_behavioral_model;
DROP POLICY IF EXISTS "Admins read ceo_behavioral_model" ON public.ceo_behavioral_model;
CREATE POLICY "Admins read ceo_behavioral_model" ON public.ceo_behavioral_model FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- CEO communication profile
DROP POLICY IF EXISTS "ceo_comm_profile_read" ON public.ceo_communication_profile;
DROP POLICY IF EXISTS "Admins read ceo_communication_profile" ON public.ceo_communication_profile;
CREATE POLICY "Admins read ceo_communication_profile" ON public.ceo_communication_profile FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- emergency_controls
DROP POLICY IF EXISTS "Authenticated read emergency_controls" ON public.emergency_controls;
DROP POLICY IF EXISTS "Admins read emergency_controls" ON public.emergency_controls;
CREATE POLICY "Admins read emergency_controls" ON public.emergency_controls FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- freeze_controls
DROP POLICY IF EXISTS "Authenticated read freeze_controls" ON public.freeze_controls;
DROP POLICY IF EXISTS "Admins read freeze_controls" ON public.freeze_controls;
CREATE POLICY "Admins read freeze_controls" ON public.freeze_controls FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- governance_rules
DROP POLICY IF EXISTS "Authenticated read governance_rules" ON public.governance_rules;
DROP POLICY IF EXISTS "Admins read governance_rules" ON public.governance_rules;
CREATE POLICY "Admins read governance_rules" ON public.governance_rules FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- authority_levels
DROP POLICY IF EXISTS "Authenticated read authority_levels" ON public.authority_levels;
DROP POLICY IF EXISTS "Admins read authority_levels" ON public.authority_levels;
CREATE POLICY "Admins read authority_levels" ON public.authority_levels FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- autonomy_caps
DROP POLICY IF EXISTS "Authenticated read autonomy_caps" ON public.autonomy_caps;
DROP POLICY IF EXISTS "Admins read autonomy_caps" ON public.autonomy_caps;
CREATE POLICY "Admins read autonomy_caps" ON public.autonomy_caps FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- veto_events
DROP POLICY IF EXISTS "Authenticated read veto_events" ON public.veto_events;
DROP POLICY IF EXISTS "Admins read veto_events" ON public.veto_events;
CREATE POLICY "Admins read veto_events" ON public.veto_events FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
