import { motion } from 'framer-motion';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Unlock, 
  Shield, 
  FileQuestion,
  XCircle,
  CreditCard,
  Receipt,
  Copy,
  Handshake,
  Timer,
  PartyPopper
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { P2PSystemMessage as P2PSystemMessageType } from '@/contexts/P2PContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface P2PSystemMessageProps {
  message: P2PSystemMessageType;
}

// Enhanced type config with all P2P system message types
const typeConfig: Record<string, {
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
}> = {
  // Order lifecycle
  order_created: {
    icon: Receipt,
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10 border-primary/20',
  },
  order_matched: {
    icon: Handshake,
    colorClass: 'text-nova',
    bgClass: 'bg-nova/10 border-nova/20',
  },
  
  // Payment flow
  buyer_copied_bank: {
    icon: Copy,
    colorClass: 'text-info',
    bgClass: 'bg-info/10 border-info/20',
  },
  buyer_paid: {
    icon: CreditCard,
    colorClass: 'text-warning',
    bgClass: 'bg-warning/10 border-warning/20',
  },
  payment_confirmed: {
    icon: CreditCard,
    colorClass: 'text-warning',
    bgClass: 'bg-warning/10 border-warning/20',
  },
  
  // Seller actions
  seller_confirmed: {
    icon: CheckCircle,
    colorClass: 'text-success',
    bgClass: 'bg-success/10 border-success/20',
  },
  seller_verify_prompt: {
    icon: AlertTriangle,
    colorClass: 'text-warning',
    bgClass: 'bg-warning/10 border-warning/20',
  },
  
  // Completion
  nova_released: {
    icon: PartyPopper,
    colorClass: 'text-success',
    bgClass: 'bg-success/10 border-success/20',
  },
  released: {
    icon: Unlock,
    colorClass: 'text-success',
    bgClass: 'bg-success/10 border-success/20',
  },
  funds_released: {
    icon: Unlock,
    colorClass: 'text-nova',
    bgClass: 'bg-nova/10 border-nova/20',
  },
  completion_summary: {
    icon: Receipt,
    colorClass: 'text-success',
    bgClass: 'bg-success/10 border-success/20',
  },
  
  // Time management
  time_extended: {
    icon: Timer,
    colorClass: 'text-info',
    bgClass: 'bg-info/10 border-info/20',
  },
  order_expired: {
    icon: Clock,
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted/50 border-muted',
  },
  
  // Cancellation
  order_cancelled: {
    icon: XCircle,
    colorClass: 'text-destructive',
    bgClass: 'bg-destructive/10 border-destructive/20',
  },
  
  // Disputes
  dispute_opened: {
    icon: AlertTriangle,
    colorClass: 'text-destructive',
    bgClass: 'bg-destructive/10 border-destructive/20',
  },
  support_joined: {
    icon: Shield,
    colorClass: 'text-warning',
    bgClass: 'bg-warning/10 border-warning/20',
  },
  support_message: {
    icon: FileQuestion,
    colorClass: 'text-warning',
    bgClass: 'bg-warning/10 border-warning/20',
  },
  dispute_resolved: {
    icon: CheckCircle,
    colorClass: 'text-success',
    bgClass: 'bg-success/10 border-success/20',
  },
  
  // Legacy/fallback
  status_change: {
    icon: Clock,
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10 border-primary/20',
  },
  awaiting_buyer_payment: {
    icon: Clock,
    colorClass: 'text-warning',
    bgClass: 'bg-warning/10 border-warning/20',
  },
  sell_order_created: {
    icon: Receipt,
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10 border-primary/20',
  },
};

// Default config for unknown types
const defaultConfig = {
  icon: Clock,
  colorClass: 'text-muted-foreground',
  bgClass: 'bg-muted/50 border-muted',
};

export function P2PSystemMessage({ message }: P2PSystemMessageProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const config = typeConfig[message.type] || defaultConfig;
  const Icon = config.icon;

  const content = language === 'ar' ? message.contentAr : message.content;

  // Special rendering for completion summary card
  if (message.type === 'completion_summary' && message.orderDetails) {
    const details = message.orderDetails;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex justify-center my-4 w-full px-2"
      >
        <Card className="border-success/30 bg-success/5 w-full max-w-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-success/20 flex items-center justify-center">
                  <Receipt className="h-3.5 w-3.5 text-success" />
                </div>
                <CardTitle className="text-sm">
                  {isRTL ? 'ملخص اكتمال طلب P2P' : 'P2P Order Summary'}
                </CardTitle>
              </div>
              <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px]">
                <CheckCircle className="h-2.5 w-2.5 me-1" />
                {isRTL ? 'مكتمل' : 'Completed'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-2 pt-0">
            {/* Order ID */}
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground">
                {isRTL ? 'رقم الطلب' : 'Order ID'}
              </span>
              <span className="font-mono text-xs font-medium">
                {message.orderId}
              </span>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground">
                {isRTL ? 'الحالة' : 'Status'}
              </span>
              <span className="text-xs font-medium text-success">
                🟢 {isRTL ? 'مكتمل' : 'Completed'}
              </span>
            </div>

            {/* Amount */}
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground">
                Nova
              </span>
              <span className="text-xs font-bold text-nova">
                И {details.amount.toFixed(0)}
              </span>
            </div>

            {/* Price Rate */}
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground">
                {isRTL ? 'السعر' : 'Price'}
              </span>
              <span className="text-xs font-medium">
                {details.currencySymbol} {details.price.toFixed(2)}
              </span>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground">
                {isRTL ? 'الإجمالي' : 'Total'}
              </span>
              <span className="text-xs font-bold text-success">
                {details.currencySymbol} {details.total.toFixed(2)}
              </span>
            </div>

            {/* Payment Method */}
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                {isRTL ? 'طريقة الدفع' : 'Payment'}
              </span>
              <span className="text-xs font-medium">
                {details.paymentMethod}
              </span>
            </div>

            {/* Execution Time */}
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {isRTL ? 'وقت الإكمال' : 'Completed at'}
              </span>
              <span className="text-xs font-medium">
                {message.time}
              </span>
            </div>

            {/* Notice - Cannot be reversed */}
            <div className="mt-2 p-2 bg-muted/50 rounded-md">
              <p className="text-[10px] text-muted-foreground text-center">
                {isRTL 
                  ? '✅ تمت العملية بنجاح ولا يمكن التراجع عنها'
                  : '✅ Transaction completed and cannot be reversed'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Multi-line content support
  const contentLines = content.split('\n');
  const hasMultipleLines = contentLines.length > 1;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex justify-center my-3 w-full"
    >
      <div className={`
        inline-flex flex-col items-center gap-1 px-4 py-3 rounded-xl border 
        max-w-[90%] ${config.bgClass}
      `}>
        {/* Icon and main content */}
        <div className="flex items-start gap-2 w-full">
          <div className={`w-8 h-8 rounded-full ${config.bgClass} flex items-center justify-center shrink-0`}>
            <Icon className={`h-4 w-4 ${config.colorClass}`} />
          </div>
          <div className="flex-1 min-w-0">
            {contentLines.map((line, idx) => (
              <p 
                key={idx} 
                className={`
                  text-sm ${idx === 0 ? `font-medium ${config.colorClass}` : 'text-muted-foreground text-xs mt-1'}
                  ${isRTL ? 'text-right' : 'text-left'}
                `}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
        
        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground/60 self-end mt-1">
          {message.time}
        </span>
      </div>
    </motion.div>
  );
}

// Compact version for message list
export function P2PSystemMessageCompact({ message }: P2PSystemMessageProps) {
  const { language } = useLanguage();
  const config = typeConfig[message.type] || defaultConfig;
  const Icon = config.icon;

  const content = language === 'ar' ? message.contentAr : message.content;
  // Show only first line for compact view
  const displayContent = content.split('\n')[0];

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${config.bgClass}`}>
      <Icon className={`h-3.5 w-3.5 shrink-0 ${config.colorClass}`} />
      <span className="flex-1">{displayContent}</span>
      <span className="text-[10px] text-muted-foreground/60">{message.time}</span>
    </div>
  );
}
