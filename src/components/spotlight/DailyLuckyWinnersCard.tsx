import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { CountdownTimer } from '@/components/common/CountdownTimer';
import { useNavigate } from 'react-router-dom';

interface DailyWinner {
  id: string;
  name: string;
  prize: number;
  percentage: number;
}

interface DailyLuckyWinnersCardProps {
  totalPool: number;
  winners: DailyWinner[];
  yesterdayWinners?: DailyWinner[];
  yesterdayPool?: number;
  nextDrawTime: Date;
}

export function DailyLuckyWinnersCard({
  totalPool,
  winners,
  yesterdayWinners,
  yesterdayPool,
  nextDrawTime,
}: DailyLuckyWinnersCardProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  // Check if announcement time has passed
  const [isAnnounced, setIsAnnounced] = useState(() => {
    return new Date() >= nextDrawTime;
  });

  useEffect(() => {
    const checkAnnouncement = () => {
      const now = new Date();
      if (now >= nextDrawTime && !isAnnounced) {
        setIsAnnounced(true);
      }
    };

    const interval = setInterval(checkAnnouncement, 1000);
    return () => clearInterval(interval);
  }, [nextDrawTime, isAnnounced]);

  const handleProfileClick = (userId: string) => {
    navigate(`/user/${userId}`);
  };

  // Determine which winners and pool to show
  const displayWinners = isAnnounced ? winners : (yesterdayWinners || winners);
  const displayPool = isAnnounced ? totalPool : (yesterdayPool || totalPool);

  // Calculate next draw time for after announcement
  const getNextDrawTime = () => {
    if (isAnnounced) {
      // After today's announcement, show countdown to tomorrow
      const tomorrow = new Date(nextDrawTime);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }
    return nextDrawTime;
  };

  const countdownTarget = getNextDrawTime();

  return (
    <Card className="overflow-hidden">
      {/* Countdown Header */}
      <div className="bg-nova/10 p-4 border-b border-nova/20">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-nova" />
          <span className="text-sm text-muted-foreground">
            {isRTL 
              ? (isAnnounced ? 'متبقي للإعلان عن محظوظي الغد' : 'متبقي للإعلان عن محظوظي اليوم')
              : (isAnnounced ? 'Time until tomorrow\'s announcement' : 'Time until today\'s announcement')
            }
          </span>
        </div>
        <CountdownTimer targetDate={countdownTarget} size="sm" hideDays />
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-nova" />
            <span>
              {isRTL 
                ? (isAnnounced ? 'محظوظو اليوم' : 'محظوظو الأمس')
                : (isAnnounced ? "Today's Lucky Winners" : "Yesterday's Lucky Winners")
              }
            </span>
          </div>
          <div className="flex items-center gap-1 bg-nova/10 px-3 py-1 rounded-full">
            <span className="text-nova font-bold">И {displayPool.toFixed(0)}</span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {displayWinners.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {isRTL 
                ? 'لم يتم الإعلان عن الفائزين بعد' 
                : 'No winners announced yet'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {isRTL 
                ? 'سيتم الإعلان عن الفائزين عند انتهاء السحب' 
                : 'Winners will be announced after the draw'}
            </p>
          </div>
        ) : (
          displayWinners.map((winner, index) => (
            <motion.div
              key={winner.id}
              initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                index === 0 
                  ? 'bg-gradient-to-r from-nova/20 to-nova/5 border border-nova/30' 
                  : 'bg-muted/50'
              }`}
            >
              {/* Medal */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                index === 0 ? 'bg-gradient-nova' : 'bg-muted'
              }`}>
                {index === 0 ? '🥇' : '🥈'}
              </div>

              {/* Winner Info */}
              <div className="flex-1">
                <p 
                  className="font-medium cursor-pointer hover:text-nova transition-colors"
                  onClick={() => handleProfileClick(winner.id)}
                >
                  {winner.name}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className={index === 0 ? 'text-nova font-bold' : ''}>
                    {winner.percentage}%
                  </span>
                </div>
              </div>

              {/* Prize */}
              <div className="text-end">
                <p className={`font-bold ${index === 0 ? 'text-nova text-lg' : ''}`}>
                  И {winner.prize.toFixed(0)}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
