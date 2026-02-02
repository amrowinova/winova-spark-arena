import { Calendar, Sparkles, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';

interface CycleProgressCardProps {
  currentDay: number;
  totalDays: number;
  cyclePoints: number;
  daysRemaining?: number;
  progressPercentage?: number;
}

export function CycleProgressCard({
  currentDay,
  totalDays,
  cyclePoints,
  daysRemaining,
  progressPercentage,
}: CycleProgressCardProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  // Use provided percentage or calculate from days
  const dayProgress = progressPercentage ?? (currentDay / totalDays) * 100;
  const remaining = daysRemaining ?? (totalDays - currentDay);

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
          
          {/* Days remaining */}
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span>{isRTL ? 'التقدم' : 'Progress'}: {dayProgress.toFixed(1)}%</span>
            </div>
            <span>
              {isRTL 
                ? `${remaining} يوم متبقي`
                : `${remaining} days remaining`
              }
            </span>
          </div>
        </div>

        {/* Cumulative Cycle Points */}
        <div className="bg-primary/10 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm text-foreground">
              {isRTL ? 'مجموع نقاطك حتى اليوم' : 'Your total points so far'}
            </span>
          </div>
          <span className="font-bold text-primary text-lg">
            {cyclePoints.toLocaleString()} {isRTL ? 'نقطة' : 'pts'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
