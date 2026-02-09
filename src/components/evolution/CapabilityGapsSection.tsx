import { useEvolutionProposals } from '@/hooks/useEvolutionEngine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, Bot } from 'lucide-react';

const urgencyVariant = (u: string) =>
  u === 'critical' ? 'destructive' : u === 'high' ? 'default' : 'secondary';

export function CapabilityGapsSection() {
  const { data: proposals, isLoading } = useEvolutionProposals();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => <Skeleton key={i} className="h-28 w-full" />)}
      </div>
    );
  }

  if (!proposals?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No capability gaps detected yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {proposals.map(p => (
        <Card key={p.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">{p.missing_capability}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={urgencyVariant(p.urgency)}>{p.urgency}</Badge>
                <Badge variant="outline" className="text-xs">{p.status}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <p className="text-sm text-muted-foreground">{p.reason}</p>
            {p.suggested_agent_type && (
              <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-md p-2">
                <Bot className="h-3.5 w-3.5" />
                <span className="font-medium">Suggested Agent:</span> {p.suggested_agent_type}
              </div>
            )}
            {p.skills_required?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {p.skills_required.map((s: string) => (
                  <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                ))}
              </div>
            )}
            <div className="flex gap-3 text-xs text-muted-foreground">
              {p.expected_impact && <span>💥 {p.expected_impact}</span>}
              {p.confidence && <span>🎯 {p.confidence}%</span>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
