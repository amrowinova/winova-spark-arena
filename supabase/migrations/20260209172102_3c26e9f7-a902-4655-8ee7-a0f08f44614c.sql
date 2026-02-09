
-- Add required_auto_execute_level to ai_execution_permissions
ALTER TABLE public.ai_execution_permissions
ADD COLUMN IF NOT EXISTS required_auto_execute_level INT NOT NULL DEFAULT 99;

-- Add comment explaining the column
COMMENT ON COLUMN public.ai_execution_permissions.required_auto_execute_level IS 
'Minimum agent auto_execute_level required to bypass human approval. 99 = always requires approval. 0-5 maps to rank hierarchy.';

-- Update existing permissions with sensible defaults
-- infra operations: level 1 (operator can auto-execute)
UPDATE public.ai_execution_permissions SET required_auto_execute_level = 1 WHERE category = 'infra';
-- performance operations: level 2 (senior+)
UPDATE public.ai_execution_permissions SET required_auto_execute_level = 2 WHERE category = 'performance';
-- fraud operations: level 3 (expert+)
UPDATE public.ai_execution_permissions SET required_auto_execute_level = 3 WHERE category = 'fraud';
-- p2p operations: level 4 (commander+)
UPDATE public.ai_execution_permissions SET required_auto_execute_level = 4 WHERE category = 'p2p';
