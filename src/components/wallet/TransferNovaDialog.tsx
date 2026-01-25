import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, ArrowRight, User, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface TransferNovaDialogProps {
  open: boolean;
  onClose: () => void;
  recipientId?: string;
  recipientName?: string;
  recipientUsername?: string;
  onTransferComplete?: (receipt: Receipt) => void;
}

export function TransferNovaDialog({
  open,
  onClose,
  recipientId,
  recipientName,
  recipientUsername,
  onTransferComplete,
}: TransferNovaDialogProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user, spendNova } = useUser();
  const { createTransaction, calculateLocalAmount } = useTransactions();

  const [amount, setAmount] = useState('');
  const [username, setUsername] = useState(recipientUsername || '');
  const [note, setNote] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [generatedReceipt, setGeneratedReceipt] = useState<Receipt | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const novaAmount = parseFloat(amount) || 0;
  const localInfo = calculateLocalAmount(novaAmount, user.country);
  const hasEnoughBalance = novaAmount <= user.novaBalance && novaAmount > 0;

  const handleTransfer = async () => {
    if (!hasEnoughBalance || novaAmount <= 0) return;

    setIsLoading(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Deduct from balance
    const success = spendNova(novaAmount);
    if (!success) {
      toast.error(language === 'ar' ? 'رصيد غير كافي' : 'Insufficient balance');
      setIsLoading(false);
      return;
    }

    // Create transaction and receipt
    const receipt = createTransaction({
      type: 'transfer_nova',
      status: 'completed',
      amount: novaAmount,
      currency: 'nova',
      sender: {
        id: user.id,
        name: user.name,
        username: `${user.name.toLowerCase()}_user`,
        country: user.country,
      },
      receiver: {
        id: recipientId || 'recipient-001',
        name: recipientName || username || 'Unknown',
        username: username || recipientUsername || 'unknown',
        country: user.country, // In production, get from recipient data
      },
      reason: note || (language === 'ar' ? 'تحويل Nova' : 'Nova Transfer'),
    });

    setGeneratedReceipt(receipt);
    setShowReceipt(true);
    setIsLoading(false);

    toast.success(language === 'ar' ? 'تم التحويل بنجاح!' : 'Transfer successful!');

    if (onTransferComplete) {
      onTransferComplete(receipt);
    }
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setAmount('');
    setUsername('');
    setNote('');
    onClose();
  };

  return (
    <>
      <Dialog open={open && !showReceipt} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              {language === 'ar' ? 'تحويل Nova' : 'Transfer Nova'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ar' 
                ? 'أرسل Nova إلى مستخدم آخر'
                : 'Send Nova to another user'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Balance */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">
                {language === 'ar' ? 'رصيدك الحالي' : 'Your Balance'}
              </p>
              <p className="text-xl font-bold">
                {user.novaBalance.toFixed(3)} <span className="text-nova">✦</span>
              </p>
            </div>

            {/* Recipient */}
            {!recipientUsername && (
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'اسم المستخدم' : 'Username'}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="@username"
                    className="ps-10"
                  />
                </div>
              </div>
            )}

            {recipientName && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'المستلم' : 'Recipient'}
                </p>
                <p className="font-medium">{recipientName}</p>
                <p className="text-xs text-muted-foreground">@{recipientUsername}</p>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المبلغ' : 'Amount'}</Label>
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
              
              {novaAmount > 0 && (
                <p className="text-sm text-muted-foreground">
                  ≈ {localInfo.amount.toFixed(2)} {localInfo.symbol} {localInfo.currency}
                </p>
              )}
              
              {!hasEnoughBalance && novaAmount > 0 && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {language === 'ar' ? 'رصيد غير كافي' : 'Insufficient balance'}
                </p>
              )}
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'ملاحظة (اختياري)' : 'Note (optional)'}</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={language === 'ar' ? 'أضف ملاحظة...' : 'Add a note...'}
                rows={2}
              />
            </div>

            {/* Summary */}
            {novaAmount > 0 && hasEnoughBalance && (
              <div className="p-3 bg-success/5 border border-success/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'سترسل' : 'You will send'}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="font-bold">
                    {novaAmount.toFixed(3)} ✦
                  </span>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              disabled={!hasEnoughBalance || novaAmount <= 0 || (!username && !recipientUsername) || isLoading}
              onClick={handleTransfer}
            >
              {isLoading 
                ? (language === 'ar' ? 'جاري التحويل...' : 'Transferring...') 
                : (language === 'ar' ? 'تأكيد التحويل' : 'Confirm Transfer')}
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
