import { Card, CardContent } from '@/components/ui/card';

interface UnifiedPrincipleProps {
  language: string;
}

export function UnifiedPrinciple({ language }: UnifiedPrincipleProps) {
  return (
    <Card className="bg-muted/30 border-muted">
      <CardContent className="p-4">
        <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
          🧠 {language === 'ar' ? 'مبدأ عام' : 'General Principle'}
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          {language === 'ar' ? 'في WINOVA:' : 'In WINOVA:'}
        </p>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span>•</span>
            <span>{language === 'ar' ? 'كل رتبة يمكنها إحضار مشتركين جدد' : 'Every rank can bring new subscribers'}</span>
          </li>
          <li className="flex items-start gap-2">
            <span>•</span>
            <span>{language === 'ar' ? 'النجاح لا يعتمد فقط على الفريق المباشر' : 'Success doesn\'t depend only on direct team'}</span>
          </li>
          <li className="flex items-start gap-2">
            <span>•</span>
            <span className="font-medium text-primary">{language === 'ar' ? 'القوة الحقيقية = عدد كبير + نشاط مستمر' : 'True Strength = Large numbers + Continuous activity'}</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
