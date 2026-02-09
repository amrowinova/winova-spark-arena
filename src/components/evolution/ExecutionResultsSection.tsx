import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, RotateCcw, TrendingUp, TrendingDown } from 'lucide-react';
import { useExecutionResults } from '@/hooks/useExecutionZone';
import { Skeleton } from '@/components/ui/skeleton';

const statusIcons: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  success: { icon: CheckCircle2, color: 'text-emerald-400' },
  partial: { icon: TrendingUp, color: 'text-amber-400' },
  failed: { icon: XCircle, color: 'text-destructive' },
  rolled_back: { icon: RotateCcw, color: 'text-orange-400' },
};

export function ExecutionResultsSection() {
  const { data: results, isLoading } = useExecutionResults();

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  // Compute stats
  const total = results?.length || 0;
  const successCount = results?.filter((r: any) => r.execution_status === 'success').length || 0;
  const rollbackCount = results?.filter((r: any) => r.was_rolled_back).length || 0;
  const avgDuration = total > 0 ? Math.round((results || []).reduce((s: number, r: any) => s + (r.duration_ms || 0), 0) / total) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Execution Results</h3>
        <Badge variant="outline" className="text-[10px]">{total} total</Badge>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Total', value: total },
          { label: 'Success', value: successCount },
          { label: 'Rollbacks', value: rollbackCount },
          { label: 'Avg ms', value: avgDuration },
        ].map(s => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-2 text-center">
              <div className="text-lg font-bold text-foreground">{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent results */}
      {(results || []).slice(0, 10).map((r: any) => {
        const cfg = statusIcons[r.execution_status] || statusIcons.failed;
        const Icon = cfg.icon;
        return (
          <Card key={r.id} className="border-border/50">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={`h-4 w-4 shrink-0 ${cfg.color}`} />
                  <span className="text-xs font-medium text-foreground">{r.execution_status}</span>
                  {r.was_rolled_back && <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-400">Rolled back</Badge>}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {r.confidence_delta !== 0 && (
                    <span className={`flex items-center gap-0.5 ${r.confidence_delta > 0 ? 'text-emerald-400' : 'text-destructive'}`}>
                      {r.confidence_delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {r.confidence_delta > 0 ? '+' : ''}{r.confidence_delta}
                    </span>
                  )}
                  {r.duration_ms && <span>{r.duration_ms}ms</span>}
                </div>
              </div>
              {r.error_message && (
                <p className="text-[10px] text-destructive mt-1 line-clamp-2">{r.error_message}</p>
              )}
              <div className="text-[10px] text-muted-foreground mt-1">
                {new Date(r.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {total === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No execution results yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
