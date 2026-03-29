/**
 * AgentDashboard.tsx - Updated to use new useAgents hook
 */
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
import { useLanguage } from '@/contexts/LanguageContext';
import { useBanner } from '@/contexts/BannerContext';
import { useUser } from '@/contexts/UserContext';
import { useAgents, type DepositRequest } from '@/hooks/useAgents';
import { useAgentReservations, AgentReservation } from '@/hooks/useAgentReservations';
import { cn } from '@/lib/utils';

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
    accepted: ['مقبول', 'Accepted'],
    active:    ['نشط', 'Active'],
    completed: ['مكتمل', 'Completed'],
    cancelled: ['ملغى', 'Cancelled'],
    disputed:  ['نزاع', 'Disputed'],
    rejected: ['مرفوض', 'Rejected'],
  };
  const pair = map[status] ?? [status, status];
  return isRTL ? pair[0] : pair[1];
}

function timeAgo(date: string, isRTL: boolean): string {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();
  const m = Math.floor(diff / 60000); // minutes
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
            <span className="font-semibold text-sm">{r.user_id}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {timeAgo(r.created_at, isRTL)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center justify-end gap-1">
            <Button size="icon" variant="ghost" onClick={() => onNavigate(r.user_id)}>
              <Shield className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Amount row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-nova">
            И {r.nova_amount}
          </p>
          <p className="text-xs text-muted-foreground">
            {isRTL ? 'نقاط Nova' : 'Nova Points'}
          </p>
        </div>
        {r.fiat_amount && r.fiat_currency && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              {isRTL ? 'نقدي:' : 'Cash:'} {r.fiat_amount} {r.fiat_currency}
            </p>
          </div>
        )}
      </div>

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
  { value: 'vodafone_cash', ar: 'فودافون كاش',      en: 'Vodafone Cash' },
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
  const { user } = useUser();

  const { myAgentProfile, getMyAgentProfile, requestDeposit, getDepositRequests } = useAgents();
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
    const data = await getDepositRequests('all');
    setDepositRequests(data);
  }, [getDepositRequests]);

  useEffect(() => {
    getMyAgentProfile();
  }, [getMyAgentProfile]);

  useEffect(() => {
    if (myAgentProfile?.id) {
      fetchAgentReservations(myAgentProfile.id);
    }
    loadDeposits();
  }, [myAgentProfile?.id, loadDeposits]);

  const handleRequestDeposit = async () => {
    const amt = parseFloat(depositAmount);
    if (!depositAmount || isNaN(amt) || amt <= 0) {
      showError(isRTL ? 'أدخل مبلغاً صحيحاً' : 'Enter a valid amount');
      return;
    }
    if (!depositMethod) {
      showError(isRTL ? 'اختر طريقة الدفع' : 'Select payment method');
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

  const handleRejectReservation = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    setActionLoading(true);
    await respondToReservation(rejectId, false, rejectReason);
    setRejectOpen(false);
    setRejectId('');
    setRejectReason('');
    setActionLoading(false);
    await fetchAgentReservations(myAgentProfile?.id || '');
  };

  const commission = myAgentProfile?.commission_pct ?? 5;
  const net = parseFloat(depositAmount || '0') * (1 - commission / 100);

  return (
    <div className="min-h-screen bg-background pb-24" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="font-bold text-lg">
            {myAgentProfile?.shop_name || (isRTL ? 'لوحة الوكيل' : 'Agent Dashboard')}
          </h1>
          <Badge className={cn(
            'text-xs px-2 py-1',
            myAgentProfile?.status === 'active' ? 'bg-nova text-white' : 'bg-muted text-muted-foreground'
          )}>
            {statusLabel(myAgentProfile?.status || 'pending', isRTL)}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowDownLeft className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <Tabs defaultValue="reservations" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-9">
            <TabsTrigger value="reservations" className="text-xs">
              {isRTL ? '📋 حجوزاتي' : '📋 My Bookings'}
            </TabsTrigger>
            <TabsTrigger value="deposits" className="text-xs">
              {isRTL ? '💰 طلبات الشحن' : '💰 Deposit Requests'}
            </TabsTrigger>
          </TabsList>

          {/* Reservations Tab */}
          <TabsContent value="reservations" className="space-y-3">
            {agentReservations.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {isRTL ? 'لا توجد حجوزات حالياً' : 'No reservations at the moment'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {agentReservations.map((r) => (
                  <ReservationCard
                    key={r.id}
                    r={r}
                    isRTL={isRTL}
                    onNavigate={(id) => navigate(`/chat?user=${r.user_id}`)}
                    onAccept={async (id) => {
                      await respondToReservation(id, true);
                      await fetchAgentReservations(myAgentProfile?.id || '');
                    }}
                    onReject={handleRejectReservation}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Deposits Tab */}
          <TabsContent value="deposits" className="space-y-3">
            <div className="bg-card border border-border/60 rounded-xl p-4">
              <h3 className="font-semibold mb-3">
                {isRTL ? 'تقديم طلب شحن' : 'Request Deposit'}
              </h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="amount">
                    {isRTL ? 'المبلغ (نقاط Nova)' : 'Amount (Nova Points)'}
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder={isRTL ? 'أدخل المبلغ...' : 'Enter amount...'}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="mt-1"
                  />
                  {depositAmount && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {isRTL ? `العمولة (${commission}%): И ${net.toFixed(2)}` : `Fee (${commission}%): И ${net.toFixed(2)}`}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="method">
                    {isRTL ? 'طريقة الدفع' : 'Payment Method'}
                  </Label>
                  <select
                    id="method"
                    value={depositMethod}
                    onChange={(e) => setDepositMethod(e.target.value)}
                    className="w-full mt-1 p-2 border rounded-md bg-background"
                  >
                    <option value="">{isRTL ? 'اختر طريقة' : 'Select method'}</option>
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method.value} value={method.value}>
                        {isRTL ? method.ar : method.en}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="reference">
                    {isRTL ? 'رقم المرجع' : 'Reference Number'}
                  </Label>
                  <Input
                    id="resolution"
                    placeholder={isRTL ? 'أدخل رقم المرجع...' : 'Enter reference number...'}
                    value={depositRef}
                    onChange={(e) => setDepositRef(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <Button
                  onClick={handleRequestDeposit}
                  disabled={depositLoading}
                  className="w-full"
                >
                  {depositLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isRTL ? 'جاري الإرسال...' : 'Sending...'}
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4 mr-2" />
                      {isRTL ? 'إرسال الطلب' : 'Send Request'}
                    </>
                  )}
                </Button>
              </div>

              {/* Recent Deposit Requests */}
              <div className="mt-6">
                <h4 className="font-semibold mb-3">
                  {isRTL ? 'طلبات الشحن السابقة' : 'Recent Deposit Requests'}
                </h4>
                <div className="space-y-2">
                  {depositRequests.map((d) => (
                    <div key={d.id} className="bg-muted/40 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">И {d.amount_nova}</p>
                          <p className="text-sm text-muted-foreground">
                            {d.payment_method}
                          </p>
                        </div>
                        <Badge className={cn('text-xs', depositStatusColor(d.status))}>
                          {statusLabel(d.status, isRTL)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {timeAgo(d.created_at, isRTL)}
                      </div>
                      {d.admin_notes && (
                        <p className="text-xs bg-background rounded p-2 mt-2">
                          {isRTL ? 'ملاحظات الأدمن:' : 'Admin notes:'} {d.admin_notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Reject Reservation Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isRTL ? 'رفض الحجز' : 'Reject Reservation'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              {isRTL ? 'هل أنت متأكد من رفض هذا الحجز؟' : 'Are you sure you want to reject this reservation?'}
            </p>
            <div>
              <Label htmlFor="reason">
                {isRTL ? 'سبب الرفض' : 'Rejection Reason'}
              </Label>
              <Textarea
                id="reason"
                placeholder={isRTL ? 'اكتب سبب الرفض...' : 'Write rejection reason...'}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleRejectReservation} 
                className="flex-1"
                disabled={actionLoading || !rejectReason.trim()}
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isRTL ? 'جاري الرفض...' : 'Rejecting...'}
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    {isRTL ? 'رفض' : 'Reject'}
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setRejectOpen(false)} className="flex-1">
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
