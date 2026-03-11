-- BUG 2: Create convert_nova_aura RPC
-- Deducts Nova, adds Aura (1:2 ratio), logs to wallet_ledger
CREATE OR REPLACE FUNCTION public.convert_nova_aura(
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_aura_amount numeric;
  v_current_nova numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  v_aura_amount := p_amount * 2;

  -- Check current Nova balance
  SELECT nova_balance INTO v_current_nova
  FROM wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF v_current_nova < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient Nova balance');
  END IF;

  -- Check if wallet is frozen
  IF EXISTS (SELECT 1 FROM wallets WHERE user_id = v_user_id AND is_frozen = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet is frozen');
  END IF;

  -- Set bypass flag for wallet guard trigger
  PERFORM set_config('app.bypass_wallet_guard', 'true', true);

  -- Deduct Nova
  UPDATE wallets
  SET nova_balance = nova_balance - p_amount,
      updated_at = now()
  WHERE user_id = v_user_id;

  -- Add Aura
  UPDATE wallets
  SET aura_balance = aura_balance + v_aura_amount,
      updated_at = now()
  WHERE user_id = v_user_id;

  -- Reset bypass flag
  PERFORM set_config('app.bypass_wallet_guard', 'false', true);

  -- Log to wallet_ledger (using 'conversion' which exists in the enum)
  INSERT INTO wallet_ledger (user_id, entry_type, amount, currency)
  VALUES
    (v_user_id, 'conversion', -p_amount, 'NOVA'),
    (v_user_id, 'conversion', v_aura_amount, 'AURA');

  RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.bypass_wallet_guard', 'false', true);
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;