import { useExperiments } from '@/hooks/useControlTower';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FlaskConical } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function ExperimentsLabSection() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { data, isLoading } = useExperiments();

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-20 w-full" /></CardContent>
      </Card>
    );
  }

  const reports = data?.reports || [];
  const proposals = data?.productProposals || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="h-4 w-4" />
          {isAr ? 'وضع التجارب' : 'Experiment Mode'}
          <Badge variant="outline" className="ms-auto text-[10px]">SANDBOX</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-72 overflow-y-auto">
        {reports.length === 0 && proposals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {isAr ? 'لا توجد تجارب حالية' : 'No active experiments'}
          </p>
        ) : (
          <>
            {reports.map((r: any) => (
              <div key={r.id} className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{r.analysis_type}</Badge>
                  <Badge variant={r.critical_issues > 0 ? 'destructive' : 'secondary'} className="text-[10px]">
                    {r.critical_issues} {isAr ? 'حرج' : 'critical'}
                  </Badge>
                </div>
                <p className="text-sm">{isAr ? (r.summary_ar || r.summary) : r.summary}</p>
                <p className="text-[10px] text-muted-foreground">
                  {r.findings_count} {isAr ? 'نتائج' : 'findings'} · {r.patches_proposed} {isAr ? 'تعديلات' : 'patches'}
                </p>
              </div>
            ))}
            {proposals.map((p: any) => (
              <div key={p.id} className="rounded-lg border p-3 space-y-1">
                <p className="text-sm font-medium">{isAr ? (p.title_ar || p.title) : p.title}</p>
                <p className="text-xs text-muted-foreground">{isAr ? (p.description_ar || p.description) : p.description}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>🎯 {p.confidence_score}%</span>
                  <span>📊 {p.estimated_impact}</span>
                  <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
                </div>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
