import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Clock, CheckCircle2, XCircle, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSupervisorChangeRequest } from '@/hooks/useSupervisorChangeRequest';
import { toast } from '@/hooks/use-toast';

interface SupervisorChangeSheetProps {
  open: boolean;
  onClose: () => void;
}

export function SupervisorChangeSheet({ open, onClose }: SupervisorChangeSheetProps) {
  const { language } = useLanguage();
  const ar = language === 'ar';

  const { requests, loading, submitting, hasPending, submitRequest } = useSupervisorChangeRequest();

  const [code, setCode] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    if (!code.trim()) return;
    const { success, message } = await submitRequest(code.trim(), reason.trim() || undefined);
    if (success) {
      toast({
        title: ar ? 'تم إرسال الطلب' : 'Request submitted',
        description: ar
          ? `طلبك لتغيير المسؤول إلى ${message} قيد المراجعة`
          : `Your request to change supervisor to ${message} is under review`,
      });
      setCode('');
      setReason('');
    } else {
      const errorMessages: Record<string, string> = {
        'You already have a pending request': ar ? 'لديك طلب معلق بالفعل' : 'You already have a pending request',
        'Invalid referral code': ar ? 'كود إحالة غير صحيح' : 'Invalid referral code',
        'Cannot set yourself as supervisor': ar ? 'لا يمكنك تعيين نفسك مسؤولاً' : 'Cannot set yourself as supervisor',
        'This is already your supervisor': ar ? 'هذا هو مسؤولك الحالي' : 'This is already your supervisor',
      };
      toast({
        title: ar ? 'خطأ' : 'Error',
        description: errorMessages[message] || message,
        variant: 'destructive',
      });
    }
  };

  const statusIcon = (status: string) => {
    if (status === 'pending')  return <Clock className="h-4 w-4 text-warning" />;
    if (status === 'approved') return <CheckCircle2 className="h-4 w-4 text-success" />;
    return <XCircle className="h-4 w-4 text-destructive" />;
  };

  const statusLabel = (status: string) => {
    if (ar) {
      if (status === 'pending')  return 'معلق';
      if (status === 'approved') return 'مقبول';
      return 'مرفوض';
    }
    return status;
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-3xl max-h-[90vh] overflow-y-auto"
            dir={ar ? 'rtl' : 'ltr'}
          >
            <div className="p-5 space-y-5">
              {/* Handle */}
              <div className="w-12 h-1.5 bg-muted rounded-full mx-auto" />

              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">
                  {ar ? 'طلب تغيير المسؤول' : 'Change Supervisor Request'}
                </h2>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Info note */}
              <div className="flex items-start gap-2 p-3 bg-muted/40 rounded-lg">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-snug">
                  {ar
                    ? 'يحتاج تغيير المسؤول إلى موافقة الإدارة. سيتم مراجعة طلبك والرد عليه في أقرب وقت.'
                    : 'Changing your supervisor requires admin approval. Your request will be reviewed and answered shortly.'}
                </p>
              </div>

              {/* New request form */}
              {!hasPending ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">
                      {ar ? 'كود إحالة المسؤول الجديد' : 'New Supervisor Referral Code'}
                    </Label>
                    <Input
                      value={code}
                      onChange={e => setCode(e.target.value.toUpperCase())}
                      placeholder="WINOVA-XXXXXX"
                      dir="ltr"
                      className="h-11 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">
                      {ar ? 'سبب الطلب (اختياري)' : 'Reason (optional)'}
                    </Label>
                    <Textarea
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder={ar ? 'اشرح سبب رغبتك في التغيير...' : 'Explain why you want to change...'}
                      className="resize-none h-20 text-sm"
                    />
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={handleSubmit}
                    disabled={!code.trim() || submitting}
                  >
                    {submitting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {ar ? 'إرسال الطلب' : 'Submit Request'}
                  </Button>
                </div>
              ) : (
                <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
                  <p className="text-sm text-warning font-medium">
                    {ar ? 'لديك طلب معلق في الانتظار' : 'You have a pending request'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ar
                      ? 'سيتم الرد على طلبك الحالي قبل تقديم طلب جديد'
                      : 'Your current request must be resolved before submitting a new one'}
                  </p>
                </div>
              )}

              {/* Request history */}
              {requests.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {ar ? 'سجل الطلبات' : 'Request History'}
                  </h3>
                  {requests.map(req => (
                    <div key={req.id} className="p-3 bg-muted/30 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{req.requested_supervisor_name}</span>
                        <div className="flex items-center gap-1.5">
                          {statusIcon(req.status)}
                          <span className="text-xs capitalize">{statusLabel(req.status)}</span>
                        </div>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground">{req.requested_supervisor_code}</p>
                      {req.reason && (
                        <p className="text-xs text-muted-foreground">{req.reason}</p>
                      )}
                      {req.admin_note && (
                        <p className="text-xs text-primary border-t border-border pt-1 mt-1">
                          {ar ? 'ملاحظة الإدارة: ' : 'Admin note: '}{req.admin_note}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(req.created_at).toLocaleDateString(ar ? 'ar-SA' : 'en-US')}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {loading && (
                <div className="text-center py-4">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
