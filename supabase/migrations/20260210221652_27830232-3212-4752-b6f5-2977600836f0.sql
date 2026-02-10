
-- =====================================================
-- FINANCIAL INTEGRITY: Hard database-level constraints
-- Wallet balances must NEVER become negative.
-- =====================================================

-- CHECK constraints on wallet balances
ALTER TABLE public.wallets
  ADD CONSTRAINT wallets_nova_balance_non_negative CHECK (nova_balance >= 0),
  ADD CONSTRAINT wallets_aura_balance_non_negative CHECK (aura_balance >= 0),
  ADD CONSTRAINT wallets_locked_nova_non_negative CHECK (locked_nova_balance >= 0);

-- Prevent direct wallet updates from any authenticated user (defense in depth)
-- Only SECURITY DEFINER RPCs should mutate balances
-- Revoke direct UPDATE on balance columns is already handled by RLS,
-- but add a trigger as an additional guard

CREATE OR REPLACE FUNCTION public.guard_wallet_balance_mutation()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow service_role (RPCs) and postgres, block direct user updates on balance columns
  IF current_setting('role', true) = 'authenticated' THEN
    -- Check if balance columns are being changed
    IF NEW.nova_balance IS DISTINCT FROM OLD.nova_balance
       OR NEW.aura_balance IS DISTINCT FROM OLD.aura_balance
       OR NEW.locked_nova_balance IS DISTINCT FROM OLD.locked_nova_balance THEN
      RAISE EXCEPTION 'Direct balance mutation is forbidden. Use authorized transaction services.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER guard_wallet_direct_mutation
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_wallet_balance_mutation();
