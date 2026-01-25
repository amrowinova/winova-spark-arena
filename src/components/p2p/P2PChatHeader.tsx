import { ArrowLeft, MoreVertical, AlertTriangle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { P2PChat, P2POrder, P2POrderStatus } from '@/contexts/P2PContext';

interface P2PChatHeaderProps {
  chat: P2PChat;
  currentOrder?: P2POrder | null;
  currentUserId: string;
  onBack: () => void;
  onViewOrderDetails?: () => void;
}

const statusConfig: Record<P2POrderStatus, { en: string; ar: string; color: string }> = {
  created: { en: 'Created', ar: 'تم الإنشاء', color: 'bg-muted text-muted-foreground' },
  waiting_payment: { en: 'Waiting Payment', ar: 'بانتظار الدفع', color: 'bg-warning/20 text-warning' },
  paid: { en: 'Paid', ar: 'تم الدفع', color: 'bg-info/20 text-info' },
  released: { en: 'Released', ar: 'تم التحرير', color: 'bg-success/20 text-success' },
  completed: { en: 'Completed', ar: 'مكتمل', color: 'bg-success/20 text-success' },
  dispute: { en: 'Dispute', ar: 'نزاع', color: 'bg-destructive/20 text-destructive' },
  cancelled: { en: 'Cancelled', ar: 'ملغي', color: 'bg-muted text-muted-foreground' },
};

export function P2PChatHeader({ 
  chat, 
  currentOrder, 
  currentUserId, 
  onBack,
  onViewOrderDetails 
}: P2PChatHeaderProps) {
  const { language } = useLanguage();

  // Determine the other party
  const isBuyer = chat.buyer.id === currentUserId;
  const otherParty = isBuyer ? chat.seller : chat.buyer;
  const otherPartyLabel = isBuyer 
    ? (language === 'ar' ? 'البائع' : 'Seller')
    : (language === 'ar' ? 'المشتري' : 'Buyer');

  const activeOrdersCount = chat.orders.filter(o => 
    !['completed', 'cancelled'].includes(o.status)
  ).length;

  const hasDispute = chat.orders.some(o => o.status === 'dispute');

  return (
    <div className="px-3 py-2 border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Avatar & Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg shrink-0">
              {otherParty.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">
                  {language === 'ar' ? otherParty.nameAr : otherParty.name}
                </p>
                <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                  {otherPartyLabel}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>@{otherParty.username}</span>
                <span>•</span>
                <span>⭐ {otherParty.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2">
          {chat.supportPresent && (
            <Badge variant="outline" className="gap-1 border-warning/30 text-warning">
              <Shield className="h-3 w-3" />
              <span className="hidden sm:inline">
                {language === 'ar' ? 'دعم' : 'Support'}
              </span>
            </Badge>
          )}

          {hasDispute && (
            <Badge variant="outline" className="gap-1 border-destructive/30 text-destructive">
              <AlertTriangle className="h-3 w-3" />
              <span className="hidden sm:inline">
                {language === 'ar' ? 'نزاع' : 'Dispute'}
              </span>
            </Badge>
          )}

          {activeOrdersCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeOrdersCount} {language === 'ar' ? 'طلب' : 'order'}
              {activeOrdersCount > 1 && (language === 'ar' ? '' : 's')}
            </Badge>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onViewOrderDetails}>
                {language === 'ar' ? 'تفاصيل الطلبات' : 'Order Details'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Current Order Status Bar */}
      {currentOrder && (
        <div className="mt-2 flex items-center justify-between px-2 py-1.5 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">
              #{currentOrder.id}
            </span>
            <Badge className={statusConfig[currentOrder.status].color}>
              {language === 'ar' 
                ? statusConfig[currentOrder.status].ar 
                : statusConfig[currentOrder.status].en
              }
            </Badge>
          </div>
          <div className="text-xs">
            <span className="text-nova font-bold">
              {currentOrder.amount.toFixed(3)} ✦
            </span>
            <span className="text-muted-foreground mx-1">→</span>
            <span className="text-success font-medium">
              {currentOrder.currencySymbol} {currentOrder.total.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
