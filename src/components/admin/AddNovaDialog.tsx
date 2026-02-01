import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Minus, 
  User, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { formatNovaWithLocal } from '@/lib/novaExchangeRates';

interface UserWallet {
  id: string;
  user_id: string;
  nova_balance: number;
  aura_balance: number;
  locked_nova_balance: number;
  user_name: string;
  user_avatar: string | null;
  username: string;
  country?: string;
}

interface AddNovaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWallet | null;
  onSuccess: () => void;
}

type OperationType = 'add' | 'deduct';

export function AddNovaDialog({ open, onOpenChange, user, onSuccess }: AddNovaDialogProps) {
  const { language } = useLanguage();
  const { user: adminUser } = useAuth();
  const isRTL = language === 'ar';
  
  const [operation, setOperation] = useState<OperationType>('add');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const country = user?.country || 'Egypt';

  const numericAmount = parseFloat(amount) || 0;
  const localValue = formatNovaWithLocal(numericAmount, country, isRTL);

  const handleSubmit = async () => {
    if (!user || !adminUser || numericAmount <= 0) return;

    // Validation for deduction
    if (operation === 'deduct' && numericAmount > user.nova_balance) {
      toast.error(isRTL ? 'الرصيد غير كافٍ' : 'Insufficient balance');
      return;
    }

    setIsLoading(true);

    try {
      const newBalance = operation === 'add' 
        ? user.nova_balance + numericAmount 
        : user.nova_balance - numericAmount;

      // 1. Update wallet balance
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ nova_balance: newBalance })
        .eq('user_id', user.user_id);

      if (walletError) throw walletError;

      // 2. Record transaction
      const transactionData = {
        user_id: user.user_id,
        amount: operation === 'add' ? numericAmount : -numericAmount,
        currency: 'nova' as const,
        type: operation === 'add' ? 'deposit' as const : 'withdrawal' as const,
        description: reason || (operation === 'add' 
          ? 'Admin deposit' 
          : 'Admin withdrawal'),
        description_ar: reason || (operation === 'add' 
          ? 'إيداع من المشرف' 
          : 'سحب من المشرف'),
      };

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert(transactionData);

      if (transactionError) throw transactionError;

      toast.success(
        isRTL 
          ? `تم ${operation === 'add' ? 'إضافة' : 'خصم'} ${numericAmount} Nova بنجاح`
          : `Successfully ${operation === 'add' ? 'added' : 'deducted'} ${numericAmount} Nova`
      );

      // Reset and close
      setAmount('');
      setReason('');
      setOperation('add');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error updating Nova balance:', error);
      toast.error(isRTL ? 'حدث خطأ' : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {isRTL ? 'إدارة رصيد Nova' : 'Manage Nova Balance'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Avatar className="w-12 h-12">
              <AvatarImage src={user.user_avatar || undefined} />
              <AvatarFallback><User className="w-6 h-6" /></AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{user.user_name}</p>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            </div>
            <div className="text-end">
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'الرصيد الحالي' : 'Current Balance'}
              </p>
              <p className="font-bold text-amber-600">
                {user.nova_balance.toFixed(2)} И
              </p>
            </div>
          </div>

          {/* Operation Toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={operation === 'add' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setOperation('add')}
            >
              <Plus className="w-4 h-4 me-1" />
              {isRTL ? 'إضافة' : 'Add'}
            </Button>
            <Button
              type="button"
              variant={operation === 'deduct' ? 'destructive' : 'outline'}
              className="flex-1"
              onClick={() => setOperation('deduct')}
            >
              <Minus className="w-4 h-4 me-1" />
              {isRTL ? 'خصم' : 'Deduct'}
            </Button>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label>{isRTL ? 'المبلغ (Nova)' : 'Amount (Nova)'}</Label>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg pe-12"
                min="0"
                step="0.01"
              />
              <span className="absolute end-3 top-1/2 -translate-y-1/2 text-amber-600 font-medium">
                И
              </span>
            </div>
            
            {/* Local Currency Equivalent */}
            {numericAmount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {isRTL ? 'ما يعادل' : 'Equivalent to'}:
                </span>
                <Badge variant="outline" className="font-mono">
                  {localValue.local}
                </Badge>
              </div>
            )}

            {/* Exchange Rate Info */}
            <p className="text-xs text-muted-foreground text-center">
              {localValue.rate}
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>{isRTL ? 'السبب (اختياري)' : 'Reason (optional)'}</Label>
            <Textarea
              placeholder={isRTL ? 'أدخل سبب العملية...' : 'Enter reason for this operation...'}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          {/* Warning for Deduction */}
          {operation === 'deduct' && numericAmount > user.nova_balance && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              {isRTL ? 'المبلغ أكبر من الرصيد المتاح' : 'Amount exceeds available balance'}
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isLoading || numericAmount <= 0 || (operation === 'deduct' && numericAmount > user.nova_balance)}
            className="w-full"
            variant={operation === 'add' ? 'default' : 'destructive'}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin me-2" />
            ) : operation === 'add' ? (
              <Plus className="w-4 h-4 me-2" />
            ) : (
              <Minus className="w-4 h-4 me-2" />
            )}
            {isRTL 
              ? `${operation === 'add' ? 'إضافة' : 'خصم'} ${numericAmount > 0 ? numericAmount : ''} Nova`
              : `${operation === 'add' ? 'Add' : 'Deduct'} ${numericAmount > 0 ? numericAmount : ''} Nova`
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
