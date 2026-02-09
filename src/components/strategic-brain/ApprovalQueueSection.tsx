import { usePendingProposals } from '@/hooks/useControlTower';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function ApprovalQueueSection() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { data, isLoading } = usePendingProposals();

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-20 w-full" /></CardContent>
      </Card>
    );
  }

  const priorityEmoji: Record<string, string> = {
    critical: '🔴',
    high: '🟡',
    medium: '🔵',
    low: '⚪',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" />
          {isAr ? 'بانتظار الموافقة' : 'Awaiting Approval'}
          {(data || []).length > 0 && (
            <Badge variant="destructive" className="ms-auto text-xs">{data?.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-72 overflow-y-auto">
        {(!data || data.length === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {isAr ? 'لا توجد اقتراحات معلقة' : 'No pending proposals'}
          </p>
        ) : (
          data.map((p: any) => (
            <div key={p.id} className="rounded-lg border p-3 space-y-1">
              <div className="flex items-start gap-2">
                <span>{priorityEmoji[p.priority] || '⚪'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{isAr ? (p.title_ar || p.title) : p.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {isAr ? (p.description_ar || p.description) : p.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Badge variant="outline" className="text-[10px]">{p.proposal_type}</Badge>
                {p.affected_area && <span>📍 {p.affected_area}</span>}
                {p.ai_agents?.agent_name_ar && <span>🤖 {p.ai_agents.agent_name_ar}</span>}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
