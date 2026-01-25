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
import { useTransactions, Receipt } from '@/contexts/TransactionContext';
import { ReceiptDialog } from '@/components/common/ReceiptCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface ConvertNovaAuraDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ConvertNovaAuraDialog({ open, onClose }: ConvertNovaAuraDialogProps) {
  const { language } = useLanguage();
  const { user, spendNova, addAura } = useUser();
  const { createTransaction } = useTransactions();

  const [amount, setAmount] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [generatedReceipt, setGeneratedReceipt] = useState<Receipt | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const novaAmount = parseFloat(amount) || 0;
  const auraAmount = novaAmount; // 1:1 conversion rate
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

    // Create transaction and receipt
    const receipt = createTransaction({
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
        ? `تحويل ${novaAmount.toFixed(3)} Nova إلى ${auraAmount.toFixed(3)} Aura`
        : `Convert ${novaAmount.toFixed(3)} Nova to ${auraAmount.toFixed(3)} Aura`,
    });

    setGeneratedReceipt(receipt);
    setShowReceipt(true);
    setIsLoading(false);

    toast.success(language === 'ar' ? 'تم التحويل بنجاح!' : 'Conversion successful!');
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setAmount('');
    onClose();
  };

  return (
    <>
      <Dialog open={open && !showReceipt} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              {language === 'ar' ? 'تحويل Nova → Aura' : 'Convert Nova → Aura'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ar' 
                ? 'حوّل Nova إلى Aura للاستخدام في المسابقات والتصويت'
                : 'Convert Nova to Aura for use in contests and voting'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Balances */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gradient-nova/10 rounded-lg border border-nova/20">
                <p className="text-xs text-muted-foreground mb-1">Nova</p>
                <p className="text-xl font-bold">
                  {user.novaBalance.toFixed(3)} <span className="text-nova">✦</span>
                </p>
              </div>
              <div className="p-3 bg-gradient-aura/10 rounded-lg border border-aura/20">
                <p className="text-xs text-muted-foreground mb-1">Aura</p>
                <p className="text-xl font-bold">
                  {user.auraBalance.toFixed(3)} <span className="text-aura">◈</span>
                </p>
              </div>
            </div>

            {/* Conversion Info */}
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
              <p className="text-muted-foreground">
                {language === 'ar' 
                  ? '⚠️ Aura غير قابلة للتحويل بين المستخدمين. تُستخدم فقط في المسابقات والتصويت.'
                  : '⚠️ Aura cannot be transferred between users. It can only be used for contests and voting.'}
              </p>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'مبلغ Nova للتحويل' : 'Nova Amount to Convert'}</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.001"
                  min="0.001"
                  max={user.novaBalance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.000"
                  className="text-lg font-bold pe-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-nova font-bold">
                  ✦
                </span>
              </div>

              {!hasEnoughBalance && novaAmount > 0 && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {language === 'ar' ? 'رصيد غير كافي' : 'Insufficient balance'}
                </p>
              )}
            </div>

            {/* Conversion Preview */}
            {novaAmount > 0 && hasEnoughBalance && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-nova">
                      {novaAmount.toFixed(3)} ✦
                    </p>
                    <p className="text-xs text-muted-foreground">Nova</p>
                  </div>
                  
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  
                  <div className="text-center">
                    <p className="text-2xl font-bold text-aura">
                      {auraAmount.toFixed(3)} ◈
                    </p>
                    <p className="text-xs text-muted-foreground">Aura</p>
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground mt-2">
                  {language === 'ar' ? 'معدل التحويل: 1 Nova = 1 Aura' : 'Rate: 1 Nova = 1 Aura'}
                </p>
              </div>
            )}

            <Button
              className="w-full bg-gradient-aura text-aura-foreground"
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

      <ReceiptDialog
        receipt={generatedReceipt}
        open={showReceipt}
        onClose={handleCloseReceipt}
      />
    </>
  );
}
