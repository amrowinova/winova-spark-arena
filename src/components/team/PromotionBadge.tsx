import { Star, Clock, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TeamMember } from './TeamMemberCard';

type PromotionStatus = 'eligible' | 'close' | 'not-eligible';

interface PromotionBadgeProps {
  member: TeamMember;
  size?: 'sm' | 'md';
}

export function getPromotionStatus(member: TeamMember): PromotionStatus {
  // Promotion logic:
  // Eligible: subscriber with 3+ direct members and 4+ active weeks
  // Close: subscriber with 2+ direct members and 3+ active weeks
  // Not Eligible: everyone else
  
  if (member.rank !== 'subscriber') {
    // Already promoted ranks need different logic
    if (member.rank === 'marketer') {
      // Marketer → Leader: 10 direct marketers
      if (member.directTeam >= 10) return 'eligible';
      if (member.directTeam >= 7) return 'close';
      return 'not-eligible';
    }
    return 'not-eligible';
  }
  
  // Subscriber → Marketer requirements
  const hasEnoughDirect = member.directTeam >= 3;
  const hasEnoughActivity = member.activeWeeks >= 4;
  
  if (hasEnoughDirect && hasEnoughActivity) {
    return 'eligible';
  }
  
  const closeToEnoughDirect = member.directTeam >= 2;
  const closeToEnoughActivity = member.activeWeeks >= 3;
  
  if (closeToEnoughDirect && closeToEnoughActivity) {
    return 'close';
  }
  
  return 'not-eligible';
}

export function PromotionBadge({ member, size = 'sm' }: PromotionBadgeProps) {
  const { language } = useLanguage();
  const status = getPromotionStatus(member);
  
  const config = {
    eligible: {
      icon: Star,
      label: language === 'ar' ? 'مؤهل' : 'Eligible',
      className: 'bg-success/20 text-success border-success/30 hover:bg-success/30',
    },
    close: {
      icon: Clock,
      label: language === 'ar' ? 'قريب' : 'Close',
      className: 'bg-warning/20 text-warning border-warning/30 hover:bg-warning/30',
    },
    'not-eligible': {
      icon: X,
      label: language === 'ar' ? 'غير مؤهل' : 'Not Yet',
      className: 'bg-muted text-muted-foreground border-border hover:bg-muted/80',
    },
  };
  
  const { icon: Icon, label, className } = config[status];
  
  return (
    <Badge 
      variant="outline" 
      className={`${className} ${size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'}`}
    >
      <Icon className={`${size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} me-0.5`} />
      {label}
    </Badge>
  );
}
