import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Clock, Users, Zap, ArrowRight, AlertCircle } from 'lucide-react';
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
  activeInContest: number;
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
  activeInContest,
  onJoin,
}: ContestJoinCardProps) {
  const { language } = useLanguage();
  const { user } = useUser();
  const pricing = getPricing(user.country);
  
  const [minutesLeft, setMinutesLeft] = useState(0);
  const [canJoin, setCanJoin] = useState(true);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const diff = closesAt.getTime() - now.getTime();
      const mins = Math.max(0, Math.floor(diff / 60000));
      setMinutesLeft(mins);
      setCanJoin(diff > 0);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [closesAt]);

  const stageLabel = stage === 'stage1' 
    ? (language === 'ar' ? 'المرحلة الأولى' : 'Stage 1')
    : (language === 'ar' ? 'المرحلة النهائية' : 'Final Stage');

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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary-foreground" />
              <span className="text-primary-foreground font-bold">
                {language === 'ar' ? 'المسابقة اليومية' : 'Daily Contest'}
              </span>
            </div>
            <span className="px-2 py-1 bg-white/20 rounded-full text-primary-foreground text-xs font-medium">
              {stageLabel}
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
              {prizePool} ✦
            </motion.p>
            <p className="text-primary-foreground/60 text-xs">
              ≈ {pricing.symbol} {(prizePool * pricing.novaRate).toFixed(0)}
            </p>
          </div>

          {/* Stats Row */}
          <div className="flex justify-center gap-6 text-primary-foreground/80 text-xs">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{participants} {language === 'ar' ? 'مشترك' : 'joined'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span>{activeInContest}+ {language === 'ar' ? 'نشط الآن' : 'active'}</span>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Countdown */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 text-sm">
            <Clock className="h-4 w-4 text-warning" />
            <span className="text-muted-foreground">
              {language === 'ar' ? 'تنتهي المرحلة خلال' : 'Stage ends in'}
            </span>
          </div>
          <CountdownTimer targetDate={endsAt} size="sm" showLabels />
        </div>

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
                  <p className="text-xs text-warning flex items-center justify-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {language === 'ar' 
                      ? `باب الانضمام يغلق بعد ${minutesLeft} دقيقة!`
                      : `Joining closes in ${minutesLeft} minutes!`
                    }
                  </p>
                </motion.div>

                <Button 
                  className="w-full bg-gradient-primary text-primary-foreground font-bold"
                  onClick={onJoin}
                >
                  {language === 'ar' 
                    ? `انضم الآن (${minutesLeft} دقيقة متبقية)`
                    : `Join Now (${minutesLeft} min left)`
                  }
                  <ArrowRight className="h-4 w-4 ms-2" />
                </Button>

                <p className="text-center text-xs text-muted-foreground mt-2">
                  {language === 'ar' ? 'رسوم الدخول:' : 'Entry:'} {entryFee} ◈ Aura
                </p>
              </>
            ) : (
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'انتهى وقت الانضمام' : 'Joining period ended'}
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
