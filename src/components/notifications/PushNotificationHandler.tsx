/**
 * PushNotificationHandler
 *
 * Invisible component mounted once in App.tsx.
 * Subscribes to Supabase Realtime channels and fires native browser
 * notifications for all key user events — bilingual (ar/en).
 *
 * Events handled:
 *   1. wallet_ledger INSERT — contest_win, vote_receive, transfer_in,
 *      streak_reward, mission_reward, mystery_box, referral_prize,
 *      commission_earn (team earnings)
 *   2. p2p_orders UPDATE   — order matched (executor assigned)
 *   3. agent_reservations  — new reservation (for agents), status changes
 *   4. notifications table — generic DB notifications from RPCs
 *   5. Contest reminder     — polls every 60 s for upcoming contests
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const CONTEST_REMINDER_WINDOW_MS = 65 * 60 * 1000;
const CONTEST_REMINDER_MIN_MS   = 55 * 60 * 1000;
const POLL_INTERVAL_MS          = 60_000;

const remindedContests = new Set<string>();

// Bilingual notification map keyed by wallet_ledger entry_type
const LEDGER_NOTIFY: Record<string, {
  title_ar: string; title_en: string;
  body_ar: (amount: number) => string;
  body_en: (amount: number) => string;
  category: 'contest' | 'earnings' | 'p2p' | 'team' | 'system';
  tag: string;
}> = {
  contest_win: {
    title_ar: '🏆 فزت بالمسابقة!',
    title_en: '🏆 You won the contest!',
    body_ar: (n) => `تم إضافة ${n} Nova إلى محفظتك.`,
    body_en: (n) => `${n} Nova has been added to your wallet.`,
    category: 'contest',
    tag: 'contest_win',
  },
  vote_receive: {
    title_ar: '⭐ تصويت جديد',
    title_en: '⭐ New vote received',
    body_ar: (n) => `حصلت على تصويت جديد (+${n} Nova).`,
    body_en: (n) => `You received a vote (+${n} Nova).`,
    category: 'earnings',
    tag: 'vote_receive',
  },
  transfer_in: {
    title_ar: '💸 وصلك تحويل Nova',
    title_en: '💸 Nova transfer received',
    body_ar: (n) => `استلمت ${n} Nova في محفظتك.`,
    body_en: (n) => `You received ${n} Nova in your wallet.`,
    category: 'earnings',
    tag: 'transfer_in',
  },
  streak_reward: {
    title_ar: '🔥 مكافأة الستريك!',
    title_en: '🔥 Streak reward!',
    body_ar: (n) => `تهانيّ على استمرارك — ربحت ${n} Nova.`,
    body_en: (n) => `Congrats on your streak — you earned ${n} Nova.`,
    category: 'earnings',
    tag: 'streak_reward',
  },
  mission_reward: {
    title_ar: '✅ أنجزت مهمة!',
    title_en: '✅ Mission completed!',
    body_ar: (n) => `ربحت ${n} Nova من إكمال مهمة اليوم.`,
    body_en: (n) => `You earned ${n} Nova for completing today's mission.`,
    category: 'earnings',
    tag: 'mission_reward',
  },
  mystery_box: {
    title_ar: '🎁 فتحت صندوق الغموض!',
    title_en: '🎁 Mystery box opened!',
    body_ar: (n) => `حصلت على مكافأة ${n} Nova من صندوق الغموض.`,
    body_en: (n) => `You got ${n} Nova from the mystery box.`,
    category: 'earnings',
    tag: 'mystery_box',
  },
  referral_prize: {
    title_ar: '🏅 جائزة الإحالة الشهرية!',
    title_en: '🏅 Monthly referral prize!',
    body_ar: (n) => `ربحت ${n} Nova كجائزة إحالة هذا الشهر. أنت الأفضل!`,
    body_en: (n) => `You earned ${n} Nova as this month's referral prize. You're the best!`,
    category: 'earnings',
    tag: 'referral_prize',
  },
  commission_earn: {
    title_ar: '💼 عمولة من فريقك',
    title_en: '💼 Team commission earned',
    body_ar: (n) => `ربحت ${n} Nova من نشاط أحد أعضاء فريقك.`,
    body_en: (n) => `You earned ${n} Nova from your team activity.`,
    category: 'team',
    tag: 'commission',
  },
};

export function PushNotificationHandler() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { notify, isGranted } = usePushNotifications();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAr = language === 'ar';

  useEffect(() => {
    if (!user || !isGranted) return;

    const uid = user.id;

    // ── 1. wallet_ledger — all reward & transfer events ─────────────────────
    const txChannel = supabase
      .channel(`push_tx_${uid}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'wallet_ledger', filter: `user_id=eq.${uid}` },
        (payload) => {
          const row = payload.new as { entry_type: string; amount: number; currency: string };
          const cfg = LEDGER_NOTIFY[row.entry_type];
          if (!cfg) return;

          notify({
            title:    isAr ? cfg.title_ar : cfg.title_en,
            body:     isAr ? cfg.body_ar(row.amount) : cfg.body_en(row.amount),
            tag:      `${cfg.tag}_${Date.now()}`,
            category: cfg.category,
          });
        }
      )
      .subscribe();

    // ── 2. P2P orders — notify creator when matched ──────────────────────────
    const p2pChannel = supabase
      .channel(`push_p2p_${uid}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'p2p_orders', filter: `creator_id=eq.${uid}` },
        (payload) => {
          const oldRow = payload.old as { executor_id: string | null };
          const newRow = payload.new as { executor_id: string | null; nova_amount: number; order_type: string };

          if (!oldRow.executor_id && newRow.executor_id) {
            const isBuy = newRow.order_type === 'buy';
            notify({
              title:    isAr ? '🤝 طلب P2P جديد' : '🤝 New P2P match',
              body:     isAr
                ? (isBuy ? `شخص يريد البيع لك — ${newRow.nova_amount} Nova` : `شخص يريد الشراء منك — ${newRow.nova_amount} Nova`)
                : (isBuy ? `Someone wants to sell you ${newRow.nova_amount} Nova` : `Someone wants to buy ${newRow.nova_amount} Nova from you`),
              tag:      `p2p_matched_${newRow.executor_id}`,
              category: 'p2p',
            });
          }
        }
      )
      .subscribe();

    // ── 3. Agent reservations ────────────────────────────────────────────────
    // a) Agent receives new reservation
    const agentResChannel = supabase
      .channel(`push_agent_res_${uid}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_reservations', filter: `agent_user_id=eq.${uid}` },
        (payload) => {
          const row = payload.new as { nova_amount: number; type: string };
          const isDeposit = row.type === 'deposit';
          notify({
            title:    isAr ? '📋 حجز جديد' : '📋 New reservation',
            body:     isAr
              ? `${isDeposit ? 'إيداع' : 'سحب'} — ${row.nova_amount} Nova. راجع الطلب وقبل أو ارفض.`
              : `${isDeposit ? 'Deposit' : 'Withdrawal'} — ${row.nova_amount} Nova. Accept or reject.`,
            tag:      `agent_new_res_${Date.now()}`,
            category: 'earnings',
          });
        }
      )
      .subscribe();

    // b) User gets notified when their reservation status changes
    const userResChannel = supabase
      .channel(`push_user_res_${uid}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'agent_reservations', filter: `user_id=eq.${uid}` },
        (payload) => {
          const oldRow = payload.old as { status: string };
          const newRow = payload.new as { status: string; nova_amount: number };

          if (oldRow.status === newRow.status) return;

          const statusMap: Record<string, { ar: string; en: string; cat: 'earnings' | 'p2p' | 'system' }> = {
            escrow:    { ar: 'قبل الوكيل طلبك ✅', en: 'Agent accepted your request ✅', cat: 'earnings' },
            rejected:  { ar: 'رُفض طلبك من الوكيل', en: 'Your reservation was rejected', cat: 'system' },
            completed: { ar: `اكتملت العملية — ${newRow.nova_amount} Nova`, en: `Operation completed — ${newRow.nova_amount} Nova`, cat: 'earnings' },
            disputed:  { ar: 'تم رفع نزاع على طلبك', en: 'A dispute was raised on your reservation', cat: 'p2p' },
          };

          const msg = statusMap[newRow.status];
          if (!msg) return;

          notify({
            title:    isAr ? '🏪 تحديث الحجز' : '🏪 Reservation update',
            body:     isAr ? msg.ar : msg.en,
            tag:      `res_status_${newRow.status}_${Date.now()}`,
            category: msg.cat,
          });
        }
      )
      .subscribe();

    // ── 4. Generic notifications table ──────────────────────────────────────
    const notifChannel = supabase
      .channel(`push_notif_${uid}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
        (payload) => {
          const row = payload.new as {
            type: string;
            title_ar?: string; title_en?: string;
            body_ar?: string;  body_en?: string;
          };

          // Skip types already handled via wallet_ledger or p2p
          const skipTypes = new Set([
            'contest_win', 'vote_receive', 'transfer_in',
            'streak_reward', 'mission_reward', 'mystery_box', 'referral_prize',
            'commission_earn', 'p2p_matched',
          ]);
          if (skipTypes.has(row.type)) return;

          const title = isAr ? (row.title_ar ?? row.title_en ?? 'إشعار') : (row.title_en ?? row.title_ar ?? 'Notification');
          const body  = isAr ? (row.body_ar  ?? row.body_en  ?? '')       : (row.body_en  ?? row.body_ar  ?? '');
          if (!title) return;

          notify({ title, body, tag: `notif_${Date.now()}`, category: 'system' });
        }
      )
      .subscribe();

    // ── 5. Contest reminder — poll every 60 s ────────────────────────────────
    const checkUpcomingContests = async () => {
      const now  = new Date();
      const from = new Date(now.getTime() + CONTEST_REMINDER_MIN_MS).toISOString();
      const to   = new Date(now.getTime() + CONTEST_REMINDER_WINDOW_MS).toISOString();

      const { data } = await supabase
        .from('contests')
        .select('id, title, title_ar, start_time')
        .eq('status', 'upcoming')
        .gte('start_time', from)
        .lte('start_time', to);

      for (const contest of data ?? []) {
        if (remindedContests.has(contest.id)) continue;
        remindedContests.add(contest.id);
        notify({
          title:    isAr ? '⏰ مسابقة تبدأ بعد ساعة!' : '⏰ Contest starts in 1 hour!',
          body:     isAr ? (contest.title_ar ?? contest.title) : (contest.title ?? contest.title_ar),
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
      supabase.removeChannel(agentResChannel);
      supabase.removeChannel(userResChannel);
      supabase.removeChannel(notifChannel);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [user, isGranted, notify, isAr]);

  return null;
}
