import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import type { P2PGlobalKPIs } from '@/hooks/useP2PControlTower';
import {
  ShoppingCart, Clock, CreditCard, AlertTriangle, CheckCircle, XCircle,
  Lock, TrendingUp, Timer, ArrowRightLeft
} from 'lucide-react';

interface Props {
  kpis: P2PGlobalKPIs;
  loading: boolean;
}

export function GlobalKPIs({ kpis, loading }: Props) {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const cards = [
    { label: isAr ? 'طلبات مفتوحة' : 'Open Orders', value: kpis.totalOpen, icon: ShoppingCart, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: isAr ? 'بانتظار الدفع' : 'Awaiting Payment', value: kpis.awaitingPayment, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: isAr ? 'تم الدفع' : 'Payment Sent', value: kpis.paymentSent, icon: CreditCard, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: isAr ? 'نزاعات' : 'Disputed', value: kpis.disputed, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', highlight: kpis.disputed > 0 },
    { label: isAr ? 'مكتمل اليوم' : 'Completed Today', value: kpis.completedToday, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: isAr ? 'ملغي اليوم' : 'Cancelled Today', value: kpis.cancelledToday, icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted' },
    { label: isAr ? 'نوفا مقفلة (ضمان)' : 'Locked Escrow', value: kpis.totalLockedEscrow, icon: Lock, color: 'text-purple-500', bg: 'bg-purple-500/10', suffix: ' Nova' },
    { label: isAr ? 'حجم اليوم' : 'Volume Today', value: kpis.totalVolumeToday, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-600/10', suffix: ' Nova' },
    { label: isAr ? 'متوسط وقت الإتمام' : 'Avg Completion', value: kpis.avgCompletionMinutes, icon: Timer, color: 'text-cyan-500', bg: 'bg-cyan-500/10', suffix: isAr ? ' دقيقة' : ' min' },
    { label: isAr ? 'ينتهي خلال 10 دقائق' : 'Expiring in 10min', value: kpis.expiringIn10, icon: Timer, color: 'text-red-500', bg: 'bg-red-500/10', highlight: kpis.expiringIn10 > 0 },
    { label: isAr ? 'قرار البائع' : 'Seller Decision', value: kpis.sellerDecisionWindow, icon: ArrowRightLeft, color: 'text-amber-600', bg: 'bg-amber-600/10' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {cards.map((c, i) => (
        <Card key={i} className={`p-3 ${c.highlight ? 'border-destructive/50 bg-destructive/5' : ''} ${loading ? 'animate-pulse' : ''}`}>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-7 h-7 rounded-full ${c.bg} flex items-center justify-center shrink-0`}>
              <c.icon className={`w-3.5 h-3.5 ${c.color}`} />
            </div>
            <span className="text-xs text-muted-foreground truncate">{c.label}</span>
          </div>
          <p className="text-xl font-bold">
            {c.value.toLocaleString()}{c.suffix || ''}
          </p>
        </Card>
      ))}
    </div>
  );
}
