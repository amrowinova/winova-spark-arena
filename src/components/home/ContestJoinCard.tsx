import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Clock, Users, ArrowRight, Gift } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CountdownTimer } from '@/components/common/CountdownTimer';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { getPricing } from '@/contexts/TransactionContext';
import { Link } from 'react-router-dom';

interface ContestJoinCardProps {
  prizePool: number;
  participants: number;
  stage: 'stage1' | 'final';
  closesAt: Date;
  endsAt: Date;
  entryFee: number;
  hasJoined: boolean;
  userRank?: number;
  onJoin: () => void;
}

export function ContestJoinCard({
  prizePool,
  participants,
  stage,
  closesAt,
  endsAt,
  entryFee,
  hasJoined,
  userRank,
  onJoin,
}: ContestJoinCardProps) {
  const { language } = useLanguage();
  const { user } = useUser();
  const pricing = getPricing(user.country);
  
  // Calculate total balance in Nova equivalent (1 Nova = 2 Aura)
  const totalNovaEquivalent = user.novaBalance + (user.auraBalance / 2);
  
  const [joinWindowMessage, setJoinWindowMessage] = useState('');
  const [canJoin, setCanJoin] = useState(true);

  // Dynamic join window messaging
  useEffect(() => {
    const updateJoinWindow = () => {
      const now = new Date();
      const diff = closesAt.getTime() - now.getTime();
      const minutesLeft = Math.max(0, Math.floor(diff / 60000));
      
      if (diff <= 0) {
        setCanJoin(false);
        setJoinWindowMessage(language === 'ar' ? 'باب الانضمام مغلق' : 'Joining closed');
      } else if (minutesLeft <= 30) {
        setCanJoin(true);
        setJoinWindowMessage(language === 'ar' ? 'باب الانضمام يغلق قريبًا' : 'Joining closes soon');
      } else if (minutesLeft <= 60) {
        setCanJoin(true);
        setJoinWindowMessage(language === 'ar' ? 'باب الانضمام يغلق خلال 30 دقيقة' : 'Joining closes in 30 minutes');
      } else {
        setCanJoin(true);
        setJoinWindowMessage(language === 'ar' ? 'باب الانضمام يغلق خلال 60 دقيقة' : 'Joining closes in 60 minutes');
      }
    };

    updateJoinWindow();
    const interval = setInterval(updateJoinWindow, 1000);
    return () => clearInterval(interval);
  }, [closesAt, language]);

  // Stage label and goal
  const stageLabel = stage === 'stage1' 
    ? (language === 'ar' ? 'المرحلة الأولى' : 'Stage 1')
    : (language === 'ar' ? 'المرحلة النهائية' : 'Final Stage');
  
  const stageGoal = stage === 'stage1'
    ? (language === 'ar' ? 'التأهل إلى Top 50' : 'Qualify for Top 50')
    : (language === 'ar' ? 'التنافس على Top 5' : 'Compete for Top 5');

  return (
    <Card className="overflow-hidden border-0 shadow-xl">
      {/* Gradient Header */}
      <div className="bg-gradient-primary p-4 relative overflow-hidden">
        {/* Animated background pulse */}
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute inset-0 bg-white/10"
        />
        
        <div className="relative z-10">
          {/* Stage Status */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary-foreground" />
              <div className="flex flex-col">
                <span className="text-primary-foreground font-bold">
                  {stageLabel}
                </span>
                <span className="text-primary-foreground/70 text-xs">
                  {stageGoal}
                </span>
              </div>
            </div>
            <span className="px-2 py-1 bg-white/20 rounded-full text-primary-foreground text-xs font-medium">
              {language === 'ar' ? 'المسابقة اليومية' : 'Daily Contest'}
            </span>
          </div>

          {/* Prize Pool */}
          <div className="text-center mb-3">
            <p className="text-primary-foreground/70 text-xs">
              {language === 'ar' ? 'مجموع الجوائز' : 'Prize Pool'}
            </p>
            <motion.p 
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-primary-foreground text-3xl font-bold"
            >
              И {prizePool} Nova
            </motion.p>
            <p className="text-primary-foreground/60 text-xs">
              ≈ {pricing.symbol} {(prizePool * pricing.novaRate).toFixed(0)}
            </p>
          </div>

          {/* Participants Count */}
          <div className="flex justify-center text-primary-foreground/80 text-xs">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{participants} {language === 'ar' ? 'مشترك' : 'participants'}</span>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Countdown Timer */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 text-sm">
            <Clock className="h-4 w-4 text-warning" />
            <span className="text-muted-foreground">
              {language === 'ar' ? 'تنتهي بعد:' : 'Ends in:'}
            </span>
          </div>
          <CountdownTimer targetDate={endsAt} size="sm" showLabels />
        </div>

        {/* User Rank (only if joined) */}
        {hasJoined && userRank && (
          <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              {stage === 'final' 
                ? (language === 'ar' ? 'ترتيبك اليوم (نهائي):' : 'Your Rank Today (Final):')
                : (language === 'ar' ? 'ترتيبك اليوم:' : 'Your Rank Today:')}
            </p>
            <p className="text-2xl font-bold text-primary">#{userRank}</p>
          </div>
        )}

        {/* Free Vote Message (Stage 1 only) */}
        {stage === 'stage1' && (
          <div className="mb-4 p-2 bg-success/10 border border-success/20 rounded-lg">
            <p className="text-xs text-success flex items-center justify-center gap-1">
              <Gift className="h-3 w-3" />
              {language === 'ar' 
                ? '🎁 صوت مجاني واحد يظهر عشوائيًا خلال المرحلة الأولى'
                : '🎁 One free vote appears randomly during Stage 1'}
            </p>
          </div>
        )}

        {/* Join Status */}
        {!hasJoined ? (
          <>
            {canJoin ? (
              <>
                <motion.div
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="p-2 bg-warning/10 rounded-lg mb-3 text-center"
                >
                  <p className="text-xs text-warning">
                    {joinWindowMessage}
                  </p>
                </motion.div>

                <Button 
                  className="w-full bg-gradient-primary text-primary-foreground font-bold"
                  onClick={onJoin}
                  disabled={totalNovaEquivalent < entryFee}
                >
                  {language === 'ar' ? 'انضم الآن' : 'Join Now'}
                  <ArrowRight className="h-4 w-4 ms-2" />
                </Button>

                <p className="text-center text-xs text-muted-foreground mt-2">
                  {language === 'ar' 
                    ? `رسوم الدخول: И ${entryFee} Nova`
                    : `Entry Fee: И ${entryFee} Nova`
                  }
                </p>
                <p className="text-center text-[10px] text-muted-foreground mt-1">
                  {language === 'ar' 
                    ? 'يمكن الدخول باستخدام Nova أو Aura بقيمة تعادل 10 Nova'
                    : 'Pay with Nova or Aura (1 Nova = 2 Aura)'}
                </p>
              </>
            ) : (
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  {joinWindowMessage}
                </p>
              </div>
            )}
          </>
        ) : (
          <Button asChild className="w-full" variant="outline">
            <Link to="/contests">
              {language === 'ar' ? 'شاهد المسابقة' : 'View Contest'}
              <ArrowRight className="h-4 w-4 ms-2" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
