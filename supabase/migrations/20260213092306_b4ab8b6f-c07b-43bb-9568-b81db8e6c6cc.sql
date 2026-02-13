
-- ============================================================
-- TEAM EVENT DISPATCHER + AUTOMATIC COMPETITIVE NOTIFICATIONS
-- ============================================================

-- Central dispatcher: emit_team_event
-- Inserts system message into all team conversations the user belongs to
-- Optionally creates push notifications for team members
CREATE OR REPLACE FUNCTION public.emit_team_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_message TEXT,
  p_message_ar TEXT DEFAULT NULL,
  p_notify BOOLEAN DEFAULT FALSE,
  p_notif_title TEXT DEFAULT NULL,
  p_notif_title_ar TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv RECORD;
  v_member RECORD;
  v_user_name TEXT;
  v_final_message TEXT;
  v_final_message_ar TEXT;
BEGIN
  -- Get user display name
  SELECT name INTO v_user_name FROM profiles WHERE user_id = p_user_id;
  IF v_user_name IS NULL THEN v_user_name := 'Member'; END IF;

  -- Replace {name} placeholder
  v_final_message := REPLACE(p_message, '{name}', v_user_name);
  v_final_message_ar := CASE 
    WHEN p_message_ar IS NOT NULL THEN REPLACE(p_message_ar, '{name}', v_user_name)
    ELSE NULL 
  END;

  -- Find all conversations where this user is a member
  FOR v_conv IN
    SELECT tc.id AS conversation_id
    FROM team_conversation_members tcm
    JOIN team_conversations tc ON tc.id = tcm.conversation_id
    WHERE tcm.user_id = p_user_id
  LOOP
    -- Insert system message into team chat
    INSERT INTO team_messages (conversation_id, sender_id, content, message_type)
    VALUES (v_conv.conversation_id, p_user_id, v_final_message, 'system');

    -- If push notification requested, notify all other members in this conversation
    IF p_notify THEN
      FOR v_member IN
        SELECT tcm2.user_id
        FROM team_conversation_members tcm2
        WHERE tcm2.conversation_id = v_conv.conversation_id
        AND tcm2.user_id != p_user_id
      LOOP
        INSERT INTO notifications (user_id, type, title, title_ar, message, message_ar, reference_id)
        VALUES (
          v_member.user_id,
          'team_' || p_event_type,
          COALESCE(p_notif_title, v_final_message),
          p_notif_title_ar,
          v_final_message,
          v_final_message_ar,
          p_user_id::text
        );
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- TRIGGER 1: Contest Join
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_team_event_contest_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM emit_team_event(
    NEW.user_id,
    'contest_join',
    '🎯 {name} joined today''s contest. Support them with your votes!',
    '🎯 {name} انضم لمسابقة اليوم. ادعمه بتصويتك!'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER team_event_contest_join
AFTER INSERT ON public.contest_entries
FOR EACH ROW
EXECUTE FUNCTION public.trg_team_event_contest_join();

-- ============================================================
-- TRIGGER 2: Contest Rank Changes (Final / Winner)
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_team_event_contest_rank()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Winner: prize_won set for the first time
  IF NEW.prize_won IS NOT NULL AND NEW.prize_won > 0 AND (OLD.prize_won IS NULL OR OLD.prize_won = 0) THEN
    PERFORM emit_team_event(
      NEW.user_id,
      'contest_win',
      '🏆 {name} WON today''s contest! Congratulations champion!',
      '🏆 {name} فاز بمسابقة اليوم! مبروك يا بطل!',
      TRUE,
      '🏆 Team member won the contest!',
      '🏆 عضو في فريقك فاز بالمسابقة!'
    );
    RETURN NEW;
  END IF;

  -- Entered Final (Top 50)
  IF NEW.rank IS NOT NULL AND NEW.rank <= 50 AND (OLD.rank IS NULL OR OLD.rank > 50) THEN
    PERFORM emit_team_event(
      NEW.user_id,
      'contest_final',
      '🚀 {name} is in the FINAL round! Votes now matter the most.',
      '🚀 {name} في الجولة النهائية! التصويت الآن هو الأهم.',
      TRUE,
      '🚀 Team member reached the Finals!',
      '🚀 عضو في فريقك وصل للنهائيات!'
    );
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER team_event_contest_rank
AFTER UPDATE ON public.contest_entries
FOR EACH ROW
EXECUTE FUNCTION public.trg_team_event_contest_rank();

-- ============================================================
-- TRIGGER 3: Rank Promotion
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_team_event_rank_promotion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rank_label TEXT;
BEGIN
  IF NEW.rank IS DISTINCT FROM OLD.rank AND NEW.rank::text != 'subscriber' THEN
    v_rank_label := INITCAP(REPLACE(NEW.rank::text, '_', ' '));
    PERFORM emit_team_event(
      NEW.user_id,
      'rank_promotion',
      '👑 {name} has been promoted to ' || v_rank_label || '. Hard work pays off.',
      '👑 {name} ترقّى إلى ' || v_rank_label || '. العمل الجاد يؤتي ثماره.',
      TRUE,
      '👑 Team member promoted!',
      '👑 عضو في فريقك ترقّى!'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER team_event_rank_promotion
AFTER UPDATE OF rank ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_team_event_rank_promotion();

-- ============================================================
-- TRIGGER 4: Spotlight Winners
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_team_event_spotlight_winner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_announced = TRUE AND (OLD.is_announced = FALSE OR OLD.is_announced IS NULL) THEN
    IF NEW.first_place_user_id IS NOT NULL THEN
      PERFORM emit_team_event(
        NEW.first_place_user_id,
        'spotlight_win',
        '✨ {name} is one of today''s Spotlight winners!',
        '✨ {name} أحد فائزي سبوتلايت اليوم!',
        TRUE,
        '✨ Team member won Spotlight!',
        '✨ عضو في فريقك فاز بسبوتلايت!'
      );
    END IF;
    IF NEW.second_place_user_id IS NOT NULL THEN
      PERFORM emit_team_event(
        NEW.second_place_user_id,
        'spotlight_win',
        '✨ {name} is one of today''s Spotlight winners!',
        '✨ {name} أحد فائزي سبوتلايت اليوم!'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER team_event_spotlight_winner
AFTER UPDATE ON public.spotlight_daily_draws
FOR EACH ROW
EXECUTE FUNCTION public.trg_team_event_spotlight_winner();

-- ============================================================
-- TRIGGER 5: New Referral Joined Team
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_team_event_new_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only for direct members (level 1)
  IF NEW.level = 1 THEN
    PERFORM emit_team_event(
      NEW.member_id,
      'new_referral',
      '🤝 {name} joined the team. Welcome!',
      '🤝 {name} انضم للفريق. أهلاً وسهلاً!'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Use a name that sorts AFTER team_chat_auto_enroll_on_team_member
CREATE TRIGGER team_event_z_new_referral
AFTER INSERT ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.trg_team_event_new_referral();

-- ============================================================
-- TRIGGER 6: Contest Prize Earnings
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_team_event_prize_earned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire for credit entries related to prizes/winnings
  IF NEW.entry_type IN ('contest_prize', 'spotlight_prize', 'lucky_prize') 
     AND NEW.amount > 0 THEN
    PERFORM emit_team_event(
      NEW.user_id,
      'prize_earned',
      '💰 {name} earned ' || NEW.amount || ' ' || NEW.currency || '.',
      '💰 {name} ربح ' || NEW.amount || ' ' || NEW.currency || '.'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER team_event_prize_earned
AFTER INSERT ON public.wallet_ledger
FOR EACH ROW
EXECUTE FUNCTION public.trg_team_event_prize_earned();
