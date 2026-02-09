import { Brain, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLiveMind } from '@/hooks/useControlTower';
import { useLanguage } from '@/contexts/LanguageContext';

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/30',
  high: 'bg-warning/10 text-warning border-warning/30',
  medium: 'bg-accent text-accent-foreground border-border',
  low: 'bg-muted text-muted-foreground border-border',
};

export function LiveMindSection() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { data, isLoading } = useLiveMind();

  const items = [
    ...(data?.priorities || []).map((p: any) => ({
      id: p.id,
      title: isAr ? (p.title_ar || p.title) : p.title,
      description: isAr ? (p.description_ar || p.description) : p.description,
      severity: p.severity || 'medium',
      confidence: p.confidence_score ?? null,
      source: p.source || 'executive_brain',
      category: p.category,
    })),
    ...(data?.criticalFindings || []).map((f: any) => ({
      id: f.id,
      title: isAr ? (f.title_ar || f.title) : f.title,
      description: isAr ? (f.description_ar || f.description) : f.description,
      severity: f.severity,
      confidence: null,
      source: f.ai_agents?.agent_name_ar || 'AI Agent',
      category: f.affected_area,
    })),
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-5 w-5 text-primary" />
          {isAr ? 'العقل الحي' : 'Live Mind'}
          {items.length > 0 && (
            <Badge variant="secondary" className="text-xs">{items.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
        ) : items.length === 0 ? (
          <div className="text-center py-6">
            <Brain className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{isAr ? 'لا توجد مخاوف حالياً' : 'No current concerns'}</p>
          </div>
        ) : (
          items.slice(0, 6).map((item) => (
            <div key={item.id} className={`rounded-lg border p-3 ${SEVERITY_STYLE[item.severity] || SEVERITY_STYLE.medium}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {item.severity === 'critical' && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                    <span className="font-medium text-sm truncate">{item.title}</span>
                  </div>
                  <p className="text-xs opacity-80 line-clamp-2">{item.description}</p>
                </div>
                {item.confidence !== null && (
                  <div className="shrink-0 text-center">
                    <span className="text-lg font-bold">{item.confidence}%</span>
                    <Progress value={item.confidence} className="w-12 h-1 mt-1" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-[10px]">{item.source}</Badge>
                {item.category && <Badge variant="outline" className="text-[10px]">{item.category}</Badge>}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
