-- Allow admins to update any user's wallet (for Nova management)
CREATE POLICY "Admins can update any wallet" 
ON public.wallets 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to insert transactions for any user
CREATE POLICY "Admins can insert transactions for any user" 
ON public.transactions 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all transactions (for verification)
CREATE POLICY "Admins can view all transactions" 
ON public.transactions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));