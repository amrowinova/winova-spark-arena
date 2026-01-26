import { useState, useEffect } from 'react';
import { Send, User, AlertCircle, MapPin, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  recipientCountry?: string;
  recipientAvatar?: string;
  onTransferComplete?: (receipt: Receipt) => void;
}

// Format number - remove .000 if whole number
const formatBalance = (value: number): string => {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
};

// Mock user lookup (in production, this would be an API call)
const mockLookupUser = (username: string): Promise<{
  id: string;
  name: string;
  username: string;
  country: string;
  avatar?: string;
} | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Mock user data
      if (username.toLowerCase().includes('test') || username.length >= 3) {
        resolve({
          id: 'user-' + username,
          name: username.charAt(0).toUpperCase() + username.slice(1),
          username: username.toLowerCase(),
          country: 'SA',
          avatar: undefined,
        });
      } else {
        resolve(null);
      }
    }, 500);
  });
};

export function TransferNovaDialog({
  open,
  onClose,
  recipientId,
  recipientName,
  recipientUsername,
  recipientCountry,
  recipientAvatar,
  onTransferComplete,
}: TransferNovaDialogProps) {
  const { language } = useLanguage();
  const { user, spendNova } = useUser();
  const { createTransaction, calculateLocalAmount } = useTransactions();

  const [amount, setAmount] = useState('');
  const [username, setUsername] = useState(recipientUsername || '');
  const [note, setNote] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [generatedReceipt, setGeneratedReceipt] = useState<Receipt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  
  // Confirmed recipient state
  const [confirmedRecipient, setConfirmedRecipient] = useState<{
    id: string;
    name: string;
    username: string;
    country: string;
    avatar?: string;
  } | null>(recipientId ? {
    id: recipientId,
    name: recipientName || '',
    username: recipientUsername || '',
    country: recipientCountry || 'SA',
    avatar: recipientAvatar,
  } : null);

  const novaAmount = parseFloat(amount) || 0;
  const localInfo = calculateLocalAmount(novaAmount, user.country, 'nova');
  const hasEnoughBalance = novaAmount <= user.novaBalance && novaAmount > 0;
  const canTransfer = hasEnoughBalance && novaAmount > 0 && confirmedRecipient !== null;

  // Lookup user when username changes
  useEffect(() => {
    if (recipientUsername) return; // Skip if pre-filled
    
    const timer = setTimeout(async () => {
      if (username.length >= 3) {
        setIsLookingUp(true);
        const foundUser = await mockLookupUser(username);
        setConfirmedRecipient(foundUser);
        setIsLookingUp(false);
      } else {
        setConfirmedRecipient(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username, recipientUsername]);

  const handleTransfer = async () => {
    if (!canTransfer || !confirmedRecipient) return;

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
        id: confirmedRecipient.id,
        name: confirmedRecipient.name,
        username: confirmedRecipient.username,
        country: confirmedRecipient.country,
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
    setConfirmedRecipient(null);
    onClose();
  };

  return (
    <>
      <Dialog open={open && !showReceipt} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-nova" />
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
            <div className="p-3 bg-nova/5 border border-nova/20 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">
                {language === 'ar' ? 'رصيدك الحالي' : 'Your Balance'}
              </p>
              <p className="text-xl font-bold">
                <span className="text-nova">И</span> {formatBalance(user.novaBalance)}
              </p>
            </div>

            {/* Recipient Input */}
            {!recipientUsername && (
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'اسم المستخدم' : 'Username'}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace('@', ''))}
                    placeholder="username"
                    className="ps-10"
                  />
                </div>
                {isLookingUp && (
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'جاري البحث...' : 'Searching...'}
                  </p>
                )}
              </div>
            )}

            {/* Confirmed Recipient Card - REQUIRED before transfer */}
            {confirmedRecipient && (
              <div className="p-4 bg-primary/5 border border-primary/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    {confirmedRecipient.avatar ? (
                      <AvatarImage src={confirmedRecipient.avatar} alt={confirmedRecipient.name} />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {confirmedRecipient.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-foreground">{confirmedRecipient.name}</p>
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">@{confirmedRecipient.username}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3" />
                      <span>{confirmedRecipient.country}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Amount Input - Clean, no icon inside */}
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المبلغ' : 'Amount'}</Label>
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
              
              {novaAmount > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  ≈ {localInfo.symbol} {formatBalance(localInfo.amount)} {localInfo.currency}
                </p>
              )}
              
              {!hasEnoughBalance && novaAmount > 0 && (
                <p className="text-sm text-destructive flex items-center justify-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {language === 'ar' ? 'رصيد غير كافي' : 'Insufficient balance'}
                </p>
              )}
            </div>

            {/* Note - Optional */}
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'ملاحظة (اختياري)' : 'Note (optional)'}</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={language === 'ar' ? 'أضف ملاحظة...' : 'Add a note...'}
                rows={2}
              />
            </div>

            {/* Single Confirm Button */}
            <Button
              className="w-full h-12 bg-nova hover:bg-nova/90 text-nova-foreground font-bold"
              disabled={!canTransfer || isLoading}
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
