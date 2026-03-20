/**
 * PlatformStatsBar
 *
 * Three live counters shown on the home page:
 *   👥  X active users right now
 *   🏆  X completed contests
 *   💰  X Nova distributed as prizes
 *
 * Refreshes every 60 seconds automatically.
 * Uses a count-up animation on first mount.
 */
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePlatformStats } from '@/hooks/usePlatformStats';
import { Users, Trophy, Coins } from 'lucide-react';

// ── Animated number ───────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) return;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // easeOutQuart
      const eased = 1 - Math.pow(1 - progress, 4);
      setValue(Math.round(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return value;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString();
}

interface StatItemProps {
  icon: React.ReactNode;
  value: number;
  labelEn: string;
  labelAr: string;
  isRTL: boolean;
  color: string;
  isLoading: boolean;
}

function StatItem({ icon, value, labelEn, labelAr, isRTL, color, isLoading }: StatItemProps) {
  const animated = useCountUp(isLoading ? 0 : value);

  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <span className="text-lg font-bold tabular-nums leading-none">
        {isLoading ? '—' : formatCompact(animated)}
      </span>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">
        {isRTL ? labelAr : labelEn}
      </span>
    </div>
  );
}

export function PlatformStatsBar() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { stats, isLoading } = usePlatformStats();

  return (
    <div
      className="w-full rounded-2xl border bg-card/80 backdrop-blur-sm px-4 py-3"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="flex items-stretch gap-2">
        <StatItem
          icon={<Users className="w-4 h-4 text-emerald-600" />}
          value={stats?.activeUsers ?? 0}
          labelEn="active now"
          labelAr="نشط الحين"
          isRTL={isRTL}
          color="bg-emerald-100"
          isLoading={isLoading}
        />

        {/* Divider */}
        <div className="w-px bg-border self-stretch mx-1" />

        <StatItem
          icon={<Trophy className="w-4 h-4 text-amber-600" />}
          value={stats?.completedContests ?? 0}
          labelEn="contests done"
          labelAr="مسابقة اكتملت"
          isRTL={isRTL}
          color="bg-amber-100"
          isLoading={isLoading}
        />

        {/* Divider */}
        <div className="w-px bg-border self-stretch mx-1" />

        <StatItem
          icon={<Coins className="w-4 h-4 text-primary" />}
          value={stats?.totalNovaPrizes ?? 0}
          labelEn="Nova in prizes"
          labelAr="Nova كجوائز"
          isRTL={isRTL}
          color="bg-primary/10"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
