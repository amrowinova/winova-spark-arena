import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Sparkles, Trophy, Users, TrendingUp, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { CurrencyBadge } from '@/components/common/CurrencyBadge';
import { CountdownTimer } from '@/components/common/CountdownTimer';
import { ProgressRing } from '@/components/common/ProgressRing';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useUser } from '@/contexts/UserContext';

// Mock spotlight data
const spotlightData = {
  dailyPool: 46.8, // 0.3 Nova × 156 participants
  weeklyPool: 327.6,
  cyclePool: 2520,
  winners: {
    daily: [
      { id: 1, name: 'Fatima S.', points: 890, prize: 30.42 },
      { id: 2, name: 'Omar A.', points: 745, prize: 16.38 },
    ],
    weekly: [
      { id: 1, name: 'Khalid M.', points: 4520, prize: 213.44 },
      { id: 2, name: 'Sara A.', points: 4120, prize: 114.16 },
    ],
  },
  leaderboard: [
    { id: 1, name: 'Khalid M.', points: 8950, avatar: '👨', rank: 1 },
    { id: 2, name: 'Sara A.', points: 8720, avatar: '👩', rank: 2 },
    { id: 3, name: 'Fatima S.', points: 8340, avatar: '👩', rank: 3 },
    { id: 4, name: 'Omar A.', points: 7890, avatar: '👨', rank: 4 },
    { id: 5, name: 'Ahmed K.', points: 7650, avatar: '👨', rank: 5 },
    { id: 6, name: 'You', points: 1250, avatar: '🌟', rank: 47, isUser: true },
  ],
  nextDraw: new Date(Date.now() + 12 * 60 * 60 * 1000),
};

export default function SpotlightPage() {
  const { t } = useTranslation();
  const { user } = useUser();

  return (
    <AppLayout title={t('spotlight.luckyPointsTitle')}>
      <div className="px-4 py-4 space-y-5">
        {/* Explanation Text */}
        <p className="text-sm text-muted-foreground text-center">
          {t('spotlight.luckyPointsDescription')}
        </p>

        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="bg-gradient-nova p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-6 w-6 text-nova-foreground" />
                <h1 className="text-nova-foreground text-lg font-bold">
                  {t('spotlight.luckyPointsTitle')}
                </h1>
              </div>

              {/* Your Points */}
              <div className="text-center mb-4">
                <p className="text-nova-foreground/70 text-sm mb-1">
                  {t('spotlight.yourPoints')}
                </p>
                <p className="text-nova-foreground text-4xl font-bold">
                  {user.spotlightPoints.toLocaleString()}
                </p>
              </div>

              {/* Pool Stats */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-card/20 rounded-lg p-2">
                  <p className="text-nova-foreground text-lg font-bold">
                    {spotlightData.dailyPool.toFixed(1)}
                  </p>
                  <p className="text-nova-foreground/60 text-[10px]">
                    {t('spotlight.dailyPool')}
                  </p>
                </div>
                <div className="bg-card/20 rounded-lg p-2">
                  <p className="text-nova-foreground text-lg font-bold">
                    {spotlightData.weeklyPool.toFixed(1)}
                  </p>
                  <p className="text-nova-foreground/60 text-[10px]">
                    {t('spotlight.weeklyPool')}
                  </p>
                </div>
                <div className="bg-card/20 rounded-lg p-2">
                  <p className="text-nova-foreground text-lg font-bold">
                    {spotlightData.cyclePool}
                  </p>
                  <p className="text-nova-foreground/60 text-[10px]">
                    {t('spotlight.cyclePool')}
                  </p>
                </div>
              </div>
            </div>

            {/* Next Draw Countdown */}
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-2 text-center">
                Next draw in
              </p>
              <CountdownTimer targetDate={spotlightData.nextDraw} size="sm" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Today's Winners */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-nova" />
            {t('home.todayWinners')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {spotlightData.winners.daily.map((winner, index) => (
              <Card key={winner.id} className={index === 0 ? 'glow-nova' : ''}>
                <CardContent className="p-4 text-center">
                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center text-lg mb-2 ${
                    index === 0 ? 'bg-gradient-nova' : 'bg-muted'
                  }`}>
                    {index === 0 ? '🥇' : '🥈'}
                  </div>
                  <p className="font-medium">{winner.name}</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    {winner.points.toLocaleString()} pts
                  </p>
                  <CurrencyBadge type="nova" amount={winner.prize} size="sm" />
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Prize Distribution Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-4 bg-primary/5 border-primary/20">
            <h3 className="font-medium mb-3">How Spotlight Points Work</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Daily pool = 0.3 Nova × number of participants
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                1st winner: 65% | 2nd winner: 35%
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Points accumulate daily, weekly, and over the 14-week cycle
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Used for manager ranking & presidency race
              </li>
            </ul>
          </Card>
        </motion.div>

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t('spotlight.leaderboard')}
          </h2>
          <div className="space-y-2">
            {spotlightData.leaderboard.map((user, index) => (
              <Card 
                key={user.id}
                className={user.isUser ? 'border-primary glow-primary' : ''}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    user.rank <= 3 ? 'bg-gradient-nova text-nova-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {user.rank}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                    {user.avatar}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${user.isUser ? 'text-primary' : ''}`}>
                      {user.name}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="font-bold">{user.points.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
