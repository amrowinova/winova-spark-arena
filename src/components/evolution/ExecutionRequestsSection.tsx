import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, XCircle, Clock, AlertTriangle, RotateCcw, Zap } from 'lucide-react';
import { useExecutionRequests, useApproveRequest, useRejectRequest } from '@/hooks/useExecutionZone';
import { Skeleton } from '@/components/ui/skeleton';

const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-amber-400', label: 'Pending' },
  approved: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-destructive', label: 'Rejected' },
  executing: { icon: Zap, color: 'text-primary', label: 'Executing' },
  completed: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Completed' },
  failed: { icon: AlertTriangle, color: 'text-destructive', label: 'Failed' },
  rolled_back: { icon: RotateCcw, color: 'text-orange-400', label: 'Rolled Back' },
  expired: { icon: Clock, color: 'text-muted-foreground', label: 'Expired' },
};

const riskBadge: Record<string, string> = {
  low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function ExecutionRequestsSection() {
  const [tab, setTab] = useState('pending');
  const { data: requests, isLoading } = useExecutionRequests(tab === 'all' ? undefined : tab);
  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Execution Requests</h3>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">Done</TabsTrigger>
          <TabsTrigger value="failed" className="text-xs">Failed</TabsTrigger>
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-3 mt-3">
          {(requests || []).map((req: any) => {
            const cfg = statusConfig[req.status] || statusConfig.pending;
            const StatusIcon = cfg.icon;
            return (
              <Card key={req.id} className="border-border/50">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <StatusIcon className={`h-4 w-4 shrink-0 ${cfg.color}`} />
                      <span className="text-sm font-medium text-foreground truncate">{req.title}</span>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${riskBadge[req.risk_level]}`}>
                      Risk {req.risk_score}%
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2">{req.description}</p>

                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                    <span>Type: {req.request_type}</span>
                    <span>Confidence: {req.confidence_score}%</span>
                    <span>{new Date(req.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {req.rollback_plan && (
                    <div className="text-[10px] text-muted-foreground bg-muted/30 rounded px-2 py-1">
                      🔄 Rollback: {req.rollback_plan}
                    </div>
                  )}

                  {req.status === 'pending' && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="h-7 text-xs flex-1"
                        onClick={() => approveMutation.mutate(req.id)}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs flex-1"
                        onClick={() => rejectMutation.mutate({ requestId: req.id, reason: 'Admin rejected' })}
                        disabled={rejectMutation.isPending}
                      >
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </div>
                  )}

                  {req.rejection_reason && (
                    <div className="text-[10px] text-destructive bg-destructive/5 rounded px-2 py-1">
                      Rejection: {req.rejection_reason}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {(!requests || requests.length === 0) && (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No {tab === 'all' ? '' : tab} execution requests.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
