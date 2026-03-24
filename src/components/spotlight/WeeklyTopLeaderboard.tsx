/**
 * WeeklyTopLeaderboard — أعلى 10 مستخدمين هذا الأسبوع في نقاط Spotlight
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';

interface LeaderEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  country: string | null;
  weekly_points: number;
  rank: number;
}

const PRIZES: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

const PRIZE_NOVA: Record<number, string> = {
  1: '500 И',
  2: '300 И',
  3: '200 И',
  4: '100 И',
  5: '100 И',
  6: '50 И',
  7: '50 И',
  8: '50 И',
  9: '50 И',
  10: '50 И',
};

export function WeeklyTopLeaderboard() {
  const { language } = useLanguage();
  const { user } = useUser();
  const isRTL = language === 'ar';

  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // جلب أعلى 10 في النقاط الأسبوعية الحالية
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const { data } = await supabase
          .from('spotlight_user_points')
          .select('user_id, points, profiles(display_name, avatar_url, country)')
          .gte('created_at', startOfWeek.toISOString())
          .order('points', { ascending: false });

        if (!data) { setLoading(false); return; }

        // تجميع النقاط لكل مستخدم
        const map = new Map<string, { pts: number; name: string; avatar: string | null; country: string | null }>();
        for (const row of data) {
          const p = row.profiles as { display_name?: string; avatar_url?: string | null; country?: string | null } | null;
          if (!map.has(row.user_id)) {
            map.set(row.user_id, { pts: 0, name: p?.display_name ?? '?', avatar: p?.avatar_url ?? null, country: p?.country ?? null });
          }
          map.get(row.user_id)!.pts += Number(row.points ?? 0);
        }

        const sorted = [...map.entries()]
          .sort((a, b) => b[1].pts - a[1].pts)
          .slice(0, 10)
          .map(([uid, v], i) => ({
            user_id: uid,
            display_name: v.name,
            avatar_url: v.avatar,
            country: v.country,
            weekly_points: v.pts,
            rank: i + 1,
          }));

        setLeaders(sorted);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (leaders.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8 text-muted-foreground text-sm">
          <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
          {isRTL ? 'لا توجد نقاط هذا الأسبوع بعد' : 'No points yet this week'}
        </CardContent>
      </Card>
    );
  }

  const myEntry = leaders.find(l => l.user_id === user.id);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-nova/10 to-background border-b border-border/50 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-nova" />
          <p className="font-bold text-sm">
            {isRTL ? 'أعلى 10 هذا الأسبوع' : 'Top 10 This Week'}
          </p>
          <span className="text-xs text-muted-foreground ms-auto">
            {isRTL ? 'الجوائز أسبوعية' : 'Weekly prizes'}
          </span>
        </div>

        {/* List */}
        <div className="divide-y divide-border/30">
          {leaders.map((l, i) => {
            const isMe = l.user_id === user.id;
            return (
              <motion.div
                key={l.user_id}
                initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-center gap-3 px-4 py-2.5 ${isMe ? 'bg-nova/5' : ''}`}
              >
                {/* Rank */}
                <div className="w-7 text-center shrink-0">
                  {PRIZES[l.rank]
                    ? <span className="text-base">{PRIZES[l.rank]}</span>
                    : <span className="text-xs font-bold text-muted-foreground">{l.rank}</span>}
                </div>

                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {l.avatar_url
                    ? <img src={l.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-xs font-bold">{(l.display_name ?? '?')[0]}</span>
                  }
                </div>

                {/* Name & country */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${isMe ? 'text-nova' : ''}`}>
                    {l.display_name} {isMe ? (isRTL ? '(أنت)' : '(you)') : ''}
                  </p>
                  {l.country && (
                    <p className="text-[10px] text-muted-foreground">{l.country}</p>
                  )}
                </div>

                {/* Points */}
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold">{l.weekly_points.toLocaleString()}</p>
                  <p className="text-[10px] text-nova">{PRIZE_NOVA[l.rank]}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* My rank if not in top 10 */}
        {myEntry === undefined && user.id && (
          <div className="px-4 py-2.5 bg-nova/5 border-t border-nova/20 flex items-center gap-3">
            <div className="w-7 text-center text-xs font-bold text-muted-foreground shrink-0">
              {isRTL ? 'أنا' : 'Me'}
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'أنت خارج أعلى 10 حالياً — زد نشاطك!' : "You're outside top 10 — be more active!"}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
