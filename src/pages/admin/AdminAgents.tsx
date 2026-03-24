import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Star, Shield, AlertTriangle, Clock, RefreshCw, Wallet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAgents, AgentProfile, type DepositRequest } from '@/hooks/useAgents';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBanner } from '@/contexts/BannerContext';
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

const PAYMENT_LABELS: Record<string, [string, string]> = {
  bank_transfer: ['تحويل بنكي', 'Bank Transfer'],
  vodafone_cash: ['فودافون كاش', 'Vodafone Cash'],
  stc_pay:       ['STC Pay', 'STC Pay'],
  easypaisa:     ['Easypaisa', 'Easypaisa'],
  dana:          ['Dana', 'Dana'],
  instapay:      ['InstaPay', 'InstaPay'],
  other:         ['أخرى', 'Other'],
};

export default function AdminAgents() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { success: showSuccess, error: showError } = useBanner();

  const { getAllAgentsForAdmin, adminManageAgent, adminGetDepositRequests, adminApproveDeposit, adminRejectDeposit } = useAgents();

  const [allAgents, setAllAgents]   = useState<AgentProfile[]>([]);
  const [loading, setLoading]       = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendId, setSuspendId]     = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Deposit state
  const [deposits, setDeposits]         = useState<DepositRequest[]>([]);
  const [depositFilter, setDepositFilter] = useState('pending');
  const [approveOpen, setApproveOpen]   = useState(false);
  const [rejectOpen, setRejectOpen]     = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<DepositRequest | null>(null);
  const [adminNotes, setAdminNotes]     = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const loadDeposits = useCallback(async () => {
    const data = await adminGetDepositRequests(depositFilter);
    setDeposits(data);
  }, [adminGetDepositRequests, depositFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    const [agentsData] = await Promise.all([
      getAllAgentsForAdmin(),
      loadDeposits(),
    ]);
    setAllAgents(agentsData);
    setLoading(false);
  }, [getAllAgentsForAdmin, loadDeposits]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => { void loadDeposits(); }, [loadDeposits]);

  const handleApproveDeposit = async () => {
    if (!selectedDeposit) return;
    setActionLoading(true);
    const result = await adminApproveDeposit(selectedDeposit.id, adminNotes || undefined);
    setActionLoading(false);
    if (!result.success) {
      showError(result.error ?? (isRTL ? 'فشل' : 'Failed'));
      return;
    }
    showSuccess(isRTL ? '✅ تم قبول طلب الشحن وإضافة الرصيد' : '✅ Deposit approved and balance added');
    setApproveOpen(false);
    setAdminNotes('');
    setSelectedDeposit(null);
    await loadDeposits();
  };

  const handleRejectDeposit = async () => {
    if (!selectedDeposit) return;
    setActionLoading(true);
    const result = await adminRejectDeposit(selectedDeposit.id, rejectReason || undefined);
    setActionLoading(false);
    if (!result.success) {
      showError(result.error ?? (isRTL ? 'فشل' : 'Failed'));
      return;
    }
    showSuccess(isRTL ? 'تم رفض الطلب' : 'Request rejected');
    setRejectOpen(false);
    setRejectReason('');
    setSelectedDeposit(null);
    await loadDeposits();
  };

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

  const agentPending   = allAgents.filter((a) => a.status === 'pending');
  const agentVerified  = allAgents.filter((a) => a.status === 'verified' || a.status === 'active');
  const agentSuspended = allAgents.filter((a) => a.status === 'suspended');
  const depositPending = deposits.filter((d) => d.status === 'pending');

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
      <div className="grid grid-cols-4 gap-2 px-4 py-3">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-2 text-center">
          <Clock className="w-4 h-4 text-yellow-500 mx-auto mb-0.5" />
          <p className="font-bold text-base text-yellow-600">{agentPending.length}</p>
          <p className="text-[10px] text-muted-foreground">{isRTL ? 'انتظار' : 'Pending'}</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-2 text-center">
          <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto mb-0.5" />
          <p className="font-bold text-base text-green-600">{agentVerified.length}</p>
          <p className="text-[10px] text-muted-foreground">{isRTL ? 'موثق' : 'Verified'}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2 text-center">
          <AlertTriangle className="w-4 h-4 text-red-500 mx-auto mb-0.5" />
          <p className="font-bold text-base text-red-600">{agentSuspended.length}</p>
          <p className="text-[10px] text-muted-foreground">{isRTL ? 'موقوف' : 'Suspended'}</p>
        </div>
        <div className="bg-nova/10 border border-nova/20 rounded-xl p-2 text-center">
          <Wallet className="w-4 h-4 text-nova mx-auto mb-0.5" />
          <p className="font-bold text-base text-nova">{depositPending.length}</p>
          <p className="text-[10px] text-muted-foreground">{isRTL ? 'شحن' : 'Deposits'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <Tabs defaultValue="pending">
          <TabsList className="w-full mb-4 grid grid-cols-4">
            <TabsTrigger value="pending" className="text-xs">
              {isRTL ? 'انتظار' : 'Pending'}
              {agentPending.length > 0 && (
                <span className="ml-1 bg-yellow-500 text-white text-[10px] rounded-full px-1.5 py-0.5">
                  {agentPending.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="verified" className="text-xs">
              {isRTL ? 'موثق' : 'Verified'}
            </TabsTrigger>
            <TabsTrigger value="suspended" className="text-xs">
              {isRTL ? 'موقوف' : 'Suspended'}
            </TabsTrigger>
            <TabsTrigger value="deposits" className="text-xs">
              {isRTL ? 'شحن' : 'Deposits'}
              {depositPending.length > 0 && (
                <span className="ml-1 bg-nova text-white text-[10px] rounded-full px-1.5 py-0.5">
                  {depositPending.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3">
            {agentPending.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-2">
                <Clock className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{isRTL ? 'لا توجد طلبات' : 'No pending applications'}</p>
              </div>
            ) : (
              agentPending.map((a) => (
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
            {agentVerified.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-2">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{isRTL ? 'لا يوجد وكلاء موثقون' : 'No verified agents'}</p>
              </div>
            ) : (
              agentVerified.map((a) => (
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
            {agentSuspended.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-2">
                <XCircle className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{isRTL ? 'لا يوجد وكلاء موقوفون' : 'No suspended agents'}</p>
              </div>
            ) : (
              agentSuspended.map((a) => (
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

          {/* ── Deposits Tab ── */}
          <TabsContent value="deposits" className="space-y-3">
            {/* Filter row */}
            <div className="flex gap-2">
              {(['pending','approved','rejected','all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setDepositFilter(f)}
                  className={cn(
                    'flex-1 text-[11px] py-1.5 rounded-lg border transition-colors',
                    depositFilter === f
                      ? 'bg-nova/15 border-nova/40 text-nova font-medium'
                      : 'border-border text-muted-foreground'
                  )}
                >
                  {f === 'pending'  ? (isRTL ? 'انتظار' : 'Pending')
                   : f === 'approved' ? (isRTL ? 'موافق' : 'Approved')
                   : f === 'rejected' ? (isRTL ? 'مرفوض' : 'Rejected')
                   : (isRTL ? 'الكل' : 'All')}
                </button>
              ))}
            </div>

            {deposits.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-2">
                <Wallet className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'لا توجد طلبات' : 'No deposit requests'}
                </p>
              </div>
            ) : (
              deposits.map((dr) => (
                <motion.div
                  key={dr.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border/60 rounded-xl p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{dr.agent_shop_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {dr.agent_city}, {dr.agent_country}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-nova">И {dr.amount_nova}</p>
                      {dr.agent_balance !== undefined && (
                        <p className="text-[10px] text-muted-foreground">
                          {isRTL ? 'رصيده:' : 'Balance:'} И {dr.agent_balance.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge className={cn('text-[10px] px-1.5 py-0 border',
                      dr.status === 'pending'  ? 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30'
                      : dr.status === 'approved' ? 'bg-green-500/15 text-green-600 border-green-500/30'
                      : 'bg-red-500/15 text-red-600 border-red-500/30'
                    )}>
                      {dr.status === 'pending' ? (isRTL ? 'انتظار' : 'Pending')
                       : dr.status === 'approved' ? (isRTL ? 'موافق' : 'Approved')
                       : (isRTL ? 'مرفوض' : 'Rejected')}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {PAYMENT_LABELS[dr.payment_method]?.[isRTL ? 0 : 1] ?? dr.payment_method}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {dr.payment_reference}
                    </span>
                  </div>

                  {dr.admin_notes && (
                    <p className="text-[11px] bg-muted/40 rounded px-2 py-1 text-muted-foreground">
                      {dr.admin_notes}
                    </p>
                  )}

                  {dr.status === 'pending' && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => { setSelectedDeposit(dr); setApproveOpen(true); }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        {isRTL ? 'موافقة' : 'Approve'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs border-destructive/50 text-destructive"
                        onClick={() => { setSelectedDeposit(dr); setRejectOpen(true); }}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        {isRTL ? 'رفض' : 'Reject'}
                      </Button>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Approve Deposit Dialog ── */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isRTL ? 'قبول طلب الشحن' : 'Approve Deposit Request'}</DialogTitle>
            <DialogDescription>
              {selectedDeposit && (
                isRTL
                  ? `إضافة И ${selectedDeposit.amount_nova} لرصيد الوكيل ${selectedDeposit.agent_shop_name}`
                  : `Add И ${selectedDeposit.amount_nova} to agent ${selectedDeposit.agent_shop_name} balance`
              )}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={isRTL ? 'ملاحظة للوكيل (اختياري)' : 'Note to agent (optional)'}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={2}
          />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setApproveOpen(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleApproveDeposit}
              disabled={actionLoading}
            >
              {actionLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : (isRTL ? 'تأكيد الموافقة' : 'Confirm Approve')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Reject Deposit Dialog ── */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isRTL ? 'رفض طلب الشحن' : 'Reject Deposit Request'}</DialogTitle>
            <DialogDescription>
              {isRTL ? 'سيتم إشعار الوكيل بالرفض.' : 'The agent will be notified of the rejection.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={isRTL ? 'سبب الرفض…' : 'Reason for rejection…'}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={2}
          />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setRejectOpen(false)}>
              {isRTL ? 'تراجع' : 'Back'}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleRejectDeposit}
              disabled={actionLoading}
            >
              {actionLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : (isRTL ? 'تأكيد الرفض' : 'Confirm Reject')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
