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
                  ? 'يتم اختيار رئيس الدولة من بين المدراء بناءً على أعلى النقاط والنشاط'
                  : 'Country President is selected from managers with highest points and activity'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Requirements Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            {language === 'ar' ? 'شروط الحفاظ على الرئاسة' : 'Requirements to Maintain Presidency'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
        </CardContent>
      </Card>

      {/* Competition Notice */}
      <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Rocket className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">
                {language === 'ar' 
                  ? 'الرئاسة تنافسية!'
                  : 'Presidency is Competitive!'}
              </p>
              <p className="text-amber-700 text-xs mt-1">
                {language === 'ar'
                  ? 'أقوى الفرق فقط تحافظ على الصدارة. استمر بتحفيز فريقك للحفاظ على موقعك.'
                  : 'Only the strongest teams maintain the lead. Keep motivating your team to hold your position.'}
              </p>
            </div>
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
    </motion.div>
  );
}
