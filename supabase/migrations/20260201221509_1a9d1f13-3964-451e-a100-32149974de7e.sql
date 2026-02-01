-- =====================================================
-- GLOBAL WALLET LEDGER - Single Source of Truth
-- Every Nova/Aura movement is tracked here
-- =====================================================

-- Ledger entry types
CREATE TYPE public.ledger_entry_type AS ENUM (
  'transfer_out',      -- Sent Nova to another user
  'transfer_in',       -- Received Nova from another user
  'p2p_buy',           -- Bought Nova via P2P
  'p2p_sell',          -- Sold Nova via P2P
  'p2p_escrow_lock',   -- Nova locked for P2P sell order
  'p2p_escrow_release',-- Nova released from escrow
  'contest_entry',     -- Paid contest entry fee
  'contest_win',       -- Won contest prize
  'vote_spend',        -- Spent Aura on voting
  'vote_receive',      -- Received Aura from votes
  'referral_bonus',    -- Bonus from referral
  'team_earnings',     -- Team commission earnings
  'admin_credit',      -- Admin added balance
  'admin_debit',       -- Admin deducted balance
  'conversion'         -- Nova to Aura conversion
);

-- Main ledger table
CREATE TABLE public.wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User whose balance changed
  user_id UUID NOT NULL,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id),
  
  -- What type of transaction
  entry_type ledger_entry_type NOT NULL,
  currency currency_type NOT NULL,
  
  -- Amount (positive = credit, negative = debit)
  amount NUMERIC NOT NULL,
  
  -- Balance tracking (CRITICAL for auditing)
  balance_before NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  
  -- References to source transactions
  reference_type TEXT, -- 'dm_message', 'p2p_order', 'contest', 'vote', 'admin_action'
  reference_id UUID,
  
  -- Counterparty for transfers
  counterparty_id UUID, -- The other user in the transaction
  
  -- Audit fields
  description TEXT,
  description_ar TEXT,
  metadata JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX idx_ledger_user_id ON public.wallet_ledger(user_id);
CREATE INDEX idx_ledger_wallet_id ON public.wallet_ledger(wallet_id);
CREATE INDEX idx_ledger_created_at ON public.wallet_ledger(created_at DESC);
CREATE INDEX idx_ledger_entry_type ON public.wallet_ledger(entry_type);
CREATE INDEX idx_ledger_reference ON public.wallet_ledger(reference_type, reference_id);

-- Enable RLS
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

-- Users can view their own ledger entries
CREATE POLICY "Users can view their own ledger entries"
ON public.wallet_ledger FOR SELECT
USING (auth.uid() = user_id);

-- Only system/admin can insert ledger entries (via functions)
CREATE POLICY "Admins can view all ledger entries"
ON public.wallet_ledger FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Enable realtime for ledger
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_ledger;

-- =====================================================
-- ATOMIC TRANSFER FUNCTION
-- Handles all Nova/Aura transfers with full audit trail
-- =====================================================
CREATE OR REPLACE FUNCTION public.execute_transfer(
  p_sender_id UUID,
  p_recipient_id UUID,
  p_amount NUMERIC,
  p_currency currency_type,
  p_reference_type TEXT DEFAULT 'transfer',
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_description_ar TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_wallet wallets%ROWTYPE;
  v_recipient_wallet wallets%ROWTYPE;
  v_sender_balance_before NUMERIC;
  v_sender_balance_after NUMERIC;
  v_recipient_balance_before NUMERIC;
  v_recipient_balance_after NUMERIC;
  v_sender_ledger_id UUID;
  v_recipient_ledger_id UUID;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  -- Lock sender wallet first (prevents race conditions)
  SELECT * INTO v_sender_wallet
  FROM wallets
  WHERE user_id = p_sender_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sender wallet not found');
  END IF;

  -- Check if sender wallet is frozen
  IF v_sender_wallet.is_frozen THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sender wallet is frozen');
  END IF;

  -- Lock recipient wallet
  SELECT * INTO v_recipient_wallet
  FROM wallets
  WHERE user_id = p_recipient_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipient wallet not found');
  END IF;

  -- Check if recipient wallet is frozen
  IF v_recipient_wallet.is_frozen THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipient wallet is frozen');
  END IF;

  -- Get current balances based on currency
  IF p_currency = 'nova' THEN
    v_sender_balance_before := v_sender_wallet.nova_balance;
    v_recipient_balance_before := v_recipient_wallet.nova_balance;
  ELSE
    v_sender_balance_before := v_sender_wallet.aura_balance;
    v_recipient_balance_before := v_recipient_wallet.aura_balance;
  END IF;

  -- Check sufficient balance
  IF v_sender_balance_before < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Calculate new balances
  v_sender_balance_after := v_sender_balance_before - p_amount;
  v_recipient_balance_after := v_recipient_balance_before + p_amount;

  -- Update sender wallet
  IF p_currency = 'nova' THEN
    UPDATE wallets SET nova_balance = v_sender_balance_after, updated_at = now()
    WHERE id = v_sender_wallet.id;
  ELSE
    UPDATE wallets SET aura_balance = v_sender_balance_after, updated_at = now()
    WHERE id = v_sender_wallet.id;
  END IF;

  -- Update recipient wallet
  IF p_currency = 'nova' THEN
    UPDATE wallets SET nova_balance = v_recipient_balance_after, updated_at = now()
    WHERE id = v_recipient_wallet.id;
  ELSE
    UPDATE wallets SET aura_balance = v_recipient_balance_after, updated_at = now()
    WHERE id = v_recipient_wallet.id;
  END IF;

  -- Create ledger entry for sender (debit)
  INSERT INTO wallet_ledger (
    user_id, wallet_id, entry_type, currency, amount,
    balance_before, balance_after, reference_type, reference_id,
    counterparty_id, description, description_ar
  ) VALUES (
    p_sender_id, v_sender_wallet.id, 'transfer_out', p_currency, -p_amount,
    v_sender_balance_before, v_sender_balance_after, p_reference_type, p_reference_id,
    p_recipient_id, p_description, p_description_ar
  ) RETURNING id INTO v_sender_ledger_id;

  -- Create ledger entry for recipient (credit)
  INSERT INTO wallet_ledger (
    user_id, wallet_id, entry_type, currency, amount,
    balance_before, balance_after, reference_type, reference_id,
    counterparty_id, description, description_ar
  ) VALUES (
    p_recipient_id, v_recipient_wallet.id, 'transfer_in', p_currency, p_amount,
    v_recipient_balance_before, v_recipient_balance_after, p_reference_type, p_reference_id,
    p_sender_id, p_description, p_description_ar
  ) RETURNING id INTO v_recipient_ledger_id;

  -- Also insert into transactions table for backward compatibility
  INSERT INTO transactions (user_id, type, currency, amount, reference_id, description, description_ar)
  VALUES 
    (p_sender_id, 'transfer', p_currency, -p_amount, v_sender_ledger_id, p_description, p_description_ar),
    (p_recipient_id, 'transfer', p_currency, p_amount, v_recipient_ledger_id, p_description, p_description_ar);

  RETURN jsonb_build_object(
    'success', true,
    'sender_ledger_id', v_sender_ledger_id,
    'recipient_ledger_id', v_recipient_ledger_id,
    'sender_balance_after', v_sender_balance_after,
    'recipient_balance_after', v_recipient_balance_after
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.execute_transfer TO authenticated;

-- =====================================================
-- ADMIN BALANCE ADJUSTMENT FUNCTION
-- For admin Nova add/deduct with full audit trail
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(
  p_admin_id UUID,
  p_target_user_id UUID,
  p_amount NUMERIC,
  p_currency currency_type,
  p_is_credit BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
  v_ledger_id UUID;
  v_entry_type ledger_entry_type;
  v_actual_amount NUMERIC;
BEGIN
  -- Verify caller is admin
  IF NOT has_role(p_admin_id, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin role required');
  END IF;

  -- Lock target wallet
  SELECT * INTO v_wallet
  FROM wallets
  WHERE user_id = p_target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target wallet not found');
  END IF;

  -- Get current balance
  IF p_currency = 'nova' THEN
    v_balance_before := v_wallet.nova_balance;
  ELSE
    v_balance_before := v_wallet.aura_balance;
  END IF;

  -- Calculate new balance
  IF p_is_credit THEN
    v_balance_after := v_balance_before + p_amount;
    v_actual_amount := p_amount;
    v_entry_type := 'admin_credit';
  ELSE
    IF v_balance_before < p_amount THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance for deduction');
    END IF;
    v_balance_after := v_balance_before - p_amount;
    v_actual_amount := -p_amount;
    v_entry_type := 'admin_debit';
  END IF;

  -- Update wallet
  IF p_currency = 'nova' THEN
    UPDATE wallets SET nova_balance = v_balance_after, updated_at = now()
    WHERE id = v_wallet.id;
  ELSE
    UPDATE wallets SET aura_balance = v_balance_after, updated_at = now()
    WHERE id = v_wallet.id;
  END IF;

  -- Create ledger entry
  INSERT INTO wallet_ledger (
    user_id, wallet_id, entry_type, currency, amount,
    balance_before, balance_after, reference_type,
    counterparty_id, description, metadata
  ) VALUES (
    p_target_user_id, v_wallet.id, v_entry_type, p_currency, v_actual_amount,
    v_balance_before, v_balance_after, 'admin_action',
    p_admin_id, p_reason, jsonb_build_object('admin_id', p_admin_id, 'reason', p_reason)
  ) RETURNING id INTO v_ledger_id;

  -- Also insert into transactions for backward compatibility
  INSERT INTO transactions (user_id, type, currency, amount, reference_id, description)
  VALUES (p_target_user_id, 
    CASE WHEN p_is_credit THEN 'deposit'::transaction_type ELSE 'withdrawal'::transaction_type END,
    p_currency, v_actual_amount, v_ledger_id, p_reason);

  RETURN jsonb_build_object(
    'success', true,
    'ledger_id', v_ledger_id,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after
  );
END;
$$;

-- Grant execute to admins only (function checks internally)
GRANT EXECUTE ON FUNCTION public.admin_adjust_balance TO authenticated;