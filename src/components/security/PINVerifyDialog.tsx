/**
 * PINVerifyDialog — PIN temporarily disabled, auto-verifies immediately.
 */
import { useEffect } from 'react';

interface PINVerifyDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onVerified: () => void;
  actionLabel?: string;
  actionLabelAr?: string;
}

export function PINVerifyDialog({
  open,
  onOpenChange,
  onVerified,
}: PINVerifyDialogProps) {
  useEffect(() => {
    if (open) {
      onVerified();
      onOpenChange(false);
    }
  }, [open, onVerified, onOpenChange]);

  return null;
}
