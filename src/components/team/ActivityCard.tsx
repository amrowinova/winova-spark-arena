import { motion } from 'framer-motion';
import { Calendar, Users, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ProgressRing } from '@/components/common/ProgressRing';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeamStats } from '@/hooks/useTeamStats';

export function ActivityCard() {
  const { language } = useLanguage();
  const {
    userActiveWeeks,
    currentWeek,
    totalWeeks,
    activeDirectCount,
    directCount,
    loading
  } = useTeamStats();

  // Calculate activity percentages from real data
  const personalActivity = currentWeek > 0 
    ? Math.round((userActiveWeeks / currentWeek) * 100) 
    : 0;
  const teamActivity = directCount > 0 
    ? Math.round((activeDirectCount / directCount) * 100) 
    : 0;

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

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
                  {userActiveWeeks}/{totalWeeks}
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
                  {activeDirectCount}/{directCount}
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
                ? `الأسبوع ${currentWeek} من ${totalWeeks}`
                : `Week ${currentWeek} of ${totalWeeks}`}
            </span>
          </div>
          <Progress value={(currentWeek / totalWeeks) * 100} className="h-1.5 mt-1" />
        </div>
      </Card>
    </motion.div>
  );
}
