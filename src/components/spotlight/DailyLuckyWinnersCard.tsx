import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Trophy, Star, Clock } from 'lucide-react';
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
  nextDrawTime: Date;
}

export function DailyLuckyWinnersCard({
  totalPool,
  winners,
  nextDrawTime,
}: DailyLuckyWinnersCardProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  const handleProfileClick = (userId: string) => {
    navigate(`/user/${userId}`);
  };

  return (
    <Card className="overflow-hidden">
      {/* Countdown Header */}
      <div className="bg-nova/10 p-4 border-b border-nova/20">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-nova" />
          <span className="text-sm text-muted-foreground">
            {isRTL ? 'متبقي للإعلان عن محظوظي اليوم' : 'Time until lucky winners announcement'}
          </span>
        </div>
        <CountdownTimer targetDate={nextDrawTime} size="sm" hideDays />
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-nova" />
            <span>{isRTL ? 'محظوظو اليوم' : "Today's Lucky Winners"}</span>
          </div>
          <div className="flex items-center gap-1 bg-nova/10 px-3 py-1 rounded-full">
            <span className="text-nova font-bold">И {totalPool.toFixed(0)}</span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {winners.map((winner, index) => (
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
        ))}
      </CardContent>
    </Card>
  );
}
