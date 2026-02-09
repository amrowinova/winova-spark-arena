import { FlaskConical, FileCode, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useExperiments } from '@/hooks/useControlTower';
import { useLanguage } from '@/contexts/LanguageContext';

export function ExperimentsSection() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { data, isLoading } = useExperiments();

  const reports = data?.reports || [];
  const products = data?.productProposals || [];
  const hasData = reports.length > 0 || products.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="h-5 w-5 text-accent-foreground" />
          {isAr ? 'التجارب والمعمل' : 'Experiments / Sandbox'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
        ) : !hasData ? (
          <div className="text-center py-6">
            <FlaskConical className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{isAr ? 'لا توجد تجارب حالياً' : 'No experiments yet'}</p>
          </div>
        ) : (
          <>
            {reports.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                  <FileCode className="h-3 w-3" />
                  {isAr ? 'تقارير المهندس' : 'Engineer Reports'}
                </h4>
                <div className="space-y-2">
                  {reports.map((r: any) => (
                    <div key={r.id} className="rounded-lg border bg-card/50 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-[10px]">{r.analysis_type}</Badge>
                        <Badge variant={r.critical_issues > 0 ? 'destructive' : 'secondary'} className="text-[10px]">
                          {r.critical_issues} {isAr ? 'حرج' : 'critical'}
                        </Badge>
                      </div>
                      <p className="text-xs">{isAr ? (r.summary_ar || r.summary) : r.summary}</p>
                      <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                        <span>{r.findings_count} {isAr ? 'اكتشاف' : 'findings'}</span>
                        <span>{r.patches_proposed} {isAr ? 'تصحيح' : 'patches'}</span>
                        {r.duration_ms && <span>{Math.round(r.duration_ms / 1000)}s</span>}
                      </div>
                      {r.github_pr_url && (
                        <a href={r.github_pr_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 block">
                          PR #{r.github_pr_number}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {products.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                  <TrendingUp className="h-3 w-3" />
                  {isAr ? 'اقتراحات المنتج' : 'Product Proposals'}
                </h4>
                <div className="space-y-2">
                  {products.map((p: any) => (
                    <div key={p.id} className="rounded-lg border bg-card/50 p-3">
                      <p className="text-sm font-medium">{isAr ? (p.title_ar || p.title) : p.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {isAr ? (p.description_ar || p.description) : p.description}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px]">{p.opportunity_type}</Badge>
                        {p.confidence_score && (
                          <Badge variant="secondary" className="text-[10px]">{p.confidence_score}%</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
