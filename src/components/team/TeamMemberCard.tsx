import { ChevronRight, MessageCircle, Users, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RankBadge } from '@/components/common/RankBadge';
import { PromotionBadge } from './PromotionBadge';
import { useLanguage } from '@/contexts/LanguageContext';
import { banner } from '@/contexts/BannerContext';
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
  showActions?: boolean;
  showPromotionBadge?: boolean;
  onMessage?: () => void;
  onViewTeam?: () => void;
  onRemind?: () => void;
}

export function TeamMemberCard({ 
  member, 
  index = 0, 
  onClick, 
  showArrow = true,
  showActions = false,
  showPromotionBadge = true,
  onMessage,
  onViewTeam,
  onRemind
}: TeamMemberCardProps) {
  const { language } = useLanguage();
  const memberActivity = Math.round((member.activeWeeks / member.totalWeeks) * 100);
  
  // Calculate active members under this member
  const activeUnder = Math.round(member.teamSize * (memberActivity / 100));

  const handleMessage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMessage) {
      onMessage();
    } else {
      banner.success(language === 'ar' ? 'جاري فتح المحادثة...' : 'Opening chat...');
    }
  };

  const handleViewTeam = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewTeam) {
      onViewTeam();
    }
  };

  const handleRemind = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemind) {
      onRemind();
    } else {
      banner.success(language === 'ar' ? 'تم إرسال التذكير!' : 'Reminder sent!');
    }
  };

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
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xl relative">
              {member.avatar}
              {/* Activity indicator dot */}
              <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card flex items-center justify-center text-[8px] font-bold ${
                member.active ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'
              }`}>
                {member.active ? '✓' : '!'}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium truncate">
                  {language === 'ar' ? member.nameAr : member.name}
                </p>
                {/* Promotion Badge */}
                {showPromotionBadge && <PromotionBadge member={member} size="sm" />}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <RankBadge rank={member.rank} size="sm" />
                <span className="text-xs text-muted-foreground">
                  {member.activeWeeks}/{member.totalWeeks} {language === 'ar' ? 'أسابيع' : 'wks'}
                </span>
              </div>
              {/* Impact indicator - Enhanced */}
              {member.teamSize > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5 bg-muted/50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {language === 'ar' 
                    ? `${activeUnder} نشط من ${member.teamSize} تحته`
                    : `${activeUnder} active of ${member.teamSize} under`}
                </p>
              )}
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
          </div>
          
          {/* Quick Actions */}
          {showActions && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 h-8 text-xs"
                onClick={handleMessage}
              >
                <MessageCircle className="h-3.5 w-3.5 me-1" />
                {language === 'ar' ? 'مراسلة' : 'Message'}
              </Button>
              {member.teamSize > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 h-8 text-xs"
                  onClick={handleViewTeam}
                >
                  <Users className="h-3.5 w-3.5 me-1" />
                  {language === 'ar' ? 'فريقه' : 'Team'}
                </Button>
              )}
              {!member.active && (
                <Button 
                  variant="default" 
                  size="sm" 
                  className="flex-1 h-8 text-xs"
                  onClick={handleRemind}
                >
                  <Bell className="h-3.5 w-3.5 me-1" />
                  {language === 'ar' ? 'تذكير' : 'Remind'}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
