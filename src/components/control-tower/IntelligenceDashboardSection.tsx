import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIntelligenceMetrics } from '@/hooks/useIntelligenceMetrics';
import { Brain, Target, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';

export function IntelligenceDashboardSection() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { data, isLoading } = useIntelligenceMetrics();

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Brain className="h-4 w-4" />
            {isAr ? 'مقاييس الذكاء' : 'Intelligence Metrics'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
        </CardContent>
      </Card>
    );
  }

  const { latest, weeklyImprovement, isLearning, maturityLevel } = data;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Brain className="h-4 w-4 text-primary" />
            {isAr ? 'مقاييس الذكاء' : 'Intelligence Metrics'}
          </CardTitle>
          <Badge variant={isLearning ? 'default' : 'secondary'} className="text-[10px]">
            {isAr ? maturityLevel.levelAr : maturityLevel.level}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Maturity Progress */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{isAr ? 'نضج النموذج' : 'Model Maturity'}</span>
            <span>{maturityLevel.progress}%</span>
          </div>
          <Progress value={maturityLevel.progress} className="h-2" />
          <p className="text-[10px] text-muted-foreground mt-1">
            {isAr
              ? `${latest?.total_predictions || 0} توقع — الهدف: ١٠٠٠ للوصول لمستوى النخبة`
              : `${latest?.total_predictions || 0} predictions — 1,000 needed for elite level`}
          </p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-3">
          <KPICard
            icon={<Target className="h-3.5 w-3.5 text-primary" />}
            label={isAr ? 'دقة التوقعات' : 'Prediction Accuracy'}
            value={`${latest?.prediction_accuracy || 0}%`}
            trend={weeklyImprovement}
            isAr={isAr}
          />
          <KPICard
            icon={<Zap className="h-3.5 w-3.5 text-primary" />}
            label={isAr ? 'نجاح الموافقة التلقائية' : 'Auto-Approval Success'}
            value={`${latest?.auto_approval_success_rate || 0}%`}
            isAr={isAr}
          />
          <KPICard
            icon={<AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
            label={isAr ? 'معدل التراجع' : 'Reversal Rate'}
            value={`${latest?.reversal_rate || 0}%`}
            invertTrend
            isAr={isAr}
          />
          <KPICard
            icon={<CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
            label={isAr ? 'الثقة مقابل الصحة' : 'Confidence Calibration'}
            value={`${latest?.confidence_vs_correctness || 0}%`}
            isAr={isAr}
          />
        </div>

        {/* Top Mistakes */}
        {latest?.top_mistakes && (latest.top_mistakes as any[]).length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1">{isAr ? 'أخطاء متكررة' : 'Top Mistakes'}</p>
            <div className="space-y-1">
              {(latest.top_mistakes as any[]).slice(0, 3).map((m: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-[11px] bg-destructive/10 rounded px-2 py-1">
                  <span className="text-destructive">{m.pattern}</span>
                  <span className="text-muted-foreground">{Math.round((m.confidence || 0) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Misunderstood Areas */}
        {latest?.misunderstood_areas && (latest.misunderstood_areas as any[]).length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1">{isAr ? 'مناطق غير مفهومة' : 'Misunderstood Areas'}</p>
            <div className="space-y-1">
              {(latest.misunderstood_areas as any[]).slice(0, 3).map((a: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-[11px] bg-muted rounded px-2 py-1">
                  <span>{a.area}</span>
                  <Badge variant="outline" className="text-[9px]">{Math.round((a.confidence || 0) * 100)}%</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weekly Trend */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-3">
          {isLearning ? (
            <>
              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              <span>{isAr ? `تحسن أسبوعي: +${weeklyImprovement}%` : `Weekly improvement: +${weeklyImprovement}%`}</span>
            </>
          ) : (
            <>
              <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{isAr ? 'بيانات غير كافية بعد' : 'Insufficient data yet'}</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function KPICard({ icon, label, value, trend, invertTrend, isAr }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: number;
  invertTrend?: boolean;
  isAr: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-bold">{value}</span>
        {trend !== undefined && trend !== 0 && (
          <span className={`text-[10px] ${(invertTrend ? trend < 0 : trend > 0) ? 'text-green-500' : 'text-destructive'}`}>
            {trend > 0 ? `+${trend}%` : `${trend}%`}
          </span>
        )}
      </div>
    </div>
  );
}
