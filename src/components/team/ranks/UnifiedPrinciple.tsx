import { Card, CardContent } from '@/components/ui/card';

interface UnifiedPrincipleProps {
  language: string;
}

export function UnifiedPrinciple({ language }: UnifiedPrincipleProps) {
  return (
    <Card className="bg-muted/30 border-muted">
      <CardContent className="p-4">
        <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
          🧠 {language === 'ar' ? 'مبدأ موحّد لكل الرتب:' : 'Unified Principle for All Ranks:'}
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          {language === 'ar' ? 'في WINOVA:' : 'In WINOVA:'}
        </p>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li>• {language === 'ar' ? 'كل رتبة يمكنها إحضار مشتركين جدد' : 'Every rank can bring new subscribers'}</li>
          <li>• {language === 'ar' ? 'النجاح لا يعتمد فقط على الفريق المباشر' : 'Success doesn\'t depend only on direct team'}</li>
          <li>• {language === 'ar' ? 'العدد + النشاط = القوة الحقيقية' : 'Numbers + Activity = True Strength'}</li>
        </ul>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="p-2 bg-destructive/10 rounded-lg text-center">
            <span className="text-xs text-destructive">
              ❌ {language === 'ar' ? 'شبكة كبيرة غير نشطة' : 'Big inactive network'}
            </span>
          </div>
          <div className="p-2 bg-primary/10 rounded-lg text-center">
            <span className="text-xs text-primary">
              ✅ {language === 'ar' ? 'شبكة نشطة ومتوسّعة' : 'Active & growing network'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
