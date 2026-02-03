-- Drop and recreate execute_transfer with caller validation
CREATE OR REPLACE FUNCTION public.execute_transfer(
  p_sender_id UUID,
  p_recipient_id UUID,
  p_amount NUMERIC,
  p_currency currency_type DEFAULT 'nova',
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
  -- CRITICAL: Verify caller is the sender (prevent impersonation)
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required', 'error_code', 'AUTH_REQUIRED');
  END IF;
  
  IF auth.uid() != p_sender_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You can only transfer from your own wallet', 'error_code', 'UNAUTHORIZED');
  END IF;

  -- Validate amount (no rounding, exact numeric)
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive', 'error_code', 'INVALID_AMOUNT');
  END IF;

  -- Prevent self-transfer
  IF p_sender_id = p_recipient_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot transfer to yourself', 'error_code', 'SELF_TRANSFER');
  END IF;

  -- Lock sender wallet first (prevents race conditions)
  SELECT * INTO v_sender_wallet
  FROM wallets
  WHERE user_id = p_sender_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sender wallet not found', 'error_code', 'SENDER_NOT_FOUND');
  END IF;

  -- Check if sender wallet is frozen
  IF v_sender_wallet.is_frozen THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your wallet is frozen', 'error_code', 'SENDER_FROZEN');
  END IF;

  -- Lock recipient wallet
  SELECT * INTO v_recipient_wallet
  FROM wallets
  WHERE user_id = p_recipient_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipient wallet not found', 'error_code', 'RECIPIENT_NOT_FOUND');
  END IF;

  -- Check if recipient wallet is frozen
  IF v_recipient_wallet.is_frozen THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipient wallet is frozen', 'error_code', 'RECIPIENT_FROZEN');
  END IF;

  -- Get current balances based on currency (using exact numeric, no rounding)
  IF p_currency = 'nova' THEN
    v_sender_balance_before := v_sender_wallet.nova_balance;
    v_recipient_balance_before := v_recipient_wallet.nova_balance;
  ELSE
    v_sender_balance_before := v_sender_wallet.aura_balance;
    v_recipient_balance_before := v_recipient_wallet.aura_balance;
  END IF;

  -- Check sufficient balance (exact comparison, no rounding)
  IF v_sender_balance_before < p_amount THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Insufficient balance', 
      'error_code', 'INSUFFICIENT_BALANCE',
      'available_balance', v_sender_balance_before,
      'requested_amount', p_amount
    );
  END IF;

  -- Calculate new balances (exact arithmetic)
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

  -- Return success with balances
  RETURN jsonb_build_object(
    'success', true,
    'sender_ledger_id', v_sender_ledger_id,
    'recipient_ledger_id', v_recipient_ledger_id,
    'sender_balance_after', v_sender_balance_after,
    'recipient_balance_after', v_recipient_balance_after
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Catch any unexpected errors and return structured response
  RETURN jsonb_build_object(
    'success', false, 
    'error', SQLERRM, 
    'error_code', 'UNEXPECTED_ERROR'
  );
END;
$$;

-- Ensure proper grants
GRANT EXECUTE ON FUNCTION public.execute_transfer TO authenticated;