import { CheckCircle2, AlertTriangle, Info, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LeaderScreenProps {
  language: string;
}

export function LeaderScreen({ language }: LeaderScreenProps) {
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
              ? 'أنت تقود مجموعة مسوّقين وتحوّلهم إلى فرق قوية.' 
              : 'You lead a group of marketers and transform them into strong teams.'}
          </p>
          <div className="mt-3 p-2 bg-primary/10 rounded-lg text-center">
            <span className="text-sm font-medium text-primary">
              {language === 'ar' ? 'أنت الآن في مرحلة القيادة الحقيقية 👏' : 'You are now in true leadership phase 👏'}
            </span>
          </div>
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
        <CardContent className="space-y-3">
          <div className="p-2 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm text-primary font-medium mb-2">
              {language === 'ar' ? 'بناء فريق متوازن من:' : 'Build a balanced team of:'}
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• {language === 'ar' ? 'مشتركين' : 'Subscribers'}</li>
              <li>• {language === 'ar' ? 'مسوّقين' : 'Marketers'}</li>
              <li>• {language === 'ar' ? 'قادة' : 'Leaders'}</li>
            </ul>
          </div>
          <ul className="space-y-1.5 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{language === 'ar' ? 'الحفاظ على نشاط الشبكة بشكل مستمر' : 'Maintain continuous network activity'}</span>
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
              <span className="text-2xl font-bold text-primary">И 0.82</span>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              {language === 'ar' 
                ? 'من كل شخص ضمن شبكتك حسب نظام التوزيع' 
                : 'From every person in your network according to distribution system'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* نصيحة القائد الذكي */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            🧠 {language === 'ar' ? 'نصيحة القائد الذكي:' : 'Smart Leader Tip:'}
          </p>
          <p className="text-sm text-muted-foreground mb-2">
            {language === 'ar' ? 'أفضل قائد هو من:' : 'The best leader is one who:'}
          </p>
          <ul className="space-y-1.5 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{language === 'ar' ? 'يوسّع الفريق أفقيًا (أشخاص جدد)' : 'Expands the team horizontally (new people)'}</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{language === 'ar' ? 'ويطوّره عموديًا (ترقيات ونشاط)' : 'And develops it vertically (promotions and activity)'}</span>
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
                <li>• {language === 'ar' ? 'المسوّق غير النشيط لا يُحتسب في التقدم' : 'Inactive marketer does not count towards progress'}</li>
                <li>• {language === 'ar' ? 'الترقية تعتمد على النشاط الحقيقي وليس العدد فقط' : 'Promotion depends on real activity, not just numbers'}</li>
                <li>• {language === 'ar' ? 'قوة القائد = قوة فريقه' : 'Leader\'s strength = Team\'s strength'}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
