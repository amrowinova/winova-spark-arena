import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Timer, AlertTriangle, Wallet, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { P2PAmountSelector } from './P2PAmountSelector';
import { P2POffer } from './P2POfferCard';
import { SavedPaymentMethod, useSavedPaymentMethods } from './P2PPaymentMethodsManager';
import { cn } from '@/lib/utils';

interface P2PSellDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: P2POffer | null; // This is a BUY offer from a buyer
  onConfirm: (amount: number, selectedPaymentMethod: SavedPaymentMethod) => void;
}

export function P2PSellDialog({
  open,
  onOpenChange,
  offer,
  onConfirm,
}: P2PSellDialogProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const navigate = useNavigate();
  const paymentMethods = useSavedPaymentMethods();

  const [amount, setAmount] = useState<number | null>(null);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');

  if (!offer) return null;

  const selectedPaymentMethod = paymentMethods.find(m => m.id === selectedPaymentMethodId);
  const total = amount ? amount * offer.price : 0;
  const canConfirm = amount && amount <= offer.amount && selectedPaymentMethod;

  const handleConfirm = () => {
    if (!canConfirm || !selectedPaymentMethod) return;
    onConfirm(amount!, selectedPaymentMethod);
    setAmount(null);
    setSelectedPaymentMethodId('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setAmount(null);
      setSelectedPaymentMethodId('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isRTL ? 'بيع Nova' : 'Sell Nova'}
          </DialogTitle>
          <DialogDescription>
            {isRTL ? 'إلى' : 'To'} {isRTL ? offer.user.nameAr : offer.user.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Buyer Info */}
          <Card className="p-4 bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center text-2xl border border-border">
                  {offer.user.avatar}
                </div>
                <span className="absolute -bottom-0.5 -end-0.5 h-3.5 w-3.5 rounded-full bg-success border-2 border-card" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg">
                  {isRTL ? offer.user.nameAr : offer.user.name}
                </p>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1 text-warning">
                    <Star className="h-4 w-4 fill-warning" />
                    <span className="font-semibold">{(offer.user.rating * 20).toFixed(0)}%</span>
                  </div>
                  <span className="text-muted-foreground">
                    {offer.user.completedTrades} {isRTL ? 'صفقة' : 'trades'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Offer Details */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">
                {isRTL ? 'السعر' : 'Price'}
              </p>
              <p className="text-lg font-bold">
                {offer.currencySymbol} {offer.price.toFixed(2)}
              </p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">
                {isRTL ? 'يريد شراء' : 'Wants to buy'}
              </p>
              <p className="text-lg font-bold text-nova">
                И {offer.amount}
              </p>
            </Card>
          </div>

          {/* Payment Methods Buyer Accepts */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {isRTL ? 'طرق الدفع المقبولة للمشتري' : 'Buyer Accepts'}
            </p>
            <div className="flex flex-wrap gap-2">
              {offer.paymentMethods.map((method) => (
                <Badge key={method.id} variant="secondary" className="gap-1.5 py-1.5">
                  <span>{method.icon}</span>
                  <span>{isRTL ? method.nameAr : method.name}</span>
                </Badge>
              ))}
            </div>
          </div>

          {/* Select Your Payment Method */}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {isRTL ? 'اختر حسابك البنكي لاستلام المبلغ' : 'Select your bank account to receive payment'}
              <span className="text-destructive ms-1">*</span>
            </p>
            
            {paymentMethods.length === 0 ? (
              <Card className="p-4 bg-warning/10 border-warning/30">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-warning">
                        {isRTL ? 'لا توجد حسابات بنكية محفوظة' : 'No saved bank accounts'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isRTL 
                          ? 'يجب إضافة حساب بنكي من إعدادات الدفع أولاً'
                          : 'Add a bank account from payment settings first'
                        }
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-warning/50 text-warning hover:bg-warning/10 hover:text-warning"
                      onClick={() => {
                        onOpenChange(false);
                        navigate('/settings');
                      }}
                    >
                      <ExternalLink className="h-4 w-4 me-2" />
                      {isRTL ? 'الذهاب لإعدادات الدفع' : 'Go to Payment Settings'}
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Select value={selectedPaymentMethodId} onValueChange={setSelectedPaymentMethodId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isRTL ? 'اختر حساب الاستلام' : 'Select receiving account'} />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        <span>{method.providerName}</span>
                        <span className="text-muted-foreground">
                          - {method.accountNumber || method.phoneNumber || method.iban}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Amount Selector */}
          <P2PAmountSelector
            value={amount}
            onChange={setAmount}
            maxAmount={offer.amount}
          />

          {/* Order Summary */}
          {amount && (
            <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'ستبيع' : "You'll sell"}
                  </p>
                  <p className="text-xl font-bold text-nova">И {amount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'ستستلم' : "You'll receive"}
                  </p>
                  <p className="text-xl font-bold text-success">
                    {offer.currencySymbol} {total.toFixed(2)}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Warning about escrow */}
          <Card className="p-3 bg-info/10 border-info/30">
            <div className="flex items-start gap-2">
              <Timer className="h-4 w-4 text-info shrink-0 mt-0.5" />
              <p className="text-xs text-info">
                {isRTL 
                  ? `سيتم حجز Nova في الضمان حتى يؤكد المشتري الدفع. المهلة: ${offer.timeLimit} دقيقة`
                  : `Nova will be held in escrow until buyer confirms payment. Time limit: ${offer.timeLimit} minutes`
                }
              </p>
            </div>
          </Card>

          {/* Confirm Button */}
          <Button
            className="w-full h-12 text-base font-semibold"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {isRTL ? 'متابعة وبدء الصفقة' : 'Continue & Start Trade'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
