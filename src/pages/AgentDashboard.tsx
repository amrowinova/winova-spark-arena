import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, MessageSquare, Star, Shield, TrendingUp, Clock, AlertTriangle, Wallet, ArrowDownLeft, ArrowUpRight, PlusCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAgents, type DepositRequest } from '@/hooks/useAgents';
import { useAgentReservations, AgentReservation } from '@/hooks/useAgentReservations';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBanner } from '@/contexts/BannerContext';
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

const PAYMENT_METHODS = [
  { value: 'bank_transfer',  ar: 'تحويل بنكي',       en: 'Bank Transfer' },
  { value: 'vodafone_cash',  ar: 'فودافون كاش',      en: 'Vodafone Cash' },
  { value: 'stc_pay',        ar: 'STC Pay',           en: 'STC Pay' },
  { value: 'easypaisa',      ar: 'Easypaisa',         en: 'Easypaisa' },
  { value: 'dana',           ar: 'Dana',              en: 'Dana' },
  { value: 'instapay',       ar: 'InstaPay',          en: 'InstaPay' },
  { value: 'other',          ar: 'أخرى',              en: 'Other' },
];

function depositStatusColor(status: string) {
  switch (status) {
    case 'pending':   return 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30';
    case 'approved':  return 'bg-green-500/15 text-green-600 border-green-500/30';
    case 'rejected':  return 'bg-red-500/15 text-red-600 border-red-500/30';
    case 'completed': return 'bg-nova/15 text-nova border-nova/30';
    default:          return 'bg-muted text-muted-foreground';
  }
}

export default function AgentDashboard() {
  const navigate  = useNavigate();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { success: showSuccess, error: showError } = useBanner();

  const { myAgentProfile, fetchMyAgentProfile, requestDeposit, fetchMyDepositRequests } = useAgents();
  const { agentReservations, fetchAgentReservations, respondToReservation } = useAgentReservations();

  const [rejectOpen, setRejectOpen]   = useState(false);
  const [rejectId, setRejectId]       = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Deposit state
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [depositOpen, setDepositOpen]     = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('');
  const [depositRef, setDepositRef]       = useState('');
  const [depositLoading, setDepositLoading] = useState(false);

  const loadDeposits = useCallback(async () => {
    const data = await fetchMyDepositRequests();
    setDepositRequests(data);
  }, [fetchMyDepositRequests]);

  const load = useCallback(async () => {
    await fetchMyAgentProfile();
    await loadDeposits();
  }, [fetchMyAgentProfile, loadDeposits]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (myAgentProfile?.id) {
      void fetchAgentReservations(myAgentProfile.id);
    }
  }, [myAgentProfile?.id, fetchAgentReservations]);

  const handleRequestDeposit = async () => {
    const amt = parseFloat(depositAmount);
    if (!depositAmount || isNaN(amt) || amt <= 0) {
      showError(isRTL ? 'أدخل مبلغاً صحيحاً' : 'Enter a valid amount');
      return;
    }
    if (!depositMethod) {
      showError(isRTL ? 'اختر طريقة الدفع' : 'Select a payment method');
      return;
    }
    if (!depositRef.trim()) {
      showError(isRTL ? 'أدخل رقم المرجع' : 'Enter reference number');
      return;
    }
    setDepositLoading(true);
    const result = await requestDeposit(amt, depositMethod, depositRef.trim());
    setDepositLoading(false);
    if (!result.success) {
      showError(result.error ?? (isRTL ? 'فشل الطلب' : 'Request failed'));
      return;
    }
    showSuccess(isRTL ? '✅ تم إرسال طلب الشحن — سيُراجع خلال 24 ساعة' : '✅ Deposit request sent — will be reviewed within 24 hours');
    setDepositOpen(false);
    setDepositAmount('');
    setDepositMethod('');
    setDepositRef('');
    await loadDeposits();
  };

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
  if (myAgentProfile.status !== 'active') {
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
            <p className="text-xl font-bold">{p.total_disputes ?? 0}</p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="px-4 mt-4">
        <Tabs defaultValue="pending">
          <TabsList className="w-full mb-4 grid grid-cols-5">
            <TabsTrigger value="pending" className="text-[10px] px-1">
              {isRTL ? 'جديد' : 'New'}
              {pending.length > 0 && (
                <span className="ml-1 bg-nova text-white text-[9px] rounded-full px-1">
                  {pending.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" className="text-[10px] px-1">
              {isRTL ? 'نشط' : 'Active'}
              {active.length > 0 && (
                <span className="ml-1 bg-blue-500 text-white text-[9px] rounded-full px-1">
                  {active.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="text-[10px] px-1">
              {isRTL ? 'السجل' : 'History'}
            </TabsTrigger>
            <TabsTrigger value="earnings" className="text-[10px] px-1">
              💰
            </TabsTrigger>
            <TabsTrigger value="deposit" className="text-[10px] px-1">
              {isRTL ? 'شحن' : 'Deposit'}
              {depositRequests.filter(d => d.status === 'pending').length > 0 && (
                <span className="ml-1 bg-yellow-500 text-white text-[9px] rounded-full px-1">
                  {depositRequests.filter(d => d.status === 'pending').length}
                </span>
              )}
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

          {/* ── Deposit ── */}
          <TabsContent value="deposit" className="space-y-3">
            {/* Request deposit button */}
            <Button
              className="w-full h-11 font-bold bg-nova hover:bg-nova/90 text-white"
              onClick={() => setDepositOpen(true)}
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              {isRTL ? 'طلب شحن رصيد جديد' : 'Request New Deposit'}
            </Button>

            {depositRequests.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <Wallet className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'لا توجد طلبات شحن بعد' : 'No deposit requests yet'}
                </p>
              </div>
            ) : (
              depositRequests.map((dr) => (
                <motion.div
                  key={dr.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border/60 rounded-xl p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-nova">И {dr.amount_nova.toFixed(2)}</p>
                      {dr.amount_local && (
                        <p className="text-[11px] text-muted-foreground">
                          ≈ {dr.amount_local.toFixed(0)} {isRTL ? 'عملة محلية' : 'local'}
                        </p>
                      )}
                    </div>
                    <Badge className={cn('text-[10px] px-1.5 py-0 border', depositStatusColor(dr.status))}>
                      {dr.status === 'pending'   ? (isRTL ? 'قيد المراجعة' : 'Pending')
                       : dr.status === 'approved'  ? (isRTL ? 'موافق عليه' : 'Approved')
                       : dr.status === 'rejected'  ? (isRTL ? 'مرفوض' : 'Rejected')
                       : (isRTL ? 'مكتمل' : 'Completed')}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {PAYMENT_METHODS.find(m => m.value === dr.payment_method)?.[isRTL ? 'ar' : 'en'] ?? dr.payment_method}
                    {' · '}{dr.payment_reference}
                  </p>
                  {dr.admin_notes && (
                    <p className="text-[11px] bg-muted/40 rounded px-2 py-1 text-muted-foreground">
                      {isRTL ? 'ملاحظة: ' : 'Note: '}{dr.admin_notes}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(dr.created_at).toLocaleDateString()}
                  </p>
                </motion.div>
              ))
            )}
          </TabsContent>

          {/* ── Earnings ── */}
          <TabsContent value="earnings" className="space-y-3">
            {(() => {
              const completed = agentReservations.filter((r) => r.status === 'completed');
              const totalEarned = completed.reduce((s, r) => s + (r.commission_nova ?? 0), 0);
              const totalVolume = completed.reduce((s, r) => s + (r.nova_amount ?? 0), 0);
              const thisMonth   = completed.filter((r) => {
                const d = new Date(r.created_at);
                const now = new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
              });
              const thisMonthEarned = thisMonth.reduce((s, r) => s + (r.commission_nova ?? 0), 0);

              return (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-nova/20 to-nova/5 border border-nova/20 rounded-xl p-3">
                      <div className="flex items-center gap-1 mb-1">
                        <Wallet className="w-3.5 h-3.5 text-nova" />
                        <p className="text-xs text-muted-foreground">
                          {isRTL ? 'إجمالي الأرباح' : 'Total Earned'}
                        </p>
                      </div>
                      <p className="text-2xl font-bold text-nova">
                        И {totalEarned.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-card border border-border/60 rounded-xl p-3">
                      <div className="flex items-center gap-1 mb-1">
                        <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                        <p className="text-xs text-muted-foreground">
                          {isRTL ? 'هذا الشهر' : 'This Month'}
                        </p>
                      </div>
                      <p className="text-2xl font-bold text-green-500">
                        И {thisMonthEarned.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-card border border-border/60 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">
                      {isRTL ? 'إجمالي الحجم' : 'Total Volume'}
                    </p>
                    <p className="text-lg font-bold">И {totalVolume.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isRTL
                        ? `عبر ${completed.length} عملية مكتملة`
                        : `across ${completed.length} completed ops`}
                    </p>
                  </div>

                  {/* Per-operation list */}
                  {completed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2">
                      <Wallet className="w-8 h-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        {isRTL ? 'لا توجد أرباح بعد' : 'No earnings yet'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground px-1">
                        {isRTL ? 'تفاصيل العمليات' : 'Operation Details'}
                      </p>
                      {completed.slice(0, 20).map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between bg-card border border-border/60 rounded-xl px-3 py-2.5 cursor-pointer hover:border-primary/30"
                          onClick={() => navigate(`/agents/r/${r.id}`)}
                        >
                          <div className="flex items-center gap-2">
                            {r.type === 'deposit'
                              ? <ArrowDownLeft className="w-4 h-4 text-blue-500" />
                              : <ArrowUpRight className="w-4 h-4 text-orange-500" />
                            }
                            <div>
                              <p className="text-xs font-medium">
                                {r.type === 'deposit'
                                  ? (isRTL ? 'إيداع' : 'Deposit')
                                  : (isRTL ? 'سحب' : 'Withdraw')}
                                {' · '}И {r.nova_amount.toFixed(0)}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(r.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-nova">
                            +И {(r.commission_nova ?? 0).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Deposit Request Dialog ── */}
      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isRTL ? 'طلب شحن رصيد' : 'Request Balance Deposit'}</DialogTitle>
            <DialogDescription>
              {isRTL
                ? 'أرسل المبلغ للحساب المخصص وأدخل رقم التحويل هنا'
                : 'Send the amount to the designated account and enter the reference number here'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs mb-1 block">{isRTL ? 'المبلغ (Nova) *' : 'Amount (Nova) *'}</Label>
              <Input
                type="number"
                placeholder="0"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="h-10"
                dir="ltr"
                min="1"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">{isRTL ? 'طريقة الدفع *' : 'Payment Method *'}</Label>
              <Select value={depositMethod} onValueChange={setDepositMethod}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={isRTL ? 'اختر الطريقة' : 'Select method'} />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {isRTL ? m.ar : m.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">{isRTL ? 'رقم التحويل / المرجع *' : 'Transfer Reference *'}</Label>
              <Input
                placeholder={isRTL ? 'أدخل رقم العملية' : 'Enter transaction ID'}
                value={depositRef}
                onChange={(e) => setDepositRef(e.target.value)}
                className="h-10"
                dir="ltr"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setDepositOpen(false)}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                className="flex-1 bg-nova hover:bg-nova/90 text-white"
                onClick={handleRequestDeposit}
                disabled={depositLoading}
              >
                {depositLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : (isRTL ? 'إرسال الطلب' : 'Send Request')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
