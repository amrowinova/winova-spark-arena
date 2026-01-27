import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Calendar, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';

interface CycleProgressCardProps {
  currentDay: number;
  totalDays: number;
  currentWeek: number;
  totalWeeks: number;
}

export function CycleProgressCard({
  currentDay,
  totalDays,
  currentWeek,
  totalWeeks,
}: CycleProgressCardProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const dayProgress = (currentDay / totalDays) * 100;
  const weekProgress = (currentWeek / totalWeeks) * 100;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Day Counter */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{isRTL ? 'اليوم في الدورة' : 'Day in Cycle'}</span>
            </div>
            <span className="font-bold text-foreground">
              {currentDay} / {totalDays}
            </span>
          </div>
          <Progress value={dayProgress} className="h-2" />
        </div>

        {/* Week Counter */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{isRTL ? 'الأسبوع الحالي' : 'Current Week'}</span>
            </div>
            <span className="font-bold text-foreground">
              {currentWeek} / {totalWeeks}
            </span>
          </div>
          <Progress value={weekProgress} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
