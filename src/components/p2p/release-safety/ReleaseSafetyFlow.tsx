import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '@/contexts/LanguageContext';
import { AlertTriangle, ShieldAlert, Clock, CheckCircle2, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ReleaseSafetyFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  novaAmount: number;
  currencySymbol: string;
  localTotal: number;
  buyerName: string;
  onConfirmRelease: () => void;
}

type Step = 'warning' | 'checklist' | 'cooldown';

const COOLDOWN_SECONDS = 5;

export function ReleaseSafetyFlow({
  open,
  onOpenChange,
  novaAmount,
  currencySymbol,
  localTotal,
  buyerName,
  onConfirmRelease,
}: ReleaseSafetyFlowProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [step, setStep] = useState<Step>('warning');
  const [checks, setChecks] = useState([false, false, false]);
  const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep('warning');
      setChecks([false, false, false]);
      setCooldown(COOLDOWN_SECONDS);
    }
  }, [open]);

  // Cooldown timer
  useEffect(() => {
    if (step !== 'cooldown') return;
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [step, cooldown]);

  const allChecked = checks.every(Boolean);

  const toggleCheck = (i: number) => {
    setChecks((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  const handleFinalRelease = useCallback(() => {
    onOpenChange(false);
    onConfirmRelease();
  }, [onOpenChange, onConfirmRelease]);

  const checklistItems = isRTL
    ? [
        'تأكدت من وصول المبلغ الكامل إلى حسابي البنكي',
        'التحويل من حساب باسم المشتري نفسه (ليس طرف ثالث)',
        'أفهم أن هذا الإجراء نهائي ولا يمكن التراجع عنه',
      ]
    : [
        'I verified the full amount arrived in my bank account',
        'The transfer is from the buyer\'s own account (not third-party)',
        'I understand this action is final and irreversible',
      ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
        <AnimatePresence mode="wait">
          {/* Step 1: Warning */}
          {step === 'warning' && (
            <motion.div
              key="warning"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6 space-y-4"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center">
                  <ShieldAlert className="h-8 w-8 text-destructive" />
                </div>
                <DialogHeader>
                  <DialogTitle className="text-destructive text-lg">
                    {isRTL ? '⚠️ تحذير: عملية لا رجعة فيها' : '⚠️ Warning: Irreversible Action'}
                  </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  {isRTL
                    ? `أنت على وشك تحرير ${novaAmount.toFixed(0)} Nova للمشتري "${buyerName}". بعد التأكيد، لا يمكن التراجع عن هذا الإجراء.`
                    : `You are about to release ${novaAmount.toFixed(0)} Nova to buyer "${buyerName}". This cannot be undone after confirmation.`}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div className="text-xs text-destructive">
                    <p className="font-semibold">
                      {isRTL ? 'لا تحرر Nova إذا:' : 'Do NOT release Nova if:'}
                    </p>
                    <ul className="mt-1 space-y-1 list-disc list-inside">
                      <li>{isRTL ? 'لم يصل المبلغ لحسابك' : 'Payment has not arrived'}</li>
                      <li>{isRTL ? 'المبلغ ناقص أو من حساب مختلف' : 'Amount is wrong or from different account'}</li>
                      <li>{isRTL ? 'التحويل معلق ولم يكتمل' : 'Transfer is pending and not settled'}</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setStep('checklist')}
                variant="destructive"
                className="w-full h-11"
              >
                {isRTL ? 'فهمت، المتابعة' : 'I Understand, Continue'}
              </Button>
            </motion.div>
          )}

          {/* Step 2: Checklist */}
          {step === 'checklist' && (
            <motion.div
              key="checklist"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-warning/15 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-warning" />
                </div>
                <DialogHeader className="text-start">
                  <DialogTitle className="text-base">
                    {isRTL ? '✅ قائمة التحقق الإلزامية' : '✅ Mandatory Checklist'}
                  </DialogTitle>
                </DialogHeader>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isRTL ? 'المبلغ:' : 'Amount:'}</span>
                  <span className="font-medium">{currencySymbol} {localTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nova:</span>
                  <span className="font-medium">{novaAmount.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isRTL ? 'المشتري:' : 'Buyer:'}</span>
                  <span className="font-medium">{buyerName}</span>
                </div>
              </div>

              <div className="space-y-3">
                {checklistItems.map((label, i) => (
                  <label
                    key={i}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      checks[i]
                        ? 'bg-success/10 border-success/30'
                        : 'bg-background border-border hover:bg-muted/30'
                    )}
                  >
                    <Checkbox
                      checked={checks[i]}
                      onCheckedChange={() => toggleCheck(i)}
                      className="mt-0.5"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>

              <Button
                onClick={() => setStep('cooldown')}
                disabled={!allChecked}
                className="w-full h-11 bg-success hover:bg-success/90"
              >
                {isRTL ? 'تأكيد القائمة' : 'Confirm Checklist'}
              </Button>
            </motion.div>
          )}

          {/* Step 3: Cooldown */}
          {step === 'cooldown' && (
            <motion.div
              key="cooldown"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6 space-y-4"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center transition-colors',
                  cooldown > 0 ? 'bg-warning/15' : 'bg-success/15'
                )}>
                  {cooldown > 0 ? (
                    <Clock className="h-8 w-8 text-warning" />
                  ) : (
                    <CheckCircle2 className="h-8 w-8 text-success" />
                  )}
                </div>
                <DialogHeader>
                  <DialogTitle className="text-base">
                    {cooldown > 0
                      ? (isRTL ? '⏳ فترة الانتظار الإلزامية' : '⏳ Mandatory Cooldown')
                      : (isRTL ? '🔓 جاهز للتحرير' : '🔓 Ready to Release')}
                  </DialogTitle>
                </DialogHeader>
                {cooldown > 0 ? (
                  <div className="space-y-2">
                    <div className="text-4xl font-bold text-warning tabular-nums">
                      {cooldown}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isRTL
                        ? 'فرصة أخيرة للتراجع قبل التحرير النهائي'
                        : 'Last chance to cancel before final release'}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {isRTL
                      ? `اضغط لتحرير ${novaAmount.toFixed(0)} Nova نهائياً`
                      : `Press to release ${novaAmount.toFixed(0)} Nova permanently`}
                  </p>
                )}
              </div>

              <Button
                onClick={handleFinalRelease}
                disabled={cooldown > 0}
                className="w-full h-12 bg-success hover:bg-success/90 text-base font-semibold"
              >
                {cooldown > 0
                  ? (isRTL ? `انتظر ${cooldown} ثانية...` : `Wait ${cooldown}s...`)
                  : (isRTL ? `🔓 حرّر ${novaAmount.toFixed(0)} Nova الآن` : `🔓 Release ${novaAmount.toFixed(0)} Nova Now`)}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
