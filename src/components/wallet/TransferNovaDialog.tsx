import { useState, useEffect, useCallback, useRef } from 'react';
import { Send, User, AlertCircle, MapPin, Check, Lock, Loader2, Search, X, Star, StarOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { executeTransfer, searchUsersByUsername, RecipientLookupResult } from '@/lib/walletService';
import { getCountryFlag } from '@/lib/countryFlags';

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
  const { getOrCreateConversation, sendMessage } = useDirectMessages();

  const isWalletFrozen = wallet?.is_frozen ?? false;

  const [amount, setAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [note, setNote] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [generatedReceipt, setGeneratedReceipt] = useState<Receipt | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Hard guard against double-submit (state updates are async)
  const inFlightRef = useRef(false);
  const requestIdRef = useRef<string | null>(null);

  const uuidV4 = useCallback((): string => {
    // Browser-native if available
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    // Fallback (still a valid UUID v4) using getRandomValues
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }, []);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<RecipientLookupResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [step, setStep] = useState<'search' | 'confirm'>('search');
  
  // Confirmed recipient - REQUIRED for transfer
  const [confirmedRecipient, setConfirmedRecipient] = useState<RecipientLookupResult | null>(
    recipientId && recipientUsername ? {
      id: '',
      userId: recipientId,
      name: recipientName || '',
      username: recipientUsername,
      country: recipientCountry || 'SA',
      avatarUrl: recipientAvatar,
    } : null
  );

  const novaAmount = parseFloat(amount) || 0;
  const localInfo = calculateLocalAmount(novaAmount, user.country, 'nova');
  const hasEnoughBalance = novaAmount <= user.novaBalance && novaAmount > 0;
  const balanceAfterTransfer = user.novaBalance - novaAmount;
  
  // Can only transfer if:
  // 1. Has enough balance
  // 2. Amount > 0
  // 3. Recipient is explicitly selected from search (has userId)
  // 4. Wallet is not frozen
  const canTransfer = hasEnoughBalance && novaAmount > 0 && confirmedRecipient?.userId && !isWalletFrozen;

  // Search users when query changes - start from first character
  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowDropdown(true);

    try {
      const results = await searchUsersByUsername(query, authUser?.id, 10);
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [authUser?.id]);

  // Debounced search
  useEffect(() => {
    if (recipientUsername) return; // Skip if pre-filled
    
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, recipientUsername, handleSearch]);

  // Handle selecting a recipient from search results
  const handleSelectRecipient = (recipient: RecipientLookupResult) => {
    setConfirmedRecipient(recipient);
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  // Clear selected recipient
  const handleClearRecipient = () => {
    setConfirmedRecipient(null);
    setSearchQuery('');
    setStep('search');
  };

  // Proceed to confirmation step
  const handleProceedToConfirm = () => {
    if (confirmedRecipient && canTransfer) {
      setStep('confirm');
    }
  };

  // Go back to search step
  const handleBackToSearch = () => {
    setStep('search');
  };

  // Execute transfer
  const handleTransfer = async () => {
    // Prevent double submit (even if isLoading hasn't updated yet)
    if (inFlightRef.current) return;
    
    if (!canTransfer || !confirmedRecipient?.userId || isWalletFrozen || !authUser) {
      showError(language === 'ar' ? 'لا يمكن إتمام التحويل' : 'Cannot complete transfer');
      return;
    }

    inFlightRef.current = true;
    setIsLoading(true);
    requestIdRef.current = uuidV4();

    try {
      // Execute atomic transfer via database RPC
      const result = await executeTransfer(
        authUser.id,
        confirmedRecipient.userId,
        novaAmount,
        'nova',
        'dm_transfer',
        requestIdRef.current,
        note || (language === 'ar' ? 'تحويل Nova' : 'Nova Transfer'),
        note || 'تحويل Nova'
      );

      if (!result.success) {
        // Show the exact backend error message (no translation / no generalization)
        const backendMsg = result.error || 'Transfer failed';
        const withCode = result.errorCode ? `${backendMsg} (${result.errorCode})` : backendMsg;
        showError(withCode);
        return;
      }

      // Send system message in DM (fire-and-forget - never block success)
      // CRITICAL: DM sync is a side-effect. Transfer is already in ledger.
      (async () => {
        try {
          const conversationId = await getOrCreateConversation(confirmedRecipient.userId);
          if (conversationId) {
            const systemMessage = language === 'ar'
              ? `💸 قام ${user.name} بتحويل И ${formatBalance(novaAmount)} Nova${note ? ` — "${note}"` : ''}`
              : `💸 ${user.name} sent И ${formatBalance(novaAmount)} Nova${note ? ` — "${note}"` : ''}`;

            await sendMessage(conversationId, systemMessage, novaAmount, confirmedRecipient.userId);
          }
        } catch (dmErr) {
          // Silent log - never show error to user for DM failures
          console.warn('[TransferNovaDialog] DM sync failed (transfer succeeded):', dmErr);
        }
      })();

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
      showSuccess(language === 'ar' ? 'تم التحويل بنجاح!' : 'Transfer successful!');

      if (onTransferComplete) {
        onTransferComplete(receipt);
      }
    } catch (err) {
      console.error('Transfer error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      showError(msg || (language === 'ar' ? 'فشل التحويل' : 'Transfer failed'));
    } finally {
      setIsLoading(false);
      inFlightRef.current = false;
      requestIdRef.current = null;
    }
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setAmount('');
    setSearchQuery('');
    setNote('');
    setConfirmedRecipient(null);
    setStep('search');
    onClose();
  };

  const handleDialogClose = () => {
    setAmount('');
    setSearchQuery('');
    setNote('');
    setSearchResults([]);
    setShowDropdown(false);
    if (!recipientId) {
      setConfirmedRecipient(null);
    }
    setStep('search');
    onClose();
  };

  return (
    <>
      <Dialog open={open && !showReceipt} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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

            {/* Step 1: Search & Select Recipient */}
            {step === 'search' && (
              <>
                {/* Recipient Search - Only show if no pre-filled recipient */}
                {!recipientUsername && !confirmedRecipient && (
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'ابحث عن المستلم' : 'Search Recipient'}</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value.replace('@', ''))}
                        placeholder={language === 'ar' ? 'اكتب الاسم أو @username' : 'Type name or @username'}
                        className="ps-10"
                        autoComplete="off"
                      />
                      
                      {/* Search Results Dropdown */}
                      {showDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                          {isSearching ? (
                            <div className="p-4 flex items-center justify-center gap-2 text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {language === 'ar' ? 'جاري البحث...' : 'Searching...'}
                            </div>
                          ) : searchResults.length === 0 && searchQuery.length >= 1 ? (
                            <div className="p-4 text-center text-muted-foreground">
                              <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="font-medium">
                                {language === 'ar' ? 'لا يوجد مستخدم بهذا الاسم' : 'No user found'}
                              </p>
                              <p className="text-xs mt-1">
                                {language === 'ar' 
                                  ? 'تحقق من الاسم أو اسم المستخدم'
                                  : 'Check the name or username'}
                              </p>
                            </div>
                          ) : (
                            <ScrollArea className="max-h-64">
                              <div className="p-1">
                                {searchResults.map((result) => (
                                  <button
                                    key={result.userId}
                                    onClick={() => handleSelectRecipient(result)}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-start"
                                  >
                                    <Avatar className="h-10 w-10">
                                      {result.avatarUrl && <AvatarImage src={result.avatarUrl} />}
                                      <AvatarFallback className="bg-primary/10 text-primary">
                                        {result.name.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium truncate">{result.name}</p>
                                      <p className="text-sm text-muted-foreground truncate">@{result.username}</p>
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                      <span>{getCountryFlag(result.country)}</span>
                                      <span>{result.country}</span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </ScrollArea>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' 
                        ? '⚠️ يجب اختيار المستلم من نتائج البحث'
                        : '⚠️ You must select recipient from search results'}
                    </p>
                  </div>
                )}

                {/* Selected Recipient Card */}
                {confirmedRecipient && (
                  <div className="p-4 bg-primary/5 border border-primary/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border-2 border-primary/20">
                        {confirmedRecipient.avatarUrl && (
                          <AvatarImage src={confirmedRecipient.avatarUrl} alt={confirmedRecipient.name} />
                        )}
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
                          <span>{getCountryFlag(confirmedRecipient.country)}</span>
                          <MapPin className="h-3 w-3" />
                          <span>{confirmedRecipient.country}</span>
                        </div>
                      </div>
                      {!recipientUsername && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleClearRecipient}
                          className="shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Amount Input */}
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
                    disabled={!confirmedRecipient}
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

                {/* Note */}
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'ملاحظة (اختياري)' : 'Note (optional)'}</Label>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={language === 'ar' ? 'أضف ملاحظة...' : 'Add a note...'}
                    rows={2}
                    disabled={!confirmedRecipient}
                  />
                </div>

                {/* Continue Button */}
                <Button
                  className="w-full h-12"
                  disabled={!canTransfer}
                  onClick={handleProceedToConfirm}
                >
                  {language === 'ar' ? 'متابعة' : 'Continue'}
                </Button>
              </>
            )}

            {/* Step 2: Confirmation Card */}
            {step === 'confirm' && confirmedRecipient && (
              <>
                <div className="p-4 bg-card border rounded-xl space-y-4">
                  <h3 className="font-bold text-center">
                    {language === 'ar' ? 'تأكيد التحويل' : 'Confirm Transfer'}
                  </h3>

                  {/* Recipient Info */}
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Avatar className="h-14 w-14 border-2 border-primary/20">
                      {confirmedRecipient.avatarUrl && (
                        <AvatarImage src={confirmedRecipient.avatarUrl} alt={confirmedRecipient.name} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                        {confirmedRecipient.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-lg">{confirmedRecipient.name}</p>
                      <p className="text-sm text-muted-foreground">@{confirmedRecipient.username}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <span>{getCountryFlag(confirmedRecipient.country)}</span>
                        <span>{confirmedRecipient.country}</span>
                      </div>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-center py-4 border-y border-border">
                    <p className="text-xs text-muted-foreground mb-1">
                      {language === 'ar' ? 'المبلغ' : 'Amount'}
                    </p>
                    <p className="text-3xl font-bold text-nova">
                      И {formatBalance(novaAmount)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ≈ {localInfo.symbol} {formatBalance(localInfo.amount)} {localInfo.currency}
                    </p>
                  </div>

                  {/* Balance After Transfer */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      {language === 'ar' ? 'رصيدك بعد التحويل' : 'Your balance after'}
                    </span>
                    <span className="font-medium">
                      <span className="text-nova">И</span> {formatBalance(balanceAfterTransfer)}
                    </span>
                  </div>

                  {/* Note if exists */}
                  {note && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">
                        {language === 'ar' ? 'ملاحظة' : 'Note'}
                      </p>
                      <p className="text-sm">{note}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={handleBackToSearch}
                    disabled={isLoading}
                  >
                    {language === 'ar' ? 'رجوع' : 'Back'}
                  </Button>
                  <Button
                    className="flex-1 h-12 bg-nova hover:bg-nova/90 text-nova-foreground font-bold"
                    disabled={isLoading || !canTransfer}
                    onClick={handleTransfer}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {language === 'ar' ? 'جاري التحويل...' : 'Transferring...'}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        {language === 'ar' ? 'تأكيد التحويل' : 'Confirm Transfer'}
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
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
