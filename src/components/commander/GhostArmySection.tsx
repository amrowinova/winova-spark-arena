import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGhostArmy, SimulationScenario } from '@/hooks/useGhostArmy';
import { useLanguage } from '@/contexts/LanguageContext';
import { BehavioralMetricsGrid } from './ghost-army/BehavioralMetricsGrid';
import { SimulationResultsList } from './ghost-army/SimulationResultsList';
import { SocialStream } from './ghost-army/SocialStream';
import { LiveTransactionFeed } from './ghost-army/LiveTransactionFeed';
import {
  Play, Trash2, Users, Loader2, TreePine, Search,
  MessageSquare, Wallet, Network, Trophy, Shield, Heart, ShoppingCart, Brain, Landmark, Zap, Radio,
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
    status, isProvisioning, isSimulating, isCleaning, isAnalyzing, isSocializing, isEconomyRunning, isChaosRunning,
    economyMetrics, chaosResults,
    checkStatus, provision, simulate, analyze, cleanup, socialSimulate, economySimulate, chaosSimulate,
  } = useGhostArmy();

  const [lastResults, setLastResults] = useState<any[] | null>(null);
  const [activeTab, setActiveTab] = useState<'behavioral' | 'results' | 'analysis' | 'social' | 'economy' | 'chaos' | 'live'>('behavioral');
  const [selectedScenario, setSelectedScenario] = useState<SimulationScenario>('full');
  const [safeMode, setSafeMode] = useState(true);
  const [liveMode, setLiveMode] = useState(false);

  useEffect(() => { checkStatus(); }, []);

  const handleSimulate = async () => {
    const data = await simulate(selectedScenario, safeMode, liveMode);
    if (data?.results) setLastResults(data.results);
  };

  const handleSocial = async () => {
    await socialSimulate(30, 4);
    setActiveTab('social');
  };

  const handleEconomy = async () => {
    await economySimulate(50, 10, 1, true, true, 20);
    setActiveTab('economy');
  };

  const handleChaos = async () => {
    await chaosSimulate();
    setActiveTab('chaos');
  };

  const isAnyRunning = isProvisioning || isSimulating || isCleaning || isAnalyzing || isSocializing || isEconomyRunning || isChaosRunning;

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
          <Button size="sm" variant="outline" onClick={handleSocial} disabled={isAnyRunning || status.provisioned === 0} className="gap-1.5">
            {isSocializing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
            {isAr ? 'محاكاة اجتماعية ذكية' : 'Sentient Social'}
          </Button>
          <Button size="sm" variant="outline" onClick={handleEconomy} disabled={isAnyRunning || status.provisioned === 0} className="gap-1.5 border-primary/40">
            {isEconomyRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Landmark className="h-3.5 w-3.5" />}
            {isAr ? '🏙️ اقتصاد ذاتي' : '🏙️ Autonomous Economy'}
          </Button>
          <Button size="sm" variant="outline" onClick={handleChaos} disabled={isAnyRunning || status.provisioned === 0} className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10">
            {isChaosRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            {isAr ? '⚡ فوضى محكومة' : '⚡ Controlled Chaos'}
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
        {(status.lastSimulation || status.lastAnalysis || status.provisioned > 0) && (
          <div className="flex gap-1">
            <Button size="sm" variant={activeTab === 'behavioral' ? 'default' : 'ghost'} onClick={() => setActiveTab('behavioral')} className="h-7 text-xs">
              {isAr ? 'المقاييس' : 'Behavioral'}
            </Button>
            <Button size="sm" variant={activeTab === 'results' ? 'default' : 'ghost'} onClick={() => setActiveTab('results')} className="h-7 text-xs">
              {isAr ? 'النتائج' : 'Results'}
            </Button>
            <Button size="sm" variant={activeTab === 'social' ? 'default' : 'ghost'} onClick={() => setActiveTab('social')} className="h-7 text-xs gap-1">
              <Brain className="h-3 w-3" />
              {isAr ? 'البث الاجتماعي' : 'Social Stream'}
            </Button>
            <Button size="sm" variant={activeTab === 'economy' ? 'default' : 'ghost'} onClick={() => setActiveTab('economy')} className="h-7 text-xs gap-1">
              <Landmark className="h-3 w-3" />
              {isAr ? 'الاقتصاد' : 'Economy'}
            </Button>
            <Button size="sm" variant={activeTab === 'chaos' ? 'default' : 'ghost'} onClick={() => setActiveTab('chaos')} className="h-7 text-xs gap-1">
              <Zap className="h-3 w-3" />
              {isAr ? 'الفوضى' : 'Chaos'}
            </Button>
            <Button size="sm" variant={activeTab === 'live' ? 'default' : 'ghost'} onClick={() => setActiveTab('live')} className="h-7 text-xs gap-1">
              <Radio className="h-3 w-3" />
              {isAr ? 'بث مباشر' : 'Live Feed'}
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

        {/* Social Stream */}
        {activeTab === 'social' && (
          <SocialStream isAr={isAr} />
        )}

        {/* Economy Metrics */}
        {activeTab === 'economy' && economyMetrics && (
          <EconomyMetricsView metrics={economyMetrics} isAr={isAr} />
        )}
        {activeTab === 'economy' && !economyMetrics && (
          <p className="text-xs text-muted-foreground">
            {isAr ? 'اضغط "اقتصاد ذاتي" لبدء محاكاة السوق.' : 'Click "Autonomous Economy" to start the marketplace simulation.'}
          </p>
        )}

        {/* Chaos Results */}
        {activeTab === 'chaos' && chaosResults && (
          <ChaosResultsView data={chaosResults} isAr={isAr} />
        )}
        {activeTab === 'chaos' && !chaosResults && (
          <p className="text-xs text-muted-foreground">
            {isAr ? 'اضغط "فوضى محكومة" لاختبار الجهاز المناعي.' : 'Click "Controlled Chaos" to stress-test the immune system.'}
          </p>
        )}

        {/* Live Transaction Feed */}
        {activeTab === 'live' && (
          <LiveTransactionFeed isAr={isAr} />
        )}

        {/* Spy Analysis */}
        {activeTab === 'analysis' && status.lastAnalysis && (
          <SpyAnalysisView status={status} isAr={isAr} />
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

function SpyAnalysisView({ status, isAr }: { status: any; isAr: boolean }) {
  return (
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
  );
}

function ChaosResultsView({ data, isAr }: { data: any; isAr: boolean }) {
  const s = data.summary;
  const results = data.results || [];

  return (
    <div className="space-y-3">
      {/* Immune Score */}
      <div className="flex items-center gap-3">
        <div className={`text-3xl font-black ${
          s.immune_score === 100 ? 'text-primary' : s.immune_score >= 80 ? 'text-yellow-500' : 'text-destructive'
        }`}>
          {s.immune_score}%
        </div>
        <div>
          <p className="text-sm font-medium">{isAr ? 'نسبة المناعة' : 'Immune Score'}</p>
          <p className="text-[10px] text-muted-foreground">
            {s.defenses} {isAr ? 'صد' : 'defended'} / {s.total_attacks} {isAr ? 'هجمة' : 'attacks'} • {s.duration_ms}ms
          </p>
        </div>
      </div>

      {/* Attack Results */}
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {results.map((r: any, i: number) => (
          <div key={i} className={`flex items-start gap-2 p-2 rounded-md border text-xs ${
            r.blocked ? 'border-primary/20 bg-primary/5' : 'border-destructive/30 bg-destructive/5'
          }`}>
            <span className="text-base mt-0.5">{r.blocked ? '🛡️' : '💥'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium">{r.attack}</span>
                <Badge variant={r.blocked ? 'secondary' : 'destructive'} className="text-[9px] h-4">
                  {r.category}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{r.detail}</p>
              <p className="text-[10px] mt-0.5 font-mono">
                {r.blocked ? '✅' : '❌'} {r.defense_mechanism}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EconomyMetricsView({ metrics, isAr }: { metrics: any; isAr: boolean }) {
  const stats = [
    { icon: '📦', value: metrics.sell_orders_created, label: isAr ? 'طلبات بيع' : 'Sell Orders' },
    { icon: '🤝', value: metrics.orders_executed, label: isAr ? 'تم المطابقة' : 'Matched' },
    { icon: '✅', value: metrics.escrows_released, label: isAr ? 'تم التحرير' : 'Released' },
    { icon: 'И', value: metrics.total_nova_traded, label: isAr ? 'نوڤا متداولة' : 'Nova Traded' },
    { icon: '🎁', value: metrics.tips_sent || 0, label: isAr ? 'إكراميات' : 'Tips Sent' },
    { icon: '💸', value: `${(metrics.tips_nova_total || 0).toFixed(1)}И`, label: isAr ? 'نوڤا إكراميات' : 'Nova Tipped' },
    { icon: '🏆', value: metrics.contest_joined || 0, label: isAr ? 'مسابقات' : 'Contests' },
    { icon: '🍞', value: metrics.hunger_trades_triggered || 0, label: isAr ? 'تداولات جوع' : 'Hunger Trades' },
    { icon: '⭐', value: metrics.ratings_submitted, label: isAr ? 'تقييمات' : 'Ratings' },
    { icon: '💰', value: metrics.wallets_seeded, label: isAr ? 'محافظ مموّلة' : 'Wallets Seeded' },
    { icon: '⏱', value: `${(metrics.duration_ms / 1000).toFixed(1)}s`, label: isAr ? 'المدة' : 'Duration' },
    { icon: '🔄', value: metrics.cycles_completed, label: isAr ? 'دورات' : 'Cycles' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {stats.map((s, i) => (
          <MiniStat key={i} icon={s.icon} value={s.value} label={s.label} />
        ))}
      </div>
      {metrics.errors && metrics.errors.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-destructive">
            {isAr ? `أخطاء (${metrics.errors.length}):` : `Errors (${metrics.errors.length}):`}
          </p>
          <div className="max-h-32 overflow-y-auto space-y-0.5">
            {metrics.errors.slice(0, 10).map((err: string, i: number) => (
              <p key={i} className="text-[10px] text-muted-foreground pl-2 border-l-2 border-destructive/30 font-mono">{err}</p>
            ))}
          </div>
        </div>
      )}
      {(!metrics.errors || metrics.errors.length === 0) && metrics.escrows_released > 0 && (
        <p className="text-xs text-primary font-medium">
          {isAr ? '✅ سوق حي بدون أخطاء' : '✅ Living marketplace — zero errors'}
        </p>
      )}
    </div>
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
