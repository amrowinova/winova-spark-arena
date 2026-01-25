import { motion } from 'framer-motion';
import { Calendar, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ProgressRing } from '@/components/common/ProgressRing';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface ActivityCardProps {
  directTeamActiveCount: number;
  directTeamTotalCount: number;
}

export function ActivityCard({ directTeamActiveCount, directTeamTotalCount }: ActivityCardProps) {
  const { user } = useUser();
  const { language } = useLanguage();

  const personalActivity = Math.round((user.activeWeeks / user.currentWeek) * 100);
  const teamActivity = directTeamTotalCount > 0 
    ? Math.round((directTeamActiveCount / directTeamTotalCount) * 100) 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className="p-4">
        <h3 className="font-semibold mb-4">
          {language === 'ar' ? 'النشاط' : 'Activity'}
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Personal Activity */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">
                {language === 'ar' ? 'نشاطي' : 'My Activity'}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <ProgressRing progress={personalActivity} size={50} strokeWidth={4}>
                <span className="text-xs font-bold">{personalActivity}%</span>
              </ProgressRing>
              
              <div className="flex-1">
                <p className="text-sm font-bold text-primary">
                  {user.activeWeeks}/{user.totalWeeks}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {language === 'ar' ? 'أسبوع' : 'weeks'}
                </p>
              </div>
            </div>
          </div>

          {/* Direct Team Activity */}
          <div className="bg-success/5 border border-success/20 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-success" />
              <span className="text-xs font-medium">
                {language === 'ar' ? 'الفريق المباشر' : 'Direct Team'}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <ProgressRing progress={teamActivity} size={50} strokeWidth={4}>
                <span className="text-xs font-bold">{teamActivity}%</span>
              </ProgressRing>
              
              <div className="flex-1">
                <p className="text-sm font-bold text-success">
                  {directTeamActiveCount}/{directTeamTotalCount}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {language === 'ar' ? 'نشط' : 'active'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Week indicator */}
        <div className="mt-3 p-2 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {language === 'ar' ? 'الدورة الحالية' : 'Current Cycle'}
            </span>
            <span className="font-medium">
              {language === 'ar' 
                ? `الأسبوع ${user.currentWeek} من 14`
                : `Week ${user.currentWeek} of 14`}
            </span>
          </div>
          <Progress value={(user.currentWeek / 14) * 100} className="h-1.5 mt-1" />
        </div>
      </Card>
    </motion.div>
  );
}
