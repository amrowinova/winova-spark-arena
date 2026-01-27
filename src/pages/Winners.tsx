import { useState } from 'react';
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
import { getPricing } from '@/contexts/TransactionContext';
import { ContestDetailsDialog, type ContestHistoryItem } from '@/components/contest';

// Mock data for latest finished contest
const latestContest = {
  id: 'C-1246',
  date: '2026-01-25',
  prizePool: 850,
  participants: 142,
  userParticipated: true,
  userRank: 12,
  winners: [
    { rank: 1, name: 'خالد محمد', votes: 156, prize: 425, percentage: 50 },
    { rank: 2, name: 'فاطمة سعيد', votes: 134, prize: 170, percentage: 20 },
    { rank: 3, name: 'عمر أحمد', votes: 121, prize: 127.5, percentage: 15 },
    { rank: 4, name: 'ليلى حسن', votes: 98, prize: 85, percentage: 10 },
    { rank: 5, name: 'أحمد كريم', votes: 87, prize: 42.5, percentage: 5 },
  ],
};

// Mock data for contest history
const contestHistory: ContestHistoryItem[] = [
  {
    id: 'C-1246',
    date: '2026-01-25',
    prizePool: 850,
    participants: 142,
    userRank: 12,
    participated: true,
    winners: [
      { rank: 1, name: 'خالد محمد', votes: 156, prize: 425 },
      { rank: 2, name: 'فاطمة سعيد', votes: 134, prize: 170 },
      { rank: 3, name: 'عمر أحمد', votes: 121, prize: 127.5 },
      { rank: 4, name: 'ليلى حسن', votes: 98, prize: 85 },
      { rank: 5, name: 'أحمد كريم', votes: 87, prize: 42.5 },
    ],
  },
  {
    id: 'C-1245',
    date: '2026-01-24',
    prizePool: 720,
    participants: 120,
    userRank: null,
    participated: false,
    winners: [
      { rank: 1, name: 'سارة أحمد', votes: 145, prize: 360 },
      { rank: 2, name: 'محمد علي', votes: 128, prize: 144 },
      { rank: 3, name: 'نور حسين', votes: 112, prize: 108 },
      { rank: 4, name: 'يوسف كمال', votes: 95, prize: 72 },
      { rank: 5, name: 'هدى سمير', votes: 82, prize: 36 },
    ],
  },
  {
    id: 'C-1244',
    date: '2026-01-23',
    prizePool: 680,
    participants: 113,
    userRank: 8,
    participated: true,
    winners: [
      { rank: 1, name: 'كريم فوزي', votes: 167, prize: 340 },
      { rank: 2, name: 'منى عادل', votes: 142, prize: 136 },
      { rank: 3, name: 'طارق نبيل', votes: 125, prize: 102 },
      { rank: 4, name: 'سلمى رشدي', votes: 108, prize: 68 },
      { rank: 5, name: 'باسم وليد', votes: 91, prize: 34 },
    ],
  },
];

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
  const pricing = getPricing(user.country);
  
  const [selectedContest, setSelectedContest] = useState<ContestHistoryItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleViewDetails = (contest: ContestHistoryItem) => {
    setSelectedContest(contest);
    setDetailsOpen(true);
  };

  const handleProfileClick = (name: string) => {
    // Generate a simple ID from the name for now
    const id = name.replace(/\s+/g, '-').toLowerCase();
    navigate(`/user/${id}`);
  };

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
              {/* Contest Info */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{latestContest.date}</span>
                    </div>
                    {latestContest.userParticipated && (
                      <Badge className="bg-success/10 text-success border-success/30">
                        {language === 'ar' ? 'شاركت' : 'Participated'}
                      </Badge>
                    )}
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
                      key={winner.rank}
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

                      {/* Winner Info - Clickable */}
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleProfileClick(winner.name)}
                      >
                        <p className="font-medium text-sm truncate hover:text-primary transition-colors">{winner.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {winner.votes} {language === 'ar' ? 'صوت' : 'votes'}
                        </p>
                      </div>

                      {/* Prize */}
                      <div className="text-end">
                        <p className="font-bold text-nova text-sm">
                          И {winner.prize >= 1 ? Math.floor(winner.prize) : winner.prize.toFixed(1)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {winner.percentage}%
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>

              {/* User Participation Status */}
              {latestContest.userParticipated && (
                <Card className="border-success/20 bg-success/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                        <span className="text-lg">🎯</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {language === 'ar' ? 'مشاركتك في هذه المسابقة' : 'Your participation'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {language === 'ar' ? 'مركزك النهائي:' : 'Final rank:'} #{latestContest.userRank}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
                        <Badge 
                          variant={contest.participated ? "default" : "secondary"}
                          className={contest.participated ? "bg-success/10 text-success border-success/30" : ""}
                        >
                          {contest.participated 
                            ? (language === 'ar' ? 'شاركت' : 'Participated')
                            : (language === 'ar' ? 'لم تشارك' : 'Did not participate')
                          }
                        </Badge>
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
                        {contest.participated && contest.userRank && (
                          <span className="flex items-center gap-1">
                            🎯 #{contest.userRank}
                          </span>
                        )}
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
