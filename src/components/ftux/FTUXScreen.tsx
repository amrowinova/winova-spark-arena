import { motion } from 'framer-motion';
import { Rocket, Trophy, Users, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';

interface FTUXScreenProps {
  /** Page title to show in header */
  pageTitle: string;
}

export function FTUXScreen({ pageTitle }: FTUXScreenProps) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const handleJoinContest = () => {
    navigate('/contests');
  };

  const features = [
    {
      icon: Trophy,
      titleEn: 'Win Prizes',
      titleAr: 'اربح جوائز',
      descEn: 'Compete and win Nova tokens',
      descAr: 'تنافس واربح عملات نوڤا',
    },
    {
      icon: Users,
      titleEn: 'Build Your Team',
      titleAr: 'ابنِ فريقك',
      descEn: 'Invite friends and grow together',
      descAr: 'ادعُ أصدقاءك وانموا معاً',
    },
    {
      icon: Sparkles,
      titleEn: 'Earn Aura',
      titleAr: 'اكسب أورا',
      descEn: 'Use Aura to vote and support',
      descAr: 'استخدم أورا للتصويت والدعم',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InnerPageHeader title={pageTitle} />
      
      <main className="flex-1 px-4 py-6 pb-24 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md text-center space-y-6"
        >
          {/* Hero Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mx-auto h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <Rocket className="h-12 w-12 text-primary" />
          </motion.div>

          {/* Title & Subtitle */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              {isRTL ? 'مرحباً بك في وينوڤا!' : 'Welcome to WINOVA!'}
            </h1>
            <p className="text-muted-foreground">
              {isRTL 
                ? 'رحلتك تبدأ بالمسابقة الأولى. انضم الآن واربح!'
                : 'Your journey starts with your first contest. Join now and win!'
              }
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid gap-3 pt-4">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <Card className="border-border/50">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className={`text-${isRTL ? 'right' : 'left'}`}>
                      <p className="font-semibold text-foreground">
                        {isRTL ? feature.titleAr : feature.titleEn}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isRTL ? feature.descAr : feature.descEn}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Primary CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="pt-6"
          >
            <Button 
              size="lg" 
              className="w-full h-14 text-lg font-semibold"
              onClick={handleJoinContest}
            >
              <Trophy className="h-5 w-5 me-2" />
              {isRTL ? 'انضم لأول مسابقة' : 'Join Your First Contest'}
            </Button>
            
            <p className="text-xs text-muted-foreground mt-3">
              {isRTL 
                ? 'بعد انضمامك للمسابقة، ستفتح لك جميع الميزات'
                : 'All features unlock after you join your first contest'
              }
            </p>
          </motion.div>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
