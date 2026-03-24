import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Clock, CheckCircle2, XCircle, AlertTriangle, Shield, Timer, PhoneCall, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAgentReservations, AgentReservation, AgentMessage } from '@/hooks/useAgentReservations';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCountdown(deadline: string | null): string {
  if (!deadline) return '';
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return '00:00';
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function statusColor(status: string) {
  switch (status) {
    case 'pending':       return 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30';
    case 'accepted':      return 'bg-blue-500/15 text-blue-600 border-blue-500/30';
    case 'active':        return 'bg-nova/15 text-nova border-nova/30';
    case 'completed':     return 'bg-green-500/15 text-green-600 border-green-500/30';
    case 'cancelled':     return 'bg-muted text-muted-foreground border-border';
    case 'disputed':      return 'bg-red-500/15 text-red-600 border-red-500/30';
    default:              return 'bg-muted text-muted-foreground border-border';
  }
}

function statusLabel(status: string, isRTL: boolean): string {
  const map: Record<string, [string, string]> = {
    pending:    ['في الانتظار', 'Pending'],
    accepted:   ['مقبول', 'Accepted'],
    active:     ['نشط', 'Active'],
    completed:  ['مكتمل', 'Completed'],
    cancelled:  ['ملغى', 'Cancelled'],
    disputed:   ['نزاع', 'Disputed'],
    rejected:   ['مرفوض', 'Rejected'],
  };
  const pair = map[status] ?? [status, status];
  return isRTL ? pair[0] : pair[1];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AgentReservationChat() {
  const { reservationId } = useParams<{ reservationId: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const {
    getReservation, confirmReservation, cancelReservation,
    raiseDispute, requestExtension, respondExtension,
    sendMessage, subscribeToMessages, subscribeToReservation,
    submitReview, rateUser,
  } = useAgentReservations();

  const [reservation, setReservation] = useState<AgentReservation | null>(null);
  const [messages, setMessages]       = useState<AgentMessage[]>([]);
  const [loading, setLoading]         = useState(true);
  const [msgInput, setMsgInput]       = useState('');
  const [sending, setSending]         = useState(false);
  const [countdown, setCountdown]     = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Dialog states
  const [cancelOpen, setCancelOpen]   = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [extendOpen, setExtendOpen]   = useState(false);
  const [reviewOpen, setReviewOpen]   = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewHasIssue, setReviewHasIssue] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isAgent = reservation?.is_agent ?? false;

  // ── Load reservation ────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!reservationId) return;
    setLoading(true);
    const r = await getReservation(reservationId);
    if (r) {
      setReservation(r);
      setMessages(r.messages ?? []);
    }
    setLoading(false);
  }, [reservationId, getReservation]);

  useEffect(() => { void load(); }, [load]);

  // ── Realtime subscriptions ──────────────────────────────────────────────────
  useEffect(() => {
    if (!reservationId) return;
    const unsub1 = subscribeToMessages(reservationId, (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    const unsub2 = subscribeToReservation(reservationId, (partial) => {
      setReservation((prev) => prev ? { ...prev, ...partial } : prev);
    });
    return () => { unsub1(); unsub2(); };
  }, [reservationId, subscribeToMessages, subscribeToReservation]);

  // ── Countdown timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(formatCountdown(reservation?.escrow_deadline ?? null));
    }, 1000);
    return () => clearInterval(id);
  }, [reservation?.escrow_deadline]);

  // ── Scroll to bottom ────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!msgInput.trim() || !reservationId) return;
    setSending(true);
    await sendMessage(reservationId, msgInput.trim());
    setMsgInput('');
    setSending(false);
  };

  const handleConfirm = async () => {
    if (!reservationId) return;
    setActionLoading(true);
    await confirmReservation(reservationId);
    await load();
    setActionLoading(false);
  };

  const handleCancel = async () => {
    if (!reservationId) return;
    setActionLoading(true);
    await cancelReservation(reservationId, cancelReason || undefined);
    setCancelOpen(false);
    setCancelReason('');
    await load();
    setActionLoading(false);
  };

  const handleDispute = async () => {
    if (!reservationId || !disputeReason.trim()) return;
    setActionLoading(true);
    await raiseDispute(reservationId, disputeReason.trim());
    setDisputeOpen(false);
    setDisputeReason('');
    await load();
    setActionLoading(false);
  };

  const handleExtend = async (minutes: 10 | 20 | 30) => {
    if (!reservationId) return;
    setActionLoading(true);
    await requestExtension(reservationId, minutes);
    setExtendOpen(false);
    await load();
    setActionLoading(false);
  };

  const handleRespondExtension = async (accept: boolean) => {
    if (!reservationId) return;
    setActionLoading(true);
    await respondExtension(reservationId, accept);
    await load();
    setActionLoading(false);
  };

  const handleReview = async () => {
    if (!reservationId) return;
    setActionLoading(true);
    if (isAgent) {
      await rateUser(reservationId, reviewRating, reviewComment, reviewHasIssue);
    } else {
      await submitReview(reservationId, reviewRating, reviewComment, reviewHasIssue);
    }
    setReviewOpen(false);
    await load();
    setActionLoading(false);
  };

  // ── Computed ────────────────────────────────────────────────────────────────
  const commission = reservation ? (reservation.nova_amount * reservation.commission_pct) / 100 : 0;
  const net        = reservation ? reservation.nova_amount - commission : 0;
  const status     = reservation?.status ?? '';
  const canConfirm = ['accepted', 'active'].includes(status);
  const canCancel  = ['pending', 'accepted', 'active'].includes(status);
  const canDispute = status === 'active';
  const canExtend  = status === 'active' && !reservation?.extension_requested_by;
  const extensionPending = status === 'active' && !!reservation?.extension_requested_by;
  const extensionFromOther = extensionPending &&
    reservation?.extension_requested_by !== authUser?.id;
  const canChat    = ['accepted', 'active'].includes(status);
  const canReview  = status === 'completed';

  const deadlineUrgent = countdown && countdown < '05:00';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-nova border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-4">
        <XCircle className="w-12 h-12 text-destructive" />
        <p className="text-center text-muted-foreground">
          {isRTL ? 'الحجز غير موجود' : 'Reservation not found'}
        </p>
        <Button variant="ghost" onClick={() => navigate('/agents')}>
          {isRTL ? 'رجوع' : 'Back'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background max-w-lg mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">
              {reservation.shop_name ?? (isRTL ? 'وكيل' : 'Agent')}
            </span>
            <Badge className={cn('text-[10px] px-1.5 py-0 border', statusColor(status))}>
              {statusLabel(status, isRTL)}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {isRTL
              ? `${reservation.type === 'deposit' ? 'إيداع' : 'سحب'} · ${reservation.nova_amount} Nova`
              : `${reservation.type === 'deposit' ? 'Deposit' : 'Withdraw'} · ${reservation.nova_amount} Nova`}
          </p>
        </div>
        {reservation.whatsapp && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => window.open(`https://wa.me/${reservation.whatsapp?.replace(/\D/g, '')}`, '_blank')}
          >
            <PhoneCall className="w-4 h-4 text-green-500" />
          </Button>
        )}
      </div>

      {/* ── Status Card ── */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        {/* Breakdown */}
        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-sm border border-border/50">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{isRTL ? 'المبلغ:' : 'Amount:'}</span>
            <span className="font-medium">И {reservation.nova_amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {isRTL ? `عمولة (${reservation.commission_pct}%):` : `Fee (${reservation.commission_pct}%):`}
            </span>
            <span className="text-destructive">−И {commission.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t pt-1.5">
            <span className="font-semibold">{isRTL ? 'الصافي:' : 'Net:'}</span>
            <span className="font-bold text-nova">И {net.toFixed(2)}</span>
          </div>
          {reservation.fiat_amount && reservation.fiat_currency && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isRTL ? 'المبلغ الفعلي:' : 'Cash amount:'}</span>
              <span className="font-medium">
                {reservation.fiat_amount} {reservation.fiat_currency}
              </span>
            </div>
          )}
        </div>

        {/* Countdown / deadline */}
        {status === 'active' && reservation.escrow_deadline && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'flex items-center justify-between rounded-lg px-3 py-2 border',
              deadlineUrgent
                ? 'bg-red-500/10 border-red-500/30 text-red-600'
                : 'bg-nova/10 border-nova/30 text-nova'
            )}
          >
            <div className="flex items-center gap-1.5">
              <Timer className="w-4 h-4" />
              <span className="text-xs font-medium">
                {isRTL ? 'المهلة المتبقية' : 'Time remaining'}
              </span>
            </div>
            <span className="font-mono font-bold text-sm">{countdown}</span>
          </motion.div>
        )}

        {/* Extension pending banner */}
        {extensionPending && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-lg px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 space-y-2"
          >
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-semibold text-yellow-600">
                {isRTL
                  ? `طلب تمديد ${reservation.extension_minutes} دقيقة`
                  : `Extension request: +${reservation.extension_minutes} min`}
              </span>
            </div>
            {extensionFromOther && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleRespondExtension(true)}
                  disabled={actionLoading}
                >
                  {isRTL ? 'قبول' : 'Accept'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs flex-1"
                  onClick={() => handleRespondExtension(false)}
                  disabled={actionLoading}
                >
                  {isRTL ? 'رفض' : 'Decline'}
                </Button>
              </div>
            )}
            {!extensionFromOther && (
              <p className="text-[11px] text-muted-foreground">
                {isRTL ? 'في انتظار موافقة الطرف الآخر' : 'Waiting for other party to accept'}
              </p>
            )}
          </motion.div>
        )}

        {/* Confirmation status */}
        {status === 'active' && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              {reservation.user_confirmed_at
                ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                : <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40" />}
              <span>{isRTL ? 'تأكيد المستخدم' : 'User confirmed'}</span>
            </div>
            <div className="flex items-center gap-1">
              {reservation.agent_confirmed_at
                ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                : <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40" />}
              <span>{isRTL ? 'تأكيد الوكيل' : 'Agent confirmed'}</span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {canConfirm && (
            <Button
              size="sm"
              className="h-8 text-xs bg-nova hover:bg-nova/90 text-white"
              onClick={handleConfirm}
              disabled={actionLoading}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              {isRTL ? 'تأكيد الاستلام' : 'Confirm Receipt'}
            </Button>
          )}
          {canExtend && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setExtendOpen(true)}
              disabled={actionLoading}
            >
              <Clock className="w-3.5 h-3.5 mr-1" />
              {isRTL ? 'تمديد الوقت' : 'Extend Time'}
            </Button>
          )}
          {canDispute && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-orange-500/50 text-orange-600 hover:bg-orange-500/10"
              onClick={() => setDisputeOpen(true)}
              disabled={actionLoading}
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
              {isRTL ? 'رفع نزاع' : 'Raise Dispute'}
            </Button>
          )}
          {canCancel && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-destructive/50 text-destructive hover:bg-destructive/10"
              onClick={() => setCancelOpen(true)}
              disabled={actionLoading}
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
          )}
          {canReview && (
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => setReviewOpen(true)}
              disabled={actionLoading}
            >
              <Shield className="w-3.5 h-3.5 mr-1" />
              {isRTL ? 'تقييم' : 'Leave Review'}
            </Button>
          )}
        </div>
      </div>

      {/* ── Chat ── */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 min-h-0">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground text-center">
              {isRTL ? 'لا توجد رسائل بعد' : 'No messages yet'}
            </p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMine = msg.sender_id === authUser?.id;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn(
                  'flex',
                  isMine ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.is_system_msg ? (
                  <div className="mx-auto max-w-[85%] bg-muted/50 rounded-full px-3 py-1 text-[11px] text-muted-foreground text-center border border-border/40">
                    {msg.content}
                  </div>
                ) : (
                  <div
                    className={cn(
                      'max-w-[78%] rounded-2xl px-3 py-2 text-sm',
                      isMine
                        ? 'bg-nova text-white rounded-tr-sm'
                        : 'bg-muted text-foreground rounded-tl-sm'
                    )}
                  >
                    <p className="leading-snug">{msg.content}</p>
                    <p className={cn(
                      'text-[10px] mt-1',
                      isMine ? 'text-white/60 text-right' : 'text-muted-foreground text-left'
                    )}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* ── Message input ── */}
      {canChat ? (
        <div className="px-4 py-3 border-t bg-card/50 flex items-center gap-2">
          <Input
            value={msgInput}
            onChange={(e) => setMsgInput(e.target.value)}
            placeholder={isRTL ? 'اكتب رسالة…' : 'Type a message…'}
            className="flex-1 text-sm"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
          <Button
            size="icon"
            className="shrink-0 bg-nova hover:bg-nova/90 text-white"
            onClick={handleSend}
            disabled={sending || !msgInput.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="px-4 py-2 border-t text-center text-xs text-muted-foreground">
          {status === 'completed'
            ? (isRTL ? 'اكتمل الحجز' : 'Reservation completed')
            : status === 'cancelled'
            ? (isRTL ? 'تم الإلغاء' : 'Reservation cancelled')
            : status === 'disputed'
            ? (isRTL ? 'النزاع قيد المراجعة' : 'Dispute under review')
            : (isRTL ? 'في انتظار قبول الوكيل' : 'Waiting for agent to accept')}
        </div>
      )}

      {/* ── Cancel Dialog ── */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isRTL ? 'إلغاء الحجز' : 'Cancel Reservation'}</DialogTitle>
            <DialogDescription>
              {isRTL ? 'سيتم إلغاء الحجز وإعادة Nova إلى المحفظة.' : 'The reservation will be cancelled and Nova returned.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={isRTL ? 'سبب الإلغاء (اختياري)' : 'Reason (optional)'}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={2}
          />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setCancelOpen(false)}>
              {isRTL ? 'تراجع' : 'Back'}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleCancel}
              disabled={actionLoading}
            >
              {isRTL ? 'تأكيد الإلغاء' : 'Confirm Cancel'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dispute Dialog ── */}
      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isRTL ? 'رفع نزاع' : 'Raise Dispute'}</DialogTitle>
            <DialogDescription>
              {isRTL
                ? 'سيتم تجميد المعاملة وإرسالها لمراجعة الإدارة.'
                : 'The transaction will be frozen and sent for admin review.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={isRTL ? 'اشرح المشكلة بالتفصيل…' : 'Describe the issue in detail…'}
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDisputeOpen(false)}>
              {isRTL ? 'تراجع' : 'Back'}
            </Button>
            <Button
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleDispute}
              disabled={actionLoading || !disputeReason.trim()}
            >
              {isRTL ? 'إرسال النزاع' : 'Submit Dispute'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Extend Dialog ── */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isRTL ? 'طلب تمديد الوقت' : 'Request Time Extension'}</DialogTitle>
            <DialogDescription>
              {isRTL ? 'سيحتاج الطرف الآخر للموافقة على التمديد.' : 'The other party will need to approve the extension.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2">
            {([10, 20, 30] as const).map((m) => (
              <Button
                key={m}
                variant="outline"
                className="h-14 flex-col gap-0.5"
                onClick={() => handleExtend(m)}
                disabled={actionLoading}
              >
                <span className="font-bold text-lg">{m}</span>
                <span className="text-[10px] text-muted-foreground">{isRTL ? 'دقيقة' : 'min'}</span>
              </Button>
            ))}
          </div>
          <Button variant="ghost" className="w-full" onClick={() => setExtendOpen(false)}>
            {isRTL ? 'تراجع' : 'Cancel'}
          </Button>
        </DialogContent>
      </Dialog>

      {/* ── Review Dialog ── */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {isRTL
                ? (isAgent ? 'تقييم المستخدم' : 'تقييم الوكيل')
                : (isAgent ? 'Rate User' : 'Rate Agent')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Star rating */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setReviewRating(star)}
                  className={cn(
                    'text-2xl transition-transform hover:scale-110',
                    star <= reviewRating ? 'text-yellow-400' : 'text-muted-foreground/30'
                  )}
                >
                  ★
                </button>
              ))}
            </div>
            <Textarea
              placeholder={isRTL ? 'اكتب تعليقك…' : 'Write your comment…'}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={3}
            />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={reviewHasIssue}
                onChange={(e) => setReviewHasIssue(e.target.checked)}
                className="rounded"
              />
              <span className="text-muted-foreground">
                {isRTL ? 'كانت هناك مشكلة في هذه المعاملة' : 'There was an issue with this transaction'}
              </span>
            </label>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setReviewOpen(false)}>
              {isRTL ? 'تراجع' : 'Back'}
            </Button>
            <Button
              className="flex-1 bg-nova hover:bg-nova/90 text-white"
              onClick={handleReview}
              disabled={actionLoading}
            >
              {isRTL ? 'إرسال التقييم' : 'Submit Review'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
