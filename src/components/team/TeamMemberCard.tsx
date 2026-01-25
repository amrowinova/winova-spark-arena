import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { RankBadge } from '@/components/common/RankBadge';
import { useLanguage } from '@/contexts/LanguageContext';
import type { UserRank } from '@/contexts/UserContext';

export interface TeamMember {
  id: string;
  name: string;
  nameAr: string;
  username: string;
  rank: UserRank;
  active: boolean;
  avatar: string;
  activeWeeks: number;
  totalWeeks: number;
  directTeam: number;
  indirectTeam: number;
  teamSize: number;
}

interface TeamMemberCardProps {
  member: TeamMember;
  index?: number;
  onClick?: () => void;
  showArrow?: boolean;
}

export function TeamMemberCard({ member, index = 0, onClick, showArrow = true }: TeamMemberCardProps) {
  const { language } = useLanguage();
  const memberActivity = Math.round((member.activeWeeks / member.totalWeeks) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card 
        className={`${onClick ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`}
        onClick={onClick}
      >
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xl">
            {member.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {language === 'ar' ? member.nameAr : member.name}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <RankBadge rank={member.rank} size="sm" />
              <span className="text-xs text-muted-foreground">
                {member.activeWeeks}/{member.totalWeeks} {language === 'ar' ? 'أسابيع' : 'wks'}
              </span>
            </div>
          </div>
          <div className="text-end shrink-0">
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              member.active 
                ? 'bg-success/20 text-success' 
                : 'bg-destructive/20 text-destructive'
            }`}>
              {member.active 
                ? (language === 'ar' ? 'نشط' : 'Active')
                : (language === 'ar' ? 'غير نشط' : 'Inactive')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {memberActivity}%
            </p>
          </div>
          {showArrow && onClick && (
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
