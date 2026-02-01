import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { P2PRole, ROLE_BADGE_CONFIG } from '@/lib/p2pRoleUtils';
import { cn } from '@/lib/utils';

interface P2PRoleBadgeProps {
  role: P2PRole;
  isYou?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function P2PRoleBadge({ role, isYou = false, size = 'sm', className }: P2PRoleBadgeProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  const configKey = isYou ? `you_${role}` as const : role;
  const config = ROLE_BADGE_CONFIG[configKey];
  
  return (
    <Badge 
      variant="outline"
      className={cn(
        config.className,
        size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5',
        className
      )}
    >
      {isRTL ? config.ar : config.en}
    </Badge>
  );
}

interface P2PParticipantWithRoleProps {
  name: string;
  nameAr: string;
  avatar?: string;
  role: P2PRole;
  isYou?: boolean;
  showAvatar?: boolean;
}

export function P2PParticipantWithRole({
  name,
  nameAr,
  avatar,
  role,
  isYou = false,
  showAvatar = true,
}: P2PParticipantWithRoleProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const displayName = isRTL ? nameAr : name;
  
  return (
    <div className="flex items-center gap-2">
      {showAvatar && avatar && (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm shrink-0">
          {avatar}
        </div>
      )}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="font-medium truncate">{displayName}</span>
        <P2PRoleBadge role={role} isYou={isYou} size="sm" />
      </div>
    </div>
  );
}
