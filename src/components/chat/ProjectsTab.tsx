import { useState } from 'react';
import { FolderOpen, Clock, AlertTriangle, CheckCircle2, Loader2, XCircle, Pause } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProjectOS, BuildProject } from '@/hooks/useProjectOS';
import { ProjectRoomSheet } from './ProjectRoomSheet';

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  planning: { label: 'تخطيط', icon: Clock, color: 'text-info' },
  clarifying: { label: 'توضيح', icon: Clock, color: 'text-info' },
  building: { label: 'جاري البناء', icon: Loader2, color: 'text-primary' },
  waiting: { label: 'في الانتظار', icon: Pause, color: 'text-warning' },
  delivered: { label: 'تم التسليم', icon: CheckCircle2, color: 'text-success' },
  completed: { label: 'مكتمل', icon: CheckCircle2, color: 'text-success' },
  review: { label: 'مراجعة', icon: Clock, color: 'text-warning' },
  failed: { label: 'فشل', icon: XCircle, color: 'text-destructive' },
};

const RISK_COLORS: Record<string, string> = {
  low: 'bg-success/20 text-success',
  medium: 'bg-warning/20 text-warning',
  high: 'bg-destructive/20 text-destructive',
  critical: 'bg-destructive text-destructive-foreground',
};

function getProgress(phases: Record<string, string> | null): number {
  if (!phases) return 0;
  const all = Object.values(phases);
  if (all.length === 0) return 0;
  const completed = all.filter(v => v === 'completed').length;
  return Math.round((completed / 9) * 100); // 9 total phases
}

interface ProjectsTabProps {
  conversationId: string;
}

export function ProjectsTab({ conversationId }: ProjectsTabProps) {
  const { language } = useLanguage();
  const { projects, loading } = useProjectOS(conversationId);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">
          {language === 'ar' ? 'لا توجد مشاريع بعد' : 'No projects yet'}
        </p>
        <p className="text-xs mt-1 opacity-60">
          {language === 'ar' ? 'اكتب "ابني لي..." لبدء مشروع جديد' : 'Type "Build me..." to start'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2 p-3">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => setSelectedProject(project.id)}
          />
        ))}
      </div>

      <ProjectRoomSheet
        projectId={selectedProject}
        open={!!selectedProject}
        onClose={() => setSelectedProject(null)}
      />
    </>
  );
}

function ProjectCard({ project, onClick }: { project: BuildProject; onClick: () => void }) {
  const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;
  const StatusIcon = status.icon;
  const progress = getProgress(project.phase_progress);
  const riskClass = RISK_COLORS[project.risk_level] || RISK_COLORS.low;

  return (
    <button
      onClick={onClick}
      className="w-full text-start bg-card border border-border rounded-xl p-3 hover:bg-accent/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate">
            {project.title_ar || project.title}
          </h3>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {project.description_ar || project.description}
          </p>
        </div>
        <Badge variant="outline" className={`shrink-0 text-[10px] ${riskClass}`}>
          {project.risk_level === 'low' ? '🟢' : project.risk_level === 'medium' ? '🟡' : '🔴'} 
          {project.risk_level}
        </Badge>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Progress value={progress} className="h-1.5 flex-1" />
        <span className="text-[10px] text-muted-foreground font-mono w-8 text-end">{progress}%</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <StatusIcon className={`h-3.5 w-3.5 ${status.color} ${project.status === 'building' ? 'animate-spin' : ''}`} />
          <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {new Date(project.updated_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </button>
  );
}
