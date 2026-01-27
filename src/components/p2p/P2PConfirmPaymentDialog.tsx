import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { P2POrder } from '@/contexts/P2PContext';

interface P2PConfirmPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: P2POrder | null;
  onConfirm: () => void;
}

export function P2PConfirmPaymentDialog({
  open,
  onOpenChange,
  order,
  onConfirm,
}: P2PConfirmPaymentDialogProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  if (!order) return null;

  const sellerName = isRTL ? order.seller.nameAr : order.seller.name;
  const paymentMethod = order.paymentDetails.bankName;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-start">
            {isRTL ? 'تأكيد الدفع' : 'Confirm Payment'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-start space-y-4">
            <p>
              {isRTL 
                ? `هل قمت بتحويل مبلغ ${order.total.toFixed(2)} ${order.currencySymbol} إلى حساب ${sellerName}`
                : `Have you transferred ${order.currencySymbol} ${order.total.toFixed(2)} to ${sellerName}'s account`
              }
              <br />
              {isRTL 
                ? `عبر ${paymentMethod}؟`
                : `via ${paymentMethod}?`
              }
            </p>
            
            <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-warning">
                {isRTL 
                  ? 'لا تنسَ إرسال صورة إيصال التحويل داخل محادثة الصفقة (P2P Chat).'
                  : "Don't forget to send a screenshot of the transfer receipt inside the P2P Chat."
                }
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-2">
          <AlertDialogCancel className="flex-1 mt-0">
            {isRTL ? 'إلغاء' : 'Cancel'}
          </AlertDialogCancel>
          <AlertDialogAction className="flex-1" onClick={onConfirm}>
            {isRTL ? 'تأكيد' : 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
