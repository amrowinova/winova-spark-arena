
-- Allow authenticated (system/AI edge functions) to insert
CREATE POLICY "Authenticated can insert ai_product_proposals" ON public.ai_product_proposals FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
