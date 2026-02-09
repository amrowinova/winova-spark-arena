import { Radar, AlertTriangle, Bug } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTopFailures, useLiveMind } from '@/hooks/useControlTower';
import { useLanguage } from '@/contexts/LanguageContext';

export function RiskRadarSection() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { data: failures = [], isLoading: failuresLoading } = useTopFailures();
  const { data: mind, isLoading: mindLoading } = useLiveMind();

  const isLoading = failuresLoading || mindLoading;
  const criticalFindings = mind?.criticalFindings || [];
  const topFailures = failures.slice(0, 5);
  const hasRisks = topFailures.length > 0 || criticalFindings.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Radar className="h-5 w-5 text-destructive" />
          {isAr ? 'رادار المخاطر' : 'Risk Radar'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
        ) : !hasRisks ? (
          <div className="text-center py-6">
            <Radar className="h-8 w-8 mx-auto mb-2 text-success/30" />
            <p className="text-sm text-muted-foreground">{isAr ? 'لا مخاطر مكتشفة' : 'No risks detected'}</p>
          </div>
        ) : (
          <>
            {/* Top Failures */}
            {topFailures.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                  <Bug className="h-3 w-3" />
                  {isAr ? 'أكثر الأخطاء تكراراً' : 'Most Repeated Failures'}
                </h4>
                <div className="space-y-1.5">
                  {topFailures.map((f) => (
                    <div key={f.rpc} className="flex items-center justify-between p-2 rounded-lg border bg-destructive/5">
                      <div className="flex-1 min-w-0">
                        <code className="text-xs font-mono truncate block">{f.rpc}</code>
                        {f.lastError && (
                          <p className="text-[10px] text-muted-foreground truncate">{f.lastError}</p>
                        )}
                      </div>
                      <Badge variant="destructive" className="text-xs shrink-0 ms-2">
                        ×{f.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Critical Findings as Risks */}
            {criticalFindings.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                  <AlertTriangle className="h-3 w-3" />
                  {isAr ? 'تهديدات محتملة' : 'Potential Threats'}
                </h4>
                <div className="space-y-1.5">
                  {criticalFindings.slice(0, 4).map((f: any) => (
                    <div key={f.id} className="p-2 rounded-lg border bg-warning/5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{f.severity}</Badge>
                        <span className="text-xs font-medium truncate">
                          {isAr ? (f.title_ar || f.title) : f.title}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
