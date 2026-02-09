import { useCapabilityMetrics } from '@/hooks/useEvolutionEngine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Users, TrendingUp, AlertTriangle, CheckCircle, ArrowUpRight } from 'lucide-react';

export function GrowthMetricsSection() {
  const { data: metrics, isLoading } = useCapabilityMetrics();

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  const latest = metrics?.[0];
  const previous = metrics?.[1];

  if (!latest) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No capability metrics recorded yet.
        </CardContent>
      </Card>
    );
  }

  const delta = (cur: number, prev?: number) => {
    if (!prev) return null;
    const diff = cur - prev;
    if (diff === 0) return null;
    return diff > 0 ? `+${diff}` : `${diff}`;
  };

  const stats = [
    { label: 'Total Agents', value: latest.total_agents, prev: previous?.total_agents, icon: Users },
    { label: 'Active Agents', value: latest.active_agents, prev: previous?.active_agents, icon: Brain },
    { label: 'Avg Confidence', value: `${latest.avg_confidence}%`, prev: previous?.avg_confidence, icon: TrendingUp, rawValue: latest.avg_confidence },
    { label: 'Skills Coverage', value: `${latest.skills_coverage}%`, prev: previous?.skills_coverage, icon: CheckCircle, rawValue: latest.skills_coverage },
    { label: 'Solved Autonomously', value: latest.solved_without_human, prev: previous?.solved_without_human, icon: ArrowUpRight },
    { label: 'Escalations', value: latest.escalations, prev: previous?.escalations, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map(s => {
          const d = delta(s.rawValue ?? (typeof s.value === 'number' ? s.value : 0), s.prev);
          return (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{s.value}</span>
                  {d && (
                    <span className={`text-xs ${d.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                      {d}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {latest.improvement_rate !== null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Improvement Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, Number(latest.improvement_rate)))}%` }}
                />
              </div>
              <span className="text-sm font-semibold">{latest.improvement_rate}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {metrics && metrics.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {metrics.slice(0, 10).map(m => (
                <div key={m.id} className="flex justify-between text-xs py-1 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground">{m.metric_date}</span>
                  <div className="flex gap-3">
                    <span>{m.total_agents} agents</span>
                    <span>{m.avg_confidence}% conf</span>
                    <span>{m.improvement_rate}% imp</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
