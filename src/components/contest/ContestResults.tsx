import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Trophy, Medal, Users, Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface Winner {
  id: string;
  name: string;
  username: string;
  rank: number;
  prize: number;
  votes: number;
  country: string;
  avatar: string;
}

interface ContestResultsProps {
  winners: Winner[];
  totalParticipants: number;
  totalPrizePool: number;
  contestEnded: boolean;
  onShareResults: () => void;
}

export function ContestResults({
  winners,
  totalParticipants,
  totalPrizePool,
  contestEnded,
  onShareResults
}: ContestResultsProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isRTL = language === 'ar' || language === 'ur' || language === 'fa';

  const formatPrize = (amount: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getPrizeDistribution = (rank: number) => {
    const percentages = [50, 20, 15, 10, 5];
    return percentages[rank - 1] || 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <Trophy className="h-8 w-8 text-yellow-500" />
          <h2 className="text-2xl font-bold">
            {isRTL ? 'نتائج المسابقة' : 'Contest Results'}
          </h2>
        </div>
        
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{totalParticipants} {isRTL ? 'مشارك' : 'participants'}</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span>{formatPrize(totalPrizePool)} Nova</span>
          </div>
        </div>
      </motion.div>

      {/* Winners Podium */}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-end justify-center gap-4 mb-8">
          {winners.slice(0, 3).map((winner, index) => (
            <motion.div
              key={winner.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
              className={cn(
                "flex flex-col items-center",
                index === 0 ? "order-1" : index === 1 ? "order-2" : "order-3"
              )}
            >
              {/* Rank Badge */}
              <div className={cn(
                "flex items-center justify-center w-12 h-12 rounded-full mb-2",
                index === 0 ? "bg-yellow-500" : index === 1 ? "bg-gray-400" : "bg-orange-600"
              )}>
                <span className="text-white font-bold text-lg">
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                </span>
              </div>

              {/* Winner Info */}
              <Card className="w-48 text-center">
                <CardContent className="p-4">
                  <Avatar className="w-16 h-16 mx-auto mb-3">
                    <AvatarImage src={winner.avatar} alt={winner.name} />
                    <AvatarFallback>{winner.avatar}</AvatarFallback>
                  </Avatar>
                  
                  <h3 className="font-semibold text-lg mb-1">{winner.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">@{winner.username}</p>
                  
                  <div className="space-y-1">
                    <Badge variant="secondary" className="text-xs">
                      #{winner.rank} {isRTL ? 'مركز' : 'place'}
                    </Badge>
                    
                    <div className="flex items-center justify-center gap-1 text-sm">
                      <Medal className="h-3 w-3 text-yellow-500" />
                      <span className="font-medium">
                        {getPrizeDistribution(winner.rank)}% • {formatPrize(winner.prize)} Nova
                      </span>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {winner.votes} {isRTL ? 'صوت' : 'votes'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Other Winners */}
      {winners.length > 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="space-y-3"
        >
          <h3 className="text-center font-semibold text-lg mb-4">
            {isRTL ? 'باقي الفائزين' : 'Other Winners'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {winners.slice(3).map((winner, index) => (
              <motion.div
                key={winner.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <Card>
                  <CardContent className="p-4 text-center">
                    <Avatar className="w-12 h-12 mx-auto mb-2">
                      <AvatarImage src={winner.avatar} alt={winner.name} />
                      <AvatarFallback>{winner.avatar}</AvatarFallback>
                    </Avatar>
                    
                    <h4 className="font-medium text-sm mb-1">{winner.name}</h4>
                    <p className="text-xs text-muted-foreground mb-2">@{winner.username}</p>
                    
                    <div className="flex items-center justify-between text-xs">
                      <Badge variant="outline" className="text-xs">
                        #{winner.rank}
                      </Badge>
                      <span className="font-medium">
                        {formatPrize(winner.prize)} Nova
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center gap-3 mt-8">
        <Button
          variant="outline"
          onClick={onShareResults}
          className="flex items-center gap-2"
        >
          <Calendar className="h-4 w-4" />
          {isRTL ? 'مشاركة النتائج' : 'Share Results'}
        </Button>
        
        {contestEnded && (
          <Button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2"
          >
            <Trophy className="h-4 w-4" />
            {isRTL ? 'مسابقة جديدة' : 'New Contest'}
          </Button>
        )}
      </div>
    </div>
  );
}
