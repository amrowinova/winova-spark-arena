import { Clock, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

export function P2PWaitingReleaseCard() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  return (
    <Card className="p-4 bg-warning/10 border-warning/30">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
            <Clock className="h-5 w-5 text-warning" />
          </div>
          <Loader2 className="absolute -bottom-1 -right-1 h-4 w-4 text-warning animate-spin" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-warning">
            {isRTL ? '🟡 تم تأكيد الدفع' : '🟡 Payment Confirmed'}
          </p>
          <p className="text-sm text-muted-foreground">
            {isRTL 
              ? 'بانتظار تأكيد الطرف الآخر لتحرير Nova' 
              : 'Waiting for the other party to release Nova'
            }
          </p>
        </div>
      </div>
    </Card>
  );
}
