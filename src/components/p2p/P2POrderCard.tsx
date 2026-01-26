import { Clock, Timer, AlertTriangle, CheckCircle2, XCircle, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { P2POrder, P2POrderStatus } from '@/contexts/P2PContext';
import { CountdownTimer } from '@/components/common/CountdownTimer';
import { cn } from '@/lib/utils';

interface P2POrderCardProps {
  order: P2POrder;
  isActive?: boolean;
  onClick?: () => void;
}

const statusConfig: Record<P2POrderStatus, { 
  en: string; 
  ar: string; 
  color: string;
  icon: React.ElementType;
}> = {
  created: { 
    en: 'In Progress', 
    ar: 'جارٍ التنفيذ', 
    color: 'bg-info/20 text-info border-info/30',
    icon: Clock,
  },
  waiting_payment: { 
    en: 'Waiting Payment', 
    ar: 'بانتظار الدفع', 
    color: 'bg-warning/20 text-warning border-warning/30',
    icon: Timer,
  },
  paid: { 
    en: 'Paid', 
    ar: 'مدفوع', 
    color: 'bg-nova/20 text-nova border-nova/30',
    icon: CheckCircle2,
  },
  released: { 
    en: 'Released', 
    ar: 'تم التحرير', 
    color: 'bg-success/20 text-success border-success/30',
    icon: CheckCircle2,
  },
  completed: { 
    en: 'Completed', 
    ar: 'مكتمل', 
    color: 'bg-success/20 text-success border-success/30',
    icon: CheckCircle2,
  },
  dispute: { 
    en: 'Support Review', 
    ar: 'مراجعة الدعم', 
    color: 'bg-destructive/20 text-destructive border-destructive/30',
    icon: AlertTriangle,
  },
  cancelled: { 
    en: 'Cancelled', 
    ar: 'ملغي', 
    color: 'bg-muted text-muted-foreground border-muted',
    icon: XCircle,
  },
  expired: { 
    en: 'Expired', 
    ar: 'منتهي', 
    color: 'bg-muted text-muted-foreground border-muted',
    icon: XCircle,
  },
};

export function P2POrderCard({ order, isActive, onClick }: P2POrderCardProps) {
  const { language } = useLanguage();
  const config = statusConfig[order.status];
  const StatusIcon = config.icon;

  const isExpired = new Date() > order.expiresAt;
  const showTimer = ['created', 'waiting_payment', 'paid'].includes(order.status) && !isExpired;

  return (
    <Card 
      className={cn(
        "transition-all cursor-pointer hover:border-primary/50",
        isActive && "ring-2 ring-primary border-primary",
        order.status === 'dispute' && "border-destructive/50"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Order ID and Status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">
              #{order.id}
            </span>
            {order.supportJoined && (
              <Badge variant="outline" className="text-[10px] gap-1 border-info/30 text-info">
                <Shield className="h-3 w-3" />
                {language === 'ar' ? 'دعم' : 'Support'}
              </Badge>
            )}
          </div>
          <Badge className={cn("gap-1", config.color)}>
            <StatusIcon className="h-3 w-3" />
            {language === 'ar' ? config.ar : config.en}
          </Badge>
        </div>

        {/* Amount Grid */}
        <div className="grid grid-cols-3 gap-3 text-center mb-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Nova</p>
            <p className="font-bold text-lg text-nova">
              {order.amount.toFixed(3)} ✦
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">
              {language === 'ar' ? 'السعر' : 'Price'}
            </p>
            <p className="font-bold">
              {order.currencySymbol} {order.price.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">
              {language === 'ar' ? 'الإجمالي' : 'Total'}
            </p>
            <p className="font-bold text-success">
              {order.currencySymbol} {order.total.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Timer */}
        {showTimer && (
          <div className="flex items-center justify-center gap-2 text-sm py-2 px-3 bg-muted/50 rounded-lg">
            <Timer className="h-4 w-4 text-warning" />
            <span className="text-muted-foreground text-xs">
              {language === 'ar' ? 'الوقت المتبقي:' : 'Time left:'}
            </span>
            <CountdownTimer targetDate={order.expiresAt} size="sm" showLabels={false} />
          </div>
        )}

        {/* Dispute Banner */}
        {order.status === 'dispute' && (
          <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg border border-destructive/30">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-xs text-destructive">
              {order.disputeReason || (language === 'ar' ? 'نزاع مفتوح' : 'Dispute open')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
