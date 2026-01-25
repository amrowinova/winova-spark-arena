import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Trophy, Users, ArrowRight, Sparkles, TrendingUp, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { CurrencyBadge } from '@/components/common/CurrencyBadge';
import { RankBadge } from '@/components/common/RankBadge';
import { CountdownTimer } from '@/components/common/CountdownTimer';
import { ProgressRing } from '@/components/common/ProgressRing';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPricing } from '@/contexts/TransactionContext';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Mock spotlight winners
const spotlightWinners = [
  { id: 1, name: 'سارة أحمد', prize: 18.5, avatar: '👩' },
  { id: 2, name: 'محمد كريم', prize: 9.75, avatar: '👨' },
];

export default function HomePage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useUser();
  
  // Next contest in 2 hours
  const nextContest = new Date(Date.now() + 2 * 60 * 60 * 1000);
  
  // Get local currency info - single price per country
  const pricing = getPricing(user.country);
  const novaLocalValue = user.novaBalance * pricing.novaRate;
  const auraLocalValue = user.auraBalance * pricing.auraRate;

  // Calculate personal activity percentage
  const personalActivityPercent = Math.round((user.activeWeeks / user.currentWeek) * 100);

  return (
    <AppLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-4 py-4 space-y-5"
      >
        {/* Welcome & Balance Section */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="bg-gradient-dark p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-secondary-foreground/70 text-sm">
                    {t('home.welcome')}
                  </p>
                  <h1 className="text-secondary-foreground text-xl font-bold">
                    {user.name}
                  </h1>
                </div>
                <RankBadge rank={user.rank} size="sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Nova Balance */}
                <div className="bg-gradient-nova/20 backdrop-blur rounded-xl p-4 border border-nova/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-nova text-lg">✦</span>
                    <span className="text-secondary-foreground/70 text-xs">
                      Nova
                    </span>
                  </div>
                  <p className="text-secondary-foreground text-2xl font-bold">
                    {user.novaBalance.toFixed(3)}
                  </p>
                  <p className="text-secondary-foreground/60 text-xs mt-1">
                    ≈ {pricing.symbol} {novaLocalValue.toFixed(2)}
                  </p>
                </div>

                {/* Aura Balance */}
                <div className="bg-gradient-aura/20 backdrop-blur rounded-xl p-4 border border-aura/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-aura text-lg">◈</span>
                    <span className="text-secondary-foreground/70 text-xs">
                      Aura
                    </span>
                  </div>
                  <p className="text-secondary-foreground text-2xl font-bold">
                    {user.auraBalance.toFixed(3)}
                  </p>
                  <p className="text-secondary-foreground/60 text-xs mt-1">
                    ≈ {pricing.symbol} {auraLocalValue.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Quick Stats */}
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{user.teamSize}</p>
            <p className="text-[10px] text-muted-foreground">{t('home.teamSize')}</p>
          </Card>
          
          <Card className="p-3 text-center">
            <ProgressRing progress={personalActivityPercent} size={40} strokeWidth={4}>
              <span className="text-xs font-bold">{personalActivityPercent}%</span>
            </ProgressRing>
            <p className="text-[10px] text-muted-foreground mt-1">{t('home.weeklyActivity')}</p>
          </Card>
          
          <Card className="p-3 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-success" />
            <p className="text-lg font-bold">{user.spotlightPoints}</p>
            <p className="text-[10px] text-muted-foreground">{t('spotlight.yourPoints')}</p>
          </Card>
        </motion.div>

        {/* Contest Countdown */}
        <motion.div variants={itemVariants}>
          <Card className="p-5 glow-primary">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">{t('home.contestCountdown')}</h2>
              </div>
              <span className="text-xs text-muted-foreground pulse-glow px-2 py-1 rounded-full bg-primary/10">
                LIVE
              </span>
            </div>
            
            <CountdownTimer 
              targetDate={nextContest} 
              size="md" 
              showLabels 
              className="mb-4"
            />
            
            <Button asChild className="w-full bg-gradient-primary hover:opacity-90">
              <Link to="/contests">
                {t('home.joinContest')}
                <ArrowRight className="h-4 w-4 ms-2" />
              </Link>
            </Button>
          </Card>
        </motion.div>

        {/* Spotlight Winners */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-nova" />
              <h2 className="font-semibold">{t('home.spotlight')}</h2>
            </div>
            <Link 
              to="/spotlight" 
              className="text-xs text-primary flex items-center gap-1"
            >
              {t('home.viewAll')}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-3">
                {t('home.todayWinners')}
              </p>
              <div className="space-y-3">
                {spotlightWinners.map((winner, index) => (
                  <motion.div
                    key={winner.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-nova flex items-center justify-center text-lg">
                        {winner.avatar}
                      </div>
                      <div>
                        <p className="font-medium">{winner.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {language === 'ar' 
                            ? (index === 0 ? 'الفائز الأول' : 'الفائز الثاني')
                            : t(`spotlight.winner${index + 1}`)
                          }
                        </p>
                      </div>
                    </div>
                    <CurrencyBadge type="nova" amount={winner.prize} size="sm" />
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
          <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
            <Link to="/p2p">
              <span className="text-2xl">🤝</span>
              <span>{t('nav.p2p')}</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
            <Link to="/wallet">
              <Wallet className="h-6 w-6 text-primary" />
              <span>{t('nav.wallet')}</span>
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}
