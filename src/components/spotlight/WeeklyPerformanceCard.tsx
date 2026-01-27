import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

interface WeekData {
  week: number;
  points: number;
}

interface WeeklyPerformanceCardProps {
  currentWeek: number;
  weeklyData: WeekData[];
}

export function WeeklyPerformanceCard({
  currentWeek,
  weeklyData,
}: WeeklyPerformanceCardProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const maxPoints = Math.max(...weeklyData.map(w => w.points), 1);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-foreground">
            {isRTL ? 'أداءك خلال أسابيع الدورة' : 'Your Performance Across Cycle Weeks'}
          </h3>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weeklyData.map((data) => {
            const isCurrentWeek = data.week === currentWeek;
            const isFutureWeek = data.week > currentWeek;
            const heightPercent = isFutureWeek ? 0 : (data.points / maxPoints) * 100;
            
            return (
              <div key={data.week} className="flex flex-col items-center gap-1">
                {/* Bar */}
                <div className="w-full h-16 bg-muted rounded-t-sm flex flex-col justify-end overflow-hidden">
                  <div
                    className={`w-full transition-all duration-300 rounded-t-sm ${
                      isCurrentWeek 
                        ? 'bg-primary' 
                        : isFutureWeek 
                          ? 'bg-muted' 
                          : 'bg-primary/60'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                
                {/* Week number */}
                <span className={`text-[10px] font-medium ${
                  isCurrentWeek 
                    ? 'text-primary' 
                    : isFutureWeek 
                      ? 'text-muted-foreground/50' 
                      : 'text-muted-foreground'
                }`}>
                  {data.week}
                </span>
                
                {/* Points (only show for past/current weeks) */}
                {!isFutureWeek && (
                  <span className={`text-[9px] ${
                    isCurrentWeek ? 'text-primary font-bold' : 'text-muted-foreground'
                  }`}>
                    {data.points}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Second row for weeks 8-14 */}
        <div className="grid grid-cols-7 gap-2">
          {weeklyData.slice(7).map((data) => {
            const isCurrentWeek = data.week === currentWeek;
            const isFutureWeek = data.week > currentWeek;
            const heightPercent = isFutureWeek ? 0 : (data.points / maxPoints) * 100;
            
            return (
              <div key={data.week} className="flex flex-col items-center gap-1">
                {/* Bar */}
                <div className="w-full h-16 bg-muted rounded-t-sm flex flex-col justify-end overflow-hidden">
                  <div
                    className={`w-full transition-all duration-300 rounded-t-sm ${
                      isCurrentWeek 
                        ? 'bg-primary' 
                        : isFutureWeek 
                          ? 'bg-muted' 
                          : 'bg-primary/60'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                
                {/* Week number */}
                <span className={`text-[10px] font-medium ${
                  isCurrentWeek 
                    ? 'text-primary' 
                    : isFutureWeek 
                      ? 'text-muted-foreground/50' 
                      : 'text-muted-foreground'
                }`}>
                  {data.week}
                </span>
                
                {/* Points (only show for past/current weeks) */}
                {!isFutureWeek && (
                  <span className={`text-[9px] ${
                    isCurrentWeek ? 'text-primary font-bold' : 'text-muted-foreground'
                  }`}>
                    {data.points}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {isRTL 
            ? `الأسبوع الحالي: ${currentWeek} من 14`
            : `Current week: ${currentWeek} of 14`
          }
        </p>
      </CardContent>
    </Card>
  );
}
