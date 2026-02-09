
-- Evolution proposal lifecycle with full audit trail
CREATE TABLE public.ai_self_evolution_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposing_agent_id uuid REFERENCES public.ai_agents(id),
  proposal_type text NOT NULL CHECK (proposal_type IN ('weakness_fix','upgrade','new_tool','new_agent','workflow','architecture')),
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
  risk_assessment text NOT NULL DEFAULT 'low' CHECK (risk_assessment IN ('low','medium','high','critical')),
  risk_details text,
  risk_details_ar text,
  simulation_id uuid REFERENCES public.ai_shadow_simulations(id),
  simulation_verdict text,
  simulation_report text,
  lifecycle_status text NOT NULL DEFAULT 'draft' CHECK (lifecycle_status IN ('draft','simulated','waiting_approval','approved','rejected','expired')),
  draft_at timestamptz NOT NULL DEFAULT now(),
  simulated_at timestamptz,
  submitted_at timestamptz,
  decided_at timestamptz,
  decided_by text,
  decision_reason text,
  decision_reason_ar text,
  conversation_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_self_evolution_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read evolution proposals" ON public.ai_self_evolution_proposals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins write evolution proposals" ON public.ai_self_evolution_proposals FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_self_evolution_proposals;
