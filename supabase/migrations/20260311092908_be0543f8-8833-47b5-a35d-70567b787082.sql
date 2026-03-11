-- BUG 1: Fix trigger that uses invalid enum values
-- The trigger uses 'contest_prize', 'spotlight_prize', 'lucky_prize' which don't exist
-- Valid enum values are: 'contest_win', 'referral_bonus', 'team_earnings'
CREATE OR REPLACE FUNCTION public.trg_team_event_prize_earned()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only fire for credit entries related to prizes/winnings
  IF NEW.entry_type IN ('contest_win', 'referral_bonus', 'team_earnings') 
     AND NEW.amount > 0 THEN
    PERFORM emit_team_event(
      NEW.user_id,
      'prize_earned',
      '💰 {name} earned ' || NEW.amount || ' Nova.',
      '💰 {name} ربح ' || NEW.amount || ' Nova.'
    );
  END IF;
  RETURN NEW;
END;
$function$;