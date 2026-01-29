import { CheckCircle2, AlertTriangle, ArrowRight, Copy, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RankInfoSheet } from './RankInfoSheet';

interface SubscriberScreenProps {
  language: string;
  referralCode: string;
}

export function SubscriberScreen({ language, referralCode }: SubscriberScreenProps) {
  const handleCopyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success(language === 'ar' ? 'تم نسخ الكود!' : 'Code copied!');
  };

  return (
    <>
      {/* زر "من أنت؟" */}
      <RankInfoSheet 
        language={language} 
        rankTitle={language === 'ar' ? '🔵 المشترك' : '🔵 Subscriber'}
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
                ? 'أنت في بداية رحلتك في WINOVA.' 
                : 'You are at the beginning of your WINOVA journey.'}
            </p>
          </CardContent>
        </Card>

        {/* ماذا عليك أن تفعل الآن؟ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              {language === 'ar' ? 'ماذا عليك أن تفعل الآن؟' : 'What Should You Do Now?'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 mb-3">
              <p className="text-sm font-medium text-primary text-center">
                {language === 'ar' ? 'المطلوب: أحضر 3 مشتركين نشيطين' : 'Required: Bring 3 active subscribers'}
              </p>
              <p className="text-xs text-muted-foreground text-center mt-1">
                {language === 'ar' ? '(مشاركوا في المسابقة + تصويت مدفوع واحد على الأقل)' : '(Joined contest + at least one paid vote)'}
              </p>
            </div>
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{language === 'ar' ? 'شارك في المسابقات والتصويت بانتظام' : 'Participate in contests and vote regularly'}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{language === 'ar' ? 'ادعُ أصدقاءك باستخدام كود الإحالة الخاص بك' : 'Invite friends using your referral code'}</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* ما هو المشترك النشيط؟ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              {language === 'ar' ? 'ما هو المشترك النشيط؟' : 'What is an Active Subscriber?'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {language === 'ar' 
                ? 'المشترك النشيط هو شخص:' 
                : 'An active subscriber is someone who:'}
            </p>
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{language === 'ar' ? 'يسجل باستخدام كود إحالتك' : 'Registers using your referral code'}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{language === 'ar' ? 'يشارك في مسابقة واحدة على الأقل' : 'Joins at least one contest'}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{language === 'ar' ? 'يقوم بتصويت مدفوع مرة واحدة' : 'Makes one paid vote'}</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* نصيحة مهمة */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              💡 {language === 'ar' ? 'نصيحة مهمة:' : 'Important Tip:'}
            </p>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' 
                ? 'كل شخص تدخله على كودك هو بداية فريقك، والنشاط أهم من العدد.' 
                : 'Everyone you bring with your code is the start of your team, and activity matters more than numbers.'}
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
                    ? 'أي شخص يسجل بدون كود إحالتك لن يتم احتسابه ضمن تقدّمك.' 
                    : 'Anyone who registers without your referral code will not count towards your progress.'}
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
