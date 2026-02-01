import { useState, useEffect } from 'react';
import { Send, User, AlertCircle, MapPin, Check, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { useBanner } from '@/contexts/BannerContext';
import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/contexts/AuthContext';
import { executeTransfer, lookupUserByUsername, searchUsersByUsername, RecipientLookupResult } from '@/lib/walletService';

interface TransferNovaDialogProps {
  open: boolean;
  onClose: () => void;
  recipientId?: string;        // This should be user_id for transfers
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
  const { user: authUser } = useAuth();
  const { user, refetchUserData } = useUser();
  const { createTransaction, calculateLocalAmount } = useTransactions();
  const { success: showSuccess, error: showError } = useBanner();
  const { wallet, refetch: refetchWallet } = useWallet();

  // Check if wallet is frozen
  const isWalletFrozen = wallet?.is_frozen ?? false;

  const [amount, setAmount] = useState('');
  const [username, setUsername] = useState(recipientUsername || '');
  const [note, setNote] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [generatedReceipt, setGeneratedReceipt] = useState<Receipt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [searchResults, setSearchResults] = useState<RecipientLookupResult[]>([]);
  
  // Confirmed recipient state - MUST have userId for transfer
  const [confirmedRecipient, setConfirmedRecipient] = useState<RecipientLookupResult | null>(
    recipientId ? {
      id: '', // Will be resolved
      userId: recipientId,
      name: recipientName || '',
      username: recipientUsername || '',
      country: recipientCountry || 'SA',
      avatarUrl: recipientAvatar,
    } : null
  );

  const novaAmount = parseFloat(amount) || 0;
  const localInfo = calculateLocalAmount(novaAmount, user.country, 'nova');
  const hasEnoughBalance = novaAmount <= user.novaBalance && novaAmount > 0;
  const canTransfer = hasEnoughBalance && novaAmount > 0 && confirmedRecipient !== null && !isWalletFrozen;

  // Lookup user when username changes
  useEffect(() => {
    if (recipientUsername) return; // Skip if pre-filled
    
    const timer = setTimeout(async () => {
      if (username.length >= 2) {
        setIsLookingUp(true);
        
        // Search for users matching the query
        const results = await searchUsersByUsername(username, authUser?.id, 5);
        setSearchResults(results);
        
        // If exact match found, confirm it
        const exactMatch = results.find(r => r.username.toLowerCase() === username.toLowerCase());
        if (exactMatch) {
          setConfirmedRecipient(exactMatch);
        } else {
          setConfirmedRecipient(null);
        }
        
        setIsLookingUp(false);
      } else {
        setSearchResults([]);
        setConfirmedRecipient(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username, recipientUsername, authUser?.id]);

  // Resolve pre-filled recipient username to get user_id
  useEffect(() => {
    if (recipientUsername && !confirmedRecipient?.userId) {
      lookupUserByUsername(recipientUsername).then((result) => {
        if (result) {
          setConfirmedRecipient(result);
        }
      });
    }
  }, [recipientUsername]);

  const handleSelectRecipient = (recipient: RecipientLookupResult) => {
    setConfirmedRecipient(recipient);
    setUsername(recipient.username);
    setSearchResults([]);
  };

  const handleTransfer = async () => {
    if (!canTransfer || !confirmedRecipient || isWalletFrozen || !authUser) return;

    // Validate we have the recipient's user_id
    if (!confirmedRecipient.userId) {
      showError(language === 'ar' ? 'لم يتم التعرف على المستلم' : 'Recipient not identified');
      return;
    }

    setIsLoading(true);

    // Execute atomic transfer via database function
    const result = await executeTransfer(
      authUser.id,
      confirmedRecipient.userId,
      novaAmount,
      'nova',
      'dm_transfer',
      undefined,
      note || (language === 'ar' ? 'تحويل Nova' : 'Nova Transfer'),
      note || 'تحويل Nova'
    );

    if (!result.success) {
      const errorMessages: Record<string, { en: string; ar: string }> = {
        'Insufficient balance': { en: 'Insufficient balance', ar: 'رصيد غير كافي' },
        'Sender wallet is frozen': { en: 'Your wallet is frozen', ar: 'محفظتك مجمّدة' },
        'Recipient wallet is frozen': { en: 'Recipient wallet is frozen', ar: 'محفظة المستلم مجمّدة' },
        'Sender wallet not found': { en: 'Wallet not found', ar: 'المحفظة غير موجودة' },
        'Recipient wallet not found': { en: 'Recipient wallet not found', ar: 'محفظة المستلم غير موجودة' },
      };
      
      const msg = errorMessages[result.error || ''] || { en: result.error || 'Transfer failed', ar: 'فشل التحويل' };
      showError(language === 'ar' ? msg.ar : msg.en);
      setIsLoading(false);
      return;
    }

    // Refetch wallet to get updated balance
    await refetchWallet();
    await refetchUserData();

    // Create receipt for UI display
    const receipt = createTransaction({
      type: 'transfer_nova',
      status: 'completed',
      amount: novaAmount,
      currency: 'nova',
      sender: {
        id: authUser.id,
        name: user.name,
        username: user.username,
        country: user.country,
      },
      receiver: {
        id: confirmedRecipient.userId,
        name: confirmedRecipient.name,
        username: confirmedRecipient.username,
        country: confirmedRecipient.country,
      },
      reason: note || (language === 'ar' ? 'تحويل Nova' : 'Nova Transfer'),
    });

    setGeneratedReceipt(receipt);
    setShowReceipt(true);
    setIsLoading(false);

    showSuccess(language === 'ar' ? 'تم التحويل بنجاح!' : 'Transfer successful!');

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
            {/* Frozen Wallet Warning */}
            {isWalletFrozen && (
              <Alert variant="destructive">
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  {language === 'ar' 
                    ? 'رصيدك مجمّد. لا يمكنك تحويل Nova حالياً.'
                    : 'Your wallet is frozen. You cannot transfer Nova.'}
                </AlertDescription>
              </Alert>
            )}

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
                    {confirmedRecipient.avatarUrl ? (
                      <AvatarImage src={confirmedRecipient.avatarUrl} alt={confirmedRecipient.name} />
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
