import { useState } from 'react';
import { RefreshCw, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUser } from '@/contexts/UserContext';
import { useTransactions } from '@/contexts/TransactionContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

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
  const { user, spendNova, addAura } = useUser();
  const { createTransaction } = useTransactions();

  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const novaAmount = parseFloat(amount) || 0;
  const auraAmount = novaAmount * 2; // 1 Nova = 2 Aura
  const hasEnoughBalance = novaAmount <= user.novaBalance && novaAmount > 0;

  const handleConvert = async () => {
    if (!hasEnoughBalance || novaAmount <= 0) return;

    setIsLoading(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Deduct Nova and add Aura
    const success = spendNova(novaAmount);
    if (!success) {
      toast.error(language === 'ar' ? 'رصيد غير كافي' : 'Insufficient balance');
      setIsLoading(false);
      return;
    }

    addAura(auraAmount);

    // Record in transaction history (no receipt dialog)
    createTransaction({
      type: 'convert_nova_aura',
      status: 'completed',
      amount: novaAmount,
      currency: 'nova',
      sender: {
        id: user.id,
        name: user.name,
        username: `${user.name.toLowerCase()}_user`,
        country: user.country,
      },
      reason: language === 'ar' 
        ? `تحويل ${formatBalance(novaAmount)} Nova إلى ${formatBalance(auraAmount)} Aura`
        : `Convert ${formatBalance(novaAmount)} Nova to ${formatBalance(auraAmount)} Aura`,
    });

    setIsLoading(false);

    // Show success toast with clear message
    toast.success(
      language === 'ar' 
        ? `تم تحويل ${formatBalance(novaAmount)} Nova (И) إلى ${formatBalance(auraAmount)} Aura (✦) بنجاح`
        : `Successfully converted ${formatBalance(novaAmount)} Nova (И) to ${formatBalance(auraAmount)} Aura (✦)`
    );

    // Reset and close
    setAmount('');
    onClose();
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
            {/* Current Balances - Side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-nova/5 rounded-lg border border-nova/20">
                <p className="text-xs text-muted-foreground mb-1">Nova</p>
                <p className="text-xl font-bold">
                  <span className="text-nova">И</span> {formatBalance(user.novaBalance)}
                </p>
              </div>
              <div className="p-3 bg-aura/5 rounded-lg border border-aura/20">
                <p className="text-xs text-muted-foreground mb-1">Aura</p>
                <p className="text-xl font-bold">
                  <span className="text-aura">✦</span> {formatBalance(user.auraBalance)}
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
                max={user.novaBalance}
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
              disabled={!hasEnoughBalance || novaAmount <= 0 || isLoading}
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
