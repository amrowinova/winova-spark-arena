import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Calendar, Crown, Users, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useNovaPricing } from '@/hooks/useNovaPricing';
import { ContestDetailsDialog, type ContestHistoryItem } from '@/components/contest';
import { getCountryFlag } from '@/lib/countryFlags';
import { supabase } from '@/integrations/supabase/client';

interface ContestWinner {
  rank: number;
  id: string;
  name: string;
  votes: number;
  prize: number;
  country: string;
}

interface ContestRecord {
  id: string;
  date: string;
  prizePool: number;
  participants: number;
  userRank: number | null;
  participated: boolean;
  winners: ContestWinner[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

const positionColors = [
  'bg-gradient-to-r from-yellow-400 to-amber-500', // 1st
  'bg-gradient-to-r from-gray-300 to-gray-400',    // 2nd
  'bg-gradient-to-r from-amber-600 to-amber-700', // 3rd
  'bg-gradient-to-r from-primary/80 to-primary',  // 4th
  'bg-gradient-to-r from-muted-foreground/60 to-muted-foreground/80', // 5th
];

export default function Winners() {
  const { language } = useLanguage();
  const { user } = useUser();
  const navigate = useNavigate();
  const { getCurrencyInfo } = useNovaPricing();
  const pricing = getCurrencyInfo(user.country);
  
  const [contestHistory, setContestHistory] = useState<ContestRecord[]>([]);
  const [selectedContest, setSelectedContest] = useState<ContestHistoryItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchContestHistory() {
      try {
        // Fetch completed contests
        const { data: contests, error } = await supabase
          .from('contests')
          .select('*')
          .eq('status', 'completed')
          .order('end_time', { ascending: false })
          .limit(10);

        if (error) throw error;

        const contestRecords: ContestRecord[] = [];
        
        for (const contest of contests || []) {
          // Fetch entries for this contest
          const { data: entries } = await supabase
            .from('contest_entries')
            .select(`
              user_id,
              votes_received,
              prize_won,
              rank,
              profiles!inner(name, country)
            `)
            .eq('contest_id', contest.id)
            .order('rank', { ascending: true })
            .limit(5);

          const winners: ContestWinner[] = (entries || []).map((entry: any, index: number) => ({
            rank: entry.rank || index + 1,
            id: entry.user_id,
            name: entry.profiles?.name || 'User',
            votes: entry.votes_received || 0,
            prize: entry.prize_won || 0,
            country: entry.profiles?.country || '',
          }));

          contestRecords.push({
            id: contest.id,
            date: new Date(contest.end_time).toISOString().split('T')[0],
            prizePool: contest.prize_pool,
            participants: contest.current_participants,
            userRank: null,
            participated: false,
            winners,
          });
        }

        setContestHistory(contestRecords);
      } catch (err) {
        console.error('Error fetching contest history:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchContestHistory();
  }, []);

  const handleViewDetails = (contest: ContestRecord) => {
    setSelectedContest({
      id: contest.id,
      date: contest.date,
      prizePool: contest.prizePool,
      participants: contest.participants,
      userRank: contest.userRank,
      participated: contest.participated,
      winners: contest.winners.map(w => ({
        rank: w.rank,
        id: w.id,
        name: w.name,
        votes: w.votes,
        prize: w.prize,
      })),
    });
    setDetailsOpen(true);
  };

  const handleProfileClick = (winnerId: string) => {
    navigate(`/user/${winnerId}`);
  };

  const latestContest = contestHistory[0];

  // Empty state
  if (!isLoading && contestHistory.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <InnerPageHeader title={language === 'ar' ? 'الفائزون' : 'Winners'} />
        <main className="flex-1 px-4 py-3 pb-20 flex items-center justify-center">
          <div className="text-center">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-lg font-bold mb-2">
              {language === 'ar' ? 'لا توجد مسابقات منتهية' : 'No Completed Contests'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' 
                ? 'سيظهر الفائزون هنا بعد انتهاء المسابقات'
                : 'Winners will appear here after contests end'}
            </p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InnerPageHeader title={language === 'ar' ? 'الفائزون' : 'Winners'} />
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 px-4 py-3 pb-20 space-y-4"
      >
        {/* Description */}
        <motion.div variants={itemVariants}>
          <p className="text-sm text-muted-foreground">
            {language === 'ar' 
              ? 'سجل الفائزين في المسابقات اليومية' 
              : 'Daily contest winners history'}
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div variants={itemVariants}>
          <Tabs defaultValue="latest" className="w-full">
            <TabsList className="w-full grid grid-cols-2 h-11">
              <TabsTrigger value="latest" className="text-xs">
                {language === 'ar' ? 'آخر مسابقة' : 'Latest Contest'}
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs">
                {language === 'ar' ? 'السجل' : 'History'}
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Latest Finished Contest */}
            <TabsContent value="latest" className="mt-4 space-y-4">
              {latestContest && (
                <>
                  {/* Contest Info */}
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{latestContest.date}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Trophy className="h-3.5 w-3.5 text-nova" />
                          <span className="text-nova font-bold">И {latestContest.prizePool}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {latestContest.participants} {language === 'ar' ? 'مشارك' : 'participants'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top 5 Winners */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Crown className="h-4 w-4 text-yellow-500" />
                        {language === 'ar' ? 'الفائزون الخمسة' : 'Top 5 Winners'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {latestContest.winners.map((winner, index) => (
                        <motion.div
                          key={winner.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`flex items-center gap-3 p-3 rounded-lg ${
                            index === 0 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-muted/30'
                          }`}
                        >
                          {/* Rank Badge */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${positionColors[index]}`}>
                            {index === 0 ? <Crown className="h-4 w-4" /> : winner.rank}
                          </div>

                          {/* Avatar - Clickable */}
                          <div 
                            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                            onClick={() => handleProfileClick(winner.id)}
                          >
                            👤
                          </div>

                          {/* Winner Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p 
                                className="font-medium text-sm truncate cursor-pointer hover:text-primary transition-colors"
                                onClick={() => handleProfileClick(winner.id)}
                              >
                                {winner.name}
                              </p>
                              {getCountryFlag(winner.country) && (
                                <span className="text-sm shrink-0">{getCountryFlag(winner.country)}</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {winner.votes} {language === 'ar' ? 'صوت' : 'votes'}
                            </p>
                          </div>

                          {/* Prize */}
                          <div className="text-end">
                            <p className="font-bold text-nova text-sm">
                              И {winner.prize >= 1 ? Math.floor(winner.prize) : winner.prize.toFixed(1)}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Tab 2: Contest History */}
            <TabsContent value="history" className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                {language === 'ar' 
                  ? 'جميع المسابقات السابقة مرتبة من الأحدث' 
                  : 'All past contests, newest first'}
              </p>
              
              {contestHistory.map((contest, index) => (
                <motion.div
                  key={contest.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="overflow-hidden">
                    <CardContent className="p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-bold text-sm">{contest.date}</span>
                        </div>
                      </div>
                      
                      {/* Stats */}
                      <div className="flex items-center gap-4 mb-3 text-sm">
                        <span className="flex items-center gap-1">
                          <Trophy className="h-3.5 w-3.5 text-nova" />
                          <span className="text-nova font-bold">И {contest.prizePool}</span>
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          {contest.participants}
                        </span>
                      </div>

                      {/* Top 3 Preview */}
                      <div className="flex items-center gap-2 mb-3">
                        {contest.winners.slice(0, 3).map((winner, i) => (
                          <div key={i} className="flex items-center gap-1 text-xs bg-muted/50 px-2 py-1 rounded-full">
                            <span className={i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : 'text-amber-600'}>
                              {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                            </span>
                            <span className="truncate max-w-[60px]">{winner.name.split(' ')[0]}</span>
                          </div>
                        ))}
                      </div>
                      
                      {/* CTA */}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleViewDetails(contest)}
                      >
                        {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                        <ChevronRight className="h-4 w-4 ms-1" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </TabsContent>
        </Tabs>
        </motion.div>
      </motion.main>

      <BottomNav />

      {/* Contest Details Dialog */}
      {selectedContest && (
        <ContestDetailsDialog
          contest={selectedContest}
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          country={user.country}
        />
      )}
    </div>
  );
}
