import { useNavigate } from 'react-router-dom';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { StrategicSummarySection } from '@/components/strategic-brain/StrategicSummarySection';
import { InsightsSection } from '@/components/strategic-brain/InsightsSection';
import { TodayLearningsSection } from '@/components/strategic-brain/TodayLearningsSection';
import { ApprovalQueueSection } from '@/components/strategic-brain/ApprovalQueueSection';
import { ExperimentsLabSection } from '@/components/strategic-brain/ExperimentsLabSection';
import { LeadershipQuestionsSection } from '@/components/strategic-brain/LeadershipQuestionsSection';

export default function StrategicBrain() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <InnerPageHeader
        title={isAr ? 'العقل الاستراتيجي' : 'AI Strategic Brain'}
        onBack={() => navigate('/admin')}
      />

      <div className="container pb-24 pt-4 space-y-6">
        {/* Read-only banner */}
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {isAr
              ? 'الذكاء يوصي فقط — لا يتم تنفيذ أي شيء تلقائيًا'
              : 'AI recommends only — nothing executes automatically'}
          </span>
          <Badge variant="outline" className="text-[10px] ms-auto">READ ONLY</Badge>
        </div>

        {/* Summary KPIs */}
        <StrategicSummarySection />

        {/* Row 1: Insights + Today's Learnings */}
        <div className="grid md:grid-cols-2 gap-4">
          <InsightsSection />
          <TodayLearningsSection />
        </div>

        {/* Row 2: Risks + Approval Queue */}
        <div className="grid md:grid-cols-2 gap-4">
          <RiskRadarSection />
          <ApprovalQueueSection />
        </div>

        {/* Row 3: Experiments + Performance */}
        <div className="grid md:grid-cols-2 gap-4">
          <ExperimentsLabSection />
          <AIPerformanceSection />
        </div>

        {/* Row 4: Questions for Leadership */}
        <LeadershipQuestionsSection />
      </div>
    </div>
  );
}
