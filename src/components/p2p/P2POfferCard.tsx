import { Star, Clock, CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { CountryConfig, PaymentMethod } from './P2PCountrySelector';

export interface P2POffer {
  id: string;
  type: 'buy' | 'sell';
  user: {
    id: string;
    name: string;
    nameAr: string;
    avatar: string;
    rating: number;
    completedTrades: number;
    completionRate: number;
  };
  amount: number; // Available Nova
  price: number; // Price per Nova
  currency: string;
  currencySymbol: string;
  timeLimit: number; // Minutes
  paymentMethods: PaymentMethod[];
  country: CountryConfig;
}

interface P2POfferCardProps {
  offer: P2POffer;
  onAction: (offer: P2POffer) => void;
  actionType: 'buy' | 'sell';
}

export function P2POfferCard({ offer, onAction, actionType }: P2POfferCardProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  return (
    <Card className="overflow-hidden hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        {/* User Info Row */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl border border-border">
              {offer.user.avatar}
            </div>
            {/* Online indicator */}
            <span className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full bg-success border-2 border-card" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">
              {isRTL ? offer.user.nameAr : offer.user.name}
            </p>
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1 text-warning">
                <Star className="h-3 w-3 fill-warning" />
                <span className="font-medium">{(offer.user.rating * 20).toFixed(0)}%</span>
              </div>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                {offer.user.completedTrades} {isRTL ? 'صفقة' : 'trades'}
              </span>
            </div>
          </div>
        </div>

        {/* Price & Amount Row */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {isRTL ? 'السعر' : 'Price'}
            </p>
            <p className="text-lg font-bold text-foreground">
              {offer.currencySymbol} {offer.price.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {isRTL ? 'الكمية المتاحة' : 'Available'}
            </p>
            <p className="text-lg font-bold">
              <span className="text-nova">{offer.amount}</span>
              <span className="text-nova text-sm ms-1">✦</span>
            </p>
          </div>
        </div>

        {/* Info Row - Time & Payment Methods */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{offer.timeLimit} {isRTL ? 'دقيقة' : 'min'}</span>
          </div>
          <div className="flex items-center gap-1">
            {offer.paymentMethods.slice(0, 3).map((method) => (
              <Badge 
                key={method.id} 
                variant="secondary" 
                className="text-[10px] px-1.5 py-0.5"
              >
                {method.icon} {isRTL ? method.nameAr.slice(0, 8) : method.name.slice(0, 8)}
              </Badge>
            ))}
            {offer.paymentMethods.length > 3 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                +{offer.paymentMethods.length - 3}
              </Badge>
            )}
          </div>
        </div>

        {/* Action Button */}
        <Button 
          className={cn(
            "w-full font-semibold",
            actionType === 'buy' 
              ? "bg-success hover:bg-success/90 text-success-foreground" 
              : "bg-primary hover:bg-primary/90"
          )}
          onClick={() => onAction(offer)}
        >
          {actionType === 'buy' 
            ? (isRTL ? `شراء Nova` : `Buy Nova`)
            : (isRTL ? `بيع Nova` : `Sell Nova`)
          }
        </Button>
      </CardContent>
    </Card>
  );
}
