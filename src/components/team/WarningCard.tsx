import { motion } from 'framer-motion';
import { AlertTriangle, TrendingDown, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface WarningCardProps {
  inactiveCount: number;
  directTeamCount: number;
}

export function WarningCard({ inactiveCount, directTeamCount }: WarningCardProps) {
  const { user } = useUser();
  const { language } = useLanguage();

  // Determine warning type
  const userInactive = !user.weeklyActive;
  const teamActivityLow = directTeamCount > 0 && (inactiveCount / directTeamCount) > 0.5;
  const cycleEnding = user.currentWeek >= 12;
  const activityLow = user.activeWeeks < user.currentWeek * 0.5;

  // No warning needed
  if (!userInactive && !teamActivityLow && !cycleEnding && !activityLow) {
    return null;
  }

  // Determine most urgent warning
  let warningType: 'user_inactive' | 'team_low' | 'cycle_ending' | 'activity_low' = 'user_inactive';
  let icon = AlertTriangle;
  let bgClass = 'bg-warning/10 border-warning/30';
  let textClass = 'text-warning';
  let title = '';
  let description = '';

  if (userInactive) {
    warningType = 'user_inactive';
    icon = Clock;
    bgClass = 'bg-destructive/10 border-destructive/30';
    textClass = 'text-destructive';
    title = language === 'ar' ? 'أنت غير نشط!' : 'You are inactive!';
    description = language === 'ar' 
      ? 'انضم لمسابقة وصوّت للحفاظ على نشاطك'
      : 'Join a contest and vote to stay active';
  } else if (teamActivityLow) {
    warningType = 'team_low';
    icon = TrendingDown;
    bgClass = 'bg-warning/10 border-warning/30';
    textClass = 'text-warning';
    title = language === 'ar' 
      ? `${inactiveCount} أعضاء غير نشطين`
      : `${inactiveCount} inactive members`;
    description = language === 'ar' 
      ? 'تواصل مع فريقك لتحسين النشاط'
      : 'Contact your team to improve activity';
  } else if (cycleEnding) {
    warningType = 'cycle_ending';
    icon = Clock;
    bgClass = 'bg-primary/10 border-primary/30';
    textClass = 'text-primary';
    title = language === 'ar' 
      ? `${14 - user.currentWeek} أسابيع متبقية`
      : `${14 - user.currentWeek} weeks remaining`;
    description = language === 'ar' 
      ? 'الدورة تنتهي قريباً، حافظ على نشاطك!'
      : 'Cycle ending soon, stay active!';
  } else if (activityLow) {
    warningType = 'activity_low';
    icon = TrendingDown;
    bgClass = 'bg-warning/10 border-warning/30';
    textClass = 'text-warning';
    title = language === 'ar' ? 'نشاطك منخفض' : 'Low activity';
    description = language === 'ar' 
      ? 'شارك بانتظام للحفاظ على نسبة نشاط جيدة'
      : 'Participate regularly to maintain good activity';
  }

  const Icon = icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className={`p-4 border ${bgClass}`}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full ${bgClass} flex items-center justify-center shrink-0`}>
            <Icon className={`h-5 w-5 ${textClass}`} />
          </div>
          <div className="flex-1">
            <p className={`font-bold ${textClass}`}>{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
