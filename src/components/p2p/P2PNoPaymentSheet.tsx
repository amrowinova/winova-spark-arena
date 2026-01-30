import { Clock, AlertTriangle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';

interface P2PNoPaymentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (action: 'wait' | 'dispute') => void;
}

export function P2PNoPaymentSheet({
  open,
  onOpenChange,
  onAction,
}: P2PNoPaymentSheetProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const handleWait = () => {
    onAction('wait');
    onOpenChange(false);
  };

  const handleDispute = () => {
    onAction('dispute');
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="text-start">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <SheetTitle>
                {isRTL ? '❗ لم يتم استلام التحويل' : '❗ Transfer Not Received'}
              </SheetTitle>
              <SheetDescription>
                {isRTL 
                  ? 'اختر الإجراء المناسب'
                  : 'Choose the appropriate action'
                }
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Option 1: Wait */}
          <Card 
            className="p-4 cursor-pointer hover:border-primary/50 transition-all"
            onClick={handleWait}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  {isRTL ? '⏳ الانتظار 10 دقائق إضافية' : '⏳ Wait 10 More Minutes'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isRTL 
                    ? 'سيتم تمديد وقت الانتظار للتحويل البنكي'
                    : 'The waiting time for bank transfer will be extended'
                  }
                </p>
              </div>
            </div>
          </Card>

          {/* Option 2: Dispute */}
          <Card 
            className="p-4 cursor-pointer hover:border-destructive/50 transition-all border-destructive/20"
            onClick={handleDispute}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  {isRTL ? '⚖️ فتح نزاع – دعم WINOVA' : '⚖️ Open Dispute – WINOVA Support'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isRTL 
                    ? 'سيتم قفل الطلب ودخول فريق الدعم لمراجعة الصفقة'
                    : 'The order will be locked and support will review the transaction'
                  }
                </p>
              </div>
            </div>
          </Card>

          {/* Info notice */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              {isRTL 
                ? '💡 نوصي بالانتظار قليلاً لأن التحويلات البنكية قد تتأخر'
                : '💡 We recommend waiting as bank transfers may be delayed'
              }
            </p>
          </div>

          {/* Cancel button */}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
