import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Wallet, Users, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';

const ONBOARDED_KEY = 'winova_onboarded';

const slides = [
  {
    icon: Trophy,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    titleAr: 'شارك في المسابقات',
    titleEn: 'Join the Contests',
    descAr: 'صوّت لمتسابقيك المفضلين، ارتقِ في الترتيب، واربح جوائز نقدية حقيقية كل دورة.',
    descEn: 'Vote for your favourite contestants, climb the leaderboard, and win real cash prizes every cycle.',
  },
  {
    icon: Wallet,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    titleAr: 'محفظتك وتداول P2P',
    titleEn: 'Your Wallet & P2P Trading',
    descAr: 'اشترِ وبِع Nova بأمان عبر نظام P2P المحمي. رصيدك محفوظ وكل معاملة مؤمّنة.',
    descEn: 'Buy and sell Nova securely through our protected P2P system. Your balance is safe and every transaction is secured.',
  },
  {
    icon: Users,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    titleAr: 'ابنِ فريقك واكسب أكثر',
    titleEn: 'Build Your Team & Earn More',
    descAr: 'ادعُ أصدقاءك واحصل على مكافأة فورية. كلما نما فريقك، زادت أرباحك من عمولات الفريق.',
    descEn: 'Invite friends and get an instant reward. The bigger your team, the more you earn from team commissions.',
  },
];

export function OnboardingFlow() {
  const { language } = useLanguage();
  const { user } = useUser();
  const isRTL = language === 'ar';

  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Only show to authenticated users who haven't been onboarded
    if (user && !localStorage.getItem(ONBOARDED_KEY)) {
      setVisible(true);
    }
  }, [user]);

  const dismiss = () => {
    localStorage.setItem(ONBOARDED_KEY, '1');
    setVisible(false);
  };

  const next = () => {
    if (step < slides.length - 1) {
      setStep(s => s + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const slide = slides[step];
  const Icon = slide.icon;
  const isLast = step === slides.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full max-w-md bg-card rounded-t-3xl p-6 pb-10 shadow-2xl"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Skip button */}
        <div className="flex justify-end mb-2">
          <button
            onClick={dismiss}
            className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
            aria-label="Skip"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Slide content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? 30 : -30 }}
            transition={{ duration: 0.25 }}
            className="text-center space-y-4 py-4"
          >
            <div className={`w-20 h-20 mx-auto rounded-2xl ${slide.bg} flex items-center justify-center`}>
              <Icon className={`w-10 h-10 ${slide.color}`} />
            </div>

            <h2 className="text-xl font-bold text-foreground">
              {isRTL ? slide.titleAr : slide.titleEn}
            </h2>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              {isRTL ? slide.descAr : slide.descEn}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="flex justify-center gap-2 my-6">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Action button */}
        <Button
          onClick={next}
          className="w-full h-12 text-base font-semibold"
        >
          {isLast
            ? (isRTL ? '🚀 ابدأ الآن' : '🚀 Get Started')
            : (isRTL ? 'التالي' : 'Next')}
          {!isLast && <ChevronRight className={`h-4 w-4 ${isRTL ? 'rotate-180 me-2' : 'ms-2'}`} />}
        </Button>
      </motion.div>
    </div>
  );
}
