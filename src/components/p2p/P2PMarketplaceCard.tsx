import { Star, Clock, MapPin, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { MarketplaceOrder } from '@/hooks/useP2PMarketplace';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface P2PMarketplaceCardProps {
  order: MarketplaceOrder;
  onExecute: (order: MarketplaceOrder) => void;
  actionType: 'buy' | 'sell';
  isExecuting?: boolean;
}

export function P2PMarketplaceCard({ 
  order, 
  onExecute, 
  actionType,
  isExecuting = false 
}: P2PMarketplaceCardProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const timeAgo = formatDistanceToNow(new Date(order.createdAt), {
    addSuffix: true,
    locale: isRTL ? ar : enUS,
  });

  return (
    <Card className="overflow-hidden hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        {/* User Info Row */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl border border-border">
              {order.creatorAvatar || '👤'}
            </div>
            {/* Online indicator */}
            <span className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full bg-success border-2 border-card" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">
              {order.creatorName}
            </p>
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1 text-warning">
                <Star className="h-3 w-3 fill-warning" />
                <span className="font-medium">{(order.rating * 20).toFixed(0)}%</span>
              </div>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                @{order.creatorUsername}
              </span>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            <MapPin className="h-3 w-3 me-1" />
            {order.creatorCountry?.slice(0, 3)}
          </Badge>
        </div>

        {/* Price & Amount Row */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {isRTL ? 'السعر' : 'Price'}
            </p>
            <p className="text-lg font-bold text-foreground">
              {order.currencySymbol} {order.exchangeRate.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {isRTL ? 'الكمية' : 'Amount'}
            </p>
            <p className="text-lg font-bold">
              <span className="text-nova">И</span>
              <span className="text-nova ms-1">{order.novaAmount}</span>
            </p>
          </div>
        </div>

        {/* Total Amount */}
        <div className="bg-muted/50 rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {isRTL ? 'الإجمالي' : 'Total'}
            </span>
            <span className="text-lg font-bold">
              {order.currencySymbol} {order.localAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Info Row - Time */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{order.timeLimitMinutes} {isRTL ? 'دقيقة' : 'min'}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {timeAgo}
          </span>
        </div>

        {/* Action Button */}
        <Button 
          className={cn(
            "w-full font-semibold",
            actionType === 'buy' 
              ? "bg-success hover:bg-success/90 text-success-foreground" 
              : "bg-primary hover:bg-primary/90"
          )}
          onClick={() => onExecute(order)}
          disabled={isExecuting}
        >
          {isExecuting ? (
            <>
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
              {isRTL ? 'جاري...' : 'Processing...'}
            </>
          ) : actionType === 'buy' 
            ? (isRTL ? `شراء И${order.novaAmount} Nova` : `Buy И${order.novaAmount} Nova`)
            : (isRTL ? `بيع И${order.novaAmount} Nova` : `Sell И${order.novaAmount} Nova`)
          }
        </Button>
      </CardContent>
    </Card>
  );
}
