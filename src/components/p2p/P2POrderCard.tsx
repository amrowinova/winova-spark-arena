import { Clock, Timer, AlertTriangle, CheckCircle2, XCircle, Shield, ArrowDownLeft, ArrowUpRight, User, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { P2POrder, P2POrderStatus } from '@/contexts/P2PContext';
import { CountdownTimer } from '@/components/common/CountdownTimer';
import { cn } from '@/lib/utils';

interface P2POrderCardProps {
  order: P2POrder;
  currentUserId?: string;
  isActive?: boolean;
  onClick?: () => void;
  onDeleteOrder?: (orderId: string) => void;
}

const statusConfig: Record<P2POrderStatus, { 
  en: string; 
  ar: string; 
  color: string;
  icon: React.ElementType;
}> = {
  created: { 
    en: 'Open in Market', 
    ar: 'مفتوح في السوق', 
    color: 'bg-info/20 text-info border-info/30',
    icon: Clock,
  },
  waiting_payment: { 
    en: 'Awaiting Payment', 
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

export function P2POrderCard({ order, currentUserId, isActive, onClick, onDeleteOrder }: P2POrderCardProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const config = statusConfig[order.status];
  const StatusIcon = config.icon;

  // CRITICAL: Determine if order is MATCHED (has both buyer and seller assigned)
  // An order is matched when it has moved beyond 'created' status
  const isMatched = order.status !== 'created';
  
  // Timer should ONLY show for matched orders in active payment states
  // NOT for open/created orders - they have no timer
  const showTimer = isMatched && ['waiting_payment', 'paid'].includes(order.status);

  // Check if timer is expired (only relevant for matched orders)
  const isExpired = isMatched && new Date() > order.expiresAt;

  // Determine user's role
  const isBuyer = currentUserId === order.buyer.id;
  const isSeller = currentUserId === order.seller.id;
  const isCreator = (order.type === 'buy' && isBuyer) || (order.type === 'sell' && isSeller);
  
  // Get counterparty info
  const counterparty = isBuyer ? order.seller : order.buyer;
  
  // Order type display
  const orderTypeDisplay = order.type === 'buy' 
    ? { en: 'Buy', ar: 'شراء', icon: ArrowDownLeft, color: 'text-success' }
    : { en: 'Sell', ar: 'بيع', icon: ArrowUpRight, color: 'text-nova' };
  
  const OrderTypeIcon = orderTypeDisplay.icon;

  // Can delete if OPEN and is creator
  const canDelete = order.status === 'created' && isCreator;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteOrder?.(order.id);
  };

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
        {/* Header: Order Type + Status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {/* Order Type Badge */}
            <Badge variant="outline" className={cn("gap-1 font-semibold", orderTypeDisplay.color)}>
              <OrderTypeIcon className="h-3 w-3" />
              {isRTL ? orderTypeDisplay.ar : orderTypeDisplay.en}
            </Badge>
            
            {/* Order ID */}
            <span className="text-xs font-mono text-muted-foreground">
              #{order.id.slice(0, 6)}
            </span>
            
            {order.supportJoined && (
              <Badge variant="outline" className="text-[10px] gap-1 border-info/30 text-info">
                <Shield className="h-3 w-3" />
                {isRTL ? 'دعم' : 'Support'}
              </Badge>
            )}
          </div>
          
          {/* Status Badge */}
          <Badge className={cn("gap-1", config.color)}>
            <StatusIcon className="h-3 w-3" />
            {isRTL ? config.ar : config.en}
          </Badge>
        </div>

        {/* Main Info Grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Left: Nova Amount */}
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">
              Nova
            </p>
            <p className="font-bold text-xl text-nova">
              И {order.amount.toFixed(0)}
            </p>
          </div>
          
          {/* Right: Local Amount */}
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">
              {isRTL ? 'الإجمالي' : 'Total'}
            </p>
            <p className="font-bold text-xl text-success">
              {order.currencySymbol} {order.total.toFixed(2)}
            </p>
          </div>
        </div>
        
        {/* Price per Nova */}
        <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-3">
          <span>{isRTL ? 'السعر:' : 'Price:'}</span>
          <span className="font-medium text-foreground">
            {order.currencySymbol} {order.price.toFixed(2)}/{isRTL ? 'نوفا' : 'Nova'}
          </span>
        </div>
        
        {/* Role Badges - Always show for clarity */}
        {currentUserId && (
          <div className="flex items-center justify-center gap-2 mb-3">
            <Badge variant="secondary" className={cn(
              "text-xs",
              isBuyer ? "bg-success/20 text-success border-success/30" : "bg-nova/20 text-nova border-nova/30"
            )}>
              👤 {isBuyer 
                ? (isRTL ? 'أنت: مشتري' : 'You: Buyer')
                : (isRTL ? 'أنت: بائع' : 'You: Seller')
              }
            </Badge>
          </div>
        )}
        
        {/* Counterparty Info (only for matched orders) */}
        {isMatched && counterparty.id && (
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg mb-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-lg">
              {counterparty.avatar || <User className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {isRTL ? counterparty.nameAr : counterparty.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {isBuyer 
                  ? (isRTL ? 'البائع' : 'Seller')
                  : (isRTL ? 'المشتري' : 'Buyer')
                }
              </p>
            </div>
          </div>
        )}
        
        {/* Open order notice - NO TIMER for open orders */}
        {order.status === 'created' && (
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2 p-2 bg-info/10 rounded-lg border border-info/20">
              <Clock className="h-4 w-4 text-info shrink-0" />
              <p className="text-xs text-info">
                {isRTL 
                  ? '📢 طلبك معروض في السوق – بانتظار طرف آخر'
                  : '📢 Your order is in market – Waiting for counterparty'
                }
              </p>
            </div>
            
            {/* Delete button for open orders */}
            {canDelete && onDeleteOrder && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
                {isRTL ? 'حذف الطلب' : 'Delete Order'}
              </Button>
            )}
          </div>
        )}

        {/* Timer - ONLY for matched orders in active states */}
        {showTimer && !isExpired && (
          <div className="flex items-center justify-center gap-2 text-sm py-2 px-3 bg-warning/10 rounded-lg border border-warning/20">
            <Timer className="h-4 w-4 text-warning" />
            <span className="text-muted-foreground text-xs">
              {isRTL ? 'الوقت المتبقي:' : 'Time left:'}
            </span>
            <CountdownTimer targetDate={order.expiresAt} size="sm" showLabels={false} />
          </div>
        )}

        {/* Expired notice */}
        {showTimer && isExpired && (
          <div className="flex items-center justify-center gap-2 text-sm py-2 px-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <XCircle className="h-4 w-4 text-destructive" />
            <span className="text-xs text-destructive">
              {isRTL ? '⏰ انتهى الوقت' : '⏰ Time expired'}
            </span>
          </div>
        )}

        {/* Dispute Banner */}
        {order.status === 'dispute' && (
          <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg border border-destructive/30 mt-3">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-xs text-destructive">
              {order.disputeReason || (isRTL ? 'نزاع مفتوح' : 'Dispute open')}
            </p>
          </div>
        )}

        {/* Cancellation reason (if cancelled) */}
        {order.status === 'cancelled' && order.disputeReason && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border border-muted mt-3">
            <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              {isRTL ? 'سبب الإلغاء: ' : 'Reason: '}{order.disputeReason}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}