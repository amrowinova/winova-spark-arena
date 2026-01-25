import { Copy, Lock, CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { P2PPaymentDetails } from '@/contexts/P2PContext';
import { toast } from 'sonner';

interface P2PPaymentCardProps {
  paymentDetails: P2PPaymentDetails;
  showCopy?: boolean;
}

export function P2PPaymentCard({ paymentDetails, showCopy = true }: P2PPaymentCardProps) {
  const { language } = useLanguage();

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(language === 'ar' ? `تم نسخ ${label}` : `${label} copied`);
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        {/* Header with Lock Icon */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">
              {language === 'ar' ? 'بيانات الدفع' : 'Payment Details'}
            </span>
          </div>
          {paymentDetails.isLocked && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span className="text-[10px]">
                {language === 'ar' ? 'مقفل' : 'Locked'}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {/* Bank Name */}
          <div className="flex items-center justify-between p-2 bg-background rounded">
            <div>
              <p className="text-[10px] text-muted-foreground">
                {language === 'ar' ? 'البنك' : 'Bank'}
              </p>
              <p className="text-sm font-medium">{paymentDetails.bankName}</p>
            </div>
            {showCopy && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleCopy(paymentDetails.bankName, language === 'ar' ? 'البنك' : 'Bank')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Account Number */}
          <div className="flex items-center justify-between p-2 bg-background rounded">
            <div>
              <p className="text-[10px] text-muted-foreground">
                {language === 'ar' ? 'رقم الحساب' : 'Account Number'}
              </p>
              <p className="text-sm font-mono">{paymentDetails.accountNumber}</p>
            </div>
            {showCopy && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleCopy(paymentDetails.accountNumber, language === 'ar' ? 'رقم الحساب' : 'Account')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Account Holder */}
          <div className="flex items-center justify-between p-2 bg-background rounded">
            <div>
              <p className="text-[10px] text-muted-foreground">
                {language === 'ar' ? 'اسم صاحب الحساب' : 'Account Holder'}
              </p>
              <p className="text-sm font-medium">{paymentDetails.accountHolder}</p>
            </div>
            {showCopy && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleCopy(paymentDetails.accountHolder, language === 'ar' ? 'الاسم' : 'Name')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Warning */}
        <p className="text-[10px] text-muted-foreground mt-3 text-center">
          {language === 'ar' 
            ? '⚠️ لا يمكن تعديل بيانات الدفع بعد إنشاء الطلب'
            : '⚠️ Payment details cannot be modified after order creation'
          }
        </p>
      </CardContent>
    </Card>
  );
}
