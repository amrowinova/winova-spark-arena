import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useIntelligenceMetrics } from '@/hooks/useIntelligenceMetrics';
import { useLanguage } from '@/contexts/LanguageContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Brain, TrendingUp, TrendingDown } from 'lucide-react';

export function LearningLoopChart() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { data, isLoading } = useIntelligenceMetrics();

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
        </CardContent>
      </Card>
    );
  }

  const { latest, trend, weeklyImprovement, isLearning, maturityLevel } = data;

  const chartData = trend.map((t: any) => ({
    date: new Date(t.metric_date).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' }),
    accuracy: t.prediction_accuracy || 0,
    reversal: t.reversal_rate || 0,
    autoSuccess: t.auto_approval_success_rate || 0,
  }));

  const isImproving = weeklyImprovement > 0;
  const statusText = isImproving
    ? (isAr ? 'النظام يتعلم ويتحسن' : 'System is learning and improving')
    : weeklyImprovement === 0
    ? (isAr ? 'بيانات غير كافية' : 'Insufficient data')
    : (isAr ? '⚠️ الدقة تراجعت — يتطلب مراجعة' : '⚠️ Accuracy declined — requires review');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            {isAr ? 'هل النظام يتعلم؟' : 'Is the System Learning?'}
          </CardTitle>
          <Badge variant={isLearning ? 'default' : 'secondary'} className="text-[10px]">
            {isAr ? maturityLevel.levelAr : maturityLevel.level}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status banner */}
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${isImproving ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
          {isImproving ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {statusText}
          {weeklyImprovement !== 0 && (
            <span className="ms-auto font-bold">{weeklyImprovement > 0 ? '+' : ''}{weeklyImprovement}%</span>
          )}
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-4 gap-2">
          <MetricBox label={isAr ? 'دقة التوقع' : 'Prediction'} value={`${latest?.prediction_accuracy || 0}%`} />
          <MetricBox label={isAr ? 'التراجعات' : 'Reversals'} value={`${latest?.reversal_rate || 0}%`} invert />
          <MetricBox label={isAr ? 'نجاح تلقائي' : 'Auto Success'} value={`${latest?.auto_approval_success_rate || 0}%`} />
          <MetricBox label={isAr ? 'معايرة' : 'Calibration'} value={`${latest?.confidence_vs_correctness || 0}%`} />
        </div>

        {/* Maturity bar */}
        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>{isAr ? 'نضج النموذج' : 'Model Maturity'}</span>
            <span>{latest?.total_predictions || 0} / 1000</span>
          </div>
          <Progress value={maturityLevel.progress} className="h-1.5" />
        </div>

        {/* Chart */}
        {chartData.length > 2 && (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} className="text-muted-foreground" />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="accuracy" name={isAr ? 'دقة' : 'Accuracy'} stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="reversal" name={isAr ? 'تراجع' : 'Reversals'} stroke="hsl(var(--destructive))" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="autoSuccess" name={isAr ? 'نجاح' : 'Auto Success'} stroke="hsl(var(--success))" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricBox({ label, value, invert }: { label: string; value: string; invert?: boolean }) {
  const num = parseInt(value);
  const isGood = invert ? num < 10 : num > 70;
  return (
    <div className="text-center rounded-lg border p-2">
      <p className={`text-lg font-bold ${isGood ? 'text-success' : num > 50 && !invert ? 'text-foreground' : 'text-warning'}`}>{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}
