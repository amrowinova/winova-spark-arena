import { useStrategicSummary } from '@/hooks/useStrategicBrain';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

export function StrategicSummarySection() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { data, isLoading } = useStrategicSummary();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      icon: <Brain className="h-5 w-5 text-primary" />,
      label: isAr ? 'رؤى اليوم' : "Today's Insights",
      value: data?.todayCount || 0,
      sub: `${data?.total || 0} ${isAr ? 'إجمالي' : 'total'}`,
    },
    {
      icon: <AlertTriangle className="h-5 w-5 text-warning" />,
      label: isAr ? 'بحاجة مراجعة' : 'Needs Review',
      value: data?.newCount || 0,
      sub: isAr ? 'رؤى جديدة' : 'new insights',
    },
    {
      icon: <CheckCircle className="h-5 w-5 text-success" />,
      label: isAr ? 'تمت المراجعة' : 'Reviewed',
      value: data?.reviewedCount || 0,
      sub: isAr ? 'مكتملة' : 'completed',
    },
    {
      icon: <TrendingUp className="h-5 w-5 text-info" />,
      label: isAr ? 'متوسط الثقة' : 'Avg Confidence',
      value: `${data?.avgConfidence || 0}%`,
      sub: isAr ? 'عبر كل الرؤى' : 'across all insights',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card, i) => (
        <Card key={i}>
          <CardContent className="p-4 flex items-start gap-3">
            {card.icon}
            <div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-xl font-bold">{card.value}</p>
              <p className="text-[10px] text-muted-foreground">{card.sub}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
