import { useStrategicInsights } from '@/hooks/useStrategicBrain';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const typeEmoji: Record<string, string> = {
  risk: '🔴',
  opportunity: '🟢',
  performance_gap: '🟡',
  architecture: '🔵',
  fraud_pattern: '🟠',
};

const severityColor: Record<string, string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/30',
  high: 'bg-warning/10 text-warning border-warning/30',
  medium: 'bg-info/10 text-info border-info/30',
  low: 'bg-muted text-muted-foreground border-border',
};

export function InsightsSection() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { data, isLoading } = useStrategicInsights();

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-32 w-full" /></CardContent>
      </Card>
    );
  }

  const newInsights = (data || []).filter((i: any) => i.status === 'new');
  const risks = newInsights.filter((i: any) => i.insight_type === 'risk' || i.insight_type === 'fraud_pattern');
  const opportunities = newInsights.filter((i: any) => i.insight_type === 'opportunity');
  const gaps = newInsights.filter((i: any) => i.insight_type === 'performance_gap' || i.insight_type === 'architecture');

  const renderGroup = (title: string, items: any[]) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase">{title}</h4>
        {items.map((item: any) => (
          <div key={item.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-start gap-2">
              <span>{typeEmoji[item.insight_type] || '❓'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{isAr ? (item.title_ar || item.title) : item.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isAr ? (item.description_ar || item.description) : item.description}
                </p>
              </div>
              <Badge variant="outline" className={`text-[10px] shrink-0 ${severityColor[item.severity] || ''}`}>
                {item.severity}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>🎯 {isAr ? 'ثقة' : 'Confidence'}: {item.confidence_score}%</span>
              <span>📊 {isAr ? (item.impact_estimation_ar || item.impact_estimation) : item.impact_estimation}</span>
            </div>
            {item.recommended_action && (
              <div className="bg-muted/50 rounded p-2">
                <p className="text-xs">
                  💡 {isAr ? (item.recommended_action_ar || item.recommended_action) : item.recommended_action}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-4 w-4" />
          {isAr ? 'الرؤى الاستراتيجية' : 'Strategic Insights'}
          <Badge variant="secondary" className="ms-auto text-xs">{newInsights.length} {isAr ? 'جديد' : 'new'}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
        {newInsights.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {isAr ? 'لا توجد رؤى جديدة — شغّل محرك التحليل لإنتاجها' : 'No new insights — run the Insight Engine to generate'}
          </p>
        ) : (
          <>
            {renderGroup(isAr ? '⚠️ مخاطر وأنماط احتيال' : '⚠️ Risks & Fraud Patterns', risks)}
            {renderGroup(isAr ? '🟢 فرص نمو' : '🟢 Growth Opportunities', opportunities)}
            {renderGroup(isAr ? '🔧 فجوات أداء وبنية' : '🔧 Performance & Architecture Gaps', gaps)}
          </>
        )}
      </CardContent>
    </Card>
  );
}
