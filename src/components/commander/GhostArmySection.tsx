import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGhostArmy } from '@/hooks/useGhostArmy';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Play, Trash2, Users, ShieldAlert, CheckCircle2,
  AlertTriangle, Loader2, TreePine, Search, MessageSquare, Skull, Target,
} from 'lucide-react';

export function GhostArmySection() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const {
    status, isProvisioning, isSimulating, isCleaning, isAnalyzing,
    checkStatus, provision, simulate, analyze, cleanup,
  } = useGhostArmy();

  const [lastResults, setLastResults] = useState<any[] | null>(null);
  const [activeTab, setActiveTab] = useState<'results' | 'analysis'>('results');
  const [expandedResult, setExpandedResult] = useState<number | null>(null);

  useEffect(() => { checkStatus(); }, []);

  const handleSimulate = async () => {
    const data = await simulate();
    if (data?.results) setLastResults(data.results);
  };

  const isAnyRunning = isProvisioning || isSimulating || isCleaning || isAnalyzing;

  const categoryIcons: Record<string, string> = {
    RLS_Security: '🔒', Data_Integrity: '📊', Financial_Safety: '💰',
    Referral_Integrity: '🌳', Chat_Stress: '💬', Fraud_Simulation: '🕵️',
    Performance: '⚡', Feature_Test: '🧪',
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TreePine className="h-5 w-5 text-primary" />
          {isAr ? 'عملية الغابة الرقمية' : 'Operation: Digital Forest'}
          {status.provisioned > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {status.provisioned} {isAr ? 'عميل' : 'agents'}
            </Badge>
          )}
          {status.referralLinks > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {status.referralLinks} {isAr ? 'رابط' : 'links'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => provision(200)} disabled={isAnyRunning || status.provisioned >= 200} className="gap-1.5">
            {isProvisioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
            {isAr ? 'نشر 200 عميل' : 'Deploy 200 Agents'}
          </Button>
          <Button size="sm" variant="secondary" onClick={handleSimulate} disabled={isAnyRunning || status.provisioned === 0} className="gap-1.5">
            {isSimulating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {isAr ? 'اختبار الضغط' : 'Stress Test'}
          </Button>
          <Button size="sm" variant="outline" onClick={analyze} disabled={isAnyRunning || status.provisioned === 0} className="gap-1.5">
            {isAnalyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            {isAr ? 'تحليل العميل المراقب' : 'Spy Agent Analysis'}
          </Button>
          <Button size="sm" variant="destructive" onClick={cleanup} disabled={isAnyRunning || status.provisioned === 0} className="gap-1.5">
            {isCleaning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            {isAr ? 'تنظيف' : 'Purge'}
          </Button>
        </div>

        {/* Tab Switcher */}
        {(status.lastSimulation || status.lastAnalysis) && (
          <div className="flex gap-1">
            <Button size="sm" variant={activeTab === 'results' ? 'default' : 'ghost'} onClick={() => setActiveTab('results')} className="h-7 text-xs">
              {isAr ? 'نتائج الاختبار' : 'Test Results'}
            </Button>
            <Button size="sm" variant={activeTab === 'analysis' ? 'default' : 'ghost'} onClick={() => setActiveTab('analysis')} className="h-7 text-xs">
              {isAr ? 'تقرير المراقب' : 'Spy Report'}
            </Button>
          </div>
        )}

        {/* Simulation Results */}
        {activeTab === 'results' && status.lastSimulation && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <MiniStat icon={<CheckCircle2 className="h-3.5 w-3.5 text-success" />} value={status.lastSimulation.passed} label={isAr ? 'نجح' : 'Passed'} />
              <MiniStat icon={<AlertTriangle className="h-3.5 w-3.5 text-warning" />} value={status.lastSimulation.failed} label={isAr ? 'فشل' : 'Failed'} highlight={status.lastSimulation.failed > 0} />
              <MiniStat icon={<ShieldAlert className="h-3.5 w-3.5 text-destructive" />} value={status.lastSimulation.critical_issues} label={isAr ? 'حرج' : 'Critical'} highlight={status.lastSimulation.critical_issues > 0} />
              <MiniStat icon={<MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />} value={`${status.lastSimulation.chat_delivered ?? (status.lastSimulation.avg_chat_latency_ms ? '—' : 0)}/${status.lastSimulation.chat_attempted ?? 20}`} label={isAr ? 'رسائل مُسلّمة' : 'Chat Delivered'} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MiniStat icon={<TreePine className="h-3.5 w-3.5 text-primary" />} value={status.lastSimulation.referral_links_tested} label={isAr ? 'روابط الإحالة' : 'Referral Links'} />
              <MiniStat icon={<Skull className="h-3.5 w-3.5 text-destructive" />} value={status.lastSimulation.fraud_tests_run} label={isAr ? 'اختبار احتيال' : 'Fraud Tests'} />
              <MiniStat icon={<Play className="h-3.5 w-3.5 text-muted-foreground" />} value={`${status.lastSimulation.duration_ms}ms`} label={isAr ? 'المدة' : 'Duration'} />
            </div>

            {/* Executive-grade results list */}
            {lastResults && lastResults.length > 0 && (
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {lastResults.map((r: any, i: number) => {
                  const isExpanded = expandedResult === i;
                  const hasExecFields = r.what_happened && r.why_it_matters && r.recommended_action;

                  return (
                    <div
                      key={i}
                      className={`rounded-md border transition-colors ${
                        r.status === 'fail' ? 'border-destructive/30 bg-destructive/5' :
                        r.status === 'warning' ? 'border-warning/30 bg-warning/5' : 'border-border bg-card'
                      }`}
                    >
                      <div
                        className="flex items-start gap-2 text-xs px-2.5 py-1.5 cursor-pointer"
                        onClick={() => setExpandedResult(isExpanded ? null : i)}
                      >
                        <span className="mt-0.5 shrink-0">{categoryIcons[r.category] || '📋'}</span>
                        <div className="min-w-0 flex-1">
                          <span className="font-medium">{r.test}</span>
                          {r.latency_ms != null && <span className="text-muted-foreground ml-1">({r.latency_ms}ms)</span>}
                        </div>
                        <Badge variant="outline" className={`text-[9px] shrink-0 ${
                          r.severity === 'critical' ? 'border-destructive/50 text-destructive' :
                          r.severity === 'high' ? 'border-warning/50 text-warning' : ''
                        }`}>
                          {r.status === 'pass' ? '✓' : r.status === 'fail' ? '✗' : '⚠'} {r.severity}
                        </Badge>
                      </div>

                      {/* Executive Detail — Problem → Impact → Action */}
                      {isExpanded && hasExecFields && (
                        <div className="px-2.5 pb-2.5 space-y-1.5 border-t border-border/50 mt-1 pt-2">
                          <div className="text-[11px]">
                            <span className="font-semibold text-foreground">{isAr ? 'ما حدث: ' : 'What happened: '}</span>
                            <span className="text-muted-foreground">{r.what_happened}</span>
                          </div>
                          <div className="text-[11px]">
                            <span className="font-semibold text-foreground">{isAr ? 'الأثر: ' : 'Impact: '}</span>
                            <span className="text-muted-foreground">{r.why_it_matters}</span>
                          </div>
                          <div className="text-[11px] flex items-start gap-1">
                            <Target className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-primary">{isAr ? 'الإجراء: ' : 'Action: '}</span>
                              <span>{r.recommended_action}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Fallback for old results without exec fields */}
                      {isExpanded && !hasExecFields && (
                        <div className="px-2.5 pb-2 text-[11px] text-muted-foreground">
                          {r.detail}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Spy Agent Analysis */}
        {activeTab === 'analysis' && status.lastAnalysis && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={
                status.lastAnalysis.overall_health === 'HEALTHY' ? 'default' :
                status.lastAnalysis.overall_health === 'NEEDS_ATTENTION' ? 'secondary' : 'destructive'
              } className="text-xs">
                {status.lastAnalysis.overall_health}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Depth: {status.lastAnalysis.hierarchy_depth} levels
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <MiniStat icon={<span className="text-xs">И</span>} value={status.lastAnalysis.financial_overview.total_nova} label="Total Nova" />
              <MiniStat icon={<span className="text-xs">✦</span>} value={status.lastAnalysis.financial_overview.total_aura} label="Total Aura" />
              <MiniStat icon={<span className="text-xs">Ø</span>} value={status.lastAnalysis.financial_overview.avg_balance} label="Avg Balance" />
            </div>

            {status.lastAnalysis.critical_findings.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-destructive">{isAr ? 'مشاكل حرجة:' : 'Critical Findings:'}</p>
                {status.lastAnalysis.critical_findings.map((f: string, i: number) => (
                  <p key={i} className="text-xs text-muted-foreground pl-2 border-l-2 border-destructive/30">{f}</p>
                ))}
              </div>
            )}

            {status.lastAnalysis.recommendations.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-primary">{isAr ? 'التوصيات:' : 'Recommendations:'}</p>
                {status.lastAnalysis.recommendations.map((r: string, i: number) => (
                  <p key={i} className="text-xs text-muted-foreground pl-2 border-l-2 border-primary/30">→ {r}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {status.provisioned === 0 && !status.lastSimulation && (
          <p className="text-xs text-muted-foreground">
            {isAr
              ? 'لم يتم نشر أي عميل. انقر "نشر 200 عميل" لبدء عملية الغابة الرقمية.'
              : 'No agents deployed. Click "Deploy 200 Agents" to begin Operation: Digital Forest.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MiniStat({ icon, value, label, highlight }: {
  icon: React.ReactNode; value: string | number; label: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-2.5 ${highlight ? 'border-destructive/30 bg-destructive/5' : 'bg-card'}`}>
      <div className="flex items-center gap-1 mb-0.5">{icon}</div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
