import { CheckCircle2, AlertTriangle, ArrowRight, Copy, Info, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RankInfoSheet } from './RankInfoSheet';

interface MarketerScreenProps {
  language: string;
  referralCode: string;
}

export function MarketerScreen({ language, referralCode }: MarketerScreenProps) {
  const handleCopyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success(language === 'ar' ? 'تم نسخ الكود!' : 'Code copied!');
  };

  return (
    <>
      {/* زر "من أنت؟" */}
      <RankInfoSheet 
        language={language} 
        rankTitle={language === 'ar' ? '🟢 المسوّق' : '🟢 Marketer'}
      >
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
                ? 'أنت شخص بدأ ببناء فريق حقيقي، وليس مجرد مشارك.' 
                : 'You are someone who started building a real team, not just a participant.'}
            </p>
            <div className="mt-3 p-2 bg-primary/10 rounded-lg text-center">
              <span className="text-sm font-medium text-primary">
                {language === 'ar' ? 'أنت الآن قائد مرحلة أولى 👏' : 'You are now a Phase 1 Leader 👏'}
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
            <p className="text-sm text-muted-foreground">
              {language === 'ar' ? 'إحضار 10 مسوّقين مباشرين' : 'Bring 10 direct marketers'}
            </p>
            <div className="p-2 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                {language === 'ar' ? 'كل مسوّق يجب أن:' : 'Each marketer must:'}
              </p>
              <ul className="space-y-1.5 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{language === 'ar' ? 'يحضر 3 مشتركين نشطين' : 'Bring 3 active subscribers'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{language === 'ar' ? 'يشارك ويُبقي فريقه نشطًا' : 'Participate and keep their team active'}</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* كيف تنجح كمسوّق؟ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              {language === 'ar' ? 'كيف تنجح كمسوّق؟' : 'How to Succeed as a Marketer?'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{language === 'ar' ? 'لا تعتمد فقط على المباشرين' : "Don't just rely on direct members"}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{language === 'ar' ? 'يمكنك إحضار مشتركين جدد بنفسك' : 'You can bring new subscribers yourself'}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{language === 'ar' ? 'ساعد فريقك على الترقية وليس فقط التسجيل' : 'Help your team get promoted, not just registered'}</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* الهدف التالي */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              🎯 {language === 'ar' ? 'الهدف التالي:' : 'Next Goal:'}
            </p>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' 
                ? 'عند وجود 10 مسوّقين نشطين + نشاط قوي → تصبح قائد' 
                : 'With 10 active marketers + strong activity → You become a Leader'}
            </p>
          </CardContent>
        </Card>

        {/* Warning Note */}
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  {language === 'ar' ? 'تنويه مهم' : 'Important Note'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {language === 'ar' 
                    ? 'أي شخص لا يستخدم كودك لن يُحتسب ضمن فريقك أو تقدّمك.' 
                    : 'Anyone who does not use your code will not count towards your team or progress.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </RankInfoSheet>

      {/* Referral Code - يبقى ظاهراً */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground mb-2 text-center">
            {language === 'ar' ? 'كود الإحالة الخاص بك:' : 'Your Referral Code:'}
          </p>
          <div className="flex items-center justify-center gap-2">
            <code className="text-lg font-bold text-primary bg-background px-4 py-2 rounded-lg border">
              {referralCode}
            </code>
            <Button 
              size="icon" 
              variant="outline" 
              onClick={handleCopyReferralCode}
              className="h-10 w-10"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
