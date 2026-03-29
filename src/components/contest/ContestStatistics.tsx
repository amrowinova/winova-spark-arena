import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, Users, Zap, Trophy, Target, BarChart3, PieChart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface VoteProgress {
  timestamp: Date;
  participantId: string;
  participantName: string;
  votes: number;
  cumulativeVotes: number;
}

interface PowerUpUsage {
  type: string;
  userId: string;
  timestamp: Date;
  participantId: string;
}

interface ContestStatisticsProps {
  contestId: string;
  winners: any[];
  isRTL: boolean;
}

export function ContestStatistics({ contestId, winners, isRTL }: ContestStatisticsProps) {
  const [voteProgress, setVoteProgress] = useState<VoteProgress[]>([]);
  const [powerUpUsage, setPowerUpUsage] = useState<PowerUpUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChart, setSelectedChart] = useState<'progress' | 'distribution'>('progress');

  useEffect(() => {
    const fetchStatistics = async () => {
      setLoading(true);
      
      try {
        // Fetch vote progress data
        const { data: progressData } = await (supabase as any).rpc('get_contest_vote_progress', {
          p_contest_id: contestId
        });

        // Fetch power-up usage data
        const { data: powerUpData } = await (supabase as any).rpc('get_contest_powerup_usage', {
          p_contest_id: contestId
        });

        setVoteProgress(progressData || []);
        setPowerUpUsage(powerUpData || []);
      } catch (error) {
        console.error('Error fetching statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [contestId]);

  const getInsights = () => {
    const insights = [];

    // Winner's late surge
    if (winners.length > 0) {
      const winner = winners[0];
      const winnerProgress = voteProgress.filter(p => p.participantId === winner.id);
      
      if (winnerProgress.length > 0) {
        const last20Percent = Math.floor(winnerProgress.length * 0.8);
        const last20Votes = winnerProgress.slice(last20Percent);
        const last20VoteCount = last20Votes.reduce((sum, p) => sum + p.votes, 0);
        const totalVotes = winnerProgress.reduce((sum, p) => sum + p.votes, 0);
        
        const last20Percentage = totalVotes > 0 ? (last20VoteCount / totalVotes) * 100 : 0;
        
        if (last20Percentage > 50) {
          insights.push({
            type: 'surge',
            icon: <TrendingUp className="h-4 w-4" />,
            text: isRTL 
              ? `حصل الفائز على ${last20Percentage.toFixed(0)}% من أصواته في آخر 20 دقيقة`
              : `Winner got ${last20Percentage.toFixed(0)}% of votes in last 20 minutes`,
            color: 'text-green-600'
          });
        }
      }
    }

    // Strongest momentum
    const momentumEvents = powerUpUsage.filter(p => p.type === 'momentum');
    if (momentumEvents.length > 0) {
      const momentumCounts = momentumEvents.reduce((acc, event) => {
        acc[event.participantId] = (acc[event.participantId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const maxMomentum = Math.max(...Object.values(momentumCounts));
      const topMomentumParticipant = Object.entries(momentumCounts).find(([_, count]) => count === maxMomentum);
      
      if (topMomentumParticipant) {
        const participant = voteProgress.find(p => p.participantId === topMomentumParticipant[0]);
        insights.push({
          type: 'momentum',
          icon: <Zap className="h-4 w-4" />,
          text: isRTL 
            ? `أقوى تصويت جماعي كان لـ ${participant?.participantName || 'المركز الثالث'} (${maxMomentum} مرة)`
            : `Strongest collective voting was for ${participant?.participantName || '3rd place'} (${maxMomentum} times)`,
          color: 'text-orange-600'
        });
      }
    }

    // Power-up usage
    const totalPowerUps = powerUpUsage.length;
    const uniqueUsers = new Set(powerUpUsage.map(p => p.userId)).size;
    
    if (totalPowerUps > 0) {
      insights.push({
        type: 'powerups',
        icon: <Trophy className="h-4 w-4" />,
        text: isRTL 
          ? `استخدم ${uniqueUsers} مشاركين Power-ups المجانية (${totalPowerUps} مرة إجمالية)`
          : `${uniqueUsers} participants used free Power-ups (${totalPowerUps} total uses)`,
        color: 'text-purple-600'
      });
    }

    // Closest competition
    if (winners.length >= 2) {
      const first = winners[0];
      const second = winners[1];
      const voteDifference = first.votes - second.votes;
      
      if (voteDifference <= 10) {
        insights.push({
          type: 'competition',
          icon: <Target className="h-4 w-4" />,
          text: isRTL 
            ? `أقرب منافسة: فارق ${voteDifference} صوت بين المركز الأول والثاني`
            : `Closest competition: ${voteDifference} votes between 1st and 2nd place`,
          color: 'text-red-600'
        });
      }
    }

    return insights;
  };

  const insights = getInsights();

  const renderProgressChart = () => {
    if (voteProgress.length === 0) return null;

    // Group by participant for chart data
    const participantData = voteProgress.reduce((acc, point) => {
      if (!acc[point.participantId]) {
        acc[point.participantId] = {
          name: point.participantName,
          data: []
        };
      }
      acc[point.participantId].data.push({
        time: point.timestamp,
        votes: point.cumulativeVotes
      });
      return acc;
    }, {} as Record<string, { name: string; data: any[] }>);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            {isRTL ? 'تقدم التصويت بمرور الوقت' : 'Vote Progress Over Time'}
          </h4>
        </div>
        
        <div className="space-y-3">
          {Object.entries(participantData).slice(0, 5).map(([participantId, data]) => {
            const winner = winners.find(w => w.id === participantId);
            const isWinner = winner?.rank === 1;
            
            return (
              <div key={participantId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isWinner && <Trophy className="h-4 w-4 text-yellow-500" />}
                    <span className="font-medium text-sm">{data.name}</span>
                    {winner && (
                      <Badge variant="outline" className="text-xs">
                        #{winner.rank}
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {data.data[data.data.length - 1]?.votes || 0} {isRTL ? 'صوت' : 'votes'}
                  </span>
                </div>
                <Progress 
                  value={data.data[data.data.length - 1]?.votes || 0} 
                  max={Math.max(...Object.values(participantData).map(d => d.data[d.data.length - 1]?.votes || 0))}
                  className="h-2"
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDistributionChart = () => {
    const totalVotes = winners.reduce((sum, w) => sum + w.votes, 0);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold flex items-center gap-2">
            <PieChart className="h-5 w-5 text-green-500" />
            {isRTL ? 'توزيع الأصوات' : 'Vote Distribution'}
          </h4>
          <Badge variant="outline">
            {totalVotes.toLocaleString()} {isRTL ? 'إجمالي' : 'total'}
          </Badge>
        </div>
        
        <div className="space-y-3">
          {winners.slice(0, 5).map((winner) => {
            const percentage = totalVotes > 0 ? (winner.votes / totalVotes) * 100 : 0;
            
            return (
              <div key={winner.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{winner.name}</span>
                    <Badge variant="outline" className="text-xs">
                      #{winner.rank}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{percentage.toFixed(1)}%</span>
                    <span className="text-xs text-muted-foreground">
                      ({winner.votes.toLocaleString()} {isRTL ? 'صوت' : 'votes'})
                    </span>
                  </div>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">
              {isRTL ? 'جاري تحميل الإحصائيات...' : 'Loading statistics...'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            {isRTL ? 'إحصائيات المسابقة' : 'Contest Statistics'}
          </h3>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={selectedChart === 'progress' ? 'default' : 'outline'}
              onClick={() => setSelectedChart('progress')}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={selectedChart === 'distribution' ? 'default' : 'outline'}
              onClick={() => setSelectedChart('distribution')}
            >
              <PieChart className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Charts */}
        <div className="mb-6">
          {selectedChart === 'progress' ? renderProgressChart() : renderDistributionChart()}
        </div>

        {/* Insights */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-500" />
            {isRTL ? 'رؤى ممتعة' : 'Fun Insights'}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-3 bg-white/50 rounded-lg"
              >
                <div className={insight.color}>
                  {insight.icon}
                </div>
                <p className="text-sm leading-relaxed">
                  {insight.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {winners.length}
              </div>
              <div className="text-xs text-muted-foreground">
                {isRTL ? 'فائزين' : 'Winners'}
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {winners.reduce((sum, w) => sum + w.votes, 0).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {isRTL ? 'إجمالي الأصوات' : 'Total Votes'}
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {powerUpUsage.length}
              </div>
              <div className="text-xs text-muted-foreground">
                {isRTL ? 'Power-ups' : 'Power-ups'}
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {new Set(powerUpUsage.map(p => p.userId)).size}
              </div>
              <div className="text-xs text-muted-foreground">
                {isRTL ? 'مستخدمين نشطين' : 'Active Users'}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
