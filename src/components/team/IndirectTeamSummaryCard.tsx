import { Users, TrendingUp, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TeamMember } from './TeamMemberCard';

interface IndirectTeamSummaryCardProps {
  parentMember: TeamMember;
  members: TeamMember[];
  totalTeamSize: number; // User's total team size for percentage calculation
}

export function IndirectTeamSummaryCard({ 
  parentMember, 
  members, 
  totalTeamSize 
}: IndirectTeamSummaryCardProps) {
  const { language } = useLanguage();
  
  const activeCount = members.filter(m => m.active).length;
  const activityPercentage = members.length > 0 
    ? Math.round((activeCount / members.length) * 100) 
    : 0;
  
  // Calculate contribution to your overall team
  const contributionPercentage = totalTeamSize > 0 
    ? Math.round((members.length / totalTeamSize) * 100) 
    : 0;
  
  // Impact on your activity (simplified: active members from this sub-team)
  const activityImpact = totalTeamSize > 0
    ? Math.round((activeCount / totalTeamSize) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-muted/50 border-primary/20">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="font-bold text-sm">
            {language === 'ar' ? 'تأثير هذا الفريق' : 'Team Impact'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Members Added */}
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-1">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <p className="text-lg font-bold">{members.length}</p>
            <p className="text-[10px] text-muted-foreground">
              {language === 'ar' ? 'أعضاء' : 'Members'}
            </p>
          </div>

          {/* Active Contribution */}
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-1">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <p className="text-lg font-bold text-success">{activeCount}</p>
            <p className="text-[10px] text-muted-foreground">
              {language === 'ar' ? 'نشط' : 'Active'}
            </p>
          </div>

          {/* Team Contribution */}
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-1">
              <BarChart3 className="h-5 w-5 text-warning" />
            </div>
            <p className="text-lg font-bold text-warning">{contributionPercentage}%</p>
            <p className="text-[10px] text-muted-foreground">
              {language === 'ar' ? 'من فريقك' : 'Of Team'}
            </p>
          </div>
        </div>

        {/* Activity Impact */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              {language === 'ar' ? 'تأثير النشاط' : 'Activity Impact'}
            </span>
            <span className="font-medium">
              +{activityImpact}% {language === 'ar' ? 'لفريقك' : 'to your team'}
            </span>
          </div>
          <Progress value={activityPercentage} className="h-2" />
          <p className="text-[10px] text-muted-foreground text-center">
            {language === 'ar'
              ? `${activeCount} من ${members.length} نشط = ${activityPercentage}% نشاط`
              : `${activeCount} of ${members.length} active = ${activityPercentage}% activity`}
          </p>
        </div>
      </Card>
    </motion.div>
  );
}
