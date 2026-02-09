
-- Create the ai_priorities table
CREATE TABLE IF NOT EXISTS public.ai_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  title text,
  title_ar text,
  description text,
  description_ar text,
  category text, -- fix / risk / growth / revenue / performance
  severity text, -- critical / high / medium / low
  confidence_score int,
  estimated_impact text, -- high / medium / low
  requires_approval boolean DEFAULT true,
  source text, -- engineer / product / rule / anomaly
  reference_id text,
  status text DEFAULT 'pending' -- pending / approved / executed / ignored
);

-- Enable RLS
ALTER TABLE public.ai_priorities ENABLE ROW LEVEL SECURITY;

-- Admin → full access
CREATE POLICY "Admins can manage ai_priorities"
ON public.ai_priorities FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Support → read only
CREATE POLICY "Support can read ai_priorities"
ON public.ai_priorities FOR SELECT
USING (is_support_staff(auth.uid()));

-- AI/system → insert only
CREATE POLICY "Authenticated can insert ai_priorities"
ON public.ai_priorities FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
