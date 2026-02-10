import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGhostArmy, SimulationScenario } from '@/hooks/useGhostArmy';
import { useLanguage } from '@/contexts/LanguageContext';
import { BehavioralMetricsGrid } from './ghost-army/BehavioralMetricsGrid';
import { SimulationResultsList } from './ghost-army/SimulationResultsList';
import {
  Play, Trash2, Users, Loader2, TreePine, Search,
  MessageSquare, Wallet, Network, Trophy, Shield, Heart, ShoppingCart,
} from 'lucide-react';

const SCENARIOS: { id: SimulationScenario; icon: React.ReactNode; label: string; labelAr: string }[] = [
  { id: 'full', icon: <Play className="h-3 w-3" />, label: 'Full', labelAr: 'كامل' },
  { id: 'social', icon: <Heart className="h-3 w-3" />, label: 'Social', labelAr: 'اجتماعي' },
  { id: 'p2p', icon: <ShoppingCart className="h-3 w-3" />, label: 'P2P Trade', labelAr: 'تداول' },
  { id: 'wallet', icon: <Wallet className="h-3 w-3" />, label: 'Wallet', labelAr: 'المحفظة' },
  { id: 'chat', icon: <MessageSquare className="h-3 w-3" />, label: 'Chat', labelAr: 'الدردشة' },
  { id: 'referral', icon: <Network className="h-3 w-3" />, label: 'Referral', labelAr: 'الإحالة' },
  { id: 'contest', icon: <Trophy className="h-3 w-3" />, label: 'Contest', labelAr: 'المسابقة' },
  { id: 'fraud', icon: <Shield className="h-3 w-3" />, label: 'Fraud', labelAr: 'الاحتيال' },
];

export function GhostArmySection() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const {
    status, isProvisioning, isSimulating, isCleaning, isAnalyzing,
    checkStatus, provision, simulate, analyze, cleanup,
  } = useGhostArmy();

  const [lastResults, setLastResults] = useState<any[] | null>(null);
  const [activeTab, setActiveTab] = useState<'behavioral' | 'results' | 'analysis'>('behavioral');
  const [selectedScenario, setSelectedScenario] = useState<SimulationScenario>('full');
  const [safeMode, setSafeMode] = useState(true);
  const [liveMode, setLiveMode] = useState(false);

  useEffect(() => { checkStatus(); }, []);

  const handleSimulate = async () => {
    const data = await simulate(selectedScenario, safeMode, liveMode);
    if (data?.results) setLastResults(data.results);
  };

  const isAnyRunning = isProvisioning || isSimulating || isCleaning || isAnalyzing;

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
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => provision(200)} disabled={isAnyRunning || status.provisioned >= 200} className="gap-1.5">
            {isProvisioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
            {isAr ? 'نشر 200 عميل' : 'Deploy 200 Agents'}
          </Button>
          <Button size="sm" variant="outline" onClick={analyze} disabled={isAnyRunning || status.provisioned === 0} className="gap-1.5">
            {isAnalyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            {isAr ? 'تحليل المراقب' : 'Spy Analysis'}
          </Button>
          <Button size="sm" variant="destructive" onClick={cleanup} disabled={isAnyRunning || status.provisioned === 0} className="gap-1.5">
            {isCleaning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            {isAr ? 'تنظيف' : 'Purge'}
          </Button>
        </div>

        {/* Scenario Missions */}
        {status.provisioned > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{isAr ? 'اختر المهمة:' : 'Select Mission:'}</p>
            <div className="flex flex-wrap gap-1.5">
              {SCENARIOS.map(s => (
                <Button key={s.id} size="sm" variant={selectedScenario === s.id ? 'default' : 'outline'}
                  onClick={() => setSelectedScenario(s.id)} disabled={isAnyRunning} className="h-7 text-xs gap-1">
                  {s.icon} {isAr ? s.labelAr : s.label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" variant="secondary" onClick={handleSimulate} disabled={isAnyRunning} className="gap-1.5">
                {isSimulating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                {isAr ? 'تشغيل المهمة' : `Run ${SCENARIOS.find(s => s.id === selectedScenario)?.label} Mission`}
              </Button>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={safeMode} onChange={e => setSafeMode(e.target.checked)} className="rounded" />
                {isAr ? 'الوضع الآمن' : 'Safe Mode'}
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setLiveMode(false)}
                  disabled={isAnyRunning}
                  className={`text-[10px] px-2 py-0.5 rounded-l-md border transition-colors ${
                    !liveMode ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border'
                  }`}
                >
                  {isAr ? '🧹 تنظيف' : '🧹 SAFE'}
                </button>
                <button
                  onClick={() => setLiveMode(true)}
                  disabled={isAnyRunning}
                  className={`text-[10px] px-2 py-0.5 rounded-r-md border transition-colors ${
                    liveMode ? 'bg-destructive text-destructive-foreground border-destructive' : 'bg-card text-muted-foreground border-border'
                  }`}
                >
                  {isAr ? '🏙️ مباشر' : '🏙️ LIVE'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        {(status.lastSimulation || status.lastAnalysis) && (
          <div className="flex gap-1">
            <Button size="sm" variant={activeTab === 'behavioral' ? 'default' : 'ghost'} onClick={() => setActiveTab('behavioral')} className="h-7 text-xs">
              {isAr ? 'المقاييس السلوكية' : 'Behavioral'}
            </Button>
            <Button size="sm" variant={activeTab === 'results' ? 'default' : 'ghost'} onClick={() => setActiveTab('results')} className="h-7 text-xs">
              {isAr ? 'نتائج الاختبار' : 'Test Results'}
            </Button>
            <Button size="sm" variant={activeTab === 'analysis' ? 'default' : 'ghost'} onClick={() => setActiveTab('analysis')} className="h-7 text-xs">
              {isAr ? 'تقرير المراقب' : 'Spy Report'}
            </Button>
          </div>
        )}

        {/* Behavioral Metrics */}
        {activeTab === 'behavioral' && status.lastSimulation?.behavioral && (
          <BehavioralMetricsGrid metrics={status.lastSimulation.behavioral} isAr={isAr} simulation={status.lastSimulation} />
        )}

        {/* Test Results */}
        {activeTab === 'results' && lastResults && lastResults.length > 0 && (
          <SimulationResultsList results={lastResults} isAr={isAr} />
        )}

        {/* Spy Analysis */}
        {activeTab === 'analysis' && status.lastAnalysis && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={
                status.lastAnalysis.overall_health === 'HEALTHY' ? 'default' :
                status.lastAnalysis.overall_health === 'NEEDS_ATTENTION' ? 'secondary' : 'destructive'
              } className="text-xs">{status.lastAnalysis.overall_health}</Badge>
              <span className="text-xs text-muted-foreground">Depth: {status.lastAnalysis.hierarchy_depth} levels</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MiniStat icon="И" value={status.lastAnalysis.financial_overview.total_nova} label="Total Nova" />
              <MiniStat icon="✦" value={status.lastAnalysis.financial_overview.total_aura} label="Total Aura" />
              <MiniStat icon="Ø" value={status.lastAnalysis.financial_overview.avg_balance} label="Avg Balance" />
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

function MiniStat({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <div className="rounded-lg border p-2.5 bg-card">
      <div className="flex items-center gap-1 mb-0.5"><span className="text-xs">{icon}</span></div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
