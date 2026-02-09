
-- Add 'deferred' to the valid status constraint
ALTER TABLE public.ai_execution_requests DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE public.ai_execution_requests ADD CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'deferred', 'executing', 'completed', 'failed', 'rolled_back', 'expired'));
