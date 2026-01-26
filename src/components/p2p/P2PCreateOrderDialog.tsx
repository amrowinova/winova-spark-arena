import { useState } from 'react';
import { Lock, Info, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { P2PAmountSelector, FIXED_AMOUNTS } from './P2PAmountSelector';
import { P2PTimeSelector, FIXED_TIMES } from './P2PTimeSelector';
import { CountryConfig, PaymentMethod } from './P2PCountrySelector';
import { cn } from '@/lib/utils';

interface P2PCreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  country: CountryConfig;
  onCreateOrder: (order: {
    type: 'buy' | 'sell';
    amount: number;
    timeLimit: number;
    paymentMethod: PaymentMethod;
    paymentDetails?: string;
  }) => void;
}

export function P2PCreateOrderDialog({
  open,
  onOpenChange,
  country,
  onCreateOrder,
}: P2PCreateOrderDialogProps) {
  const { language } = useLanguage();
  const { user } = useUser();
  const isRTL = language === 'ar';

  const [orderType, setOrderType] = useState<'buy' | 'sell'>('sell');
  const [amount, setAmount] = useState<number | null>(null);
  const [timeLimit, setTimeLimit] = useState<number | null>(30);
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [paymentDetails, setPaymentDetails] = useState('');

  const selectedPaymentMethod = country.paymentMethods.find(m => m.id === paymentMethodId);
  const total = amount ? amount * country.novaRate : 0;
  const canCreate = amount && timeLimit && paymentMethodId && (orderType === 'buy' || paymentDetails);
  const insufficientBalance = orderType === 'sell' && amount && amount > user.novaBalance;

  const handleCreate = () => {
    if (!canCreate || !selectedPaymentMethod || insufficientBalance) return;
    
    onCreateOrder({
      type: orderType,
      amount: amount!,
      timeLimit: timeLimit!,
      paymentMethod: selectedPaymentMethod,
      paymentDetails: orderType === 'sell' ? paymentDetails : undefined,
    });

    // Reset form
    setAmount(null);
    setTimeLimit(30);
    setPaymentMethodId('');
    setPaymentDetails('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isRTL ? 'إنشاء طلب P2P' : 'Create P2P Order'}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <span className="text-xl">{country.flag}</span>
            {isRTL ? country.nameAr : country.name} • {country.currency}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Order Type */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={orderType === 'buy' ? 'default' : 'outline'}
              className={cn(
                "h-12 text-base",
                orderType === 'buy' && "bg-success hover:bg-success/90"
              )}
              onClick={() => setOrderType('buy')}
            >
              {isRTL ? 'شراء Nova' : 'Buy Nova'}
            </Button>
            <Button
              type="button"
              variant={orderType === 'sell' ? 'default' : 'outline'}
              className="h-12 text-base"
              onClick={() => setOrderType('sell')}
            >
              {isRTL ? 'بيع Nova' : 'Sell Nova'}
            </Button>
          </div>

          {/* Balance Info for Sell */}
          {orderType === 'sell' && (
            <Card className="p-3 bg-muted/50 border-dashed">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {isRTL ? 'رصيدك المتاح:' : 'Available balance:'}
                </span>
                <span className="font-bold text-nova">
                  {user.novaBalance.toFixed(3)} ✦
                </span>
              </div>
            </Card>
          )}

          {/* Amount Selector */}
          <P2PAmountSelector
            value={amount}
            onChange={setAmount}
            maxAmount={orderType === 'sell' ? user.novaBalance : undefined}
          />

          {insufficientBalance && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <Info className="h-3 w-3" />
              {isRTL ? 'رصيد غير كافي' : 'Insufficient balance'}
            </p>
          )}

          {/* Time Selector */}
          <P2PTimeSelector
            value={timeLimit}
            onChange={setTimeLimit}
          />

          {/* Payment Method */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              {isRTL ? 'طريقة الدفع' : 'Payment Method'}
            </Label>
            <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
              <SelectTrigger>
                <SelectValue placeholder={isRTL ? 'اختر طريقة الدفع' : 'Select payment method'} />
              </SelectTrigger>
              <SelectContent>
                {country.paymentMethods.map((method) => (
                  <SelectItem key={method.id} value={method.id}>
                    <span className="flex items-center gap-2">
                      <span>{method.icon}</span>
                      <span>{isRTL ? method.nameAr : method.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Details (for Sell orders) */}
          {orderType === 'sell' && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                {isRTL ? 'بيانات الدفع (مقفلة بعد الإنشاء)' : 'Payment Details (locked after creation)'}
              </Label>
              <Input
                value={paymentDetails}
                onChange={(e) => setPaymentDetails(e.target.value)}
                placeholder={isRTL ? 'رقم الحساب / IBAN...' : 'Account number / IBAN...'}
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                {isRTL 
                  ? 'لا يمكن تعديل بيانات الدفع بعد إنشاء الطلب'
                  : 'Payment details cannot be edited after order creation'
                }
              </p>
            </div>
          )}

          {/* Order Summary */}
          {amount && (
            <Card className="p-4 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Nova</p>
                  <p className="text-xl font-bold text-nova">{amount} ✦</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{isRTL ? 'الإجمالي' : 'Total'}</p>
                  <p className="text-xl font-bold text-success">
                    {country.currencySymbol} {total.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-success/20 text-center">
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'السعر الرسمي:' : 'Official rate:'} 1 ✦ = {country.currencySymbol} {country.novaRate}
                </p>
              </div>
            </Card>
          )}

          {/* Escrow Notice */}
          <Card className="p-3 bg-warning/10 border-warning/30">
            <div className="flex items-start gap-2">
              <Lock className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-warning">
                {orderType === 'sell' 
                  ? (isRTL 
                      ? 'سيتم حجز Nova في الضمان حتى إتمام الصفقة'
                      : 'Nova will be locked in escrow until trade completion'
                    )
                  : (isRTL 
                      ? 'يجب عليك الدفع خلال الوقت المحدد'
                      : 'You must pay within the specified time'
                    )
                }
              </p>
            </div>
          </Card>

          {/* Create Button */}
          <Button
            className="w-full h-12 text-base font-semibold"
            onClick={handleCreate}
            disabled={!canCreate || !!insufficientBalance}
          >
            {isRTL ? 'إنشاء الطلب' : 'Create Order'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
