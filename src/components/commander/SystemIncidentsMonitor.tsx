import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSystemIncidents, IncidentFilter, IncidentGroupBy } from '@/hooks/useSystemIncidents';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  AlertTriangle, Users, ShieldAlert, Activity, ChevronDown, ChevronUp,
  Filter, Layers, UserX, Ghost, User, Target,
} from 'lucide-react';

const FILTERS: { id: IncidentFilter; label: string; labelAr: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All', labelAr: 'الكل', icon: <Layers className="h-3 w-3" /> },
  { id: 'ghost', label: 'Ghost', labelAr: 'شبح', icon: <Ghost className="h-3 w-3" /> },
  { id: 'real', label: 'Real', labelAr: 'حقيقي', icon: <User className="h-3 w-3" /> },
];

const GROUP_OPTIONS: { id: IncidentGroupBy; label: string; labelAr: string }[] = [
  { id: 'flow', label: 'Flow', labelAr: 'التدفق' },
  { id: 'root_cause', label: 'Root Cause', labelAr: 'السبب الجذري' },
  { id: 'endpoint', label: 'Endpoint', labelAr: 'نقطة النهاية' },
  { id: 'actor', label: 'Actor', labelAr: 'الممثل' },
];

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'border-destructive/50 text-destructive bg-destructive/10',
  high: 'border-warning/50 text-warning bg-warning/10',
  medium: 'border-primary/50 text-primary bg-primary/10',
  low: 'border-muted-foreground/30 text-muted-foreground',
  info: 'border-border text-muted-foreground',
};

export function SystemIncidentsMonitor() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [filter, setFilter] = useState<IncidentFilter>('all');
  const [groupBy, setGroupBy] = useState<IncidentGroupBy>('flow');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [showOffenders, setShowOffenders] = useState(false);

  const { data, isLoading } = useSystemIncidents(filter, groupBy);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          {isAr ? 'مراقب حوادث النظام' : 'System Incidents Monitor'}
          {data && data.summary.total > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {data.summary.total}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Filter className="h-3 w-3 text-muted-foreground" />
            {FILTERS.map(f => (
              <Button
                key={f.id}
                size="sm"
                variant={filter === f.id ? 'default' : 'outline'}
                onClick={() => setFilter(f.id)}
                className="h-7 text-xs gap-1"
              >
                {f.icon}
                {isAr ? f.labelAr : f.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1 ms-auto">
            <Layers className="h-3 w-3 text-muted-foreground" />
            {GROUP_OPTIONS.map(g => (
              <Button
                key={g.id}
                size="sm"
                variant={groupBy === g.id ? 'secondary' : 'ghost'}
                onClick={() => setGroupBy(g.id)}
                className="h-7 text-[10px]"
              >
                {isAr ? g.labelAr : g.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <MiniStat value={data.summary.critical} label={isAr ? 'حرج' : 'Critical'} color="text-destructive" />
            <MiniStat value={data.summary.high} label={isAr ? 'مرتفع' : 'High'} color="text-warning" />
            <MiniStat value={data.summary.uniqueActors} label={isAr ? 'مستخدمون متأثرون' : 'Users Affected'} />
            <MiniStat value={data.summary.ghostCount} label={isAr ? 'حوادث شبح' : 'Ghost Incidents'} />
            <MiniStat value={data.summary.realCount} label={isAr ? 'حوادث حقيقية' : 'Real Incidents'} />
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
        ) : !data || data.groups.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-8 w-8 mx-auto mb-2 text-success/40" />
            <p className="text-sm text-muted-foreground">{isAr ? 'لا توجد حوادث مسجلة' : 'No incidents recorded'}</p>
          </div>
        ) : (
          <>
            {/* Grouped Incidents */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {data.groups.map(group => {
                const isExpanded = expandedGroup === group.key;
                return (
                  <div key={group.key} className="rounded-lg border bg-card">
                    <div
                      className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
                      onClick={() => setExpandedGroup(isExpanded ? null : group.key)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{group.label}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {group.totalCount} {isAr ? 'حادثة' : 'incidents'}
                          </span>
                          {group.criticalCount > 0 && (
                            <Badge variant="destructive" className="text-[9px] h-4">
                              {group.criticalCount} {isAr ? 'حرج' : 'critical'}
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Users className="h-2.5 w-2.5" />
                            {group.affectedUsers} {isAr ? 'متأثر' : 'affected'}
                          </span>
                          {group.topOffender && group.topOffender.count > 2 && (
                            <Badge variant="outline" className="text-[9px] h-4 border-warning/50 text-warning">
                              <UserX className="h-2.5 w-2.5 me-0.5" />
                              {group.topOffender.username} ({group.topOffender.count}×)
                            </Badge>
                          )}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>

                    {isExpanded && (
                      <div className="border-t px-3 py-2 space-y-1.5">
                        {group.incidents.slice(0, 20).map(inc => (
                          <div key={inc.id} className="flex items-start gap-2 text-[11px] py-1">
                            <Badge variant="outline" className={`text-[9px] shrink-0 ${SEVERITY_COLORS[inc.severity] || ''}`}>
                              {inc.severity}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium">{inc.action_type}</span>
                                {inc.is_ghost && <Ghost className="h-2.5 w-2.5 text-muted-foreground" />}
                                {inc.screen && (
                                  <span className="text-muted-foreground">@ {inc.screen}</span>
                                )}
                              </div>
                              {inc.error_message && (
                                <p className="text-muted-foreground truncate">{inc.error_message}</p>
                              )}
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                                {inc.actor_username && (
                                  <span className="flex items-center gap-0.5">
                                    <User className="h-2.5 w-2.5" /> {inc.actor_username}
                                  </span>
                                )}
                                {inc.target_username && (
                                  <span className="flex items-center gap-0.5">
                                    <Target className="h-2.5 w-2.5" /> → {inc.target_username}
                                  </span>
                                )}
                                {inc.latency_ms != null && <span>{inc.latency_ms}ms</span>}
                                <span>{new Date(inc.created_at).toLocaleTimeString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {group.incidents.length > 20 && (
                          <p className="text-[10px] text-muted-foreground text-center py-1">
                            +{group.incidents.length - 20} {isAr ? 'أخرى' : 'more'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Repeat Offenders */}
            {data.repeatOffenders.length > 0 && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1.5 w-full justify-start"
                  onClick={() => setShowOffenders(!showOffenders)}
                >
                  <UserX className="h-3.5 w-3.5 text-warning" />
                  {isAr ? 'المكررون الأكثر' : 'Top Repeat Offenders'}
                  <Badge variant="outline" className="text-[9px] ms-1">{data.repeatOffenders.length}</Badge>
                  {showOffenders ? <ChevronUp className="h-3 w-3 ms-auto" /> : <ChevronDown className="h-3 w-3 ms-auto" />}
                </Button>
                {showOffenders && (
                  <div className="space-y-1 mt-1 ps-2">
                    {data.repeatOffenders.map((o, i) => (
                      <div key={o.username} className="flex items-center gap-2 text-[11px]">
                        <span className="text-muted-foreground w-4 text-end">{i + 1}.</span>
                        <span className="font-medium">{o.username}</span>
                        {o.isGhost && <Ghost className="h-2.5 w-2.5 text-muted-foreground" />}
                        <Badge variant="outline" className="text-[9px] ms-auto">{o.count} {isAr ? 'حادثة' : 'incidents'}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MiniStat({ value, label, color }: { value: number; label: string; color?: string }) {
  return (
    <div className="rounded-lg border p-2 bg-card text-center">
      <p className={`text-lg font-bold ${color || ''}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
