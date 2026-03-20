/**
 * PINVerifyDialog
 *
 * Shows before any financial operation.
 * - If PIN session is still valid (< 5 min ago) → calls onVerified immediately
 * - If user has no PIN yet → redirects to PINSetupDialog first, then onVerified
 * - Otherwise → shows numpad + optional biometrics button
 *
 * Usage:
 *   const [verifyOpen, setVerifyOpen] = useState(false);
 *   ...
 *   <Button onClick={() => setVerifyOpen(true)}>Send Nova</Button>
 *   <PINVerifyDialog
 *     open={verifyOpen}
 *     onOpenChange={setVerifyOpen}
 *     onVerified={() => executeTransfer()}
 *   />
 */
import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePIN } from '@/hooks/usePIN';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PINSetupDialog } from './PINSetupDialog';
import { Shield, Fingerprint, Delete, AlertTriangle } from 'lucide-react';

interface PINVerifyDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Called when PIN / biometrics verification passes */
  onVerified: () => void;
  /** Optional label shown inside the dialog */
  actionLabel?: string;
  actionLabelAr?: string;
}

const DIGITS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
const MAX_ATTEMPTS = 5;

function PINDots({ value, error }: { value: string; error: boolean }) {
  return (
    <div className="flex gap-3 justify-center my-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
            error
              ? 'border-destructive bg-destructive/40'
              : i < value.length
              ? 'bg-primary border-primary scale-110'
              : 'border-muted-foreground/40'
          }`}
        />
      ))}
    </div>
  );
}

function Numpad({ onPress, disabled }: { onPress: (d: string) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
      {DIGITS.map((d, i) => (
        <button
          key={i}
          onClick={() => d && onPress(d)}
          disabled={!d || disabled}
          className={`h-14 rounded-xl text-xl font-semibold transition-all active:scale-95 disabled:opacity-40 ${
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

export function PINVerifyDialog({
  open,
  onOpenChange,
  onVerified,
  actionLabel,
  actionLabelAr,
}: PINVerifyDialogProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const {
    hasPIN, isLoading,
    biometricsAvailable, biometricsRegistered,
    isSessionValid, verifyPIN, verifyBiometrics,
  } = usePIN();

  const [pin, setPin]               = useState('');
  const [error, setError]           = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [attempts, setAttempts]     = useState(0);
  const [setupOpen, setSetupOpen]   = useState(false);
  const [biometricLoading, setBioLoading] = useState(false);

  // Auto-pass if session is still valid
  useEffect(() => {
    if (open && !isLoading && isSessionValid()) {
      onVerified();
      onOpenChange(false);
    }
  }, [open, isLoading]);

  // If user has no PIN → open setup first
  useEffect(() => {
    if (open && !isLoading && !hasPIN) {
      setSetupOpen(true);
    }
  }, [open, isLoading, hasPIN]);

  const reset = () => { setPin(''); setError(null); };

  const handleClose = () => { reset(); onOpenChange(false); };

  const handlePress = useCallback(async (d: string) => {
    if (isVerifying) return;
    setError(null);

    if (d === '⌫') { setPin(p => p.slice(0, -1)); return; }
    if (pin.length >= 6) return;

    const next = pin + d;
    setPin(next);

    if (next.length === 6) {
      setIsVerifying(true);
      const ok = await verifyPIN(next);
      setIsVerifying(false);

      if (ok) {
        reset();
        onVerified();
        onOpenChange(false);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setError(
          isRTL
            ? `رمز PIN غير صحيح (${newAttempts}/${MAX_ATTEMPTS})`
            : `Incorrect PIN (${newAttempts}/${MAX_ATTEMPTS})`
        );
        setPin('');
      }
    }
  }, [pin, isVerifying, verifyPIN, attempts, isRTL, onVerified, onOpenChange]);

  const handleBiometrics = async () => {
    setBioLoading(true);
    setError(null);
    const ok = await verifyBiometrics();
    setBioLoading(false);

    if (ok) {
      reset();
      onVerified();
      onOpenChange(false);
    } else {
      setError(isRTL ? 'فشل التحقق بالبصمة، أدخل رمز PIN' : 'Biometric failed, enter PIN');
    }
  };

  const locked = attempts >= MAX_ATTEMPTS;

  return (
    <>
      {/* PIN Setup (first-time) */}
      <PINSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onSuccess={() => {
          setSetupOpen(false);
          // Session is now valid after setup; pass immediately
          onVerified();
          onOpenChange(false);
        }}
      />

      {/* PIN Verify */}
      <Dialog open={open && !setupOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-xs" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 justify-center">
              <Shield className="w-5 h-5 text-primary" />
              {isRTL ? 'تأكيد العملية' : 'Confirm Operation'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 pb-2">
            {(actionLabel || actionLabelAr) && (
              <p className="text-center text-xs text-muted-foreground bg-muted/40 rounded-lg py-2 px-3">
                {isRTL ? (actionLabelAr ?? actionLabel) : (actionLabel ?? actionLabelAr)}
              </p>
            )}

            <p className="text-center text-sm text-muted-foreground">
              {isRTL ? 'أدخل رمز PIN للمتابعة' : 'Enter PIN to continue'}
            </p>

            <PINDots value={pin} error={!!error} />

            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            {locked ? (
              <p className="text-center text-sm text-destructive font-medium py-4">
                {isRTL
                  ? 'تم تجاوز عدد المحاولات. أعد تسجيل الدخول.'
                  : 'Too many attempts. Please log in again.'}
              </p>
            ) : (
              <Numpad onPress={handlePress} disabled={isVerifying} />
            )}

            {/* Biometrics button */}
            {biometricsAvailable && biometricsRegistered && !locked && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-xs mt-1"
                onClick={handleBiometrics}
                disabled={biometricLoading || isVerifying}
              >
                <Fingerprint className="w-4 h-4" />
                {biometricLoading
                  ? (isRTL ? 'جارٍ التحقق...' : 'Verifying...')
                  : (isRTL ? 'استخدم البصمة / الوجه' : 'Use Face ID / Fingerprint')}
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={handleClose}
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
