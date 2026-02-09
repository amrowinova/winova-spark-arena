import { useForecasts } from '@/hooks/useEvolutionEngine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, AlertTriangle, ShieldAlert, Activity, Server } from 'lucide-react';

const typeIcons: Record<string, React.ReactNode> = {
  risk: <AlertTriangle className="h-4 w-4" />,
  load: <Server className="h-4 w-4" />,
  fraud: <ShieldAlert className="h-4 w-4" />,
  growth: <TrendingUp className="h-4 w-4" />,
  infra: <Activity className="h-4 w-4" />,
};

const probColor = (p: number) =>
  p >= 80 ? 'destructive' : p >= 50 ? 'default' : 'secondary';

export function ForecastsSection() {
  const { data: forecasts, isLoading } = useForecasts();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full" />)}
      </div>
    );
  }

  if (!forecasts?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No forecasts generated yet. The AI will begin analyzing trends soon.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {forecasts.map(f => (
        <Card key={f.id} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {typeIcons[f.forecast_type] || <Activity className="h-4 w-4" />}
                <CardTitle className="text-sm font-semibold">{f.title}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={probColor(f.probability)}>
                  {f.probability}% likely
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {f.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <p className="text-sm text-muted-foreground">{f.description}</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {f.time_window && <span>⏱ {f.time_window}</span>}
              {f.impact_range && <span>💥 {f.impact_range}</span>}
              {f.confidence_score && <span>🎯 {f.confidence_score}% confidence</span>}
            </div>
            {f.recommended_action && (
              <div className="bg-muted/50 rounded-md p-2 text-xs">
                <span className="font-medium">Recommended: </span>
                {f.recommended_action}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
