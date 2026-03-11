import { useState } from 'react';
import { RefreshCw, ArrowRight, AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBanner } from '@/contexts/BannerContext';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ConvertNovaAuraDialogProps {
  open: boolean;
  onClose: () => void;
}

// Format number - remove .000 if whole number
const formatBalance = (value: number): string => {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
};

export function ConvertNovaAuraDialog({ open, onClose }: ConvertNovaAuraDialogProps) {
  const { language } = useLanguage();
  const { user: contextUser } = useUser();
  const { user: authUser } = useAuth();
  const { success: showSuccess, error: showError } = useBanner();
  const { wallet, refetch: refetchWallet } = useWallet();

  // Check if wallet is frozen
  const isWalletFrozen = wallet?.is_frozen ?? false;

  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const novaBalance = wallet?.nova_balance ?? contextUser.novaBalance ?? 0;
  const auraBalance = wallet?.aura_balance ?? contextUser.auraBalance ?? 0;
  const novaAmount = parseFloat(amount) || 0;
  const auraAmount = novaAmount * 2; // 1 Nova = 2 Aura
  const hasEnoughBalance = novaAmount <= novaBalance && novaAmount > 0;
  const canConvert = hasEnoughBalance && !isWalletFrozen;

  const handleConvert = async () => {
    if (!canConvert || novaAmount <= 0 || isWalletFrozen || !authUser?.id) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase.rpc('convert_nova_aura', {
        p_amount: novaAmount,
      });

      if (error) {
        showError(error.message);
        setIsLoading(false);
        return;
      }

      const result = data as { success: boolean; error?: string };

      if (!result?.success) {
        showError(result?.error || (language === 'ar' ? 'فشل التحويل' : 'Conversion failed'));
        setIsLoading(false);
        return;
      }

      // Refresh wallet data from DB
      refetchWallet?.();

      // Show success banner
      showSuccess(
        language === 'ar' 
          ? `تم تحويل ${formatBalance(novaAmount)} Nova (И) إلى ${formatBalance(auraAmount)} Aura (✦) بنجاح`
          : `Successfully converted ${formatBalance(novaAmount)} Nova (И) to ${formatBalance(auraAmount)} Aura (✦)`
      );

      // Reset and close
      setAmount('');
      onClose();
    } catch (err: any) {
      showError(err?.message || 'Unexpected error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-aura" />
              {language === 'ar' ? 'تحويل Nova → Aura' : 'Convert Nova → Aura'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ar' 
                ? 'حوّل Nova إلى Aura للاستخدام في المسابقات والتصويت'
                : 'Convert Nova to Aura for use in contests and voting'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Frozen Wallet Warning */}
            {isWalletFrozen && (
              <Alert variant="destructive">
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  {language === 'ar' 
                    ? 'رصيدك مجمّد. لا يمكنك تحويل Nova حالياً.'
                    : 'Your wallet is frozen. You cannot convert Nova.'}
                </AlertDescription>
              </Alert>
            )}

            {/* Current Balances - Side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-nova/5 rounded-lg border border-nova/20">
                <p className="text-xs text-muted-foreground mb-1">Nova</p>
                <p className="text-xl font-bold">
                  <span className="text-nova">И</span> {formatBalance(novaBalance)}
                </p>
              </div>
              <div className="p-3 bg-aura/5 rounded-lg border border-aura/20">
                <p className="text-xs text-muted-foreground mb-1">Aura</p>
                <p className="text-xl font-bold">
                  <span className="text-aura">✦</span> {formatBalance(auraBalance)}
                </p>
              </div>
            </div>

            {/* Conversion Info - Simple text */}
            <p className="text-xs text-muted-foreground text-center">
              {language === 'ar' 
                ? '⚠️ Aura غير قابلة للتحويل بين المستخدمين'
                : '⚠️ Aura cannot be transferred between users'}
            </p>

            {/* Amount Input - Clean, no icon */}
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'مبلغ Nova للتحويل' : 'Nova Amount to Convert'}</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={novaBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="text-2xl font-bold h-14 text-center"
              />

              {!hasEnoughBalance && novaAmount > 0 && (
                <p className="text-sm text-destructive flex items-center justify-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {language === 'ar' ? 'رصيد غير كافي' : 'Insufficient balance'}
                </p>
              )}
            </div>

            {/* Conversion Preview */}
            {novaAmount > 0 && hasEnoughBalance && (
              <div className="p-4 bg-muted/30 rounded-lg border border-border">
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-nova">
                      И {formatBalance(novaAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground">Nova</p>
                  </div>
                  
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  
                  <div className="text-center">
                    <p className="text-2xl font-bold text-aura">
                      ✦ {formatBalance(auraAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground">Aura</p>
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground mt-2">
                  1 Nova = 2 Aura
                </p>
              </div>
            )}

            <Button
              className="w-full h-12 bg-aura hover:bg-aura/90 text-aura-foreground font-bold"
              disabled={!canConvert || novaAmount <= 0 || isLoading}
              onClick={handleConvert}
            >
              {isLoading 
                ? (language === 'ar' ? 'جاري التحويل...' : 'Converting...') 
                : (language === 'ar' ? 'تأكيد التحويل' : 'Confirm Conversion')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
  );
}
