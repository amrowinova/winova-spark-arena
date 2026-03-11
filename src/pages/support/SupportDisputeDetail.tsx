import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDisputeArbitration } from '@/hooks/useDisputeArbitration';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield,
  Send,
  ArrowUpCircle,
  FileText,
  Clock,
  User,
  Wallet,
  Lock,
  Loader2,
  MessageSquare,
  Gavel,
  Scale,
  UserCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

type ConfirmAction = 'release' | 'refund' | 'fraud' | null;

export default function SupportDisputeDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';

  const {
    caseData,
    messages,
    auditLog,
    isLoading,
    error,
    isAssignedToMe,
    isUnassigned,
    assignedTo,
    claimCase,
    releaseToBuyer,
    refundSeller,
    markFraud,
    requestProof,
    escalate,
  } = useDisputeArbitration(orderId || null);

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [proofNote, setProofNote] = useState('');
  const [escalateNote, setEscalateNote] = useState('');
  const [fraudNote, setFraudNote] = useState('');
  const [fraudTarget, setFraudTarget] = useState<'buyer' | 'seller'>('buyer');
  const [isActing, setIsActing] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showProofDialog, setShowProofDialog] = useState(false);
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [showFraudDialog, setShowFraudDialog] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <InnerPageHeader title={isRTL ? 'تحكيم النزاع' : 'Dispute Arbitration'} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <InnerPageHeader title={isRTL ? 'تحكيم النزاع' : 'Dispute Arbitration'} />
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
          <p className="text-destructive font-medium">{error || 'Case not found'}</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/support/disputes')}>
            {isRTL ? 'عودة للنزاعات' : 'Back to Disputes'}
          </Button>
        </div>
      </div>
    );
  }

  const { order, buyer, seller, buyer_wallet, seller_wallet } = caseData;
  const isResolved = order.status === 'completed' || order.status === 'cancelled';
  // Staff can act if they claimed the case OR if they are admin
  const canAct = isAssignedToMe && !isResolved;

  const handleClaimCase = async () => {
    setIsClaiming(true);
    const result = await claimCase();
    if (!result.success) {
      console.error('Claim case failed:', result.error);
      // Show the exact error from the RPC
      alert(result.error || 'Failed to claim case');
    }
    setIsClaiming(false);
  };

  const handleConfirmAction = async () => {
    setIsActing(true);
    try {
      if (confirmAction === 'release') {
        await releaseToBuyer();
      } else if (confirmAction === 'refund') {
        await refundSeller();
      }
    } finally {
      setIsActing(false);
      setConfirmAction(null);
    }
  };

  const handleRequestProof = async () => {
    if (!proofNote.trim()) return;
    setIsActing(true);
    await requestProof(proofNote.trim());
    setProofNote('');
    setShowProofDialog(false);
    setIsActing(false);
  };

  const handleEscalate = async () => {
    if (!escalateNote.trim()) return;
    setIsActing(true);
    await escalate(escalateNote.trim());
    setEscalateNote('');
    setShowEscalateDialog(false);
    setIsActing(false);
  };

  const handleMarkFraud = async () => {
    if (!fraudNote.trim()) return;
    setIsActing(true);
    const targetId = fraudTarget === 'buyer' ? buyer.user_id : seller.user_id;
    await markFraud(targetId, fraudNote.trim());
    setFraudNote('');
    setShowFraudDialog(false);
    setIsActing(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <InnerPageHeader title={isRTL ? 'تحكيم النزاع' : 'Dispute Arbitration'} />

      {/* Status Banner */}
      <div className={`px-4 py-2 flex items-center gap-2 ${
        isResolved
          ? 'bg-primary/10 border-b border-primary/20'
          : 'bg-destructive/10 border-b border-destructive/20'
      }`}>
        {isResolved
          ? <CheckCircle className="w-4 h-4 text-primary" />
          : <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />
        }
        <span className="text-sm font-medium">
          {isResolved
            ? (isRTL ? 'تم حل النزاع' : 'Dispute Resolved')
            : (isRTL ? 'نزاع نشط — يتطلب حكم' : 'Active Dispute — Ruling Required')
          }
        </span>
        <Badge variant={isResolved ? 'secondary' : 'destructive'} className="ms-auto text-xs">
          {order.status.toUpperCase()}
        </Badge>
      </div>

      {/* Claim Banner */}
      {!isResolved && isUnassigned && (
        <div className="px-4 py-3 bg-muted/50 border-b flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {isRTL ? 'هذه القضية غير مُعيّنة بعد' : 'This case is unassigned'}
          </span>
          <Button size="sm" onClick={handleClaimCase} disabled={isClaiming}>
            {isClaiming && <Loader2 className="w-4 h-4 me-1 animate-spin" />}
            <UserCheck className="w-4 h-4 me-1" />
            {isRTL ? 'استلام القضية' : 'Claim Case'}
          </Button>
        </div>
      )}
      {!isResolved && assignedTo && !isAssignedToMe && (
        <div className="px-4 py-3 bg-muted/50 border-b flex items-center gap-2">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {isRTL ? 'هذه القضية مُعيّنة لموظف آخر — للقراءة فقط' : 'This case is assigned to another staff — read only'}
          </span>
        </div>
      )}
      {!isResolved && isAssignedToMe && (
        <div className="px-4 py-2 bg-primary/10 border-b flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            {isRTL ? 'أنت المسؤول عن هذه القضية' : 'You are assigned to this case'}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Order Summary */}
        <Card className="mx-4 mt-4 p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">{isRTL ? 'ملخص الطلب' : 'Order Summary'}</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">{isRTL ? 'رقم الطلب' : 'Order ID'}</p>
              <p className="font-mono text-xs">{order.id.slice(0, 12)}...</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">{isRTL ? 'النوع' : 'Type'}</p>
              <Badge variant="outline">{order.order_type.toUpperCase()}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">{isRTL ? 'المبلغ' : 'Amount'}</p>
              <p className="font-bold">{order.nova_amount} И</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">{isRTL ? 'السعر المحلي' : 'Local Price'}</p>
              <p className="font-medium">{order.local_amount} {order.country}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">{isRTL ? 'تاريخ الإنشاء' : 'Created'}</p>
              <p className="text-xs">{format(new Date(order.created_at), 'PPp')}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">{isRTL ? 'تاريخ المطابقة' : 'Matched'}</p>
              <p className="text-xs">{order.matched_at ? format(new Date(order.matched_at), 'PPp') : '—'}</p>
            </div>
            {order.cancellation_reason && (
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">{isRTL ? 'سبب النزاع' : 'Dispute Reason'}</p>
                <p className="text-sm text-destructive">{order.cancellation_reason}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-3 mx-4 mt-3">
          {/* Buyer */}
          <Card className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={buyer.avatar_url || undefined} />
                <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{buyer.name}</p>
                <p className="text-[10px] text-muted-foreground">@{buyer.username}</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              {isRTL ? 'مشتري' : 'BUYER'}
            </Badge>
            <Separator />
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><Wallet className="w-3 h-3" /> Nova</span>
                <span className="font-mono">{buyer_wallet.nova_balance}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><Lock className="w-3 h-3" /> Locked</span>
                <span className="font-mono">{buyer_wallet.locked_nova_balance}</span>
              </div>
              {buyer_wallet.is_frozen && (
                <Badge variant="destructive" className="text-[10px] w-full justify-center">
                  {isRTL ? 'مجمّد' : 'FROZEN'}
                </Badge>
              )}
            </div>
          </Card>

          {/* Seller */}
          <Card className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={seller.avatar_url || undefined} />
                <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{seller.name}</p>
                <p className="text-[10px] text-muted-foreground">@{seller.username}</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              {isRTL ? 'بائع' : 'SELLER'}
            </Badge>
            <Separator />
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><Wallet className="w-3 h-3" /> Nova</span>
                <span className="font-mono">{seller_wallet.nova_balance}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><Lock className="w-3 h-3" /> Locked</span>
                <span className="font-mono">{seller_wallet.locked_nova_balance}</span>
              </div>
              {seller_wallet.is_frozen && (
                <Badge variant="destructive" className="text-[10px] w-full justify-center">
                  {isRTL ? 'مجمّد' : 'FROZEN'}
                </Badge>
              )}
            </div>
          </Card>
        </div>

        {/* Chat Thread */}
        <Card className="mx-4 mt-3 overflow-hidden">
          <div className="px-4 py-2 border-b flex items-center gap-2 bg-muted/30">
            <MessageSquare className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">{isRTL ? 'سجل المحادثة' : 'Chat History'}</h3>
            <Badge variant="outline" className="ms-auto text-xs">{messages.length}</Badge>
          </div>
          <ScrollArea className="h-64">
            <div className="p-3 space-y-2">
              {messages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">
                  {isRTL ? 'لا توجد رسائل' : 'No messages'}
                </p>
              ) : (
                messages.map(msg => {
                  const isBuyer = msg.sender_id === buyer.user_id;
                  const isSeller = msg.sender_id === seller.user_id;
                  const isSystem = msg.is_system_message;
                  const isStaff = !isBuyer && !isSeller && !isSystem;

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="text-center py-1">
                        <span className="text-[11px] text-muted-foreground bg-muted px-3 py-1 rounded-full inline-block">
                          {msg.content}
                        </span>
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={`flex ${isBuyer ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                        isStaff
                          ? 'bg-primary/20 border border-primary/30'
                          : isBuyer
                          ? 'bg-muted'
                          : 'bg-secondary'
                      }`}>
                        <p className="text-[10px] font-medium mb-0.5 opacity-70 flex items-center gap-1">
                          {isStaff && <Shield className="w-3 h-3" />}
                          {msg.sender_name}
                          <Badge variant="outline" className="text-[8px] py-0 h-3.5">
                            {isBuyer ? (isRTL ? 'مشتري' : 'Buyer') : isSeller ? (isRTL ? 'بائع' : 'Seller') : (isRTL ? 'دعم' : 'Staff')}
                          </Badge>
                        </p>
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className="text-[9px] opacity-50 mt-0.5 text-end">
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </Card>

        {/* Arbitration Actions */}
        {canAct && (
          <Card className="mx-4 mt-3 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Gavel className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-sm">{isRTL ? 'أدوات التحكيم' : 'Arbitration Actions'}</h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                className="w-full"
                size="sm"
                onClick={() => setConfirmAction('release')}
                disabled={isActing}
              >
                <CheckCircle className="w-4 h-4 me-1" />
                {isRTL ? 'تحرير للمشتري' : 'Release to Buyer'}
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                size="sm"
                onClick={() => setConfirmAction('refund')}
                disabled={isActing}
              >
                <XCircle className="w-4 h-4 me-1" />
                {isRTL ? 'إرجاع للبائع' : 'Refund Seller'}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                size="sm"
                onClick={() => setShowProofDialog(true)}
                disabled={isActing}
              >
                <FileText className="w-4 h-4 me-1" />
                {isRTL ? 'طلب إثبات' : 'Request Proof'}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                size="sm"
                onClick={() => setShowEscalateDialog(true)}
                disabled={isActing}
              >
                <ArrowUpCircle className="w-4 h-4 me-1" />
                {isRTL ? 'تصعيد' : 'Escalate'}
              </Button>
              <Button
                variant="destructive"
                className="w-full col-span-2"
                size="sm"
                onClick={() => setShowFraudDialog(true)}
                disabled={isActing}
              >
                <Shield className="w-4 h-4 me-1" />
                {isRTL ? 'تحديد احتيال' : 'Mark Fraud'}
              </Button>
            </div>
          </Card>
        )}

        {/* Audit Log */}
        <Card className="mx-4 mt-3 mb-6 overflow-hidden">
          <div className="px-4 py-2 border-b flex items-center gap-2 bg-muted/30">
            <FileText className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">{isRTL ? 'سجل القرارات' : 'Decision Log'}</h3>
            <Badge variant="outline" className="ms-auto text-xs">{auditLog.length}</Badge>
          </div>
          <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
            {auditLog.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                {isRTL ? 'لا توجد إجراءات بعد' : 'No actions yet'}
              </p>
            ) : (
              auditLog.map(entry => (
                <div key={entry.id} className="flex items-start gap-2 text-xs border-b last:border-0 pb-2">
                  <Clock className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium">
                      <span className="text-primary">{entry.staff_name}</span>
                      {' — '}
                      <Badge variant="outline" className="text-[9px] py-0 h-3.5">{entry.action_type}</Badge>
                    </p>
                    {entry.note && <p className="text-muted-foreground mt-0.5">{entry.note}</p>}
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {format(new Date(entry.created_at), 'PPp')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Confirm Dialog for Release/Refund */}
      <Dialog open={confirmAction !== null} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              {confirmAction === 'release'
                ? (isRTL ? 'تأكيد: تحرير للمشتري' : 'Confirm: Release to Buyer')
                : (isRTL ? 'تأكيد: إرجاع للبائع' : 'Confirm: Refund Seller')
              }
            </DialogTitle>
            <DialogDescription className="text-center">
              {confirmAction === 'release'
                ? (isRTL
                  ? `سيتم تحرير ${order.nova_amount} И للمشتري وإتمام الصفقة. هذا الإجراء لا يمكن التراجع عنه.`
                  : `${order.nova_amount} И will be released to the buyer and the trade completed. This action is irreversible.`)
                : (isRTL
                  ? `سيتم إرجاع ${order.nova_amount} И للبائع وإلغاء الصفقة. هذا الإجراء لا يمكن التراجع عنه.`
                  : `${order.nova_amount} И will be returned to the seller and the trade cancelled. This action is irreversible.`)
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmAction(null)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              variant={confirmAction === 'release' ? 'default' : 'secondary'}
              className="flex-1"
              onClick={handleConfirmAction}
              disabled={isActing}
            >
              {isActing && <Loader2 className="w-4 h-4 me-1 animate-spin" />}
              {isRTL ? 'تأكيد' : 'Confirm'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Proof Dialog */}
      <Dialog open={showProofDialog} onOpenChange={setShowProofDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{isRTL ? 'طلب إثبات إضافي' : 'Request Additional Proof'}</DialogTitle>
            <DialogDescription>
              {isRTL ? 'سيتم إرسال طلب في المحادثة' : 'A request will be sent in the chat'}
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder={isRTL ? 'ما هو الإثبات المطلوب...' : 'What proof is needed...'}
            value={proofNote}
            onChange={e => setProofNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRequestProof()}
          />
          <Button onClick={handleRequestProof} disabled={!proofNote.trim() || isActing} className="w-full">
            {isActing && <Loader2 className="w-4 h-4 me-1 animate-spin" />}
            <Send className="w-4 h-4 me-1" />
            {isRTL ? 'إرسال الطلب' : 'Send Request'}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Escalate Dialog */}
      <Dialog open={showEscalateDialog} onOpenChange={setShowEscalateDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{isRTL ? 'تصعيد القضية' : 'Escalate Case'}</DialogTitle>
            <DialogDescription>
              {isRTL ? 'سيتم نقل القضية لسلطة أعلى' : 'Case will be moved to senior authority'}
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder={isRTL ? 'سبب التصعيد...' : 'Reason for escalation...'}
            value={escalateNote}
            onChange={e => setEscalateNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEscalate()}
          />
          <Button onClick={handleEscalate} disabled={!escalateNote.trim() || isActing} className="w-full">
            {isActing && <Loader2 className="w-4 h-4 me-1 animate-spin" />}
            <ArrowUpCircle className="w-4 h-4 me-1" />
            {isRTL ? 'تصعيد' : 'Escalate'}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Mark Fraud Dialog */}
      <Dialog open={showFraudDialog} onOpenChange={setShowFraudDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {isRTL ? 'تحديد احتيال' : 'Mark Fraud'}
            </DialogTitle>
            <DialogDescription>
              {isRTL ? 'سيتم تجميد محفظة المستخدم المحدد' : 'The selected user\'s wallet will be frozen'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button
              variant={fraudTarget === 'buyer' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setFraudTarget('buyer')}
            >
              {buyer.name} ({isRTL ? 'مشتري' : 'Buyer'})
            </Button>
            <Button
              variant={fraudTarget === 'seller' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setFraudTarget('seller')}
            >
              {seller.name} ({isRTL ? 'بائع' : 'Seller'})
            </Button>
          </div>
          <Input
            placeholder={isRTL ? 'سبب التحديد...' : 'Reason for fraud flag...'}
            value={fraudNote}
            onChange={e => setFraudNote(e.target.value)}
          />
          <Button
            variant="destructive"
            onClick={handleMarkFraud}
            disabled={!fraudNote.trim() || isActing}
            className="w-full"
          >
            {isActing && <Loader2 className="w-4 h-4 me-1 animate-spin" />}
            <Shield className="w-4 h-4 me-1" />
            {isRTL ? 'تجميد وتحديد' : 'Freeze & Flag'}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
