import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Star, Shield, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAgents, AgentProfile } from '@/hooks/useAgents';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

// ─── Agent row ────────────────────────────────────────────────────────────────

function AgentRow({
  agent,
  isRTL,
  onApprove,
  onSuspend,
}: {
  agent: AgentProfile;
  isRTL: boolean;
  onApprove: (id: string) => void;
  onSuspend: (id: string) => void;
}) {
  const statusColors: Record<string, string> = {
    pending:   'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
    verified:  'bg-green-500/15 text-green-600 border-green-500/30',
    suspended: 'bg-red-500/15 text-red-600 border-red-500/30',
  };

  const statusLabels: Record<string, [string, string]> = {
    pending:   ['في الانتظار', 'Pending'],
    verified:  ['موثق', 'Verified'],
    suspended: ['موقوف', 'Suspended'],
  };

  const color = statusColors[agent.status ?? 'pending'] ?? statusColors.pending;
  const label = (statusLabels[agent.status ?? 'pending'] ?? statusLabels.pending)[isRTL ? 0 : 1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/60 rounded-xl p-3 space-y-2.5"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm">{agent.shop_name}</span>
            <Badge className={cn('text-[10px] px-1.5 py-0 border', color)}>{label}</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {agent.city}, {agent.country}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center justify-end gap-1">
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-semibold">{(agent.avg_rating ?? 0).toFixed(1)}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {isRTL ? `${agent.commission_pct}% عمولة` : `${agent.commission_pct}% fee`}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
        <div className="bg-muted/40 rounded-lg py-1.5">
          <p className="font-bold text-green-600">{agent.total_completed ?? 0}</p>
          <p className="text-muted-foreground">{isRTL ? 'مكتملة' : 'Done'}</p>
        </div>
        <div className="bg-muted/40 rounded-lg py-1.5">
          <p className="font-bold text-orange-500">{(agent as { total_disputes?: number }).total_disputes ?? 0}</p>
          <p className="text-muted-foreground">{isRTL ? 'نزاعات' : 'Disputes'}</p>
        </div>
        <div className="bg-muted/40 rounded-lg py-1.5">
          <p className={cn(
            'font-bold',
            (agent.trust_score ?? 0) >= 80 ? 'text-green-500'
              : (agent.trust_score ?? 0) >= 60 ? 'text-yellow-500'
              : 'text-destructive'
          )}>
            {agent.trust_score ?? 0}%
          </p>
          <p className="text-muted-foreground">{isRTL ? 'ثقة' : 'Trust'}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {agent.status !== 'verified' && (
          <Button
            size="sm"
            className="h-8 text-xs flex-1 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onApprove(agent.id)}
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            {isRTL ? 'قبول' : 'Approve'}
          </Button>
        )}
        {agent.status !== 'suspended' && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs flex-1 border-destructive/50 text-destructive hover:bg-destructive/10"
            onClick={() => onSuspend(agent.id)}
          >
            <XCircle className="w-3.5 h-3.5 mr-1" />
            {isRTL ? 'إيقاف' : 'Suspend'}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminAgents() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const { getAllAgentsForAdmin, adminManageAgent } = useAgents();

  const [allAgents, setAllAgents] = useState<AgentProfile[]>([]);
  const [loading, setLoading]     = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendId, setSuspendId]     = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getAllAgentsForAdmin();
    setAllAgents(data);
    setLoading(false);
  }, [getAllAgentsForAdmin]);

  useEffect(() => { void load(); }, [load]);

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    await adminManageAgent(id, 'approve');
    await load();
    setActionLoading(false);
  };

  const handleSuspendOpen = (id: string) => {
    setSuspendId(id);
    setSuspendOpen(true);
  };

  const handleSuspend = async () => {
    setActionLoading(true);
    await adminManageAgent(suspendId, 'suspend', suspendReason || undefined);
    setSuspendOpen(false);
    setSuspendReason('');
    await load();
    setActionLoading(false);
  };

  const pending   = allAgents.filter((a) => a.status === 'pending');
  const verified  = allAgents.filter((a) => a.status === 'verified');
  const suspended = allAgents.filter((a) => a.status === 'suspended');

  return (
    <div className="min-h-screen bg-background pb-24" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-nova" />
          <h1 className="font-bold text-lg">{isRTL ? 'إدارة الوكلاء' : 'Manage Agents'}</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 px-4 py-3">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-2.5 text-center">
          <Clock className="w-4 h-4 text-yellow-500 mx-auto mb-0.5" />
          <p className="font-bold text-lg text-yellow-600">{pending.length}</p>
          <p className="text-[10px] text-muted-foreground">{isRTL ? 'انتظار' : 'Pending'}</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-2.5 text-center">
          <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto mb-0.5" />
          <p className="font-bold text-lg text-green-600">{verified.length}</p>
          <p className="text-[10px] text-muted-foreground">{isRTL ? 'موثق' : 'Verified'}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 text-center">
          <AlertTriangle className="w-4 h-4 text-red-500 mx-auto mb-0.5" />
          <p className="font-bold text-lg text-red-600">{suspended.length}</p>
          <p className="text-[10px] text-muted-foreground">{isRTL ? 'موقوف' : 'Suspended'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <Tabs defaultValue="pending">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="pending" className="flex-1 text-xs">
              {isRTL ? 'انتظار' : 'Pending'}
              {pending.length > 0 && (
                <span className="ml-1 bg-yellow-500 text-white text-[10px] rounded-full px-1.5 py-0.5">
                  {pending.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="verified" className="flex-1 text-xs">
              {isRTL ? 'موثق' : 'Verified'}
            </TabsTrigger>
            <TabsTrigger value="suspended" className="flex-1 text-xs">
              {isRTL ? 'موقوف' : 'Suspended'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3">
            {pending.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-2">
                <Clock className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{isRTL ? 'لا توجد طلبات' : 'No pending applications'}</p>
              </div>
            ) : (
              pending.map((a) => (
                <AgentRow
                  key={a.id}
                  agent={a}
                  isRTL={isRTL}
                  onApprove={handleApprove}
                  onSuspend={handleSuspendOpen}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="verified" className="space-y-3">
            {verified.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-2">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{isRTL ? 'لا يوجد وكلاء موثقون' : 'No verified agents'}</p>
              </div>
            ) : (
              verified.map((a) => (
                <AgentRow
                  key={a.id}
                  agent={a}
                  isRTL={isRTL}
                  onApprove={handleApprove}
                  onSuspend={handleSuspendOpen}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="suspended" className="space-y-3">
            {suspended.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-2">
                <XCircle className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{isRTL ? 'لا يوجد وكلاء موقوفون' : 'No suspended agents'}</p>
              </div>
            ) : (
              suspended.map((a) => (
                <AgentRow
                  key={a.id}
                  agent={a}
                  isRTL={isRTL}
                  onApprove={handleApprove}
                  onSuspend={handleSuspendOpen}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Suspend dialog */}
      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isRTL ? 'إيقاف الوكيل' : 'Suspend Agent'}</DialogTitle>
            <DialogDescription>
              {isRTL ? 'سيتم إيقاف الوكيل مؤقتاً ولن يظهر للمستخدمين.' : 'The agent will be suspended and hidden from users.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={isRTL ? 'سبب الإيقاف…' : 'Reason for suspension…'}
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            rows={2}
          />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setSuspendOpen(false)}>
              {isRTL ? 'تراجع' : 'Back'}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleSuspend}
              disabled={actionLoading}
            >
              {isRTL ? 'تأكيد الإيقاف' : 'Confirm Suspend'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
