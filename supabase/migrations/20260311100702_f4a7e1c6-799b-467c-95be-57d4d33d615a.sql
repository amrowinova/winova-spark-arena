
-- Add missing 'type' column to payment_methods table
ALTER TABLE public.payment_methods 
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'bank';

-- Add notes column
ALTER TABLE public.payment_methods 
  ADD COLUMN IF NOT EXISTS notes text;
