import { CheckCircle2, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { P2POrder } from '@/contexts/P2PContext';

interface P2PCompactOrderCardProps {
  order: P2POrder;
  onViewDetails: () => void;
}

export function P2PCompactOrderCard({ order, onViewDetails }: P2PCompactOrderCardProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  return (
    <Card className="p-3 bg-success/5 border-success/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <div>
            <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px]">
              {isRTL ? 'مكتمل' : 'Completed'}
            </Badge>
            <div className="flex items-center gap-2 mt-1 text-sm">
              <span className="font-bold text-nova">И {order.amount.toFixed(0)}</span>
              <span className="text-muted-foreground">•</span>
              <span className="font-medium">{order.currencySymbol} {order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1.5"
          onClick={onViewDetails}
        >
          <Eye className="h-3.5 w-3.5" />
          {isRTL ? 'عرض التفاصيل' : 'View Details'}
        </Button>
      </div>
    </Card>
  );
}
