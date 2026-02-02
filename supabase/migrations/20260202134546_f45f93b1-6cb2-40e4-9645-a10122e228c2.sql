-- Add RLS policy to allow authenticated users to search profiles
-- This enables user search for transfers, chat, and other features

CREATE POLICY "Authenticated users can search profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND username IS NOT NULL 
  AND length(username) >= 3
);