import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCommanderBriefing } from '@/hooks/useCommander';
import { useLanguage } from '@/contexts/LanguageContext';
import { Shield, AlertTriangle, CheckCircle2, Clock, ChevronUp, TrendingUp, Activity } from 'lucide-react';
import { useAuthorityTier } from '@/hooks/useAuthorityTier';

export function CommanderBriefing() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { data, isLoading } = useCommanderBriefing();
  const { currentLevel, currentDef } = useAuthorityTier();

  if (isLoading || !data) {
    return (
      <Card className="border-primary/20">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
        </CardContent>
      </Card>
    );
  }

  if (data.isStable) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-success" />
            <div>
              <p className="font-semibold text-sm">
                {isAr ? 'جميع الأنظمة مستقرة. لا شيء يتطلب قرارك.' : 'All systems stable. No action required.'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr
                  ? `${data.autoHandled24h} عملية تمت تلقائياً خلال ٢٤ ساعة`
                  : `${data.autoHandled24h} operations auto-handled in 24h`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Intelligence maturity assessment
  const maturityLabel = data.totalPredictions < 10
    ? (isAr ? 'مرحلة التعلم' : 'Learning Phase')
    : data.predictionAccuracy >= 80
      ? (isAr ? 'ذكاء ناضج' : 'Mature Intelligence')
      : (isAr ? 'مرحلة المعايرة' : 'Calibration Phase');

  const maturityColor = data.totalPredictions < 10
    ? 'text-warning'
    : data.predictionAccuracy >= 80 ? 'text-success' : 'text-primary';

  return (
    <Card className="border-primary/20">
      <CardContent className="p-5 space-y-4">
        {/* Status Line */}
        <div className="flex items-center gap-2 flex-wrap">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">
            {isAr ? 'ملخص القائد' : 'Commander Briefing'}
          </span>
          <Badge variant="outline" className="text-[10px] gap-1">
            <ChevronUp className="h-2.5 w-2.5" />
            L{currentLevel} {isAr ? currentDef.nameAr : currentDef.name}
          </Badge>
          <Badge variant="outline" className={`text-[10px] ${maturityColor}`}>
            <Activity className="h-2.5 w-2.5 me-0.5" />
            {maturityLabel}
          </Badge>
          {data.criticalItems > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {data.criticalItems} {isAr ? 'حرج' : 'CRITICAL'}
            </Badge>
          )}
        </div>

        {/* Executive Summary — one clear sentence */}
        <div className="rounded-lg border bg-primary/5 p-3">
          <p className="text-xs leading-relaxed">
            {data.criticalItems > 0
              ? (isAr
                ? `${data.criticalItems} عنصر حرج يتطلب قرارك الفوري. ${data.pendingDecisions - data.criticalItems} عنصر آخر معلق. ${data.autoHandled24h} عملية تمت تلقائياً.`
                : `${data.criticalItems} critical item(s) require your immediate decision. ${data.pendingDecisions - data.criticalItems} other item(s) pending. ${data.autoHandled24h} operations auto-handled.`)
              : data.pendingDecisions > 0
                ? (isAr
                  ? `${data.pendingDecisions} قرار بانتظارك — لا يوجد شيء حرج. ${data.autoHandled24h} عملية تلقائية خلال ٢٤ ساعة.`
                  : `${data.pendingDecisions} decision(s) awaiting you — nothing critical. ${data.autoHandled24h} auto-handled in 24h.`)
                : (isAr
                  ? `لا توجد قرارات معلقة. ${data.autoHandled24h} عملية تمت تلقائياً.`
                  : `No pending decisions. ${data.autoHandled24h} operations auto-handled.`)}
          </p>
        </div>

        {/* Key Numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBlock
            icon={<AlertTriangle className="h-4 w-4 text-warning" />}
            value={data.pendingDecisions}
            label={isAr ? 'بانتظار قرارك' : 'Awaiting Decision'}
            highlight={data.pendingDecisions > 0}
          />
          <StatBlock
            icon={<CheckCircle2 className="h-4 w-4 text-success" />}
            value={data.autoHandled24h}
            label={isAr ? 'تمت تلقائياً' : 'Auto-handled'}
          />
          <StatBlock
            icon={<TrendingUp className="h-4 w-4 text-primary" />}
            value={`${data.predictionAccuracy}%`}
            label={isAr ? 'دقة التوقع' : 'Prediction Accuracy'}
            sublabel={data.totalPredictions < 10
              ? (isAr ? `${data.totalPredictions}/50 قرار مسجل` : `${data.totalPredictions}/50 decisions logged`)
              : undefined}
          />
          <StatBlock
            icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            value={`${data.reversalRate}%`}
            label={isAr ? 'نسبة التراجع' : 'Reversal Rate'}
            warn={data.reversalRate > 5}
          />
        </div>

        {/* Critical Warning */}
        {data.criticalItems > 0 && (
          <p className="text-xs text-destructive font-medium">
            {isAr
              ? `⚠️ ${data.criticalItems} عنصر يتطلب قرار فوري — تأخير القرار يعرّض العمليات للمخاطر`
              : `⚠️ ${data.criticalItems} item(s) require immediate decision — delay increases operational risk`}
          </p>
        )}

        {/* Intelligence calibration notice */}
        {data.totalPredictions < 50 && data.totalPredictions > 0 && (
          <p className="text-[10px] text-muted-foreground border-t pt-2">
            {isAr
              ? `النظام في مرحلة المعايرة: ${data.totalPredictions} من 50 قرار مطلوب لتفعيل التوقعات الذكية.`
              : `System in calibration: ${data.totalPredictions} of 50 decisions needed to activate intelligent predictions.`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function StatBlock({ icon, value, label, sublabel, highlight, warn }: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  sublabel?: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-warning/40 bg-warning/5' : warn ? 'border-destructive/30 bg-destructive/5' : 'bg-card'}`}>
      <div className="flex items-center gap-1.5 mb-1">{icon}</div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      {sublabel && <p className="text-[9px] text-muted-foreground/70 mt-0.5">{sublabel}</p>}
    </div>
  );
}
