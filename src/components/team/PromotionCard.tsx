import { motion } from 'framer-motion';
import { Target, CheckCircle2, Circle, Crown, Users, Trophy, Flame, Rocket, Shield, AlertTriangle, Copy, Info, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RankBadge } from '@/components/common/RankBadge';
import { Button } from '@/components/ui/button';
import { useUser, UserRank } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RANK SYSTEM - DEVELOPER REFERENCE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * RANKS (in order):
 * 1. مشترك (Subscriber)  → Entry level
 * 2. مسوّق (Marketer)    → 3 active direct subscribers
 * 3. قائد (Leader)       → 10 direct marketers
 * 4. مدير (Manager)      → 10 direct leaders
 * 5. رئيس (President)    → 10+ managers + highest spotlight points
 * 
 * USER VIEW LOGIC:
 * - User ONLY sees their current rank
 * - No tabs or rank switching visible to user
 * - View automatically updates on promotion
 * - Promotion progress shows requirements for NEXT rank only
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// RANK: مشترك (SUBSCRIBER) → مسوّق (MARKETER)
// ═══════════════════════════════════════════════════════════════════════════
const subscriberRequirements = {
  nextRank: 'marketer' as UserRank,
  directRequired: 3,
  requirementType: 'active_subscribers',
  descriptionEn: 'Recruit 3 active subscribers',
  descriptionAr: 'أحضر 3 مشتركين نشطين',
};

// ═══════════════════════════════════════════════════════════════════════════
// RANK: مسوّق (MARKETER) → قائد (LEADER)
// ═══════════════════════════════════════════════════════════════════════════
const marketerRequirements = {
  nextRank: 'leader' as UserRank,
  directRequired: 10,
  requirementType: 'direct_marketers',
  descriptionEn: 'Have 10 direct marketers',
  descriptionAr: 'لديك 10 مسوّقين مباشرين',
};

// ═══════════════════════════════════════════════════════════════════════════
// RANK: قائد (LEADER) → مدير (MANAGER)
// ═══════════════════════════════════════════════════════════════════════════
const leaderRequirements = {
  nextRank: 'manager' as UserRank,
  directRequired: 10,
  requirementType: 'direct_leaders',
  descriptionEn: 'Have 10 direct leaders',
  descriptionAr: 'لديك 10 قادة مباشرين',
};

// ═══════════════════════════════════════════════════════════════════════════
// RANK: مدير (MANAGER) → رئيس (PRESIDENT)
// ═══════════════════════════════════════════════════════════════════════════
const managerRequirements = {
  nextRank: 'president' as UserRank,
  directRequired: 10,
  requirementType: 'managers_and_points',
  descriptionEn: '10+ managers + top spotlight points',
  descriptionAr: '10+ مديرين + أعلى نقاط الأضواء',
};

// ═══════════════════════════════════════════════════════════════════════════
// RANK: رئيس (PRESIDENT) - TOP RANK
// ═══════════════════════════════════════════════════════════════════════════
const presidentRequirements = {
  nextRank: null,
  directRequired: 0,
  requirementType: 'none',
  descriptionEn: 'Top rank achieved!',
  descriptionAr: 'أعلى رتبة!',
};

// Combined requirements map
const promotionRequirements: Record<UserRank, typeof subscriberRequirements> = {
  subscriber: subscriberRequirements,
  marketer: marketerRequirements,
  leader: leaderRequirements,
  manager: managerRequirements,
  president: presidentRequirements,
};

interface PromotionCardProps {
  activeDirectCount: number;
  rankOverride?: UserRank | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PRESIDENT SCREEN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
function PresidentScreen({ language, country }: { language: string; country: string }) {
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

      {/* What Does Being President Mean */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-amber-500" />
            {language === 'ar' ? 'ماذا يعني أنك رئيس WINOVA؟' : 'What Does Being WINOVA President Mean?'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {language === 'ar' 
              ? 'كونك رئيس WINOVA في هذه الدولة يعني أنك الأعلى أداءً بين جميع المدراء خلال هذه الدورة.' 
              : 'Being WINOVA President in this country means you are the highest performing manager during this cycle.'}
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

      {/* How President is Selected */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            🏆 {language === 'ar' ? 'كيف يتم اختيار رئيس الدولة؟' : 'How is the Country President Selected?'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {language === 'ar' 
              ? 'يتم اختيار رئيس WINOVA في نهاية كل دورة وفق القاعدة التالية:' 
              : 'WINOVA President is selected at the end of each cycle based on:'}
          </p>
          <ul className="space-y-1.5 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>{language === 'ar' ? 'يتم التنافس بين المدراء فقط' : 'Competition is between managers only'}</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>{language === 'ar' ? 'المدير صاحب أعلى مجموع نقاط في الدولة يصبح رئيس WINOVA للدورة التالية' : 'Manager with highest total points in the country becomes President for next cycle'}</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Requirements Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            {language === 'ar' ? 'كيف تحافظ على الرئاسة؟' : 'How to Maintain Presidency?'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground mb-2">
            {language === 'ar' 
              ? 'للحفاظ على موقعك كرئيس للدولة، يجب عليك:' 
              : 'To maintain your position as Country President, you must:'}
          </p>
          {requirements.map((req, index) => (
            <div 
              key={index}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                req.met ? 'bg-primary/5 border border-primary/20' : 'bg-destructive/5 border border-destructive/20'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                req.met ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
              }`}>
                <req.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {language === 'ar' ? req.titleAr : req.titleEn}
                </p>
                <p className={`text-xs ${req.met ? 'text-primary' : 'text-destructive'}`}>
                  {req.isPoints 
                    ? `${req.current.toLocaleString()} ${language === 'ar' ? 'نقطة' : 'pts'}`
                    : req.isPercent
                    ? `${req.current}%`
                    : `${req.current}/${req.required}`
                  }
                </p>
              </div>
              {req.met ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
            </div>
          ))}
          <p className="text-xs text-muted-foreground mt-2">
            {language === 'ar' 
              ? 'أي تراجع في نشاط المدراء أو نقاطهم قد يعرّض موقعك للرئاسة للخطر.' 
              : 'Any decline in managers\' activity or points may jeopardize your presidency position.'}
          </p>
        </CardContent>
      </Card>

      {/* President Rewards */}
      <Card className="border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 dark:border-amber-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            💰 {language === 'ar' ? 'مكافآت رئيس WINOVA' : 'WINOVA President Rewards'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {language === 'ar' ? 'بصفتك رئيس الدولة، تحصل على:' : 'As Country President, you receive:'}
          </p>
          
          <div className="p-3 bg-background rounded-lg border shadow-sm">
            <div className="flex items-center justify-center gap-2 py-2">
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">И 0.03</span>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              {language === 'ar' 
                ? 'من كل اشتراك أو نشاط يتم من جميع المستخدمين داخل دولتك' 
                : 'From every subscription or activity by all users in your country'}
            </p>
          </div>

          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p>{language === 'ar' ? 'هذه المكافأة:' : 'This reward:'}</p>
            <ul className="space-y-1 ps-4">
              <li>• {language === 'ar' ? 'لا تعتمد على فريقك المباشر فقط' : 'Not limited to your direct team'}</li>
              <li>• {language === 'ar' ? 'ترتبط بحجم الدولة وقوة نشاطها الكامل' : 'Tied to country size and total activity strength'}</li>
            </ul>
          </div>

          <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg text-center">
            <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {language === 'ar' 
                ? 'كلما زاد نشاط الدولة → زادت مكافأتك تلقائيًا كرئيس' 
                : 'More country activity → More rewards automatically'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Competition Warning */}
      <Card className="bg-destructive/5 border-destructive/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">
                {language === 'ar' ? 'تنبيه مهم' : 'Important Warning'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {language === 'ar' 
                  ? 'الرئاسة تنافسية وليست محجوزة. أي مدير آخر قد يتجاوزك في النقاط إذا زاد نشاط فريقه وارتفع أداؤه.' 
                  : 'Presidency is competitive, not reserved. Any other manager may surpass you in points if their team\'s activity and performance increases.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best Strategy */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            {language === 'ar' ? 'أفضل استراتيجية للحفاظ على الرئاسة' : 'Best Strategy to Maintain Presidency'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ul className="space-y-1.5 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{language === 'ar' ? 'تقوية المدراء' : 'Strengthen managers'}</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{language === 'ar' ? 'دعم القادة' : 'Support leaders'}</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{language === 'ar' ? 'رفع نشاط الشبكة بالكامل' : 'Boost entire network activity'}</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{language === 'ar' ? 'بناء فرق قوية ومستقرة داخل الدولة' : 'Build strong, stable teams within the country'}</span>
            </li>
          </ul>
          <div className="mt-3 p-2 bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/50 dark:to-yellow-900/50 rounded-lg text-center">
            <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {language === 'ar' 
                ? 'أقوى دولة = رئيس ثابت + مكافآت أعلى' 
                : 'Strongest country = Stable President + Higher rewards'}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function PromotionCard({ activeDirectCount, rankOverride }: PromotionCardProps) {
  const { user } = useUser();
  const { language } = useLanguage();
  
  // Use override rank for dev testing, otherwise use actual user rank
  const displayRank = rankOverride ?? user.rank;

  const currentPromotion = promotionRequirements[displayRank];
  
  // ═══════════════════════════════════════════════════════════════════════
  // PRESIDENT VIEW - Full President Screen
  // ═══════════════════════════════════════════════════════════════════════
  if (!currentPromotion.nextRank) {
    return <PresidentScreen language={language} country={user.country} />;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PROMOTION PROGRESS VIEW - For all other ranks
  // ═══════════════════════════════════════════════════════════════════════
  const promotionProgress = Math.min(100, (activeDirectCount / currentPromotion.directRequired) * 100);
  const remaining = Math.max(0, currentPromotion.directRequired - activeDirectCount);
  const achieved = Math.min(activeDirectCount, currentPromotion.directRequired);

  const handleCopyReferralCode = () => {
    navigator.clipboard.writeText(user.referralCode);
    toast.success(language === 'ar' ? 'تم نسخ الكود!' : 'Code copied!');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="space-y-4"
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {language === 'ar' ? 'تقدّم الترقية' : 'Promotion Progress'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current → Next Rank with Progress */}
          <div className="flex items-center gap-3">
            <RankBadge rank={displayRank} size="sm" />
            <div className="flex-1">
              <Progress value={promotionProgress} className="h-2.5" />
            </div>
            <RankBadge rank={currentPromotion.nextRank} size="sm" />
          </div>

          {/* Progress Stats - Clear Numbers */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {language === 'ar' ? 'التقدم' : 'Progress'}
              </span>
              <span className="text-lg font-bold text-primary">
                {Math.round(promotionProgress)}%
              </span>
            </div>
            
            {/* Achieved vs Required */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'تم إنجازه' : 'Achieved'}
                  </p>
                  <p className="font-bold text-primary">{achieved}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'المتبقي' : 'Remaining'}
                  </p>
                  <p className="font-bold text-foreground">{remaining}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Requirement Description */}
          <div className="text-center py-2 px-3 bg-primary/5 rounded-lg border border-primary/10">
            <p className="text-sm text-muted-foreground">
              {language === 'ar' ? 'المطلوب:' : 'Requirement:'}
            </p>
            <p className="font-medium text-foreground mt-1">
              {language === 'ar' 
                ? currentPromotion.descriptionAr 
                : currentPromotion.descriptionEn}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════════
          SUBSCRIBER ONLY: Explanation & Referral Code Section
          ═══════════════════════════════════════════════════════════════════════ */}
      {displayRank === 'subscriber' && (
        <>
          {/* What is an Active Subscriber? */}
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

          {/* How to Complete This Stage */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-primary" />
                {language === 'ar' ? 'كيف تكمل هذه المرحلة؟' : 'How to Complete This Stage?'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span className="text-sm">{language === 'ar' ? 'انسخ كود الإحالة الخاص بك' : 'Copy your referral code'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span className="text-sm">{language === 'ar' ? 'أرسله إلى 3 أشخاص (واتساب – تيك توك – إنستغرام)' : 'Send it to 3 people (WhatsApp – TikTok – Instagram)'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <div className="text-sm">
                    <span>{language === 'ar' ? 'ساعدهم على:' : 'Help them:'}</span>
                    <ul className="mt-1 space-y-0.5 text-muted-foreground">
                      <li>• {language === 'ar' ? 'التسجيل بالكود' : 'Register with the code'}</li>
                      <li>• {language === 'ar' ? 'دخول مسابقة' : 'Join a contest'}</li>
                      <li>• {language === 'ar' ? 'تنفيذ تصويت مدفوع مرة واحدة' : 'Make one paid vote'}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referral Code */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-2 text-center">
                {language === 'ar' ? 'كود الإحالة الخاص بك:' : 'Your Referral Code:'}
              </p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-lg font-bold text-primary bg-background px-4 py-2 rounded-lg border">
                  {user.referralCode}
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

          {/* What Happens When You Complete */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-foreground mb-2">
                {language === 'ar' ? 'عند إحضارك 3 مشتركين نشيطين:' : 'When you bring 3 active subscribers:'}
              </p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{language === 'ar' ? 'تنتقل تلقائيًا إلى رتبة مسوّق' : 'You automatically become a Marketer'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{language === 'ar' ? 'يبدأ احتساب فريقك' : 'Your team starts counting'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{language === 'ar' ? 'تفتح لك مراحل وفرص أعلى' : 'Higher stages and opportunities unlock'}</span>
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
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MARKETER ONLY: Explanation & Referral Code Section
          ═══════════════════════════════════════════════════════════════════════ */}
      {displayRank === 'marketer' && (
        <>
          {/* What is a Marketer */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                {language === 'ar' ? 'ما معنى "مسوّق" في WINOVA؟' : 'What is a "Marketer" in WINOVA?'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {language === 'ar' 
                  ? 'المسوّق هو شخص:' 
                  : 'A marketer is someone who:'}
              </p>
              <ul className="space-y-1.5 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{language === 'ar' ? 'لا يكتفي بإحضار مشتركين فقط' : 'Does not just bring subscribers'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{language === 'ar' ? 'بل يساعدهم ليصبحوا مسوّقين مثله' : 'But helps them become marketers like him'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{language === 'ar' ? 'ويبني فريقًا نشطًا وقابلًا للنمو' : 'And builds an active, growing team'}</span>
                </li>
              </ul>
              <div className="mt-3 p-2 bg-primary/10 rounded-lg text-center">
                <span className="text-sm font-medium text-primary">
                  {language === 'ar' ? 'أنت الآن قائد مرحلة أولى 👏' : 'You are now a Phase 1 Leader 👏'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* What Does 10 Direct Marketers Mean? */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                {language === 'ar' ? 'ماذا يعني "10 مسوّقين مباشرين"؟' : 'What Does "10 Direct Marketers" Mean?'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-2 bg-destructive/5 rounded-lg border border-destructive/20">
                <p className="text-sm text-destructive font-medium">
                  {language === 'ar' ? 'هذا لا يعني:' : 'This does NOT mean:'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  ❌ {language === 'ar' ? 'تجيب 10 أشخاص وخلاص' : 'Just bring 10 people and done'}
                </p>
              </div>
              
              <div className="p-2 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-primary font-medium mb-2">
                  {language === 'ar' ? 'بل يعني:' : 'It means:'}
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span className="text-sm">{language === 'ar' ? 'أنت تجيب 10 مشتركين باستخدام كود إحالتك' : 'You bring 10 subscribers using your referral code'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <div className="text-sm">
                      <span>{language === 'ar' ? 'كل مشترك:' : 'Each subscriber:'}</span>
                      <ul className="mt-1 space-y-0.5 text-muted-foreground">
                        <li>• {language === 'ar' ? 'ينجز مهامه كمشترك' : 'Completes their subscriber tasks'}</li>
                        <li>• {language === 'ar' ? 'يُحضر 3 مشتركين نشيطين على كوده' : 'Brings 3 active subscribers on their code'}</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span className="text-sm">{language === 'ar' ? 'عندها يتحوّل هذا الشخص إلى مسوّق' : 'Then this person becomes a marketer'}</span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-primary/20">
                  <p className="text-sm text-center">
                    🔁 {language === 'ar' 
                      ? 'عندما ينجح 10 أشخاص بهذه الطريقة ➡️ يصبح عندك 10 مسوّقين مباشرين' 
                      : 'When 10 people succeed this way ➡️ You have 10 direct marketers'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* The Big Picture */}
          <Card className="bg-muted/30 border-muted">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                🧠 {language === 'ar' ? 'باختصار (الصورة الكبيرة):' : 'In Short (The Big Picture):'}
              </p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>• {language === 'ar' ? 'أنت لا تبني أشخاص' : "You're not building people"}</li>
                <li>• {language === 'ar' ? 'أنت تبني مسوّقين' : "You're building marketers"}</li>
                <li>• {language === 'ar' ? 'وكل مسوّق يبني فريقه بنفسه' : 'And each marketer builds their own team'}</li>
              </ul>
            </CardContent>
          </Card>

          {/* What Happens After 10 Marketers */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                🚀 {language === 'ar' ? 'ماذا يحدث بعد إكمال 10 مسوّقين؟' : 'What Happens After 10 Marketers?'}
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                {language === 'ar' ? 'عند تحقق الشروط:' : 'When requirements are met:'}
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground mb-3">
                <li>• {language === 'ar' ? '10 مسوّقين مباشرين' : '10 direct marketers'}</li>
                <li>• {language === 'ar' ? 'كلهم نشيطين' : 'All active'}</li>
                <li>• {language === 'ar' ? 'فرقهم نشيطة' : 'Their teams are active'}</li>
              </ul>
              <div className="p-2 bg-primary/10 rounded-lg text-center">
                <span className="text-sm font-medium text-primary">
                  🎉 {language === 'ar' 
                    ? 'تترقّى تلقائيًا إلى رتبة قائد' 
                    : 'You automatically become a Leader'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {language === 'ar' 
                  ? 'وتبدأ مرحلة جديدة بقيادة مسوّقين بدل مشتركين.'
                  : 'And start a new phase leading marketers instead of subscribers.'}
              </p>
            </CardContent>
          </Card>

          {/* How to Start Now */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-primary" />
                {language === 'ar' ? 'كيف تبدأ الآن؟' : 'How to Start Now?'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span className="text-sm">{language === 'ar' ? 'انسخ كود الإحالة الخاص بك' : 'Copy your referral code'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span className="text-sm">{language === 'ar' ? 'شاركه مع أشخاص جادّين' : 'Share it with serious people'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <div className="text-sm">
                    <span>{language === 'ar' ? 'علّمهم نفس الخطوات:' : 'Teach them the same steps:'}</span>
                    <ul className="mt-1 space-y-0.5 text-muted-foreground">
                      <li>• {language === 'ar' ? 'تسجيل بالكود' : 'Register with the code'}</li>
                      <li>• {language === 'ar' ? 'إحضار 3 مشتركين نشيطين' : 'Bring 3 active subscribers'}</li>
                      <li>• {language === 'ar' ? 'التحوّل إلى مسوّق' : 'Become a marketer'}</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="mt-2 p-2 bg-muted/50 rounded-lg text-center">
                <span className="text-xs text-muted-foreground">
                  {language === 'ar' 
                    ? 'كل شخص تساعده ليصبح مسوّقًا ➡️ يقرّبك خطوة من رتبة قائد' 
                    : 'Every person you help become a marketer ➡️ brings you closer to Leader rank'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Referral Code */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-2 text-center">
                {language === 'ar' ? 'كود الإحالة الخاص بك:' : 'Your Referral Code:'}
              </p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-lg font-bold text-primary bg-background px-4 py-2 rounded-lg border">
                  {user.referralCode}
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
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          LEADER ONLY: Explanation & Earnings Section
          ═══════════════════════════════════════════════════════════════════════ */}
      {displayRank === 'leader' && (
        <>
          {/* What is a Leader */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                {language === 'ar' ? 'ما معنى رتبة "قائد" في WINOVA؟' : 'What is a "Leader" in WINOVA?'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {language === 'ar' 
                  ? 'القائد هو شخص:' 
                  : 'A leader is someone who:'}
              </p>
              <ul className="space-y-1.5 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{language === 'ar' ? 'بنى فريق مسوّقين ناجحين' : 'Built a team of successful marketers'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{language === 'ar' ? 'لا يعمل وحده، بل يدير شبكة' : 'Does not work alone, but manages a network'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{language === 'ar' ? 'يركّز على النشاط، الاستمرارية، وجودة الفريق' : 'Focuses on activity, consistency, and team quality'}</span>
                </li>
              </ul>
              <div className="mt-3 p-2 bg-primary/10 rounded-lg text-center">
                <span className="text-sm font-medium text-primary">
                  {language === 'ar' ? 'أنت الآن في مرحلة القيادة الحقيقية 👏' : 'You are now in true leadership phase 👏'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* What Does Being a Leader Mean */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                {language === 'ar' ? 'ماذا يعني أنك قائد؟' : 'What Does Being a Leader Mean?'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-2 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-primary font-medium mb-2">
                  {language === 'ar' ? 'هذا يعني أن لديك:' : 'This means you have:'}
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• {language === 'ar' ? '10 مسوّقين مباشرين نشيطين' : '10 active direct marketers'}</li>
                  <li>• {language === 'ar' ? 'كل مسوّق عنده فريقه الخاص' : 'Each marketer has their own team'}</li>
                  <li>• {language === 'ar' ? 'أنت تتابعهم، تدعمهم، وتساعدهم على التطور' : 'You follow up, support, and help them grow'}</li>
                </ul>
              </div>
              
              <div className="p-2 bg-destructive/5 rounded-lg border border-destructive/20">
                <p className="text-sm text-destructive font-medium">
                  {language === 'ar' ? 'دورك لم يعد:' : 'Your role is no longer:'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  ❌ {language === 'ar' ? 'إحضار مشتركين فقط' : 'Just bringing subscribers'}
                </p>
              </div>

              <div className="p-2 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-primary font-medium mb-1">
                  {language === 'ar' ? 'بل:' : 'But:'}
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>✅ {language === 'ar' ? 'تطوير مسوّقين' : 'Developing marketers'}</li>
                  <li>✅ {language === 'ar' ? 'الحفاظ على نشاط فرقهم' : 'Maintaining their teams\' activity'}</li>
                  <li>✅ {language === 'ar' ? 'تقوية الفريق كامل' : 'Strengthening the entire team'}</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* How Leaders Earn */}
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                💰 {language === 'ar' ? 'كيف تربح كقائد؟' : 'How Do Leaders Earn?'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {language === 'ar' 
                  ? 'القائد يستفيد من نشاط الفريق بالكامل وليس من شخص واحد فقط.' 
                  : 'Leaders benefit from the entire team\'s activity, not just one person.'}
              </p>
              
              <div className="p-3 bg-background rounded-lg border shadow-sm">
                <p className="text-xs text-muted-foreground mb-1">
                  {language === 'ar' ? 'أرباحك كقائد:' : 'Your earnings as a Leader:'}
                </p>
                <div className="flex items-center justify-center gap-2 py-2">
                  <span className="text-2xl font-bold text-primary">И 0.82</span>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  {language === 'ar' 
                    ? 'عن كل اشتراك أو نشاط مؤهل يتم داخل فريقك' 
                    : 'For every qualified subscription or activity in your team'}
                </p>
                <p className="text-xs text-center text-muted-foreground mt-1">
                  ({language === 'ar' ? 'يتم احتسابها تلقائيًا' : 'Calculated automatically'})
                </p>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                {language === 'ar' 
                  ? 'الأرباح تُحسب بناءً على نشاط المسوّقين وفرقهم، وليس بشكل عشوائي.' 
                  : 'Earnings are calculated based on marketers\' and their teams\' activity, not randomly.'}
              </p>
            </CardContent>
          </Card>

          {/* How to Increase Earnings */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                📈 {language === 'ar' ? 'كيف تزيد أرباحك كقائد؟' : 'How to Increase Your Earnings?'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span className="text-sm">{language === 'ar' ? 'حافظ على نشاط المسوّقين الـ10' : 'Keep your 10 marketers active'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <div className="text-sm">
                    <span>{language === 'ar' ? 'ساعدهم على:' : 'Help them:'}</span>
                    <ul className="mt-1 space-y-0.5 text-muted-foreground">
                      <li>• {language === 'ar' ? 'بناء فرقهم' : 'Build their teams'}</li>
                      <li>• {language === 'ar' ? 'تفعيل أعضائهم' : 'Activate their members'}</li>
                      <li>• {language === 'ar' ? 'الاستمرار في النشاط الأسبوعي' : 'Continue weekly activity'}</li>
                    </ul>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span className="text-sm">{language === 'ar' ? 'كلما كان فريقك أقوى ➡️ زادت أرباحك تلقائيًا' : 'The stronger your team ➡️ the more you earn automatically'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Promotion */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                🚀 {language === 'ar' ? 'الترقية القادمة بعد القائد' : 'Next Promotion After Leader'}
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                {language === 'ar' ? 'عند تحقيق الشروط المطلوبة:' : 'When requirements are met:'}
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground mb-3">
                <li>• {language === 'ar' ? 'عدد أكبر من المسوّقين النشطين' : 'More active marketers'}</li>
                <li>• {language === 'ar' ? 'فرق مستقرة' : 'Stable teams'}</li>
                <li>• {language === 'ar' ? 'نقاط أعلى خلال الدورة' : 'Higher points during the cycle'}</li>
              </ul>
              <div className="p-2 bg-primary/10 rounded-lg text-center">
                <span className="text-sm font-medium text-primary">
                  🎯 {language === 'ar' ? 'تنتقل إلى رتبة مدير' : 'You advance to Manager rank'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Important Notes */}
          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">
                    {language === 'ar' ? 'ملاحظات مهمة' : 'Important Notes'}
                  </p>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                    <li>• {language === 'ar' ? 'المسوّق غير النشيط لا يُحتسب في التقدم' : 'Inactive marketers do not count towards progress'}</li>
                    <li>• {language === 'ar' ? 'الترقية تعتمد على النشاط الحقيقي وليس العدد فقط' : 'Promotion depends on real activity, not just numbers'}</li>
                    <li>• {language === 'ar' ? 'قوة القائد = قوة فريقه' : 'Leader\'s strength = Team\'s strength'}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MANAGER ONLY: Explanation & Earnings Section
          ═══════════════════════════════════════════════════════════════════════ */}
      {displayRank === 'manager' && (
        <>
          {/* What is a Manager */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                {language === 'ar' ? 'ما معنى رتبة "مدير" في WINOVA؟' : 'What is a "Manager" in WINOVA?'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {language === 'ar' 
                  ? 'المدير هو مرحلة متقدمة في القيادة.' 
                  : 'Manager is an advanced stage of leadership.'}
              </p>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' 
                  ? 'أنت لم تعد تدير أشخاص فقط، بل تدير قادة.' 
                  : 'You no longer manage people only, but manage leaders.'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {language === 'ar' ? 'هذه الرتبة مخصّصة لمن:' : 'This rank is for those who:'}
              </p>
              <ul className="space-y-1.5 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{language === 'ar' ? 'بنى فرق قوية' : 'Built strong teams'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{language === 'ar' ? 'حافظ على نشاطها' : 'Maintained their activity'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{language === 'ar' ? 'أثبت استمراريته خلال أكثر من دورة' : 'Proved consistency over multiple cycles'}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* What Does Being a Manager Mean */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                {language === 'ar' ? 'ماذا يعني أنك مدير؟' : 'What Does Being a Manager Mean?'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-2 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-primary font-medium mb-2">
                  {language === 'ar' ? 'هذا يعني أن لديك:' : 'This means you have:'}
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• {language === 'ar' ? 'قادة مباشرين نشيطين' : 'Active direct leaders'}</li>
                  <li>• {language === 'ar' ? 'كل قائد لديه فريق مسوّقين نشيط' : 'Each leader has an active marketers team'}</li>
                  <li className="mt-2">{language === 'ar' ? 'أنت تتابع:' : 'You monitor:'}</li>
                  <li className="ps-4">• {language === 'ar' ? 'نشاط القادة' : 'Leaders\' activity'}</li>
                  <li className="ps-4">• {language === 'ar' ? 'استقرار فرقهم' : 'Their teams\' stability'}</li>
                  <li className="ps-4">• {language === 'ar' ? 'قوة الأداء العام' : 'Overall performance strength'}</li>
                </ul>
              </div>
              
              <div className="p-2 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-primary font-medium mb-1">
                  {language === 'ar' ? 'دورك الأساسي:' : 'Your main role:'}
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>✅ {language === 'ar' ? 'دعم القادة' : 'Support leaders'}</li>
                  <li>✅ {language === 'ar' ? 'حل المشاكل' : 'Solve problems'}</li>
                  <li>✅ {language === 'ar' ? 'الحفاظ على استمرارية النشاط' : 'Maintain activity continuity'}</li>
                  <li>✅ {language === 'ar' ? 'رفع مستوى الفرق ككل' : 'Elevate all teams\' level'}</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* How Managers Earn */}
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                💰 {language === 'ar' ? 'كيف تربح كمدير؟' : 'How Do Managers Earn?'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {language === 'ar' 
                  ? 'المدير يستفيد من كل ما يحدث داخل الشبكة التي يديرها.' 
                  : 'Managers benefit from everything that happens in the network they manage.'}
              </p>
              
              <div className="p-3 bg-background rounded-lg border shadow-sm">
                <p className="text-xs text-muted-foreground mb-1">
                  {language === 'ar' ? 'أرباحك كمدير:' : 'Your earnings as a Manager:'}
                </p>
                <div className="flex items-center justify-center gap-2 py-2">
                  <span className="text-2xl font-bold text-primary">И 0.15</span>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  {language === 'ar' 
                    ? 'عن كل اشتراك أو نشاط مؤهل يتم داخل فريقك' 
                    : 'For every qualified subscription or activity in your team'}
                </p>
                <p className="text-xs text-center text-muted-foreground mt-1">
                  ({language === 'ar' ? 'يتم احتسابها تلقائيًا' : 'Calculated automatically'})
                </p>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                {language === 'ar' 
                  ? 'هذه النسبة تُحسب من نشاط القادة وفرقهم بالكامل، وليس من شخص واحد فقط.' 
                  : 'This rate is calculated from leaders\' and their teams\' activity, not just one person.'}
              </p>
            </CardContent>
          </Card>

          {/* How to Increase Earnings */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                📈 {language === 'ar' ? 'كيف تزيد أرباحك كمدير؟' : 'How to Increase Your Earnings?'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span className="text-sm">{language === 'ar' ? 'حافظ على نشاط القادة المباشرين' : 'Keep your direct leaders active'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <div className="text-sm">
                    <span>{language === 'ar' ? 'تأكّد أن فرقهم:' : 'Ensure their teams are:'}</span>
                    <ul className="mt-1 space-y-0.5 text-muted-foreground">
                      <li>• {language === 'ar' ? 'نشيطة' : 'Active'}</li>
                      <li>• {language === 'ar' ? 'مؤهلة' : 'Qualified'}</li>
                      <li>• {language === 'ar' ? 'مستمرة في الدورات' : 'Consistent across cycles'}</li>
                    </ul>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span className="text-sm">{language === 'ar' ? 'كلما كبر الفريق وزاد نشاطه ➡️ زادت أرباحك تلقائيًا' : 'The bigger and more active your team ➡️ the more you earn automatically'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Presidency Race */}
          <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 dark:from-amber-950/30 dark:to-yellow-950/30 dark:border-amber-800">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                🚀 {language === 'ar' ? 'الترقية القادمة بعد المدير' : 'Next Promotion After Manager'}
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                {language === 'ar' ? 'المدير يدخل في سباق الرئاسة.' : 'Managers enter the Presidency race.'}
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                {language === 'ar' ? 'خلال الدورة:' : 'During the cycle:'}
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground mb-3">
                <li>• {language === 'ar' ? 'يتم احتساب النقاط' : 'Points are calculated'}</li>
                <li>• {language === 'ar' ? 'يتم مقارنة المدراء داخل نفس الدولة' : 'Managers are compared within the same country'}</li>
              </ul>
              <div className="p-2 bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/50 dark:to-yellow-900/50 rounded-lg text-center">
                <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  👑 {language === 'ar' ? 'أعلى مدير نقاط يصبح رئيس الدولة' : 'Highest points manager becomes Country President'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Important Notes */}
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
      )}
    </motion.div>
  );
}
