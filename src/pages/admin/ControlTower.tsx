import { useNavigate } from 'react-router-dom';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { LiveMindSection } from '@/components/control-tower/LiveMindSection';
import { NewKnowledgeSection } from '@/components/control-tower/NewKnowledgeSection';
import { ExperimentsSection } from '@/components/control-tower/ExperimentsSection';
import { NeedsApprovalSection } from '@/components/control-tower/NeedsApprovalSection';
import { AIPerformanceSection } from '@/components/control-tower/AIPerformanceSection';
import { RiskRadarSection } from '@/components/control-tower/RiskRadarSection';
import { QuestionsSection } from '@/components/control-tower/QuestionsSection';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';

export default function ControlTower() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <InnerPageHeader
        title={isAr ? 'برج المراقبة' : 'AI Control Tower'}
        onBack={() => navigate('/admin')}
      />

      <div className="container pb-24 pt-4 space-y-6">
        {/* Read-only Banner */}
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {isAr ? 'وضع القراءة فقط — لا يتم تنفيذ أي عمليات من هذه الشاشة' : 'Read-only mode — no operations are executed from this screen'}
          </span>
          <Badge variant="outline" className="text-[10px] ms-auto">READ ONLY</Badge>
        </div>

        {/* Row 1: Live Mind + Needs Approval */}
        <div className="grid md:grid-cols-2 gap-4">
          <LiveMindSection />
          <NeedsApprovalSection />
        </div>

        {/* Row 2: Risk Radar + AI Performance */}
        <div className="grid md:grid-cols-2 gap-4">
          <RiskRadarSection />
          <AIPerformanceSection />
        </div>

        {/* Row 3: New Knowledge + Experiments */}
        <div className="grid md:grid-cols-2 gap-4">
          <NewKnowledgeSection />
          <ExperimentsSection />
        </div>

        {/* Row 4: Questions for Leadership */}
        <QuestionsSection />
      </div>
    </div>
  );
}
