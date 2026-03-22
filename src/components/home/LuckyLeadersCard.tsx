import { Crown, ChevronRight, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate, Link } from 'react-router-dom';
import { getCountryFlag } from '@/lib/countryFlags';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LeaderEntry {
  userId: string;
  name: string;
  prize: number;
  drawDate: string;
  place: 1 | 2;
  country: string;
}

interface LuckyLeadersCardProps {
  limit?: number;
}

export function LuckyLeadersCard({ limit = 5 }: LuckyLeadersCardProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLuckyLeaders() {
      try {
        // Fetch recent daily draws — each has 1st + 2nd place winners
        const drawsNeeded = Math.ceil(limit / 2);
        const { data: draws, error } = await supabase
          .from('spotlight_daily_draws')
          .select(
            'draw_date, first_place_user_id, first_place_prize, second_place_user_id, second_place_prize'
          )
          .not('first_place_user_id', 'is', null)
          .order('draw_date', { ascending: false })
          .limit(drawsNeeded);

        if (error) throw error;
        if (!draws?.length) {
          setLeaders([]);
          setIsLoading(false);
          return;
        }

        // Collect all user IDs
        const userIdSet = new Set<string>();
        for (const d of draws) {
          if (d.first_place_user_id)  userIdSet.add(d.first_place_user_id);
          if (d.second_place_user_id) userIdSet.add(d.second_place_user_id);
        }
        const userIds = Array.from(userIdSet);

        // Fetch profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, country')
          .in('user_id', userIds);

        const profileMap: Record<string, { name: string; country: string }> = {};
        for (const p of profiles ?? []) {
          profileMap[p.user_id] = {
            name: p.full_name ?? '—',
            country: getCountryFlag(p.country ?? '') ?? '',
          };
        }

        // Flatten into entries (1st then 2nd per draw), take `limit` total
        const entries: LeaderEntry[] = [];
        for (const d of draws) {
          if (d.first_place_user_id && entries.length < limit) {
            entries.push({
              userId:   d.first_place_user_id,
              name:     profileMap[d.first_place_user_id]?.name ?? '—',
              prize:    d.first_place_prize ?? 0,
              drawDate: d.draw_date,
              place:    1,
              country:  profileMap[d.first_place_user_id]?.country ?? '',
            });
          }
          if (d.second_place_user_id && entries.length < limit) {
            entries.push({
              userId:   d.second_place_user_id,
              name:     profileMap[d.second_place_user_id]?.name ?? '—',
              prize:    d.second_place_prize ?? 0,
              drawDate: d.draw_date,
              place:    2,
              country:  profileMap[d.second_place_user_id]?.country ?? '',
            });
          }
        }

        setLeaders(entries);
      } catch (err) {
        console.error('Error fetching lucky leaders:', err);
        setLeaders([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLuckyLeaders();
  }, [limit]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(isRTL ? 'ar-EG-u-ca-gregory' : 'en-US', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Empty state
  if (!isLoading && leaders.length === 0) {
    return (
      <Card className="overflow-hidden border border-border bg-card">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Crown className="h-4 w-4 text-nova" />
            <span>{isRTL ? 'متصدّري المحظوظين' : 'Lucky Leaders'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-center py-6 text-muted-foreground">
            <Crown className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">
              {isRTL ? 'لا يوجد محظوظين بعد' : 'No lucky winners yet'}
            </p>
            <p className="text-xs mt-1">
              {isRTL ? 'كن أول المحظوظين!' : 'Be the first lucky winner!'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border border-border bg-card">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Crown className="h-4 w-4 text-nova" />
            <span>
              {isRTL ? 'متصدّري المحظوظين' : 'Lucky Leaders'}
            </span>
          </CardTitle>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Link to="/lucky-leaders">
              {isRTL ? 'مشاهدة المزيد' : 'See More'}
              <ChevronRight className="h-3.5 w-3.5 ms-0.5" />
            </Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {isRTL ? 'فائزو سحب Spotlight اليومي' : 'Daily Spotlight draw winners'}
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {leaders.map((entry, i) => (
          <div
            key={`${entry.userId}-${entry.drawDate}-${entry.place}`}
            className={`flex items-center gap-3 p-2.5 rounded-lg border ${
              i === 0
                ? 'bg-nova/5 border-nova/20'
                : 'bg-muted/30 border-transparent'
            }`}
          >
            {/* Place badge */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 ${
                entry.place === 1
                  ? 'bg-nova/20 text-nova border-nova/30'
                  : 'bg-muted text-foreground border-border'
              }`}
            >
              {entry.place === 1 ? '🥇' : '🥈'}
            </div>

            {/* User info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p
                  className="font-medium text-sm truncate cursor-pointer hover:text-nova transition-colors"
                  onClick={() => navigate(`/user/${entry.userId}`)}
                >
                  {entry.name}
                </p>
                {entry.country && (
                  <span className="text-sm shrink-0">{entry.country}</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(entry.drawDate)}</span>
              </div>
            </div>

            {/* Prize */}
            <div className="text-end shrink-0">
              <p className={`font-bold text-sm ${i === 0 ? 'text-nova' : 'text-foreground'}`}>
                И {entry.prize.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
