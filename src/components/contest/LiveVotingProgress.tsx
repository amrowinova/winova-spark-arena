import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, BarChart3, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContestVoting } from '@/hooks/useContestVoting';

interface VoteProgress {
  contestantId: string;
  name: string;
  avatar?: string;
  country: string;
  votes: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  lastVotes: number;
}

export function LiveVotingProgress() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  const { votingData, isConnected } = useContestVoting();
  const [topContestants, setTopContestants] = useState<VoteProgress[]>([]);

  useEffect(() => {
    if (votingData?.contestants) {
      const sorted = votingData.contestants
        .sort((a, b) => b.votes - a.votes)
        .slice(0, 5)
        .map((contestant, index) => ({
          ...contestant,
          percentage: (contestant.votes / votingData.totalVotes) * 100,
          trend: contestant.trend || 'stable',
          lastVotes: contestant.lastVotes || 0,
        }));
      
      setTopContestants(sorted);
    }
  }, [votingData]);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down':
        return <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />;
      default:
        return <div className="h-3 w-3 bg-gray-300 rounded-full" />;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-500';
      case 2: return 'text-gray-400';
      case 3: return 'text-orange-600';
      default: return 'text-muted-foreground';
    }
  };

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${rank}.`;
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">
              {isRTL ? 'تقدم التصويت المباشر' : 'Live Voting Progress'}
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
              {isConnected ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                  {isRTL ? 'حي' : 'Live'}
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3 mr-1" />
                  {isRTL ? 'متوقف' : 'Paused'}
                </>
              )}
            </Badge>
            
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{votingData?.totalVotes || 0}</span>
            </div>
          </div>
        </div>

        {/* Top Contestants */}
        <div className="space-y-3">
          {topContestants.map((contestant, index) => (
            <motion.div
              key={contestant.contestantId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`font-bold text-lg ${getRankColor(index + 1)}`}>
                    {getRankEmoji(index + 1)}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {contestant.name}
                    </span>
                    {getTrendIcon(contestant.trend)}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-bold text-sm">
                    {contestant.votes.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {contestant.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="relative">
                <Progress 
                  value={contestant.percentage} 
                  className="h-2"
                />
                
                {/* Animated pulse for leader */}
                {index === 0 && isConnected && (
                  <motion.div
                    className="absolute top-0 left-0 h-2 bg-yellow-400/30 rounded-full"
                    animate={{ width: ['0%', '100%', '0%'] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                )}
              </div>
              
              {/* Recent votes indicator */}
              {contestant.lastVotes > 0 && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  <span>+{contestant.lastVotes} {isRTL ? 'صوت الآن' : 'votes now'}</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Footer Stats */}
        <div className="mt-4 pt-3 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {isRTL ? 'إجمالي الأصوات' : 'Total Votes'}: {votingData?.totalVotes || 0}
            </span>
            <span>
              {isRTL ? 'آخر تحديث' : 'Last update'}: {votingData?.lastUpdate ? 
                new Date(votingData.lastUpdate).toLocaleTimeString() : 
                isRTL ? 'غير متوفر' : 'N/A'
              }
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
