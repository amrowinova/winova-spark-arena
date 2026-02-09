
CREATE TABLE IF NOT EXISTS public.ai_product_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  title text,
  title_ar text,
  description text,
  description_ar text,
  opportunity_type text,
  confidence_score int,
  estimated_impact text,
  based_on_events int,
  data_window text,
  status text DEFAULT 'pending',
  generated_by text DEFAULT 'product_brain'
);

ALTER TABLE public.ai_product_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ai_product_proposals" ON public.ai_product_proposals FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Support can read ai_product_proposals" ON public.ai_product_proposals FOR SELECT USING (is_support_staff(auth.uid()));
