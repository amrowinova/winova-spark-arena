import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

export function HowItWorksCard() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const points = isRTL
    ? [
        'مجموع جوائز اليوم = 0.3 Nova × عدد المشاركين',
        'الفائز الأول: 65% | الفائز الثاني: 35%',
        'النقاط اليومية تُصفّر كل يوم وتُضاف للأسبوع والدورة',
        'الترتيب يكون داخل رتبتك فقط (مسوّق، قائد، مدير...)',
        'الدورة الكاملة = 14 أسبوع (98 يوم)',
      ]
    : [
        'Daily pool = 0.3 Nova × number of participants',
        '1st winner: 65% | 2nd winner: 35%',
        'Daily points reset and add to week & cycle totals',
        'Ranking is within your tier only (marketer, leader, manager...)',
        'Full cycle = 14 weeks (98 days)',
      ];

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          {isRTL ? 'كيف تعمل نقاط المحظوظين؟' : 'How Lucky Points Work'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {points.map((point, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
