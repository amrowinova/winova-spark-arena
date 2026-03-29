import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Trophy, Users, Clock, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface Contest {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  entryFee: number;
  prizePool: number;
  participantsCount: number;
  maxParticipants: number;
  currentPhase: 'waiting' | 'stage1' | 'stage2' | 'final' | 'ended';
  isActive: boolean;
  image?: string;
}

interface ContestCardProps {
  contest: Contest;
  onJoin: (contestId: string) => void;
  onShare: (contestId: string) => void;
}

export function ContestCard({
  contest,
  onJoin,
  onShare
}: ContestCardProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isRTL = language === 'ar' || language === 'ur' || language === 'fa';

  const [imageError, setImageError] = useState(false);

  const formatPrize = (amount: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short'
    });
  };

  const getPhaseLabel = (phase: string) => {
    const labels = {
      waiting: isRTL ? 'قيد الانتظار' : 'Waiting',
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

  const progressPercentage = contest.maxParticipants > 0 
    ? (contest.participantsCount / contest.maxParticipants) * 100 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="h-full"
    >
      <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <CardContent className="p-0">
          {/* Contest Image */}
          <div className="relative h-32 bg-gradient-to-br from-primary/20 to-primary/10">
            {contest.image && !imageError ? (
              <img
                src={contest.image}
                alt={contest.title}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Trophy className="h-12 w-12 text-primary/40" />
              </div>
            )}
            
            {/* Status Badge */}
            <div className="absolute top-2 right-2">
              <Badge 
                variant={contest.isActive ? "default" : "secondary"}
                className={cn(
                  "text-xs font-medium",
                  contest.isActive ? "bg-primary text-primary-foreground" : getPhaseColor(contest.currentPhase)
                )}
              >
                {getPhaseLabel(contest.currentPhase)}
              </Badge>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Title */}
            <h3 className="font-bold text-lg mb-2 line-clamp-2">
              {contest.title}
            </h3>
            
            {/* Description */}
            <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
              {contest.description}
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">
                  {isRTL ? 'الجائزة' : 'Prize Pool'}
                </div>
                <div className="font-bold text-primary">
                  {formatPrize(contest.prizePool)} Nova
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">
                  {isRTL ? 'المشاركون' : 'Participants'}
                </div>
                <div className="font-bold">
                  {contest.participantsCount} / {contest.maxParticipants}
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{isRTL ? 'التقدم' : 'Progress'}</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500" 
                  style={{ width: `${Math.min(100, progressPercentage)}%` }} 
                />
              </div>
            </div>
            </div>

            {/* Time Info */}
            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Calendar className="h-3 w-3" />
                  <span>{isRTL ? 'البداية' : 'Start'}</span>
                </div>
                <div>{formatTime(contest.startTime)}</div>
              </div>
              
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Clock className="h-3 w-3" />
                  <span>{isRTL ? 'النهاية' : 'End'}</span>
                </div>
                <div>{formatTime(contest.endTime)}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {contest.isActive && contest.entryFee > 0 && (
                <Button
                  onClick={() => onJoin(contest.id)}
                  className="flex-1"
                  size="sm"
                >
                  {isRTL ? 'انضم' : 'Join'}
                  <span className="ml-2 text-xs">
                    ({contest.entryFee} Nova)
                  </span>
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onShare(contest.id)}
                className="flex items-center gap-1"
              >
                <TrendingUp className="h-3 w-3" />
                {isRTL ? 'مشاركة' : 'Share'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
