import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, Zap } from 'lucide-react';
import { useExecutionPermissions, useTogglePermission } from '@/hooks/useExecutionZone';
import { Skeleton } from '@/components/ui/skeleton';

const categoryIcons: Record<string, typeof Shield> = {
  infra: Shield,
  performance: Zap,
  fraud: Lock,
  p2p: Shield,
  general: Shield,
};

const riskColors: Record<string, string> = {
  low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function ExecutionPermissionsSection() {
  const { data: permissions, isLoading } = useExecutionPermissions();
  const toggleMutation = useTogglePermission();

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }

  const grouped = (permissions || []).reduce((acc: Record<string, any[]>, p: any) => {
    (acc[p.category] = acc[p.category] || []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Execution Permissions</h3>
        <Badge variant="outline" className="text-[10px]">{permissions?.length || 0} defined</Badge>
      </div>

      {Object.entries(grouped).map(([category, perms]) => {
        const Icon = categoryIcons[category] || Shield;
        return (
          <div key={category} className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
              <Icon className="h-3 w-3" />
              {category}
            </div>
            {(perms as any[]).map((p: any) => (
              <Card key={p.id} className="border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{p.permission_key}</span>
                        <Badge variant="outline" className={`text-[10px] ${riskColors[p.max_risk_level]}`}>
                          {p.max_risk_level}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>Threshold: {p.auto_execute_threshold}%</span>
                        <span>Daily: {p.daily_executions_used}/{p.max_daily_executions}</span>
                        <span>Cooldown: {p.cooldown_minutes}m</span>
                        {p.requires_approval && <Badge variant="outline" className="text-[10px]">Approval Required</Badge>}
                      </div>
                    </div>
                    <Switch
                      checked={p.is_enabled}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: p.id, enabled: checked })}
                      disabled={toggleMutation.isPending}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      })}

      {(!permissions || permissions.length === 0) && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No execution permissions defined yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
