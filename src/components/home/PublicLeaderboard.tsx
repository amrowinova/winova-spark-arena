/**
 * PublicLeaderboard
 *
 * Top-10 users by total Nova won from contests.
 * Visible to unauthenticated visitors — no login required.
 */
import { useLanguage } from '@/contexts/LanguageContext';
import { usePublicLeaderboard } from '@/hooks/usePlatformStats';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { getCountryFlag } from '@/lib/countryFlags';
import { Trophy } from 'lucide-react';

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const RANK_STYLES: Record<number, string> = {
  1: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-md shadow-yellow-400/30',
  2: 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-800',
  3: 'bg-gradient-to-r from-amber-600 to-amber-700 text-white',
};

function formatNova(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1)     + 'K';
  return n.toLocaleString();
}

export function PublicLeaderboard() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { entries, isLoading } = usePublicLeaderboard(10);

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
          <Trophy className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <h2 className="font-bold text-sm">
            {isRTL ? 'أكثر الفائزين Nova' : 'Top Nova Winners'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isRTL ? 'مجموع الجوائز من المسابقات' : 'Total prizes from contests'}
          </p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="flex-1 h-4" />
          <Skeleton className="w-16 h-4" />
        </div>
      ))}

      {/* Empty */}
      {!isLoading && entries.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-6">
          {isRTL ? 'لا توجد بيانات بعد' : 'No data yet'}
        </p>
      )}

      {/* Top 3 — podium style */}
      {!isLoading && entries.slice(0, 3).map(entry => (
        <div
          key={entry.user_id}
          className={`flex items-center gap-3 p-3 rounded-xl ${RANK_STYLES[entry.rank] ?? 'bg-card border'}`}
        >
          {/* Rank */}
          <span className="text-xl w-8 text-center shrink-0">
            {MEDAL[entry.rank] ?? entry.rank}
          </span>

          {/* Avatar */}
          <Avatar className="w-9 h-9 shrink-0">
            <AvatarImage src={entry.avatar_url ?? ''} />
            <AvatarFallback className="text-sm font-bold">
              {entry.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Name / username */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{entry.name}</p>
            <p className="text-xs opacity-80 truncate">
              {getCountryFlag(entry.country)} @{entry.username}
            </p>
          </div>

          {/* Nova won */}
          <div className="text-right shrink-0">
            <p className="font-bold text-sm">И {formatNova(entry.total_nova)}</p>
            <p className="text-[10px] opacity-75">
              {entry.contest_count} {isRTL ? 'فوز' : 'wins'}
            </p>
          </div>
        </div>
      ))}

      {/* Ranks 4-10 — compact list */}
      {!isLoading && entries.slice(3).map(entry => (
        <div
          key={entry.user_id}
          className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 border border-border/50"
        >
          <span className="text-sm text-muted-foreground font-semibold w-6 text-center shrink-0">
            {entry.rank}
          </span>
          <Avatar className="w-7 h-7 shrink-0">
            <AvatarImage src={entry.avatar_url ?? ''} />
            <AvatarFallback className="text-xs">{entry.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{entry.name}</p>
          </div>
          <p className="text-sm font-semibold text-primary shrink-0">
            И {formatNova(entry.total_nova)}
          </p>
        </div>
      ))}
    </div>
  );
}
