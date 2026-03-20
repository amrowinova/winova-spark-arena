/**
 * PINSetupDialog
 *
 * Two-step numpad dialog:
 *   Step 1 — Enter new 6-digit PIN
 *   Step 2 — Confirm PIN
 * On match → calls usePIN.setupPIN() and fires onSuccess.
 */
import { useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePIN } from '@/hooks/usePIN';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Delete, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';

interface PINSetupDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: () => void;
}

const DIGITS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

function PINDots({ value, total = 6 }: { value: string; total?: number }) {
  return (
    <div className="flex gap-3 justify-center my-4">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
            i < value.length
              ? 'bg-primary border-primary scale-110'
              : 'border-muted-foreground/40'
          }`}
        />
      ))}
    </div>
  );
}

function Numpad({ onPress }: { onPress: (d: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
      {DIGITS.map((d, i) => (
        <button
          key={i}
          onClick={() => d && onPress(d)}
          disabled={!d}
          className={`h-14 rounded-xl text-xl font-semibold transition-all active:scale-95 ${
            d === '⌫'
              ? 'bg-muted text-foreground hover:bg-muted/70'
              : d
              ? 'bg-muted hover:bg-muted/70 text-foreground'
              : 'invisible'
          }`}
        >
          {d === '⌫' ? <Delete className="w-5 h-5 mx-auto" /> : d}
        </button>
      ))}
    </div>
  );
}

export function PINSetupDialog({ open, onOpenChange, onSuccess }: PINSetupDialogProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { setupPIN, biometricsAvailable, biometricsRegistered, setupBiometrics } = usePIN();

  const [step, setStep]         = useState<'enter' | 'confirm'>('enter');
  const [pin, setPin]           = useState('');
  const [confirmPin, setConfirm] = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const reset = () => { setStep('enter'); setPin(''); setConfirm(''); setError(null); };

  const handleClose = () => { reset(); onOpenChange(false); };

  const handlePress = useCallback((d: string) => {
    setError(null);
    if (step === 'enter') {
      if (d === '⌫') { setPin(p => p.slice(0, -1)); return; }
      if (pin.length >= 6) return;
      const next = pin + d;
      setPin(next);
      if (next.length === 6) setStep('confirm');
    } else {
      if (d === '⌫') { setConfirm(p => p.slice(0, -1)); return; }
      if (confirmPin.length >= 6) return;
      const next = confirmPin + d;
      setConfirm(next);
      if (next.length === 6) handleConfirm(next);
    }
  }, [step, pin, confirmPin]);

  const handleConfirm = useCallback(async (enteredConfirm: string) => {
    if (enteredConfirm !== pin) {
      setError(isRTL ? 'الأرقام غير متطابقة، حاول مجدداً' : "PINs don't match, try again");
      setConfirm('');
      setStep('enter');
      setPin('');
      return;
    }

    setIsLoading(true);
    const err = await setupPIN(pin);
    setIsLoading(false);

    if (err) {
      setError(err);
      reset();
    } else {
      toast.success(isRTL ? 'تم إنشاء رمز PIN بنجاح ✓' : 'PIN set successfully ✓');
      reset();
      onSuccess?.();
      onOpenChange(false);
    }
  }, [pin, setupPIN, isRTL, onSuccess, onOpenChange]);

  const handleSetupBiometrics = async () => {
    const ok = await setupBiometrics();
    if (ok) {
      toast.success(isRTL ? 'تم تفعيل البصمة / الوجه ✓' : 'Biometrics enabled ✓');
    } else {
      toast.error(isRTL ? 'فشل تفعيل البصمة' : 'Biometrics setup failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xs" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-center text-center">
            <Lock className="w-5 h-5 text-primary" />
            {isRTL
              ? (step === 'enter' ? 'أنشئ رمز PIN' : 'أكّد رمز PIN')
              : (step === 'enter' ? 'Create PIN' : 'Confirm PIN')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 pb-2">
          <p className="text-center text-sm text-muted-foreground">
            {step === 'enter'
              ? (isRTL ? 'أدخل 6 أرقام كرمز سري للعمليات المالية' : 'Enter 6 digits for financial operations')
              : (isRTL ? 'أعد إدخال الأرقام للتأكيد' : 'Re-enter digits to confirm')}
          </p>

          <PINDots value={step === 'enter' ? pin : confirmPin} />

          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription className="text-xs text-center">{error}</AlertDescription>
            </Alert>
          )}

          {isLoading
            ? <p className="text-center text-sm text-muted-foreground py-4">
                {isRTL ? 'جارٍ الحفظ...' : 'Saving...'}
              </p>
            : <Numpad onPress={handlePress} />
          }

          {step === 'enter' && pin.length > 0 && (
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setPin('')}>
              {isRTL ? 'مسح' : 'Clear'}
            </Button>
          )}

          {/* Biometrics setup (shown after PIN creation would be done in onSuccess,
              but also offer it here if already has PIN and coming to change) */}
          {biometricsAvailable && !biometricsRegistered && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs mt-2"
              onClick={handleSetupBiometrics}
            >
              <Fingerprint className="w-4 h-4" />
              {isRTL ? 'تفعيل بصمة الإصبع / الوجه' : 'Enable Face ID / Fingerprint'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
