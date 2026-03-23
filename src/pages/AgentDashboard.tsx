import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, MessageSquare, Star, Shield, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAgents } from '@/hooks/useAgents';
import { useAgentReservations, AgentReservation } from '@/hooks/useAgentReservations';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(status: string) {
  switch (status) {
    case 'pending':   return 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30';
    case 'accepted':  return 'bg-blue-500/15 text-blue-600 border-blue-500/30';
    case 'active':    return 'bg-nova/15 text-nova border-nova/30';
    case 'completed': return 'bg-green-500/15 text-green-600 border-green-500/30';
    case 'cancelled': return 'bg-muted text-muted-foreground border-border';
    case 'disputed':  return 'bg-red-500/15 text-red-600 border-red-500/30';
    default:          return 'bg-muted text-muted-foreground border-border';
  }
}

function statusLabel(status: string, isRTL: boolean): string {
  const map: Record<string, [string, string]> = {
    pending:   ['في الانتظار', 'Pending'],
    accepted:  ['مقبول', 'Accepted'],
    active:    ['نشط', 'Active'],
    completed: ['مكتمل', 'Completed'],
    cancelled: ['ملغى', 'Cancelled'],
    disputed:  ['نزاع', 'Disputed'],
    rejected:  ['مرفوض', 'Rejected'],
  };
  const pair = map[status] ?? [status, status];
  return isRTL ? pair[0] : pair[1];
}

function timeAgo(iso: string, isRTL: boolean): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return isRTL ? 'الآن' : 'just now';
  if (m < 60) return isRTL ? `منذ ${m} دقيقة` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return isRTL ? `منذ ${h} ساعة` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return isRTL ? `منذ ${d} يوم` : `${d}d ago`;
}

// ─── Reservation card ─────────────────────────────────────────────────────────

function ReservationCard({
  r,
  isRTL,
  onNavigate,
  onAccept,
  onReject,
}: {
  r: AgentReservation;
  isRTL: boolean;
  onNavigate: (id: string) => void;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/60 rounded-xl p-3 space-y-2.5"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <Badge className={cn('text-[10px] px-1.5 py-0 border', statusColor(r.status))}>
              {statusLabel(r.status, isRTL)}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {r.type === 'deposit'
                ? (isRTL ? 'إيداع' : 'Deposit')
                : (isRTL ? 'سحب' : 'Withdraw')}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {timeAgo(r.created_at, isRTL)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-nova">И {r.nova_amount.toFixed(2)}</p>
          <p className="text-[11px] text-muted-foreground">
            {isRTL ? `عمولة ${r.commission_pct}%` : `${r.commission_pct}% fee`}
          </p>
        </div>
      </div>

      {r.fiat_amount && r.fiat_currency && (
        <p className="text-xs text-muted-foreground">
          {isRTL ? 'نقدي:' : 'Cash:'} {r.fiat_amount} {r.fiat_currency}
        </p>
      )}

      {r.notes && (
        <p className="text-xs bg-muted/40 rounded-lg px-2 py-1.5 text-muted-foreground line-clamp-2">
          {r.notes}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {onAccept && onReject && r.status === 'pending' ? (
          <>
            <Button
              size="sm"
              className="h-8 text-xs flex-1 bg-nova hover:bg-nova/90 text-white"
              onClick={() => onAccept(r.id)}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              {isRTL ? 'قبول' : 'Accept'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs flex-1 border-destructive/50 text-destructive"
              onClick={() => onReject(r.id)}
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              {isRTL ? 'رفض' : 'Reject'}
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => onNavigate(r.id)}
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1" />
            {isRTL ? 'فتح المحادثة' : 'Open Chat'}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AgentDashboard() {
  const navigate  = useNavigate();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const { myAgentProfile, fetchMyAgentProfile } = useAgents();
  const { agentReservations, fetchAgentReservations, respondToReservation } = useAgentReservations();

  const [rejectOpen, setRejectOpen]   = useState(false);
  const [rejectId, setRejectId]       = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    await fetchMyAgentProfile();
  }, [fetchMyAgentProfile]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (myAgentProfile?.id) {
      void fetchAgentReservations(myAgentProfile.id);
    }
  }, [myAgentProfile?.id, fetchAgentReservations]);

  const handleAccept = async (id: string) => {
    setActionLoading(true);
    await respondToReservation(id, true);
    if (myAgentProfile?.id) await fetchAgentReservations(myAgentProfile.id);
    setActionLoading(false);
  };

  const handleRejectOpen = (id: string) => {
    setRejectId(id);
    setRejectOpen(true);
  };

  const handleReject = async () => {
    setActionLoading(true);
    await respondToReservation(rejectId, false, rejectReason || undefined);
    setRejectOpen(false);
    setRejectReason('');
    if (myAgentProfile?.id) await fetchAgentReservations(myAgentProfile.id);
    setActionLoading(false);
  };

  // ── Filtered lists ──────────────────────────────────────────────────────────
  const pending   = agentReservations.filter((r) => r.status === 'pending');
  const active    = agentReservations.filter((r) => ['accepted', 'active'].includes(r.status));
  const history   = agentReservations.filter((r) => ['completed', 'cancelled', 'disputed', 'rejected'].includes(r.status));

  // ── Not an agent ────────────────────────────────────────────────────────────
  if (!myAgentProfile?.found || !myAgentProfile.id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
        <Shield className="w-12 h-12 text-muted-foreground" />
        <p className="text-center text-muted-foreground text-sm">
          {isRTL ? 'أنت لست وكيلاً مسجلاً بعد.' : "You're not a registered agent yet."}
        </p>
        <Button onClick={() => navigate('/agents')} className="bg-nova hover:bg-nova/90 text-white">
          {isRTL ? 'التقديم كوكيل' : 'Apply as Agent'}
        </Button>
      </div>
    );
  }

  // ── Status not approved ─────────────────────────────────────────────────────
  if (myAgentProfile.status !== 'verified') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
        <Clock className="w-12 h-12 text-yellow-500" />
        <p className="font-semibold">{isRTL ? 'طلبك قيد المراجعة' : 'Your application is under review'}</p>
        <p className="text-center text-muted-foreground text-sm">
          {isRTL
            ? 'سيتم إشعارك فور قبول طلبك من الإدارة.'
            : 'You will be notified once approved by admin.'}
        </p>
      </div>
    );
  }

  const p = myAgentProfile;

  return (
    <div className="min-h-screen bg-background pb-24" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ── Stats header ── */}
      <div className="bg-gradient-to-br from-nova/10 to-background px-4 pt-12 pb-6">
        <h1 className="text-xl font-bold mb-4">
          {isRTL ? 'لوحة الوكيل' : 'Agent Dashboard'}
        </h1>

        <div className="grid grid-cols-2 gap-3">
          {/* Trust score */}
          <div className="bg-card border border-border/60 rounded-xl p-3 col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">
                  {isRTL ? 'نسبة الثقة' : 'Trust Score'}
                </p>
                <p className={cn(
                  'text-3xl font-bold',
                  (p.trust_score ?? 0) >= 90 ? 'text-green-500'
                    : (p.trust_score ?? 0) >= 70 ? 'text-yellow-500'
                    : 'text-destructive'
                )}>
                  {p.trust_score ?? 0}%
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1 mb-1">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold text-sm">{(p.avg_rating ?? 0).toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({p.total_reviews ?? 0})</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? `عمولة ${p.commission_pct ?? 0}%` : `${p.commission_pct ?? 0}% commission`}
                </p>
              </div>
            </div>
          </div>

          {/* Completed */}
          <div className="bg-card border border-border/60 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <p className="text-xs text-muted-foreground">{isRTL ? 'مكتملة' : 'Completed'}</p>
            </div>
            <p className="text-xl font-bold">{p.total_completed ?? 0}</p>
          </div>

          {/* Disputes */}
          <div className="bg-card border border-border/60 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <p className="text-xs text-muted-foreground">{isRTL ? 'نزاعات' : 'Disputes'}</p>
            </div>
            <p className="text-xl font-bold">{(p as { total_disputes?: number }).total_disputes ?? 0}</p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="px-4 mt-4">
        <Tabs defaultValue="pending">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="pending" className="flex-1 text-xs">
              {isRTL ? 'جديد' : 'New'}
              {pending.length > 0 && (
                <span className="ml-1 bg-nova text-white text-[10px] rounded-full px-1.5 py-0.5">
                  {pending.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" className="flex-1 text-xs">
              {isRTL ? 'نشط' : 'Active'}
              {active.length > 0 && (
                <span className="ml-1 bg-blue-500 text-white text-[10px] rounded-full px-1.5 py-0.5">
                  {active.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 text-xs">
              {isRTL ? 'السجل' : 'History'}
            </TabsTrigger>
          </TabsList>

          {/* Pending */}
          <TabsContent value="pending" className="space-y-3">
            {pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <TrendingUp className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'لا توجد حجوزات جديدة' : 'No new reservations'}
                </p>
              </div>
            ) : (
              pending.map((r) => (
                <ReservationCard
                  key={r.id}
                  r={r}
                  isRTL={isRTL}
                  onNavigate={(id) => navigate(`/agents/r/${id}`)}
                  onAccept={handleAccept}
                  onReject={handleRejectOpen}
                />
              ))
            )}
          </TabsContent>

          {/* Active */}
          <TabsContent value="active" className="space-y-3">
            {active.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <MessageSquare className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'لا توجد حجوزات نشطة' : 'No active reservations'}
                </p>
              </div>
            ) : (
              active.map((r) => (
                <ReservationCard
                  key={r.id}
                  r={r}
                  isRTL={isRTL}
                  onNavigate={(id) => navigate(`/agents/r/${id}`)}
                />
              ))
            )}
          </TabsContent>

          {/* History */}
          <TabsContent value="history" className="space-y-3">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Clock className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'لا يوجد سجل بعد' : 'No history yet'}
                </p>
              </div>
            ) : (
              history.map((r) => (
                <ReservationCard
                  key={r.id}
                  r={r}
                  isRTL={isRTL}
                  onNavigate={(id) => navigate(`/agents/r/${id}`)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Reject dialog ── */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isRTL ? 'رفض الحجز' : 'Reject Reservation'}</DialogTitle>
            <DialogDescription>
              {isRTL ? 'سيتم إعادة Nova إلى المستخدم.' : 'Nova will be returned to the user.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={isRTL ? 'سبب الرفض (اختياري)' : 'Reason (optional)'}
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
              onClick={handleReject}
              disabled={actionLoading}
            >
              {isRTL ? 'تأكيد الرفض' : 'Confirm Reject'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
