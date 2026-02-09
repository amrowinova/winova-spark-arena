import { useState } from 'react';
import {
  Building2, Database, Server, Layout, Cloud, FileText, Package,
  CheckCircle2, Loader2, AlertCircle, Clock, Shield, Download,
  Activity, ChevronDown, ChevronUp, RefreshCw, Pause, Play
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProjectDetail } from '@/hooks/useProjectOS';

const PHASE_ICONS: Record<string, any> = {
  clarification: Clock,
  architecture: Building2,
  stack: Server,
  database: Database,
  backend: Server,
  frontend: Layout,
  infra: Cloud,
  documentation: FileText,
  delivery: Package,
  testing: Shield,
};

const PHASE_LABELS_AR: Record<string, string> = {
  clarification: 'التوضيح',
  architecture: 'الهندسة',
  stack: 'التقنيات',
  database: 'قاعدة البيانات',
  backend: 'الخدمات',
  frontend: 'الواجهات',
  infra: 'البنية التحتية',
  documentation: 'التوثيق',
  delivery: 'التسليم',
  testing: 'الاختبار',
};

interface ProjectRoomSheetProps {
  projectId: string | null;
  open: boolean;
  onClose: () => void;
}

export function ProjectRoomSheet({ projectId, open, onClose }: ProjectRoomSheetProps) {
  const { language } = useLanguage();
  const { project, activities, phases, loading } = useProjectDetail(projectId);
  const [activeTab, setActiveTab] = useState('overview');

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] p-0">
        {loading || !project ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header */}
            <SheetHeader className="p-4 border-b border-border shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-base truncate">
                    📁 {project.title_ar || project.title}
                  </SheetTitle>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {project.description_ar || project.description}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {project.status}
                </Badge>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-2 mt-3">
                <Progress
                  value={project.phase_progress ? Math.round((Object.values(project.phase_progress).filter(v => v === 'completed').length / 9) * 100) : 0}
                  className="h-2 flex-1"
                />
                <span className="text-xs text-muted-foreground font-mono">
                  {project.phase_progress ? Math.round((Object.values(project.phase_progress).filter(v => v === 'completed').length / 9) * 100) : 0}%
                </span>
              </div>
            </SheetHeader>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full justify-start overflow-x-auto shrink-0 rounded-none border-b bg-transparent h-auto p-0 gap-0">
                {[
                  { value: 'overview', label: 'نظرة عامة' },
                  { value: 'phases', label: 'المراحل' },
                  { value: 'architecture', label: 'الهندسة' },
                  { value: 'delivery', label: 'التسليم' },
                  { value: 'activity', label: 'السجل' },
                ].map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-3 py-2 text-xs"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <ScrollArea className="flex-1">
                {/* Overview */}
                <TabsContent value="overview" className="p-4 space-y-4 mt-0">
                  <PhaseTimeline phases={project.phase_progress} />

                  <InfoSection title="🏗️ الهندسة المعمارية" content={project.architecture?.overview_ar || project.architecture?.overview} />
                  <InfoSection title="⚙️ التقنيات" content={project.stack_choices?.justification_ar} />
                  <InfoSection title="📊 المخاطر" content={`${project.risk_level === 'low' ? '🟢 منخفض' : project.risk_level === 'medium' ? '🟡 متوسط' : '🔴 مرتفع'} — ${project.architecture?.risk_reason || ''}`} />

                  {project.duration_ms && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>المدة: {(project.duration_ms / 1000).toFixed(1)}s</span>
                    </div>
                  )}
                </TabsContent>

                {/* Phases */}
                <TabsContent value="phases" className="p-4 mt-0">
                  <PhaseTimeline phases={project.phase_progress} detailed />

                  {/* DB Schemas */}
                  {project.db_schemas && (
                    <CollapsibleSection title={`🗄️ قاعدة البيانات (${(project.db_schemas as any[]).length})`}>
                      <div className="space-y-2">
                        {(project.db_schemas as any[]).map((schema: any, i: number) => (
                          <div key={i} className="bg-muted/30 rounded-lg p-2">
                            <p className="text-xs font-medium">{schema.table_name}</p>
                            <p className="text-[10px] text-muted-foreground">{schema.description_ar || schema.description}</p>
                          </div>
                        ))}
                      </div>
                    </CollapsibleSection>
                  )}

                  {/* Backend Services */}
                  {project.backend_services && (
                    <CollapsibleSection title={`🔧 الخدمات (${(project.backend_services as any[]).length})`}>
                      <div className="space-y-2">
                        {(project.backend_services as any[]).map((svc: any, i: number) => (
                          <div key={i} className="bg-muted/30 rounded-lg p-2">
                            <p className="text-xs font-medium">{svc.method} {svc.endpoint || svc.name}</p>
                            <p className="text-[10px] text-muted-foreground">{svc.description_ar || svc.description}</p>
                          </div>
                        ))}
                      </div>
                    </CollapsibleSection>
                  )}

                  {/* Frontend Components */}
                  {project.frontend_components && (
                    <CollapsibleSection title={`🎨 الواجهات (${(project.frontend_components as any[]).length})`}>
                      <div className="space-y-2">
                        {(project.frontend_components as any[]).map((comp: any, i: number) => (
                          <div key={i} className="bg-muted/30 rounded-lg p-2">
                            <p className="text-xs font-medium">{comp.component_name}</p>
                            <p className="text-[10px] text-muted-foreground">{comp.description_ar || comp.description}</p>
                          </div>
                        ))}
                      </div>
                    </CollapsibleSection>
                  )}
                </TabsContent>

                {/* Architecture */}
                <TabsContent value="architecture" className="p-4 space-y-3 mt-0">
                  {project.architecture?.components && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold">المكونات الرئيسية</h4>
                      {(project.architecture.components as any[]).map((c: any, i: number) => (
                        <div key={i} className="bg-muted/30 rounded-lg p-2 flex items-start gap-2">
                          <Badge variant="secondary" className="text-[9px] shrink-0">{c.type}</Badge>
                          <div>
                            <p className="text-xs font-medium">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground">{c.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {project.architecture?.security_model && (
                    <InfoSection title="🔐 نموذج الأمان" content={project.architecture.security_model} />
                  )}
                  {project.architecture?.scalability && (
                    <InfoSection title="📈 خطة التوسع" content={project.architecture.scalability} />
                  )}
                  {project.architecture?.data_flow && (
                    <InfoSection title="🔄 تدفق البيانات" content={project.architecture.data_flow} />
                  )}
                </TabsContent>

                {/* Delivery */}
                <TabsContent value="delivery" className="p-4 space-y-3 mt-0">
                  {project.status === 'completed' || project.status === 'delivered' || project.status === 'review' ? (
                    <>
                      <div className="bg-success/10 border border-success/30 rounded-xl p-3 text-center">
                        <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
                        <p className="text-sm font-semibold">✅ حزمة البناء جاهزة</p>
                      </div>

                      {/* Download Buttons */}
                      <div className="space-y-2">
                        {project.api_docs && (
                          <DownloadRow icon="📬" label="API Documentation" />
                        )}
                        {project.db_schemas && (
                          <DownloadRow icon="🗄️" label="SQL Schema" />
                        )}
                        {project.run_instructions && (
                          <DownloadRow icon="📑" label="Run Instructions" />
                        )}
                        {project.infra_config && (
                          <DownloadRow icon="☁️" label="Infra Config" />
                        )}
                        <DownloadRow icon="📊" label="Agent Audit Report" />
                        <DownloadRow icon="📄" label="Full Documentation PDF" />
                      </div>

                      {/* Run Instructions */}
                      {project.run_instructions && (
                        <InfoSection title="📑 تعليمات التشغيل" content={project.run_instructions} />
                      )}

                      {/* Env Variables */}
                      {project.env_variables && (
                        <CollapsibleSection title="🔑 متغيرات البيئة">
                          <div className="space-y-1">
                            {(project.env_variables as any[]).map((env: any, i: number) => (
                              <div key={i} className="flex items-center justify-between bg-muted/30 rounded px-2 py-1">
                                <span className="text-xs font-mono">{env.name}</span>
                                <Badge variant={env.required ? 'destructive' : 'secondary'} className="text-[9px]">
                                  {env.required ? 'مطلوب' : 'اختياري'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </CollapsibleSection>
                      )}

                      {/* v2 Button */}
                      <div className="pt-4 border-t border-border">
                        <Button variant="outline" className="w-full gap-2">
                          <RefreshCw className="h-4 w-4" />
                          إنشاء نسخة v2 أو توسيع النظام
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">لم يكتمل البناء بعد</p>
                      <p className="text-xs mt-1">ستظهر حزمة التسليم هنا عند الانتهاء</p>
                    </div>
                  )}
                </TabsContent>

                {/* Activity Log */}
                <TabsContent value="activity" className="p-4 mt-0">
                  {activities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs">لا توجد أنشطة مسجلة</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activities.map(act => (
                        <div key={act.id} className="flex gap-2 text-xs">
                          <div className="w-1 rounded-full bg-primary/30 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{act.title_ar || act.title}</p>
                            {act.description_ar || act.description ? (
                              <p className="text-muted-foreground text-[10px]">{act.description_ar || act.description}</p>
                            ) : null}
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {new Date(act.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                              {act.risk_level !== 'low' && (
                                <span className="ms-2">⚠️ {act.risk_level}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Sub-Components ───────────────────────────────

function PhaseTimeline({ phases, detailed }: { phases: Record<string, string> | null; detailed?: boolean }) {
  if (!phases) return null;
  const allPhases = ['clarification', 'architecture', 'stack', 'database', 'backend', 'frontend', 'infra', 'documentation', 'delivery'];

  return (
    <div className={`space-y-${detailed ? '2' : '1'}`}>
      {allPhases.map(phase => {
        const status = phases[phase];
        const isCompleted = status === 'completed';
        const isActive = status === 'in_progress';
        const Icon = PHASE_ICONS[phase] || Clock;

        return (
          <div
            key={phase}
            className={`flex items-center gap-2 ${detailed ? 'py-1.5 px-2 rounded-lg' : 'py-0.5'} ${
              isCompleted ? (detailed ? 'bg-success/10' : '') : isActive ? (detailed ? 'bg-primary/10' : '') : 'opacity-40'
            }`}
          >
            {isCompleted ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
            ) : isActive ? (
              <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
            ) : (
              <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <span className={`text-xs ${isCompleted ? 'text-success' : isActive ? 'text-primary font-medium' : ''}`}>
              {PHASE_LABELS_AR[phase] || phase}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function InfoSection({ title, content }: { title: string; content?: string | null }) {
  if (!content) return null;
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-semibold">{title}</h4>
      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{content}</p>
    </div>
  );
}

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border rounded-lg overflow-hidden mt-3">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-2 text-xs font-medium hover:bg-accent/30">
        {title}
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && <div className="p-2 pt-0">{children}</div>}
    </div>
  );
}

function DownloadRow({ icon, label }: { icon: string; label: string }) {
  return (
    <button className="w-full flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-accent/30 transition-colors text-xs">
      <span>{icon}</span>
      <span className="flex-1 text-start">{label}</span>
      <Download className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
  );
}
