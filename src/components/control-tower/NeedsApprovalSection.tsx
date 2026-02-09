import { ShieldCheck, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePendingProposals } from '@/hooks/useControlTower';
import { useLanguage } from '@/contexts/LanguageContext';

const PRIORITY_STYLE: Record<string, string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/30',
  high: 'bg-warning/10 text-warning border-warning/30',
  medium: 'bg-muted text-muted-foreground border-border',
  low: 'bg-muted text-muted-foreground border-border',
};

export function NeedsApprovalSection() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { data: proposals = [], isLoading } = usePendingProposals();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-5 w-5 text-warning" />
          {isAr ? 'بانتظار الموافقة' : 'Needs Approval'}
          {proposals.length > 0 && (
            <Badge variant="destructive" className="text-xs">{proposals.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
        ) : proposals.length === 0 ? (
          <div className="text-center py-6">
            <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-success/30" />
            <p className="text-sm text-muted-foreground">{isAr ? 'لا توجد طلبات معلقة' : 'No pending requests'}</p>
          </div>
        ) : (
          proposals.slice(0, 8).map((p: any) => (
            <div key={p.id} className={`rounded-lg border p-3 ${PRIORITY_STYLE[p.priority] || PRIORITY_STYLE.medium}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{isAr ? (p.title_ar || p.title) : p.title}</p>
                  <p className="text-xs opacity-80 line-clamp-2 mt-0.5">
                    {isAr ? (p.description_ar || p.description) : p.description}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">{p.priority}</Badge>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}
                </span>
                {p.ai_agents?.agent_name_ar && (
                  <Badge variant="outline" className="text-[10px]">{p.ai_agents.agent_name_ar}</Badge>
                )}
                {p.risk_level && (
                  <Badge variant="outline" className="text-[10px]">⚠️ {p.risk_level}</Badge>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
