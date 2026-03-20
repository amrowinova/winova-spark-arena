import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { getContestTiming, getCountdownTarget } from '@/lib/contestTiming';

interface ContestCountdownBadgeProps {
  className?: string;
  variant?: 'badge' | 'inline';
}

function buildText(remainingMs: number, label: { ar: string; en: string }, language: string): string {
  if (remainingMs <= 0) {
    return language === 'ar' ? 'انتهت المسابقة' : 'Contest ended';
  }

  const totalMins = Math.floor(remainingMs / 60_000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;

  const isAr = language === 'ar';

  if (hours === 0 && mins === 0) {
    return isAr ? 'أقل من دقيقة' : 'Less than a minute';
  }

  if (isAr) {
    const hPart = hours > 0 ? `${hours} ساعة` : '';
    const mPart = mins > 0 ? `${mins} دقيقة` : '';
    const timePart = [hPart, mPart].filter(Boolean).join(' و');
    return `⏱ باقي ${timePart}`;
  } else {
    const hPart = hours > 0 ? `${hours}h` : '';
    const mPart = mins > 0 ? `${mins}m` : '';
    const timePart = [hPart, mPart].filter(Boolean).join(' ');
    return `⏱ ${timePart} remaining`;
  }
}

export function ContestCountdownBadge({ className, variant = 'badge' }: ContestCountdownBadgeProps) {
  const { language } = useLanguage();

  const [text, setText] = useState(() => {
    const timing = getContestTiming();
    const { date, label } = getCountdownTarget(timing);
    const ms = Math.max(0, date.getTime() - Date.now());
    return buildText(ms, label, language);
  });

  useEffect(() => {
    const update = () => {
      const timing = getContestTiming();
      const { date, label } = getCountdownTarget(timing);
      const ms = Math.max(0, date.getTime() - Date.now());
      setText(buildText(ms, label, language));
    };

    update();
    // Align the minute tick to the next round minute for accuracy
    const now = Date.now();
    const msUntilNextMinute = 60_000 - (now % 60_000);
    const initial = setTimeout(() => {
      update();
      const interval = setInterval(update, 60_000);
      return () => clearInterval(interval);
    }, msUntilNextMinute);

    return () => clearTimeout(initial);
  }, [language]);

  if (variant === 'inline') {
    return (
      <span className={cn('text-sm text-muted-foreground', className)}>
        {text}
      </span>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
        'bg-primary/10 border border-primary/20 text-primary text-sm font-medium',
        className
      )}
    >
      <Clock className="h-3.5 w-3.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}
