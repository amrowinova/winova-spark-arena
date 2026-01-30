import { useState, useEffect } from 'react';
import { Lock, Info, CreditCard, AlertCircle, Eye, Wallet, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { P2PAmountSelector } from './P2PAmountSelector';
import { P2PTimeSelector } from './P2PTimeSelector';
import { CountryConfig, PaymentMethod } from './P2PCountrySelector';
import { 
  SavedPaymentMethod, 
  useSavedPaymentMethods, 
  PAYMENT_METHOD_TYPES,
  P2PPaymentMethodsManager 
} from './P2PPaymentMethodsManager';
import { cn } from '@/lib/utils';

interface P2PCreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  country: CountryConfig;
  initialOrderType?: 'buy' | 'sell';
  onCreateOrder: (order: {
    type: 'buy' | 'sell';
    amount: number;
    timeLimit: number;
    paymentMethod: PaymentMethod;
    paymentMethods?: PaymentMethod[]; // For buy orders with multiple accepted methods
    savedPaymentMethod?: SavedPaymentMethod;
  }) => void;
}

export function P2PCreateOrderDialog({
  open,
  onOpenChange,
  country,
  initialOrderType = 'sell',
  onCreateOrder,
}: P2PCreateOrderDialogProps) {
  const { language } = useLanguage();
  const { user } = useUser();
  const isRTL = language === 'ar';

  const [orderType, setOrderType] = useState<'buy' | 'sell'>(initialOrderType);
  const [amount, setAmount] = useState<number | null>(null);
  const [timeLimit, setTimeLimit] = useState<number | null>(30);
  
  // For Buy: multiple payment methods via checkboxes
  const [selectedBuyMethodIds, setSelectedBuyMethodIds] = useState<Set<string>>(new Set());
  
  // For Sell: select from saved payment methods
  const [sellPaymentMethodId, setSellPaymentMethodId] = useState<string>('');
  const [viewingMethod, setViewingMethod] = useState<SavedPaymentMethod | null>(null);
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
  const [isManageSheetOpen, setIsManageSheetOpen] = useState(false);

  // Get saved payment methods for this country
  const savedMethods = useSavedPaymentMethods(country.code);
  const selectedSavedMethod = savedMethods.find(m => m.id === sellPaymentMethodId);
  const selectedBuyMethods = country.paymentMethods.filter(m => selectedBuyMethodIds.has(m.id));

  // Sync order type when initialOrderType changes
  useEffect(() => {
    setOrderType(initialOrderType);
  }, [initialOrderType, open]);

  // Auto-select default method when country changes or methods load
  useEffect(() => {
    const defaultMethod = savedMethods.find(m => m.isDefault);
    if (defaultMethod && !sellPaymentMethodId) {
      setSellPaymentMethodId(defaultMethod.id);
    }
  }, [savedMethods, sellPaymentMethodId]);

  // Reset when country changes
  useEffect(() => {
    setSellPaymentMethodId('');
    setSelectedBuyMethodIds(new Set());
  }, [country.code]);

  const total = amount ? amount * country.novaRate : 0;
  const insufficientBalance = orderType === 'sell' && amount && amount > user.novaBalance;
  const noSavedMethods = orderType === 'sell' && savedMethods.length === 0;

  const canCreate = amount && timeLimit && (
    (orderType === 'buy' && selectedBuyMethodIds.size > 0) ||
    (orderType === 'sell' && sellPaymentMethodId)
  );

  const toggleBuyMethod = (methodId: string) => {
    setSelectedBuyMethodIds(prev => {
      const next = new Set(prev);
      if (next.has(methodId)) {
        next.delete(methodId);
      } else {
        next.add(methodId);
      }
      return next;
    });
  };

  const handleCreate = () => {
    if (!canCreate || insufficientBalance) return;

    if (orderType === 'sell' && selectedSavedMethod) {
      // Convert saved method to PaymentMethod format
      const paymentMethod: PaymentMethod = {
        id: selectedSavedMethod.id,
        name: selectedSavedMethod.providerName,
        nameAr: selectedSavedMethod.providerNameAr || selectedSavedMethod.providerName,
        icon: PAYMENT_METHOD_TYPES.find(t => t.id === selectedSavedMethod.type)?.icon || '💳',
      };

      onCreateOrder({
        type: 'sell',
        amount: amount!,
        timeLimit: timeLimit!,
        paymentMethod,
        savedPaymentMethod: selectedSavedMethod,
      });
    } else if (orderType === 'buy' && selectedBuyMethods.length > 0) {
      onCreateOrder({
        type: 'buy',
        amount: amount!,
        timeLimit: timeLimit!,
        paymentMethod: selectedBuyMethods[0], // First method as primary
        paymentMethods: selectedBuyMethods, // All selected methods
      });
    }

    // Reset form
    setAmount(null);
    setTimeLimit(30);
    setSelectedBuyMethodIds(new Set());
    setSellPaymentMethodId('');
    onOpenChange(false);
  };

  const getTypeConfig = (type: string) => 
    PAYMENT_METHOD_TYPES.find(t => t.id === type);

  return (
    <>
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
                    И {user.novaBalance.toFixed(0)}
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

            {/* Payment Methods - For Buy Orders (Checkboxes) */}
            {orderType === 'buy' && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  {isRTL ? 'طرق الدفع المقبولة' : 'Accepted Payment Methods'}
                  <span className="text-xs text-muted-foreground">
                    ({isRTL ? 'اختر واحدة أو أكثر' : 'select one or more'})
                  </span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {country.paymentMethods.map((method) => {
                    const isSelected = selectedBuyMethodIds.has(method.id);
                    return (
                      <Card
                        key={method.id}
                        className={cn(
                          "p-3 cursor-pointer transition-all",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        )}
                        onClick={() => toggleBuyMethod(method.id)}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-4 h-4 rounded border-2 flex items-center justify-center",
                              isSelected
                                ? "border-primary bg-primary"
                                : "border-muted-foreground/50"
                            )}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-primary-foreground"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                          <span className="text-lg">{method.icon}</span>
                          <span className="text-sm font-medium truncate">
                            {isRTL ? method.nameAr : method.name}
                          </span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
                {selectedBuyMethodIds.size === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {isRTL 
                      ? 'اختر طريقة دفع واحدة على الأقل'
                      : 'Select at least one payment method'
                    }
                  </p>
                )}
              </div>
            )}

            {/* Payment Method - For Sell Orders (Saved Methods) */}
            {orderType === 'sell' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    {isRTL ? 'طريقة الدفع المحفوظة' : 'Saved Payment Method'}
                  </Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={() => setIsManageSheetOpen(true)}
                  >
                    <Plus className="h-3 w-3 me-1" />
                    {isRTL ? 'إدارة' : 'Manage'}
                  </Button>
                </div>

                {noSavedMethods ? (
                  <Card className="p-4 border-dashed border-warning/50 bg-warning/5">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-warning">
                          {isRTL 
                            ? 'لا توجد طرق دفع محفوظة'
                            : 'No saved payment methods'
                          }
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {isRTL 
                            ? 'يجب إضافة طريقة دفع لتتمكن من بيع Nova'
                            : 'You need to add a payment method to sell Nova'
                          }
                        </p>
                        <Button 
                          size="sm" 
                          className="mt-3"
                          onClick={() => setIsManageSheetOpen(true)}
                        >
                          <Plus className="h-4 w-4 me-1" />
                          {isRTL ? 'إضافة طريقة دفع' : 'Add Payment Method'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <>
                    <Select value={sellPaymentMethodId} onValueChange={setSellPaymentMethodId}>
                      <SelectTrigger>
                        <SelectValue placeholder={isRTL ? 'اختر طريقة الدفع' : 'Select payment method'} />
                      </SelectTrigger>
                      <SelectContent>
                        {savedMethods.map((method) => {
                          const typeConfig = getTypeConfig(method.type);
                          return (
                            <SelectItem key={method.id} value={method.id}>
                              <span className="flex items-center gap-2">
                                <span>{typeConfig?.icon || '💳'}</span>
                                <span>
                                  {isRTL ? method.providerNameAr : method.providerName}
                                </span>
                                {method.isDefault && (
                                  <Badge variant="secondary" className="text-[10px] ms-1">
                                    {isRTL ? 'افتراضي' : 'Default'}
                                  </Badge>
                                )}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    {/* Selected Method Preview */}
                    {selectedSavedMethod && (
                      <Card className="p-3 bg-muted/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">
                              {getTypeConfig(selectedSavedMethod.type)?.icon}
                            </span>
                            <div>
                              <p className="text-sm font-medium">
                                {selectedSavedMethod.fullName}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {selectedSavedMethod.type === 'bank' 
                                  ? selectedSavedMethod.accountNumber 
                                  : selectedSavedMethod.phoneNumber
                                }
                              </p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => {
                              setViewingMethod(selectedSavedMethod);
                              setIsViewSheetOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    )}

                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      {isRTL 
                        ? 'بيانات الدفع مقفلة ولا يمكن تعديلها بعد إنشاء الطلب'
                        : 'Payment details are locked and cannot be edited after order creation'
                      }
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Order Summary */}
            {amount && (
              <Card className="p-4 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Nova</p>
                    <p className="text-xl font-bold text-nova">И {amount}</p>
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
                    {isRTL ? 'السعر الرسمي:' : 'Official rate:'} И 1 = {country.currencySymbol} {country.novaRate}
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
              disabled={!canCreate || !!insufficientBalance || noSavedMethods}
            >
              {isRTL ? 'إنشاء الطلب' : 'Create Order'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Payment Method Sheet (Readonly) */}
      <Sheet open={isViewSheetOpen} onOpenChange={setIsViewSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {isRTL ? 'تفاصيل طريقة الدفع' : 'Payment Method Details'}
            </SheetTitle>
            {viewingMethod && (
              <SheetDescription className="flex items-center gap-2">
                <span>{getTypeConfig(viewingMethod.type)?.icon}</span>
                {isRTL ? viewingMethod.providerNameAr : viewingMethod.providerName}
              </SheetDescription>
            )}
          </SheetHeader>

          {viewingMethod && (
            <div className="mt-6 space-y-4">
              <Card className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'النوع' : 'Type'}
                  </p>
                  <p className="font-medium flex items-center gap-2">
                    <span>{getTypeConfig(viewingMethod.type)?.icon}</span>
                    {isRTL 
                      ? getTypeConfig(viewingMethod.type)?.labelAr 
                      : getTypeConfig(viewingMethod.type)?.labelEn
                    }
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL 
                      ? (viewingMethod.type === 'bank' ? 'البنك' : 'المحفظة')
                      : (viewingMethod.type === 'bank' ? 'Bank' : 'Provider')
                    }
                  </p>
                  <p className="font-medium">
                    {isRTL ? viewingMethod.providerNameAr : viewingMethod.providerName}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'الاسم الكامل' : 'Full Name'}
                  </p>
                  <p className="font-medium">{viewingMethod.fullName}</p>
                </div>

                {viewingMethod.type === 'bank' && (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {isRTL ? 'رقم الحساب' : 'Account Number'}
                      </p>
                      <p className="font-mono font-medium">{viewingMethod.accountNumber}</p>
                    </div>

                    {viewingMethod.iban && (
                      <div>
                        <p className="text-xs text-muted-foreground">IBAN</p>
                        <p className="font-mono font-medium text-sm">{viewingMethod.iban}</p>
                      </div>
                    )}
                  </>
                )}

                {(viewingMethod.type === 'wallet' || viewingMethod.type === 'instant') && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? 'رقم الهاتف' : 'Phone Number'}
                    </p>
                    <p className="font-mono font-medium" dir="ltr">{viewingMethod.phoneNumber}</p>
                  </div>
                )}

                {viewingMethod.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? 'ملاحظات' : 'Notes'}
                    </p>
                    <p className="text-sm">{viewingMethod.notes}</p>
                  </div>
                )}
              </Card>

              <Card className="p-3 bg-info/10 border-info/30">
                <p className="text-xs text-info flex items-center gap-2">
                  <Lock className="h-3 w-3" />
                  {isRTL 
                    ? 'هذه البيانات ستظهر للمشتري بعد إنشاء الطلب'
                    : 'This information will be shown to the buyer after order creation'
                  }
                </p>
              </Card>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Manage Payment Methods Sheet */}
      <Sheet open={isManageSheetOpen} onOpenChange={setIsManageSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {isRTL ? 'إدارة طرق الدفع' : 'Manage Payment Methods'}
            </SheetTitle>
            <SheetDescription>
              {country.flag} {isRTL ? country.nameAr : country.name}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            <P2PPaymentMethodsManager country={country} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
