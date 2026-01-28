import { CheckCircle2, AlertTriangle, Info, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ManagerScreenProps {
  language: string;
}

export function ManagerScreen({ language }: ManagerScreenProps) {
  return (
    <>
      {/* من أنت؟ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            {language === 'ar' ? 'من أنت؟' : 'Who Are You?'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {language === 'ar' 
              ? 'أنت مسؤول عن قادة، وتنافس على مستوى أعلى داخل الدولة.' 
              : 'You are responsible for leaders, and compete at a higher level within the country.'}
          </p>
        </CardContent>
      </Card>

      {/* ماذا المطلوب منك؟ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            {language === 'ar' ? 'ماذا المطلوب منك؟' : 'What is Required of You?'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ul className="space-y-1.5 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{language === 'ar' ? 'إدارة قادة نشطين' : 'Manage active leaders'}</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{language === 'ar' ? 'رفع نقاط الشبكة بالكامل' : 'Increase total network points'}</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{language === 'ar' ? 'ضمان استمرار النشاط الأسبوعي' : 'Ensure continuous weekly activity'}</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* مكسبك */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            💰 {language === 'ar' ? 'مكسبك:' : 'Your Earnings:'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-background rounded-lg border shadow-sm">
            <div className="flex items-center justify-center gap-2 py-2">
              <span className="text-2xl font-bold text-primary">И 0.15</span>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              {language === 'ar' 
                ? 'من نشاط الشبكة التابعة لك' 
                : 'From your network\'s activity'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* مهم جدًا */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            ⚡ {language === 'ar' ? 'مهم جدًا:' : 'Very Important:'}
          </p>
          <p className="text-sm text-muted-foreground mb-2">
            {language === 'ar' 
              ? 'المدير القوي لا ينتظر فريقه يعمل وحده، بل:' 
              : 'A strong manager doesn\'t wait for their team to work alone, but:'}
          </p>
          <ul className="space-y-1.5 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{language === 'ar' ? 'يدعم' : 'Supports'}</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{language === 'ar' ? 'يوجّه' : 'Guides'}</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{language === 'ar' ? 'يتدخّل عند أي تراجع' : 'Intervenes at any decline'}</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Warning Note */}
      <Card className="bg-destructive/5 border-destructive/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">
                {language === 'ar' ? 'ملاحظات مهمة' : 'Important Notes'}
              </p>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• {language === 'ar' ? 'القائد غير النشيط يؤثر على أدائك' : 'Inactive leaders affect your performance'}</li>
                <li>• {language === 'ar' ? 'النقاط والنشاط أهم من العدد فقط' : 'Points and activity matter more than just numbers'}</li>
                <li>• {language === 'ar' ? 'الإدارة القوية = فريق مستقر + أرباح مستمرة' : 'Strong management = Stable team + Consistent earnings'}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
