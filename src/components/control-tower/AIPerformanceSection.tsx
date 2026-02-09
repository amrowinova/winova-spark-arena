import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAIPerformance } from '@/hooks/useControlTower';
import { useLanguage } from '@/contexts/LanguageContext';

export function AIPerformanceSection() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { data, isLoading } = useAIPerformance();

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-primary" />
            {isAr ? 'أداء الذكاء' : 'AI Performance'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
        </CardContent>
      </Card>
    );
  }

  const trend = data.thisWeekCount - data.lastWeekCount;
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-primary" />
          {isAr ? 'أداء الذكاء' : 'AI Performance'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Approval Rate */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">{isAr ? 'معدل الموافقة' : 'Approval Rate'}</span>
            <span className="text-lg font-bold">{data.approvalRate}%</span>
          </div>
          <Progress value={data.approvalRate} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-success/10">
            <p className="text-lg font-bold text-success">{data.approved}</p>
            <p className="text-[10px] text-muted-foreground">{isAr ? 'مقبول' : 'Approved'}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-destructive/10">
            <p className="text-lg font-bold text-destructive">{data.rejected}</p>
            <p className="text-[10px] text-muted-foreground">{isAr ? 'مرفوض' : 'Rejected'}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-warning/10">
            <p className="text-lg font-bold text-warning">{data.pending}</p>
            <p className="text-[10px] text-muted-foreground">{isAr ? 'معلق' : 'Pending'}</p>
          </div>
        </div>

        {/* Trend */}
        <div className="flex items-center justify-between p-2 rounded-lg border bg-card/50">
          <span className="text-xs text-muted-foreground">{isAr ? 'مقارنة بالأسبوع الماضي' : 'vs Last Week'}</span>
          <div className="flex items-center gap-1">
            <TrendIcon className={`h-4 w-4 ${trend > 0 ? 'text-success' : trend < 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            <span className="text-sm font-medium">
              {data.thisWeekCount} vs {data.lastWeekCount}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
