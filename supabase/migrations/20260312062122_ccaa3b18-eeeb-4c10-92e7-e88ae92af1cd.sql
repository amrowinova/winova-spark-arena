DROP FUNCTION IF EXISTS public.join_contest(uuid, uuid, numeric);

CREATE OR REPLACE FUNCTION public.join_contest(p_user_id uuid, p_contest_id uuid, p_entry_fee numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_wallet wallets%rowtype;
  v_contest contests%rowtype;
  v_balance_before numeric;
  v_balance_after numeric;
  v_entry_id uuid;
  v_ledger_id uuid;
  v_new_prize_pool numeric;
  v_new_participants integer;
  v_ksa_now timestamp;
  v_ksa_today date;
  v_join_close timestamp;
begin
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required', 'error_code', 'AUTH_REQUIRED');
  END IF;

  IF auth.uid() <> p_user_id THEN
    INSERT INTO public.audit_logs(action, entity_type, entity_id, performed_by, metadata)
    VALUES ('contest_join_impersonation_blocked', 'contest', p_contest_id::text, auth.uid(),
      jsonb_build_object('attempted_user_id', p_user_id, 'actual_uid', auth.uid()));
    RETURN jsonb_build_object('success', false, 'error', 'You can only join contests as yourself', 'error_code', 'UNAUTHORIZED');
  END IF;

  v_ksa_now := timezone('Asia/Riyadh', now());
  v_ksa_today := (v_ksa_now)::date;
  v_join_close := date_trunc('day', v_ksa_now) + interval '19 hours';

  if v_ksa_now >= v_join_close then
    return jsonb_build_object('success', false, 'error', 'Joining is closed');
  end if;

  select * into v_contest from contests where id = p_contest_id for update;
  if not found then return jsonb_build_object('success', false, 'error', 'Contest not found'); end if;
  if v_contest.contest_date <> v_ksa_today then return jsonb_build_object('success', false, 'error', 'No contest for today'); end if;
  if v_contest.max_participants is not null and v_contest.current_participants >= v_contest.max_participants then
    return jsonb_build_object('success', false, 'error', 'Contest is full');
  end if;
  if exists (select 1 from contest_entries where contest_id = p_contest_id and user_id = p_user_id) then
    return jsonb_build_object('success', false, 'error', 'Already joined this contest');
  end if;

  select * into v_wallet from wallets where user_id = p_user_id for update;
  if not found then return jsonb_build_object('success', false, 'error', 'Wallet not found'); end if;
  if v_wallet.is_frozen then return jsonb_build_object('success', false, 'error', 'Wallet is frozen'); end if;

  v_balance_before := v_wallet.nova_balance;
  if v_balance_before < p_entry_fee then
    return jsonb_build_object('success', false, 'error', 'Insufficient Nova balance');
  end if;
  v_balance_after := v_balance_before - p_entry_fee;

  update wallets set nova_balance = v_balance_after, updated_at = now() where id = v_wallet.id;

  insert into contest_entries (contest_id, user_id, votes_received)
  values (p_contest_id, p_user_id, 0) returning id into v_entry_id;

  v_new_participants := v_contest.current_participants + 1;
  v_new_prize_pool := v_new_participants * 6;
  update contests set current_participants = v_new_participants, prize_pool = v_new_prize_pool where id = p_contest_id;

  insert into wallet_ledger (user_id, wallet_id, entry_type, currency, amount, balance_before, balance_after, reference_type, reference_id, description, description_ar)
  values (p_user_id, v_wallet.id, 'contest_entry', 'nova', -p_entry_fee, v_balance_before, v_balance_after, 'contest', p_contest_id, 'Contest entry fee', 'رسوم دخول المسابقة')
  returning id into v_ledger_id;

  insert into transactions (user_id, type, currency, amount, reference_id, description, description_ar)
  values (p_user_id, 'contest_entry', 'nova', -p_entry_fee, v_entry_id, 'Contest entry fee', 'رسوم دخول المسابقة');

  return jsonb_build_object('success', true, 'entry_id', v_entry_id, 'ledger_id', v_ledger_id, 'balance_after', v_balance_after, 'new_participants', v_new_participants, 'new_prize_pool', v_new_prize_pool);
end;
$$;