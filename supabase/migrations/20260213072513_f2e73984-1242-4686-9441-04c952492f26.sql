-- Step 1: Add genesis_credit to the ledger_entry_type enum
ALTER TYPE public.ledger_entry_type ADD VALUE IF NOT EXISTS 'genesis_credit';
