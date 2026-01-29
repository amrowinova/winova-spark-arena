import { motion } from 'framer-motion';
import { CheckCircle2, Users, Trophy, Flame, Shield, AlertTriangle, Rocket, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RankInfoSheet } from './RankInfoSheet';

interface PresidentScreenProps {
  language: string;
  country: string;
}

export function PresidentScreen({ language, country }: PresidentScreenProps) {
  // Mock data - would come from backend
  const activeManagers = 18;
  const requiredManagers = 15;
  const currentPoints = 12500;
  const nextCompetitorPoints = 11200;
  const teamActivityPercent = 87;

  const requirements = [
    {
      icon: Users,
      titleEn: '15+ Active Managers',
      titleAr: '15+ مدير نشط',
      current: activeManagers,
      required: requiredManagers,
      met: activeManagers >= requiredManagers,
    },
    {
      icon: Trophy,
      titleEn: 'Highest Points in Country',
      titleAr: 'أعلى نقاط في الدولة',
      current: currentPoints,
      required: nextCompetitorPoints,
      met: currentPoints > nextCompetitorPoints,
      isPoints: true,
    },
    {
      icon: Flame,
      titleEn: 'Active Team Engagement',
      titleAr: 'نشاط مستمر للفريق',
      current: teamActivityPercent,
      required: 70,
      met: teamActivityPercent >= 70,
      isPercent: true,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="space-y-4"
    >
      {/* President Status Card */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-400 p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-4xl shadow-lg">
              👑
            </div>
            <div className="flex-1">
              <h2 className="text-white text-lg font-bold">
                {language === 'ar' 
                  ? `أنت رئيس WINOVA في ${country}`
                  : `You are WINOVA President in ${country}`}
              </h2>
              <p className="text-white/80 text-sm mt-1">
                {language === 'ar'
                  ? 'الأعلى أداءً بين جميع المدراء خلال هذه الدورة'
                  : 'Highest performing manager during this cycle'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* زر "من أنت؟" */}
      <RankInfoSheet 
        language={language} 
        rankTitle={language === 'ar' ? '👑 الرئيس' : '👑 President'}
      >
        {/* من أنت؟ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-500" />
              {language === 'ar' ? 'من أنت؟' : 'Who Are You?'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {language === 'ar' 
                ? `أنت رئيس WINOVA في دولتك (${country}).` 
                : `You are WINOVA President in your country (${country}).`}
            </p>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 mt-2">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {language === 'ar' 
                  ? 'الرئاسة ليست لقبًا دائمًا، بل مركز تنافسي يتم الحفاظ عليه بالقوة، النشاط، والاستمرارية.' 
                  : 'Presidency is not a permanent title, but a competitive position maintained through strength, activity, and consistency.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* كيف يتم اختيار الرئيس؟ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              🏆 {language === 'ar' ? 'كيف يتم اختيار الرئيس؟' : 'How is the President Selected?'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>{language === 'ar' ? 'يتم اختيار رئيس الدولة من بين المدراء فقط' : 'Country president is selected from managers only'}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>{language === 'ar' ? 'المدير صاحب أعلى مجموع نقاط في الدولة يصبح رئيس WINOVA للدورة التالية' : 'Manager with highest total points in the country becomes WINOVA President for next cycle'}</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* ماذا المطلوب منك؟ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              {language === 'ar' ? 'ماذا المطلوب منك؟' : 'What is Required of You?'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 mb-2">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200 text-center">
                {language === 'ar' ? 'المطلوب: ترقية 15 مديرًا نشيطًا أو أكثر' : 'Required: Promote 15+ active managers'}
              </p>
            </div>
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>{language === 'ar' ? 'الحصول على أعلى مجموع نقاط على مستوى الدولة' : 'Get the highest total points at country level'}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>{language === 'ar' ? 'الحفاظ على نشاط المدراء وفرقهم' : 'Maintain managers and their teams\' activity'}</span>
              </li>
            </ul>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {requirements.map((req, index) => (
                <div 
                  key={index}
                  className={`p-2 rounded-lg text-center ${
                    req.met ? 'bg-primary/5 border border-primary/20' : 'bg-destructive/5 border border-destructive/20'
                  }`}
                >
                  <req.icon className={`h-4 w-4 mx-auto mb-1 ${req.met ? 'text-primary' : 'text-destructive'}`} />
                  <p className={`text-xs font-medium ${req.met ? 'text-primary' : 'text-destructive'}`}>
                    {req.isPoints 
                      ? `${(req.current / 1000).toFixed(1)}K`
                      : req.isPercent
                      ? `${req.current}%`
                      : `${req.current}/${req.required}`
                    }
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* معلومة مهمة */}
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  {language === 'ar' ? 'معلومة مهمة' : 'Important Information'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {language === 'ar' 
                    ? 'الرئاسة تنافسية وليست دائمة. أي مدير قد يتجاوزك إذا بنى فريقًا أقوى وأكثر نشاطًا.' 
                    : 'Presidency is competitive, not permanent. Any manager may surpass you if they build a stronger, more active team.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* أفضل استراتيجية للرئيس */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" />
              {language === 'ar' ? 'أفضل استراتيجية للرئيس:' : 'Best Strategy for President:'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{language === 'ar' ? 'تكبير الشبكة من كل المستويات' : 'Grow network from all levels'}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{language === 'ar' ? 'دعم المدراء والقادة' : 'Support managers and leaders'}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{language === 'ar' ? 'إدخال مشتركين جدد باستمرار' : 'Continuously bring new subscribers'}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{language === 'ar' ? 'الحفاظ على نشاط حقيقي وليس أرقام فقط' : 'Maintain real activity, not just numbers'}</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </RankInfoSheet>

      {/* مكسبك - يبقى ظاهراً */}
      <Card className="border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 dark:border-amber-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            💰 {language === 'ar' ? 'مكسبك:' : 'Your Earnings:'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-background rounded-lg border shadow-sm">
            <div className="flex items-center justify-center gap-2 py-2">
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">И 0.03</span>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              {language === 'ar' 
                ? 'من نشاط جميع الأشخاص في دولتك' 
                : 'From activity of all people in your country'}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
