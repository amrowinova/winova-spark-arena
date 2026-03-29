import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Sparkles, Trophy, Users, Wallet, ArrowRight, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useNavigate } from 'react-router-dom';

interface OnboardingStep {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  icon: React.ReactNode;
  component?: React.ReactNode;
  action?: {
    text: string;
    textAr: string;
    onClick: () => void;
  };
}

export function InteractiveOnboarding() {
  const { language } = useLanguage();
  const { user } = useUser();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Winova!',
      titleAr: 'مرحباً بك في Winova!',
      description: 'Let\'s get you started with the basics of the platform.',
      descriptionAr: 'دعنا نبدأ معك أساسيات المنصة.',
      icon: <Sparkles className="h-6 w-6" />,
    },
    {
      id: 'nova-vs-aura',
      title: 'Nova vs Aura',
      titleAr: 'Nova مقابل Aura',
      description: 'Nova is your main currency for contests and transfers. Aura is for voting and qualification.',
      descriptionAr: 'Nova هي عملتك الرئيسية للمسابقات والتحويلات. Aura هي للتصويت والتأهل.',
      icon: <Wallet className="h-6 w-6" />,
      component: (
        <div className="grid grid-cols-2 gap-4 mt-4">
          <Card className="p-3 border-blue-500/20 bg-blue-500/5">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">И</div>
              <div className="text-sm font-medium">Nova</div>
              <div className="text-xs text-muted-foreground mt-1">
                {isRTL ? 'للمسابقات والتحويلات' : 'For contests & transfers'}
              </div>
            </div>
          </Card>
          <Card className="p-3 border-purple-500/20 bg-purple-500/5">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">✦</div>
              <div className="text-sm font-medium">Aura</div>
              <div className="text-xs text-muted-foreground mt-1">
                {isRTL ? 'للتصويت والتأهل' : 'For voting & qualification'}
              </div>
            </div>
          </Card>
        </div>
      ),
    },
    {
      id: 'contests',
      title: 'Daily Contests',
      titleAr: 'المسابقات اليومية',
      description: 'Join daily contests to win Nova prizes. Each contest has different phases.',
      descriptionAr: 'شارك في المسابقات اليومية للفوز بجوائز Nova. كل مسابقة لها مراحل مختلفة.',
      icon: <Trophy className="h-6 w-6" />,
      component: (
        <div className="space-y-3 mt-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold">1</div>
            <div>
              <div className="font-medium text-sm">
                {isRTL ? 'مرحلة التسجيل' : 'Registration Phase'}
              </div>
              <div className="text-xs text-muted-foreground">
                {isRTL ? 'سجل للمشاركة' : 'Sign up to participate'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">2</div>
            <div>
              <div className="font-medium text-sm">
                {isRTL ? 'مرحلة التصويت' : 'Voting Phase'}
              </div>
              <div className="text-xs text-muted-foreground">
                {isRTL ? 'صوت للمشاركين' : 'Vote for participants'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-bold">3</div>
            <div>
              <div className="font-medium text-sm">
                {isRTL ? 'مرحلة النتائج' : 'Results Phase'}
              </div>
              <div className="text-xs text-muted-foreground">
                {isRTL ? 'شاهد الفائزين' : 'See the winners'}
              </div>
            </div>
          </div>
        </div>
      ),
      action: {
        text: 'Go to Contests',
        textAr: 'اذهب للمسابقات',
        onClick: () => navigate('/contests'),
      },
    },
    {
      id: 'p2p',
      title: 'P2P Trading',
      titleAr: 'التداول P2P',
      description: 'Trade Nova safely with other users. Create orders, chat, and complete transactions.',
      descriptionAr: 'تداول Nova بأمان مع المستخدمين الآخرين. أنشئ طلبات، دردش، وأكمل المعاملات.',
      icon: <Users className="h-6 w-6" />,
      component: (
        <div className="space-y-3 mt-4">
          <Card className="p-3 border-orange-500/20 bg-orange-500/5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs">1</div>
              <span className="font-medium text-sm">
                {isRTL ? 'إنشاء طلب' : 'Create Order'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {isRTL ? 'حدد المبلغ والطريقة' : 'Set amount and method'}
            </div>
          </Card>
          <Card className="p-3 border-teal-500/20 bg-teal-500/5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs">2</div>
              <span className="font-medium text-sm">
                {isRTL ? 'الدردشة والاتفاق' : 'Chat & Agree'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {isRTL ? 'تواصل مع الطرف الآخر' : 'Communicate with counterparty'}
            </div>
          </Card>
          <Card className="p-3 border-green-500/20 bg-green-500/5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">3</div>
              <span className="font-medium text-sm">
                {isRTL ? 'إتمام المعاملة' : 'Complete Transaction'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {isRTL ? 'استلم ودفع بأمان' : 'Receive and pay safely'}
            </div>
          </Card>
        </div>
      ),
      action: {
        text: 'Try P2P',
        textAr: 'جرب P2P',
        onClick: () => navigate('/p2p'),
      },
    },
    {
      id: 'team',
      title: 'Build Your Team',
      titleAr: 'ابني فريقك',
      description: 'Invite friends and earn commissions. Build a network and grow together.',
      descriptionAr: 'دعوة الأصدقاء واربح عمولات. ابنِ شبكة ونموا معاً.',
      icon: <Users className="h-6 w-6" />,
      action: {
        text: 'View Team',
        textAr: 'عرض الفريق',
        onClick: () => navigate('/team'),
      },
    },
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => [...prev, steps[currentStep].id]);
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setCompletedSteps([...steps.map(s => s.id)]);
    setIsCompleted(true);
    
    // Save completion to localStorage
    localStorage.setItem('onboarding-completed', 'true');
    localStorage.setItem('onboarding-completed-at', new Date().toISOString());
  };

  const handleSkip = () => {
    handleComplete();
  };

  useEffect(() => {
    // Check if onboarding was already completed
    const completed = localStorage.getItem('onboarding-completed');
    if (completed === 'true') {
      setIsCompleted(true);
    }
  }, []);

  if (isCompleted) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4"
          >
            <Check className="h-8 w-8 text-white" />
          </motion.div>
          <h3 className="text-xl font-bold mb-2">
            {isRTL ? 'أكملت التوجيه!' : 'Onboarding Complete!'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {isRTL 
              ? 'أنت الآن جاهز لبدء رحلتك في Winova!' 
              : 'You\'re all set to start your Winova journey!'
            }
          </p>
          <Button onClick={() => navigate('/contests')} className="w-full">
            {isRTL ? 'ابدأ الآن' : 'Get Started'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentStepData = steps[currentStep];

  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="p-6">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">
              {isRTL ? 'التوجيه التفاعلي' : 'Interactive Onboarding'}
            </h3>
            <Badge variant="secondary">
              {currentStep + 1} / {steps.length}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-4"
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                {currentStepData.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  {isRTL ? currentStepData.titleAr : currentStepData.title}
                </h2>
              </div>
            </div>

            {/* Description */}
            <p className="text-muted-foreground">
              {isRTL ? currentStepData.descriptionAr : currentStepData.description}
            </p>

            {/* Custom Component */}
            {currentStepData.component}

            {/* Action Button */}
            {currentStepData.action && (
              <Button
                onClick={currentStepData.action.onClick}
                className="w-full"
                variant="outline"
              >
                {isRTL ? currentStepData.action.textAr : currentStepData.action.text}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={isRTL ? 'order-2' : ''}
          >
            {isRTL ? (
              <>
                {isRTL ? 'التالي' : 'Next'}
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                {isRTL ? 'السابق' : 'Previous'}
              </>
            )}
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleSkip}>
              {isRTL ? 'تخطي' : 'Skip'}
            </Button>
            <Button onClick={handleNext}>
              {currentStep === steps.length - 1 ? (
                <>
                  {isRTL ? 'إنهاء' : 'Complete'}
                  <Check className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  {isRTL ? 'التالي' : 'Next'}
                  {isRTL ? (
                    <ChevronLeft className="h-4 w-4 mr-2" />
                  ) : (
                    <ChevronRight className="h-4 w-4 ml-2" />
                  )}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
