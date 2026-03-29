import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Clock, Timer, Calendar, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface ContestTimerProps {
  startTime: Date;
  endTime: Date;
  currentPhase: 'waiting' | 'stage1' | 'stage2' | 'final' | 'ended';
  participantsCount: number;
  maxParticipants: number;
  onJoin: () => void;
  canJoin: boolean;
  entryFee: number;
  prizePool: number;
}

export function ContestTimer({
  startTime,
  endTime,
  currentPhase,
  participantsCount,
  maxParticipants,
  onJoin,
  canJoin,
  entryFee,
  prizePool
}: ContestTimerProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isRTL = language === 'ar' || language === 'ur' || language === 'fa';

  const [timeRemaining, setTimeRemaining] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const end = new Date(endTime);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  const formatTime = (time: { days: number; hours: number; minutes: number; seconds: number }) => {
    const parts = [];
    
    if (time.days > 0) {
      parts.push(`${time.days}${isRTL ? 'يوم' : 'd'}`);
    }
    
    if (time.hours > 0 || time.days > 0) {
      parts.push(`${time.hours.toString().padStart(2, '0')}:${time.minutes.toString().padStart(2, '0')}`);
    } else if (time.minutes > 0) {
      parts.push(`${time.minutes}:${time.seconds.toString().padStart(2, '0')}`);
    } else {
      parts.push(`${time.seconds.toString().padStart(2, '0')}s`);
    }

    return isRTL ? parts.join(' ') : parts.join(' : ');
  };

  const getPhaseLabel = (phase: string) => {
    const labels = {
      waiting: isRTL ? 'في انتظار البداية' : 'Waiting to start',
      stage1: isRTL ? 'المرحلة الأولى' : 'Stage 1',
      stage2: isRTL ? 'المرحلة الثانية' : 'Stage 2',
      final: isRTL ? 'المرحلة النهائية' : 'Final Stage',
      ended: isRTL ? 'انتهت' : 'Ended'
    };
    return labels[phase as keyof typeof labels] || phase;
  };

  const getPhaseColor = (phase: string) => {
    const colors = {
      waiting: 'bg-gray-500',
      stage1: 'bg-blue-500',
      stage2: 'bg-orange-500',
      final: 'bg-red-500',
      ended: 'bg-green-500'
    };
    return colors[phase as keyof typeof colors] || 'bg-gray-500';
  };

  const progressPercentage = maxParticipants > 0 ? (participantsCount / maxParticipants) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Timer Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto"
      >
        <Card className="text-center">
          <CardContent className="p-6 space-y-4">
            {/* Phase Badge */}
            <div className="flex justify-center mb-4">
              <Badge 
                variant="secondary" 
                className={cn(
                  "px-4 py-2 text-sm font-medium",
                  getPhaseColor(currentPhase)
                )}
              >
                {getPhaseLabel(currentPhase)}
              </Badge>
            </div>

            {/* Time Remaining */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Timer className="h-4 w-4" />
                <span>{isRTL ? 'الوقت المتبقي' : 'Time Remaining'}</span>
              </div>
              
              <div className="text-2xl font-bold font-mono">
                {formatTime(timeRemaining)}
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                <span>{isRTL ? 'المشاركون' : 'Participants'}</span>
                <span>{participantsCount} / {maxParticipants}</span>
              </div>
              
              <Progress 
                value={progressPercentage} 
                className="h-2"
              />
            </div>

            {/* Prize Pool */}
            <div className="pt-2 border-t">
              <div className="text-sm text-muted-foreground mb-1">
                {isRTL ? 'الجائزة الكلية' : 'Total Prize Pool'}
              </div>
              <div className="text-xl font-bold text-primary">
                {prizePool.toLocaleString()} Nova
              </div>
            </div>

            {/* Action Button */}
            {canJoin && currentPhase === 'waiting' && (
              <Button
                onClick={onJoin}
                className="w-full mt-4"
                size="lg"
              >
                {isRTL ? 'انضم للمسابقة' : 'Join Contest'}
                {entryFee > 0 && (
                  <span className="ml-2 text-sm">
                    ({entryFee} Nova)
                  </span>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Contest Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <h3 className="font-semibold mb-1">
                {isRTL ? 'وقت البدء' : 'Start Time'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {startTime.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <h3 className="font-semibold mb-1">
                {isRTL ? 'وقت النهاية' : 'End Time'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {endTime.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <h3 className="font-semibold mb-1">
                {isRTL ? 'المشاركون' : 'Participants'}
              </h3>
              <div className="space-y-1">
                <div className="text-2xl font-bold">
                  {participantsCount}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isRTL ? 'من أقصى' : 'of'} {maxParticipants} {isRTL ? 'مشارك' : 'participants'}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
