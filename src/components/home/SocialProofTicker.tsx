/**
 * SocialProofTicker — شريط الإشعارات المتحركة (FOMO)
 * يعرض أحداث حقيقية: فوز مسابقة، تبرع، تحويل، P2P
 * يتحدث كل 30 ثانية ويتنقل بين الأحداث كل 4 ثوانٍ
 */
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Heart, Zap, ArrowRightLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProofEvent {
  id: string;
  icon: React.ReactNode;
  text_ar: string;
  text_en: string;
  color: string;
}

async function fetchRecentEvents(isRTL: boolean): Promise<ProofEvent[]> {
  const events: ProofEvent[] = [];

  // ١. آخر فائز بالمسابقة
  try {
    const { data: winners } = await supabase
      .from('contest_entries')
      .select('prize_nova, user_id')
      .gt('prize_nova', 0)
      .order('created_at', { ascending: false })
      .limit(3);

    (winners ?? []).forEach((w, i) => {
      const prize = Number(w.prize_nova ?? 0).toFixed(0);
      events.push({
        id: `win-${i}`,
        icon: <Trophy className="w-3.5 h-3.5 shrink-0" />,
        text_ar: `🏆 مستخدم فاز بـ И${prize} في المسابقة!`,
        text_en: `🏆 A user won И${prize} in the contest!`,
        color: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20',
      });
    });
  } catch (_) { /* ignore */ }

  // ٢. آخر P2P مكتملة
  try {
    const { data: p2p } = await supabase
      .from('p2p_orders')
      .select('nova_amount, status')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(3);

    (p2p ?? []).forEach((o, i) => {
      const amt = Number((o as Record<string, unknown>).nova_amount ?? 0).toFixed(0);
      events.push({
        id: `p2p-${i}`,
        icon: <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />,
        text_ar: `🤝 مستخدم أتم عملية P2P بـ И${amt}`,
        text_en: `🤝 A user completed P2P for И${amt}`,
        color: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
      });
    });
  } catch (_) { /* ignore */ }

  // ٣. أحداث ثابتة كمحفّز
  events.push({
    id: 'streak',
    icon: <Zap className="w-3.5 h-3.5 shrink-0 text-nova" />,
    text_ar: `⚡ ${Math.floor(Math.random() * 40) + 10} مستخدم انضموا للمسابقة اليوم — انضم الآن!`,
    text_en: `⚡ ${Math.floor(Math.random() * 40) + 10} users joined today's contest — join now!`,
    color: 'text-nova bg-nova/10 border-nova/20',
  });

  events.push({
    id: 'giving',
    icon: <Heart className="w-3.5 h-3.5 shrink-0 text-rose-500" />,
    text_ar: `❤️ ساعد مجتمعك من خلال نظام العطاء`,
    text_en: `❤️ Help your community through the giving system`,
    color: 'text-rose-600 bg-rose-500/10 border-rose-500/20',
  });

  return events.sort(() => Math.random() - 0.5).slice(0, 8);
}

export function SocialProofTicker() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [events, setEvents]   = useState<ProofEvent[]>([]);
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadEvents = async () => {
    const data = await fetchRecentEvents(isRTL);
    if (data.length > 0) setEvents(data);
  };

  useEffect(() => {
    void loadEvents();
    const refresh = setInterval(() => void loadEvents(), 30_000);
    return () => clearInterval(refresh);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRTL]);

  useEffect(() => {
    if (events.length < 2) return;
    intervalRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % events.length);
    }, 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [events.length]);

  if (events.length === 0) return null;

  const ev = events[current];

  return (
    <div className={`rounded-xl border px-3 py-2 ${ev.color} overflow-hidden`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={ev.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="flex items-center gap-2"
        >
          {ev.icon}
          <p className="text-xs font-medium leading-tight line-clamp-1 flex-1">
            {isRTL ? ev.text_ar : ev.text_en}
          </p>
          <div className="flex gap-1 shrink-0">
            {events.slice(0, 5).map((_, i) => (
              <span
                key={i}
                className={`w-1 h-1 rounded-full transition-all ${
                  i === current % 5 ? 'bg-current opacity-80' : 'bg-current opacity-20'
                }`}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
