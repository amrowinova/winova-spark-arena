import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGhostArmy } from '@/hooks/useGhostArmy';
import { useLanguage } from '@/contexts/LanguageContext';
import { Ghost, Play, Trash2, Users, ShieldAlert, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export function GhostArmySection() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const {
    status,
    isProvisioning,
    isSimulating,
    isCleaning,
    checkStatus,
    provision,
    simulate,
    cleanup,
  } = useGhostArmy();

  const [lastResults, setLastResults] = useState<any[] | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const handleSimulate = async () => {
    const data = await simulate();
    if (data?.results) setLastResults(data.results);
  };

  const isAnyRunning = isProvisioning || isSimulating || isCleaning;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Ghost className="h-5 w-5 text-primary" />
          {isAr ? 'بروتوكول جيش الأشباح' : 'Ghost Army Protocol'}
          {status.provisioned > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {status.provisioned} {isAr ? 'عميل' : 'agents'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => provision(100)}
            disabled={isAnyRunning || status.provisioned >= 100}
            className="gap-1.5"
          >
            {isProvisioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
            {isAr ? 'نشر 100 عميل' : 'Deploy 100 Agents'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleSimulate}
            disabled={isAnyRunning || status.provisioned === 0}
            className="gap-1.5"
          >
            {isSimulating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {isAr ? 'تشغيل اختبار الضغط' : 'Run Stress Test'}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={cleanup}
            disabled={isAnyRunning || status.provisioned === 0}
            className="gap-1.5"
          >
            {isCleaning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            {isAr ? 'تنظيف البيانات' : 'Purge All Data'}
          </Button>
        </div>

        {/* Simulation Results */}
        {status.lastSimulation && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <MiniStat
                icon={<CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                value={status.lastSimulation.passed}
                label={isAr ? 'نجح' : 'Passed'}
              />
              <MiniStat
                icon={<AlertTriangle className="h-3.5 w-3.5 text-warning" />}
                value={status.lastSimulation.failed}
                label={isAr ? 'فشل' : 'Failed'}
                highlight={status.lastSimulation.failed > 0}
              />
              <MiniStat
                icon={<ShieldAlert className="h-3.5 w-3.5 text-destructive" />}
                value={status.lastSimulation.critical_issues}
                label={isAr ? 'حرج' : 'Critical'}
                highlight={status.lastSimulation.critical_issues > 0}
              />
              <MiniStat
                icon={<Play className="h-3.5 w-3.5 text-muted-foreground" />}
                value={`${status.lastSimulation.duration_ms}ms`}
                label={isAr ? 'المدة' : 'Duration'}
              />
            </div>

            {/* Detailed Results */}
            {lastResults && lastResults.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {lastResults.map((r: any, i: number) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 text-xs rounded-md px-2.5 py-1.5 border ${
                      r.status === 'fail'
                        ? 'border-destructive/30 bg-destructive/5'
                        : r.status === 'warning'
                        ? 'border-warning/30 bg-warning/5'
                        : 'border-border bg-card'
                    }`}
                  >
                    <span className="mt-0.5">
                      {r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⚠️'}
                    </span>
                    <div className="min-w-0">
                      <span className="font-medium">{r.test}</span>
                      <span className="text-muted-foreground ml-1.5">[{r.category}]</span>
                      <p className="text-muted-foreground mt-0.5 break-words">{r.detail}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[9px] shrink-0 ${
                        r.severity === 'critical' ? 'border-destructive/50 text-destructive' :
                        r.severity === 'high' ? 'border-warning/50 text-warning' : ''
                      }`}
                    >
                      {r.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {status.provisioned === 0 && !status.lastSimulation && (
          <p className="text-xs text-muted-foreground">
            {isAr
              ? 'لم يتم نشر أي عميل بعد. انقر "نشر 100 عميل" لبدء اختبار الضغط السيادي.'
              : 'No agents deployed. Click "Deploy 100 Agents" to begin the Sovereign Stress Test.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MiniStat({ icon, value, label, highlight }: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-2.5 ${highlight ? 'border-destructive/30 bg-destructive/5' : 'bg-card'}`}>
      <div className="flex items-center gap-1 mb-0.5">{icon}</div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
