import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { UserRank } from '@/contexts/UserContext';

interface RankBadgeProps {
  rank: UserRank;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const rankIcons: Record<UserRank, string> = {
  subscriber: '👤',
  marketer: '🎯',
  leader: '⭐',
  manager: '👑',
  president: '🏆',
};

export function RankBadge({ rank, size = 'md', className }: RankBadgeProps) {
  const { t } = useTranslation();

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        `rank-${rank}`,
        sizeClasses[size],
        className
      )}
    >
      <span>{rankIcons[rank]}</span>
      <span>{t(`ranks.${rank}`)}</span>
    </div>
  );
}
