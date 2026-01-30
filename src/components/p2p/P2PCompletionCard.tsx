import { Receipt, Clock, CreditCard, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { P2POrder } from '@/contexts/P2PContext';

interface P2PCompletionCardProps {
  order: P2POrder;
  executionTime?: number; // in minutes
}

export function P2PCompletionCard({ order, executionTime }: P2PCompletionCardProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  // Calculate execution time if not provided
  const duration = executionTime || Math.round(
    (new Date().getTime() - order.createdAt.getTime()) / (1000 * 60)
  );

  return (
    <Card className="border-success/30 bg-success/5 overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
              <Receipt className="h-4 w-4 text-success" />
            </div>
            <CardTitle className="text-base">
              {isRTL ? 'ملخص اكتمال طلب P2P' : 'P2P Order Completion Summary'}
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
            <CheckCircle2 className="h-3 w-3 me-1" />
            {isRTL ? 'مكتمل' : 'Completed'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Order ID */}
        <div className="flex items-center justify-between py-2 border-b border-border/50">
          <span className="text-sm text-muted-foreground">
            {isRTL ? 'رقم الطلب' : 'Order ID'}
          </span>
          <span className="font-mono text-sm font-medium">
            {order.id}
          </span>
        </div>

        {/* Price Rate */}
        <div className="flex items-center justify-between py-2 border-b border-border/50">
          <span className="text-sm text-muted-foreground">
            {isRTL ? 'السعر' : 'Price'}
          </span>
          <span className="text-sm font-medium">
            1 Nova = {order.currencySymbol} {order.price.toFixed(2)}
          </span>
        </div>

        {/* Amount */}
        <div className="flex items-center justify-between py-2 border-b border-border/50">
          <span className="text-sm text-muted-foreground">
            {isRTL ? 'الكمية' : 'Amount'}
          </span>
          <span className="text-sm font-bold text-nova">
            И {order.amount.toFixed(0)} Nova
          </span>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between py-2 border-b border-border/50">
          <span className="text-sm text-muted-foreground">
            {isRTL ? 'الإجمالي' : 'Total'}
          </span>
          <span className="text-sm font-bold text-success">
            {order.currencySymbol} {order.total.toFixed(2)}
          </span>
        </div>

        {/* Payment Method */}
        <div className="flex items-center justify-between py-2 border-b border-border/50">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <CreditCard className="h-3.5 w-3.5" />
            {isRTL ? 'طريقة الدفع' : 'Payment Method'}
          </span>
          <span className="text-sm font-medium">
            {order.paymentDetails.bankName}
          </span>
        </div>

        {/* Execution Time */}
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {isRTL ? 'مدة التنفيذ' : 'Execution Time'}
          </span>
          <span className="text-sm font-medium">
            {duration} {isRTL ? 'دقيقة' : 'minutes'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
