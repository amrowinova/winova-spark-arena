import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCommanderBriefing } from '@/hooks/useCommander';
import { useLanguage } from '@/contexts/LanguageContext';
import { Shield, AlertTriangle, CheckCircle2, Clock, ChevronUp } from 'lucide-react';
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
                {isAr ? 'جميع الأنظمة مستقرة. لا شيء يتطلب قرارك.' : 'All systems are stable. Nothing requires your decision.'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr
                  ? `${data.autoHandled24h} عملية تمت تلقائياً خلال ٢٤ ساعة`
                  : `${data.autoHandled24h} actions auto-handled in the last 24h`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

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
          {data.criticalItems > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {data.criticalItems} {isAr ? 'حرج' : 'CRITICAL'}
            </Badge>
          )}
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
            icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            value={`${data.predictionAccuracy}%`}
            label={isAr ? 'دقة التوقع' : 'Prediction Accuracy'}
          />
          <StatBlock
            icon={<Shield className="h-4 w-4 text-primary" />}
            value={`${data.confidence}%`}
            label={isAr ? 'الثقة' : 'Confidence'}
          />
        </div>

        {/* One-line summary */}
        {data.criticalItems > 0 && (
          <p className="text-xs text-destructive font-medium">
            {isAr
              ? `⚠️ ${data.criticalItems} عنصر يتطلب قرار فوري — تأخير القرار قد يؤثر على العمليات`
              : `⚠️ ${data.criticalItems} item(s) require immediate decision — delay may impact operations`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function StatBlock({ icon, value, label, highlight }: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-warning/40 bg-warning/5' : 'bg-card'}`}>
      <div className="flex items-center gap-1.5 mb-1">{icon}</div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
