import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type IncidentFilter = 'all' | 'ghost' | 'real';
export type IncidentGroupBy = 'root_cause' | 'endpoint' | 'flow' | 'actor';

export interface SystemIncident {
  id: string;
  actor_user_id: string | null;
  target_user_id: string | null;
  actor_username: string | null;
  target_username: string | null;
  is_ghost: boolean;
  screen: string | null;
  feature: string | null;
  action_type: string;
  error_message: string | null;
  error_code: string | null;
  severity: string;
  category: string | null;
  endpoint: string | null;
  flow: string | null;
  root_cause: string | null;
  frequency: number;
  latency_ms: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface IncidentGroup {
  key: string;
  label: string;
  incidents: SystemIncident[];
  totalCount: number;
  criticalCount: number;
  affectedUsers: number;
  topOffender: { username: string; count: number } | null;
}

export function useSystemIncidents(filter: IncidentFilter = 'all', groupBy: IncidentGroupBy = 'flow') {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['system-incidents', filter, groupBy],
    queryFn: async () => {
      let query = supabase
        .from('system_incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (filter === 'ghost') query = query.eq('is_ghost', true);
      if (filter === 'real') query = query.eq('is_ghost', false);

      const { data, error } = await query;
      if (error) throw error;

      const incidents = (data || []) as unknown as SystemIncident[];

      // Group incidents
      const groupMap = new Map<string, SystemIncident[]>();
      for (const inc of incidents) {
        const key = getGroupKey(inc, groupBy);
        if (!groupMap.has(key)) groupMap.set(key, []);
        groupMap.get(key)!.push(inc);
      }

      const groups: IncidentGroup[] = [];
      for (const [key, items] of groupMap) {
        const actorCounts = new Map<string, number>();
        const affectedUserSet = new Set<string>();

        for (const item of items) {
          if (item.actor_username) {
            actorCounts.set(item.actor_username, (actorCounts.get(item.actor_username) || 0) + 1);
          }
          if (item.actor_user_id) affectedUserSet.add(item.actor_user_id);
          if (item.target_user_id) affectedUserSet.add(item.target_user_id);
        }

        let topOffender: { username: string; count: number } | null = null;
        let maxCount = 0;
        for (const [username, count] of actorCounts) {
          if (count > maxCount) { maxCount = count; topOffender = { username, count }; }
        }

        groups.push({
          key,
          label: key || 'Uncategorized',
          incidents: items,
          totalCount: items.length,
          criticalCount: items.filter(i => i.severity === 'critical' || i.severity === 'high').length,
          affectedUsers: affectedUserSet.size,
          topOffender,
        });
      }

      // Sort by critical count then total
      groups.sort((a, b) => b.criticalCount - a.criticalCount || b.totalCount - a.totalCount);

      // Summary stats
      const repeatOffenders = new Map<string, number>();
      for (const inc of incidents) {
        if (inc.actor_username) {
          repeatOffenders.set(inc.actor_username, (repeatOffenders.get(inc.actor_username) || 0) + 1);
        }
      }
      const offenderList = [...repeatOffenders.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([username, count]) => ({ username, count, isGhost: username.startsWith('ghost_agent_') }));

      return {
        incidents,
        groups,
        summary: {
          total: incidents.length,
          critical: incidents.filter(i => i.severity === 'critical').length,
          high: incidents.filter(i => i.severity === 'high').length,
          medium: incidents.filter(i => i.severity === 'medium').length,
          low: incidents.filter(i => i.severity === 'low').length,
          ghostCount: incidents.filter(i => i.is_ghost).length,
          realCount: incidents.filter(i => !i.is_ghost).length,
          uniqueActors: new Set(incidents.map(i => i.actor_user_id).filter(Boolean)).size,
          uniqueFlows: new Set(incidents.map(i => i.flow).filter(Boolean)).size,
        },
        repeatOffenders: offenderList,
      };
    },
    enabled: !!user,
    refetchInterval: 15000,
  });
}

function getGroupKey(inc: SystemIncident, groupBy: IncidentGroupBy): string {
  switch (groupBy) {
    case 'root_cause': return inc.root_cause || inc.error_code || 'unknown';
    case 'endpoint': return inc.endpoint || inc.action_type || 'unknown';
    case 'flow': return inc.flow || inc.feature || 'unknown';
    case 'actor': return inc.actor_username || 'anonymous';
    default: return 'unknown';
  }
}
