import { motion } from 'framer-motion';
import { TrendingUp, Check, Trophy, Flame, Rocket, Target, Gift } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';

type ContestStage = 'qualifying' | 'final';

interface ContestUserStatusCardProps {
  userRank: number;
  userVotes: number;
  stage: ContestStage;
  prizePool: number;
  // Stage 1 props
  votesNeededForTop50?: number;
  // Final stage props
  votesNeededForTop5?: number;
  // Shared prop for rank 1
  votesNeededForRank1?: number;
  hasJoined: boolean;
}

// Prize distribution percentages
const PRIZE_PERCENTAGES: Record<number, number> = {
  1: 50,
  2: 20,
  3: 15,
  4: 10,
  5: 5,
};

export function ContestUserStatusCard({ 
  userRank, 
  userVotes, 
  stage,
  prizePool,
  votesNeededForTop50 = 0,
  votesNeededForTop5 = 0,
  votesNeededForRank1 = 0,
  hasJoined 
}: ContestUserStatusCardProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  if (!hasJoined) return null;
  
  // Determine qualification status based on stage
  const isQualifiedStage1 = userRank <= 50;
  const isQualifiedFinal = userRank <= 5;
  const isInTop5 = userRank <= 5;
  
  // Calculate remaining votes based on stage
  const votesRemainingForTop50 = Math.max(0, votesNeededForTop50 - userVotes);
  const votesRemainingForTop5 = Math.max(0, votesNeededForTop5 - userVotes);
  const votesRemainingForRank1 = Math.max(0, votesNeededForRank1 - userVotes);
  
  // Calculate prize for current rank
  const getPrizeForRank = (rank: number): number => {
    const percentage = PRIZE_PERCENTAGES[rank];
    return percentage ? Math.round(prizePool * percentage / 100) : 0;
  };

  // Progress calculation
  const getProgress = () => {
    if (stage === 'qualifying') {
      if (isQualifiedStage1) {
        return votesNeededForRank1 > 0 ? Math.min(100, (userVotes / votesNeededForRank1) * 100) : 100;
      }
      return votesNeededForTop50 > 0 ? Math.min(100, (userVotes / votesNeededForTop50) * 100) : 0;
    } else {
      if (isQualifiedFinal) {
        return votesNeededForRank1 > 0 ? Math.min(100, (userVotes / votesNeededForRank1) * 100) : 100;
      }
      return votesNeededForTop5 > 0 ? Math.min(100, (userVotes / votesNeededForTop5) * 100) : 0;
    }
  };

  // Determine card styling based on qualification status
  const getCardStyle = () => {
    if (stage === 'qualifying') {
      return isQualifiedStage1 ? 'border-success glow-success' : 'border-warning';
    } else {
      return isQualifiedFinal ? 'border-primary glow-primary' : 'border-warning';
    }
  };

  // Get stage name
  const getStageName = () => {
    if (stage === 'qualifying') {
      return isRTL ? 'المرحلة الأولى' : 'Stage 1';
    }
    return isRTL ? 'المرحلة النهائية' : 'Final Stage';
  };

  // Get prize emoji based on rank
  const getPrizeEmoji = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🎯';
    }
  };

  // Get prize message based on rank
  const getPrizeMessage = (rank: number): string => {
    const prize = getPrizeForRank(rank);
    const emoji = getPrizeEmoji(rank);
    
    if (isRTL) {
      switch (rank) {
        case 1:
          return `${emoji} إذا حافظت على المركز الأول ستحصل على И ${prize} Nova`;
        case 2:
          return `${emoji} إذا حافظت على المركز الثاني ستحصل على И ${prize} Nova`;
        case 3:
          return `${emoji} جائزة المركز الثالث И ${prize} Nova`;
        case 4:
          return `${emoji} جائزة المركز الرابع И ${prize} Nova`;
        case 5:
          return `${emoji} جائزة المركز الخامس И ${prize} Nova`;
        default:
          return '';
      }
    } else {
      switch (rank) {
        case 1:
          return `${emoji} Keep 1st place to win И ${prize} Nova`;
        case 2:
          return `${emoji} Keep 2nd place to win И ${prize} Nova`;
        case 3:
          return `${emoji} 3rd place prize: И ${prize} Nova`;
        case 4:
          return `${emoji} 4th place prize: И ${prize} Nova`;
        case 5:
          return `${emoji} 5th place prize: И ${prize} Nova`;
        default:
          return '';
      }
    }
  };

  // Render content based on stage and qualification
  const renderStatusContent = () => {
    if (stage === 'qualifying') {
      // Stage 1 - Top 50
      if (isQualifiedStage1) {
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-success text-sm font-medium">
              <Check className="h-4 w-4" />
              {isRTL ? 'أنت ضمن المتأهلين للمرحلة النهائية 🎉' : 'You qualified for Final Stage 🎉'}
            </div>
          </div>
        );
      } else {
        return (
          <div className="space-y-2">
            <p className="text-sm font-medium text-warning">
              {isRTL ? 'لم تتأهل بعد للمرحلة النهائية' : 'Not yet qualified for Final Stage'}
            </p>
            <Progress value={getProgress()} className="h-1.5" />
            <p className="text-xs text-warning flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {isRTL 
                ? `متبقّي لك ${votesRemainingForTop50} صوت للدخول ضمن أعلى 50 متأهل`
                : `${votesRemainingForTop50} votes to enter Top 50`
              }
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Rocket className="h-3 w-3" />
              {isRTL ? 'شدّ الهمة وقرّب من التأهل 💪' : 'Push harder to qualify 💪'}
            </p>
          </div>
        );
      }
    } else {
      // Final Stage - Top 5
      if (isQualifiedFinal) {
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-primary text-sm font-medium">
              <Trophy className="h-4 w-4" />
              {isRTL ? 'أنت ضمن المرشحين للفوز 🏆' : 'You\'re a winning candidate 🏆'}
            </div>
          </div>
        );
      } else {
        return (
          <div className="space-y-2">
            <p className="text-sm font-medium text-warning">
              {isRTL ? 'لم تدخل بعد ضمن المراكز الخمسة الأولى' : 'Not yet in Top 5'}
            </p>
          </div>
        );
      }
    }
  };

  // Render prize section - only for Top 5
  const renderPrizeSection = () => {
    if (isInTop5) {
      // User is in Top 5 - show their prize
      return (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-2.5 rounded-lg bg-gradient-to-r from-nova/10 to-nova/5 border border-nova/20"
        >
          <p className="text-sm font-semibold text-nova text-center">
            {getPrizeMessage(userRank)}
          </p>
        </motion.div>
      );
    } else {
      // User is outside Top 5 - show motivational message
      return (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-2.5 rounded-lg bg-warning/5 border border-warning/20"
        >
          <p className="text-xs font-medium text-warning text-center flex items-center justify-center gap-1.5">
            <Gift className="h-3.5 w-3.5" />
            {isRTL 
              ? `🔥 متبقّي لك ${votesRemainingForTop5} صوت للدخول ضمن Top 5 والفوز بجائزة`
              : `🔥 ${votesRemainingForTop5} votes to enter Top 5 and win a prize`
            }
          </p>
        </motion.div>
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Card className={`overflow-hidden ${getCardStyle()}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Rank Circle */}
            <motion.div 
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`w-16 h-16 rounded-full flex flex-col items-center justify-center shrink-0 ${
                stage === 'final' && isQualifiedFinal
                  ? 'bg-primary/10 text-primary border-2 border-primary'
                  : stage === 'qualifying' && isQualifiedStage1
                    ? 'bg-success/10 text-success border-2 border-success'
                    : 'bg-warning/10 text-warning border-2 border-warning'
              }`}
            >
              <span className="text-2xl font-bold">#{userRank}</span>
            </motion.div>
            
            {/* Info Section */}
            <div className="flex-1 min-w-0">
              {/* Header Row */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm">
                    {isRTL ? 'ترتيبك الحالي' : 'Your Current Rank'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {userVotes} {isRTL ? 'صوت' : 'votes'}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  stage === 'final' 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {getStageName()}
                </span>
              </div>
              
              {/* Dynamic Status Content */}
              {renderStatusContent()}
            </div>
          </div>
          
          {/* Prize Section - Below the main card content */}
          {renderPrizeSection()}
        </CardContent>
      </Card>
    </motion.div>
  );
}
