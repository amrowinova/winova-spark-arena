import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { UserRank } from '@/contexts/UserContext';

interface RankBadgeProps {
  rank: UserRank;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

// Unique icons for each rank - clear visual distinction
const rankIcons: Record<UserRank, string> = {
  subscriber: '🔵',  // Blue circle - entry level
  marketer: '🟢',    // Green circle - active marketer
  leader: '⭐',      // Star - leadership
  manager: '💎',     // Diamond - management
  president: '👑',   // Crown - top rank
};

// Rank-specific background colors for better distinction
const rankColors: Record<UserRank, string> = {
  subscriber: 'bg-slate-100 text-slate-700 border border-slate-200',
  marketer: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  leader: 'bg-amber-50 text-amber-700 border border-amber-200',
  manager: 'bg-purple-50 text-purple-700 border border-purple-200',
  president: 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border border-amber-300',
};

export function RankBadge({ rank, size = 'md', className, showLabel = true }: RankBadgeProps) {
  const { t } = useTranslation();

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base font-semibold',
  };

  const iconSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium shadow-sm',
        rankColors[rank],
        sizeClasses[size],
        className
      )}
    >
      <span className={iconSizes[size]}>{rankIcons[rank]}</span>
      {showLabel && <span>{t(`ranks.${rank}`)}</span>}
    </div>
  );
}
