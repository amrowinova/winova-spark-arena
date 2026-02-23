import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  FlaskConical, FolderPlus, Play, FileText, Shield, BarChart3,
  Loader2, XCircle, Microscope, BrainCircuit, AlertTriangle, Link2,
} from 'lucide-react';
import { useDeepResearch } from '@/hooks/useDeepResearch';

const CATEGORY_COLORS: Record<string, string> = {
  financial_primitive: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  regulatory_rule: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  settlement_model: 'bg-green-500/10 text-green-400 border-green-500/30',
  liquidity_pattern: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  risk_pattern: 'bg-red-500/10 text-red-400 border-red-500/30',
  fraud_pattern: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  infrastructure_component: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
};

const RELATION_LABELS: Record<string, string> = {
  depends_on: '→ depends on',
  conflicts_with: '⚡ conflicts with',
  enhances: '↑ enhances',
  replaces: '⇄ replaces',
  mitigates: '↓ mitigates',
  requires: '⊃ requires',
};

export default function DeepResearch() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const {
    projects, outputs, scores, concepts, relations, contradictions, knowledgeSummary,
    isLoading, isResearching, isSimulating,
    loadProjects, createProject, runResearch, runSimulation,
    loadOutputs, loadIntegrity, loadConcepts, loadRelations, loadContradictions, loadKnowledgeSummary,
  } = useDeepResearch();

  const [activeTab, setActiveTab] = useState('projects');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [researchTopic, setResearchTopic] = useState('');
  const [simScenario, setSimScenario] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [selectedConcept, setSelectedConcept] = useState<any>(null);

  useEffect(() => { loadProjects(); }, []);

  useEffect(() => {
    if (selectedProject) {
      loadOutputs(selectedProject);
      loadIntegrity(selectedProject);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedProject && activeTab === 'knowledge') {
      loadKnowledgeSummary(selectedProject);
      loadConcepts(selectedProject);
      loadRelations(selectedProject);
      loadContradictions(selectedProject);
    }
  }, [selectedProject, activeTab]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const p = await createProject(newName.trim(), newDesc.trim());
    if (p) { setSelectedProject(p.id); setNewName(''); setNewDesc(''); setActiveTab('research'); }
  };

  const handleResearch = async () => {
    if (!selectedProject || !researchTopic.trim()) return;
    const result = await runResearch(selectedProject, researchTopic.trim());
    if (result) {
      loadOutputs(selectedProject);
      loadIntegrity(selectedProject);
      if (activeTab === 'knowledge') {
        loadKnowledgeSummary(selectedProject);
        loadConcepts(selectedProject);
        loadRelations(selectedProject);
        loadContradictions(selectedProject);
      }
    }
  };

  const handleSimulation = async () => {
    if (!selectedProject || !simScenario.trim()) return;
    await runSimulation(selectedProject, simScenario.trim());
    loadIntegrity(selectedProject);
  };

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  const conceptRelations = selectedConcept
    ? relations.filter(r => r.concept_id === selectedConcept.id || r.related_concept_id === selectedConcept.id)
    : [];
  const conceptContradictions = selectedConcept
    ? contradictions.filter(c => c.concept_id === selectedConcept.id)
    : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <InnerPageHeader title={isRTL ? 'مختبر البحث العميق' : 'Deep Research Lab'} />

      <div className="flex-1 p-4 pb-20 space-y-4">
        <Card className="p-3 border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-destructive shrink-0" />
            <span className="text-destructive font-medium">
              {isRTL ? 'بيئة بحث معزولة — لا اتصال بالبيانات الإنتاجية' : 'Isolated Research Environment — No production data connection'}
            </span>
          </div>
        </Card>

        {selectedProjectData && (
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">{selectedProjectData.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedProject(null); setActiveTab('projects'); }}>
                {isRTL ? 'تغيير' : 'Change'}
              </Button>
            </div>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-6">
            <TabsTrigger value="projects" className="text-xs">
              <FolderPlus className="w-3 h-3 me-1" />{isRTL ? 'مشاريع' : 'Projects'}
            </TabsTrigger>
            <TabsTrigger value="research" className="text-xs" disabled={!selectedProject}>
              <Microscope className="w-3 h-3 me-1" />{isRTL ? 'بحث' : 'Research'}
            </TabsTrigger>
            <TabsTrigger value="simulate" className="text-xs" disabled={!selectedProject}>
              <Play className="w-3 h-3 me-1" />{isRTL ? 'محاكاة' : 'Simulate'}
            </TabsTrigger>
            <TabsTrigger value="outputs" className="text-xs" disabled={!selectedProject}>
              <FileText className="w-3 h-3 me-1" />{isRTL ? 'مخرجات' : 'Outputs'}
            </TabsTrigger>
            <TabsTrigger value="integrity" className="text-xs" disabled={!selectedProject}>
              <BarChart3 className="w-3 h-3 me-1" />{isRTL ? 'سلامة' : 'Integrity'}
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="text-xs" disabled={!selectedProject}>
              <BrainCircuit className="w-3 h-3 me-1" />{isRTL ? 'رسم بياني' : 'Graph'}
            </TabsTrigger>
          </TabsList>

          {/* PROJECTS TAB */}
          <TabsContent value="projects" className="space-y-4 mt-4">
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">{isRTL ? 'مشروع بحث جديد' : 'New Research Project'}</h3>
              <Input placeholder={isRTL ? 'اسم المشروع' : 'Project name'} value={newName} onChange={e => setNewName(e.target.value)} />
              <Textarea placeholder={isRTL ? 'الوصف' : 'Description'} value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} />
              <Button onClick={handleCreate} disabled={!newName.trim()} className="w-full">
                <FolderPlus className="w-4 h-4 me-2" />{isRTL ? 'إنشاء' : 'Create Project'}
              </Button>
            </Card>

            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : projects.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">{isRTL ? 'لا توجد مشاريع بحث' : 'No research projects yet'}</p>
            ) : (
              <div className="space-y-2">
                {projects.map(p => (
                  <Card
                    key={p.id}
                    className={`p-3 cursor-pointer transition-colors hover:bg-accent/50 ${selectedProject === p.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => { setSelectedProject(p.id); setActiveTab('research'); }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{p.name}</p>
                        {p.description && <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Badge variant="secondary" className="text-[10px]">{p.research_outputs?.[0]?.count || 0} files</Badge>
                        <Badge variant="outline" className="text-[10px]">{p.research_simulations?.[0]?.count || 0} sims</Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* RESEARCH TAB */}
          <TabsContent value="research" className="space-y-4 mt-4">
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Microscope className="w-4 h-4" />
                {isRTL ? 'تنفيذ بحث مهيكل' : 'Execute Structured Research'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isRTL
                  ? 'سينتج 8 ملفات إلزامية + استخراج المفاهيم تلقائيًا إلى الرسم البياني المعرفي'
                  : 'Produces 8 mandatory files + auto-extracts concepts into Knowledge Graph'}
              </p>
              <Textarea
                placeholder={isRTL ? 'موضوع البحث...' : 'Research topic...'}
                value={researchTopic}
                onChange={e => setResearchTopic(e.target.value)}
                rows={3}
              />
              <Button onClick={handleResearch} disabled={isResearching || !researchTopic.trim()} className="w-full">
                {isResearching ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Play className="w-4 h-4 me-2" />}
                {isResearching ? (isRTL ? 'جارٍ البحث...' : 'Researching...') : (isRTL ? 'تنفيذ البحث' : 'Execute Research')}
              </Button>
            </Card>

            <Card className="p-4">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">{isRTL ? 'مجالات البحث' : 'RESEARCH DOMAINS'}</h4>
              <div className="space-y-2 text-xs">
                {[
                  { label: 'Payment Infrastructure', items: 'SWIFT, SEPA, ACH, RTGS, Visa/MC' },
                  { label: 'Digital Wallets', items: 'PayPal, Binance Pay, Custodial/Non-custodial' },
                  { label: 'Liquidity & Settlement', items: 'Net settlement, RTGS, Float, Capital buffer' },
                  { label: 'Regulatory', items: 'EMI (EU), MSB (US), AML/KYC, Travel Rule' },
                  { label: 'Fraud & Risk', items: 'Chargebacks, Disputes, Fraud scoring' },
                ].map(d => (
                  <div key={d.label} className="flex gap-2">
                    <Badge variant="outline" className="text-[10px] shrink-0">{d.label}</Badge>
                    <span className="text-muted-foreground">{d.items}</span>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* SIMULATE TAB */}
          <TabsContent value="simulate" className="space-y-4 mt-4">
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <FlaskConical className="w-4 h-4" />
                {isRTL ? 'محرك المحاكاة المالية' : 'Financial Simulation Engine'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isRTL
                  ? 'يُنتج: نمذجة زمن التسوية، اختبار ضغط السيولة، نموذج التعرض لأسعار الصرف'
                  : 'Outputs: Settlement time modeling, Liquidity stress test, FX exposure, Capital requirements'}
              </p>
              <Textarea
                placeholder={isRTL ? 'سيناريو المحاكاة...' : 'Simulation scenario...'}
                value={simScenario}
                onChange={e => setSimScenario(e.target.value)}
                rows={3}
              />
              <Button onClick={handleSimulation} disabled={isSimulating || !simScenario.trim()} className="w-full" variant="secondary">
                {isSimulating ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <FlaskConical className="w-4 h-4 me-2" />}
                {isSimulating ? (isRTL ? 'جارٍ المحاكاة...' : 'Simulating...') : (isRTL ? 'تشغيل المحاكاة' : 'Run Simulation')}
              </Button>
            </Card>
          </TabsContent>

          {/* OUTPUTS TAB */}
          <TabsContent value="outputs" className="space-y-4 mt-4">
            {outputs.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">{isRTL ? 'لا توجد مخرجات' : 'No outputs yet. Run a research cycle first.'}</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {outputs.map(o => (
                    <Card
                      key={o.id}
                      className={`p-3 cursor-pointer hover:bg-accent/50 transition-colors ${selectedFile?.id === o.id ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => setSelectedFile(o)}
                    >
                      <FileText className="w-4 h-4 text-primary mb-1" />
                      <p className="text-xs font-medium truncate">{o.file_name}</p>
                      <p className="text-[10px] text-muted-foreground">v{o.version}</p>
                    </Card>
                  ))}
                </div>
                {selectedFile && (
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm">{selectedFile.file_name}</h4>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>✕</Button>
                    </div>
                    <Separator className="mb-3" />
                    <ScrollArea className="h-[400px]">
                      <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">{selectedFile.content}</pre>
                    </ScrollArea>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* INTEGRITY TAB */}
          <TabsContent value="integrity" className="space-y-4 mt-4">
            {scores.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">{isRTL ? 'لا توجد نتائج سلامة' : 'No integrity scores yet.'}</p>
            ) : (
              scores.map(s => (
                <Card key={s.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">{isRTL ? 'تقييم السلامة' : 'Integrity Assessment'}</h4>
                    <Badge variant={s.overall_score >= 70 ? 'default' : s.overall_score >= 50 ? 'secondary' : 'destructive'}>
                      {s.overall_score}/100
                    </Badge>
                  </div>
                  {[
                    { label: 'Mathematical Consistency', value: s.mathematical_consistency },
                    { label: 'Regulatory Feasibility', value: s.regulatory_feasibility },
                    { label: 'Attack Resistance', value: s.attack_resistance },
                    { label: 'Liquidity Robustness', value: s.liquidity_robustness },
                  ].map(m => (
                    <div key={m.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{m.label}</span>
                        <span className="font-mono">{m.value}/100</span>
                      </div>
                      <Progress value={m.value} className="h-2" />
                    </div>
                  ))}
                  {s.failure_report && (
                    <div className="mt-2 p-2 rounded bg-destructive/10 text-destructive text-xs flex gap-2">
                      <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{s.failure_report}</span>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleString()}</p>
                </Card>
              ))
            )}
          </TabsContent>

          {/* KNOWLEDGE GRAPH TAB */}
          <TabsContent value="knowledge" className="space-y-4 mt-4">
            {/* Summary Cards */}
            {knowledgeSummary && (
              <div className="grid grid-cols-3 gap-2">
                <Card className="p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{knowledgeSummary.total_concepts}</p>
                  <p className="text-[10px] text-muted-foreground">{isRTL ? 'مفاهيم' : 'Concepts'}</p>
                </Card>
                <Card className="p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{relations.length}</p>
                  <p className="text-[10px] text-muted-foreground">{isRTL ? 'علاقات' : 'Relations'}</p>
                </Card>
                <Card className="p-3 text-center">
                  <p className="text-2xl font-bold text-destructive">{knowledgeSummary.contradictions_detected}</p>
                  <p className="text-[10px] text-muted-foreground">{isRTL ? 'تناقضات' : 'Contradictions'}</p>
                </Card>
              </div>
            )}

            {/* Category Breakdown */}
            {knowledgeSummary && Object.keys(knowledgeSummary.by_category).length > 0 && (
              <Card className="p-4">
                <h4 className="text-xs font-semibold text-muted-foreground mb-3">{isRTL ? 'حسب الفئة' : 'BY CATEGORY'}</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(knowledgeSummary.by_category).map(([cat, count]) => (
                    <Badge key={cat} variant="outline" className={`text-[10px] ${CATEGORY_COLORS[cat] || ''}`}>
                      {cat.replace(/_/g, ' ')} ({count})
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Concepts List */}
            {concepts.length > 0 && (
              <Card className="p-4">
                <h4 className="text-xs font-semibold text-muted-foreground mb-3">{isRTL ? 'المفاهيم' : 'CONCEPTS'}</h4>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {concepts.map(c => (
                      <div
                        key={c.id}
                        className={`p-2 rounded border cursor-pointer transition-colors hover:bg-accent/50 ${selectedConcept?.id === c.id ? 'ring-2 ring-primary' : ''}`}
                        onClick={() => setSelectedConcept(selectedConcept?.id === c.id ? null : c)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium capitalize">{c.name}</span>
                            {c.contradiction_flag && <AlertTriangle className="w-3 h-3 text-destructive" />}
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className={`text-[9px] ${CATEGORY_COLORS[c.category] || ''}`}>
                              {c.category.replace(/_/g, ' ')}
                            </Badge>
                            <Badge variant={c.confidence_score >= 70 ? 'default' : 'secondary'} className="text-[9px]">
                              {c.confidence_score}%
                            </Badge>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{c.definition}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            )}

            {/* Selected Concept Detail */}
            {selectedConcept && (
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm capitalize">{selectedConcept.name}</h4>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedConcept(null)}>✕</Button>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground">DEFINITION</p>
                    <p className="text-xs">{selectedConcept.definition}</p>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Confidence</p>
                      <Progress value={selectedConcept.confidence_score} className="h-2 w-24 mt-1" />
                      <span className="text-[10px] font-mono">{selectedConcept.confidence_score}%</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">First Detected</p>
                      <p className="font-mono">{new Date(selectedConcept.first_detected_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Concept Relations */}
                {conceptRelations.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                      <Link2 className="w-3 h-3" /> RELATIONS ({conceptRelations.length})
                    </p>
                    <div className="space-y-1">
                      {conceptRelations.map(r => (
                        <div key={r.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-accent/30">
                          <span className="font-medium capitalize">{r.concept?.name || '?'}</span>
                          <span className="text-muted-foreground text-[10px]">{RELATION_LABELS[r.relation_type] || r.relation_type}</span>
                          <span className="font-medium capitalize">{r.related?.name || '?'}</span>
                          <Badge variant="outline" className="text-[9px] ms-auto">{r.strength_score}%</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Concept Contradictions */}
                {conceptContradictions.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-destructive mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> CONTRADICTIONS ({conceptContradictions.length})
                    </p>
                    {conceptContradictions.map(ct => (
                      <div key={ct.id} className="p-2 rounded bg-destructive/5 border border-destructive/20 space-y-1 text-xs">
                        <p><span className="font-medium">Previous:</span> {ct.previous_statement}</p>
                        <p><span className="font-medium">Conflicting:</span> {ct.conflicting_statement}</p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[9px]">{ct.resolution_status}</Badge>
                          <span className="text-[10px] text-muted-foreground">{new Date(ct.detected_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Top Relations */}
            {knowledgeSummary && knowledgeSummary.top_relations.length > 0 && (
              <Card className="p-4">
                <h4 className="text-xs font-semibold text-muted-foreground mb-3">{isRTL ? 'أقوى العلاقات' : 'STRONGEST RELATIONS'}</h4>
                <div className="space-y-1.5">
                  {knowledgeSummary.top_relations.map((r: any) => (
                    <div key={r.id} className="flex items-center gap-2 text-xs p-2 rounded border">
                      <span className="font-medium capitalize">{r.concept?.name || '?'}</span>
                      <span className="text-muted-foreground text-[10px]">{RELATION_LABELS[r.relation_type] || r.relation_type}</span>
                      <span className="font-medium capitalize">{r.related?.name || '?'}</span>
                      <Badge variant="default" className="text-[9px] ms-auto">{r.strength_score}%</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {concepts.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">
                {isRTL ? 'لا توجد مفاهيم بعد. قم بتشغيل دورة بحث أولاً.' : 'No concepts yet. Run a research cycle to populate the Knowledge Graph.'}
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
