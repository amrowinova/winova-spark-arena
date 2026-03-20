/**
 * PushNotificationHandler
 *
 * Invisible component mounted once in App.tsx.
 * Subscribes to Supabase Realtime channels and fires native browser
 * notifications for the 5 required event types.
 *
 * Events handled:
 *   1. Contest starting in ~1 hour  (polling every 60 s)
 *   2. Contest win                  (transactions INSERT, entry_type='contest_win')
 *   3. Vote received                (transactions INSERT, entry_type='vote_receive')
 *   4. Nova transfer received       (transactions INSERT, entry_type='transfer_in')
 *   5. P2P order matched            (p2p_orders UPDATE, executor_id set for your order)
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const CONTEST_REMINDER_WINDOW_MS = 65 * 60 * 1000; // 65 min — catches "within 1 hour"
const CONTEST_REMINDER_MIN_MS   = 55 * 60 * 1000; // 55 min floor to avoid double-fire
const POLL_INTERVAL_MS          = 60_000;           // poll every 60 s

// Track which contest IDs we've already reminded about (per session)
const remindedContests = new Set<string>();

export function PushNotificationHandler() {
  const { user } = useAuth();
  const { notify, isGranted } = usePushNotifications();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user || !isGranted) return;

    const uid = user.id;

    // ── 1. Transactions channel (contest_win, vote_receive, transfer_in) ────
    const txChannel = supabase
      .channel(`push_tx_${uid}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'wallet_ledger',
          filter: `user_id=eq.${uid}`,
        },
        (payload) => {
          const row = payload.new as {
            entry_type: string;
            amount: number;
            currency: string;
          };

          if (row.entry_type === 'contest_win') {
            notify({
              title:    '🏆 فزت بالمسابقة!',
              body:     `تم إضافة ${row.amount} Nova إلى محفظتك.`,
              tag:      `contest_win_${Date.now()}`,
              category: 'contest',
            });
          } else if (row.entry_type === 'vote_receive') {
            notify({
              title:    '⭐ تصويت جديد',
              body:     `حصلت على تصويت جديد (+${row.amount} Nova).`,
              tag:      `vote_${Date.now()}`,
              category: 'earnings',
            });
          } else if (row.entry_type === 'transfer_in') {
            notify({
              title:    '💸 وصلك تحويل Nova',
              body:     `استلمت ${row.amount} Nova في محفظتك.`,
              tag:      `transfer_${Date.now()}`,
              category: 'earnings',
            });
          }
        }
      )
      .subscribe();

    // ── 2. P2P orders — notify creator when order is matched ────────────────
    const p2pChannel = supabase
      .channel(`push_p2p_${uid}`)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'p2p_orders',
          filter: `creator_id=eq.${uid}`,
        },
        (payload) => {
          const oldRow = payload.old as { executor_id: string | null; status: string };
          const newRow = payload.new as {
            executor_id: string | null;
            status: string;
            nova_amount: number;
            order_type: string;
          };

          // Fire only on the transition: executor_id was null → now set
          if (!oldRow.executor_id && newRow.executor_id) {
            const isBuy = newRow.order_type === 'buy';
            notify({
              title:    `🤝 طلب P2P جديد`,
              body:     isBuy
                ? `شخص يريد البيع لك — ${newRow.nova_amount} Nova`
                : `شخص يريد الشراء منك — ${newRow.nova_amount} Nova`,
              tag:      `p2p_matched_${newRow.executor_id}`,
              category: 'p2p',
            });
          }
        }
      )
      .subscribe();

    // ── 3. Contest reminder — poll every 60 s ───────────────────────────────
    const checkUpcomingContests = async () => {
      const now   = new Date();
      const from  = new Date(now.getTime() + CONTEST_REMINDER_MIN_MS).toISOString();
      const to    = new Date(now.getTime() + CONTEST_REMINDER_WINDOW_MS).toISOString();

      const { data } = await supabase
        .from('contests')
        .select('id, title, title_ar, start_time')
        .eq('status', 'upcoming')
        .gte('start_time', from)
        .lte('start_time', to);

      if (!data) return;

      for (const contest of data) {
        if (remindedContests.has(contest.id)) continue;
        remindedContests.add(contest.id);

        notify({
          title:    '⏰ مسابقة تبدأ بعد ساعة!',
          body:     contest.title_ar ?? contest.title,
          tag:      `contest_reminder_${contest.id}`,
          category: 'contest',
        });
      }
    };

    checkUpcomingContests();
    pollRef.current = setInterval(checkUpcomingContests, POLL_INTERVAL_MS);

    return () => {
      supabase.removeChannel(txChannel);
      supabase.removeChannel(p2pChannel);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [user, isGranted, notify]);

  return null;
}
