-- Add matched_at column to track when order was accepted (for timer logic)
ALTER TABLE public.p2p_orders ADD COLUMN IF NOT EXISTS matched_at TIMESTAMP WITH TIME ZONE;

-- Create a trigger to set matched_at when executor_id is set
CREATE OR REPLACE FUNCTION public.set_p2p_order_matched_at()
RETURNS TRIGGER AS $$
BEGIN
  -- When executor_id is set and matched_at is null, set matched_at
  IF NEW.executor_id IS NOT NULL AND OLD.executor_id IS NULL AND NEW.matched_at IS NULL THEN
    NEW.matched_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS tr_set_p2p_order_matched_at ON public.p2p_orders;
CREATE TRIGGER tr_set_p2p_order_matched_at
  BEFORE UPDATE ON public.p2p_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_p2p_order_matched_at();