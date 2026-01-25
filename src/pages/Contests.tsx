import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Star, ThumbsUp, Clock, ChevronRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CurrencyBadge } from '@/components/common/CurrencyBadge';
import { CountdownTimer } from '@/components/common/CountdownTimer';
import { ProgressRing } from '@/components/common/ProgressRing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useUser } from '@/contexts/UserContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// Mock contest data
const mockContest = {
  id: 1,
  participants: 156,
  prizePool: 936, // 6 Nova × 156 participants
  stage: 'stage1' as const,
  endsAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
  joinCloses: new Date(Date.now() + 1 * 60 * 60 * 1000),
  entryFee: 10,
  userJoined: true,
  userVotes: 24,
  votesToTop50: 45,
};

// Mock top participants
const topParticipants = [
  { id: 1, name: 'Khalid M.', votes: 89, avatar: '👨', rank: 1 },
  { id: 2, name: 'Fatima S.', votes: 76, avatar: '👩', rank: 2 },
  { id: 3, name: 'Omar A.', votes: 72, avatar: '👨', rank: 3 },
  { id: 4, name: 'Layla H.', votes: 68, avatar: '👩', rank: 4 },
  { id: 5, name: 'Ahmed K.', votes: 65, avatar: '👨', rank: 5 },
  { id: 6, name: 'Nora B.', votes: 61, avatar: '👩', rank: 6 },
  { id: 7, name: 'You', votes: 24, avatar: '🌟', rank: 47, isUser: true },
];

const prizeDistribution = [
  { place: '1st', percentage: 50, color: 'bg-nova' },
  { place: '2nd', percentage: 20, color: 'bg-primary' },
  { place: '3rd', percentage: 15, color: 'bg-accent' },
  { place: '4th', percentage: 10, color: 'bg-muted' },
  { place: '5th', percentage: 5, color: 'bg-muted-foreground' },
];

export default function ContestsPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [selectedTab, setSelectedTab] = useState('current');
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<typeof topParticipants[0] | null>(null);

  const handleVote = (participant: typeof topParticipants[0]) => {
    setSelectedParticipant(participant);
    setVoteDialogOpen(true);
  };

  return (
    <AppLayout title={t('contests.title')}>
      <div className="px-4 py-4 space-y-5">
        {/* Contest Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="bg-gradient-primary p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-primary-foreground" />
                  <h1 className="text-primary-foreground text-lg font-bold">
                    {t('contests.title')}
                  </h1>
                </div>
                <span className="px-3 py-1 bg-card/20 rounded-full text-primary-foreground text-xs font-medium">
                  {t(`contests.${mockContest.stage}`)}
                </span>
              </div>

              {/* Prize Pool */}
              <div className="text-center mb-4">
                <p className="text-primary-foreground/70 text-sm mb-1">
                  {t('contests.prizePool')}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-nova text-2xl">✦</span>
                  <span className="text-primary-foreground text-4xl font-bold">
                    {mockContest.prizePool}
                  </span>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-card/10 rounded-lg p-2">
                  <Users className="h-4 w-4 mx-auto mb-1 text-primary-foreground/70" />
                  <p className="text-primary-foreground font-bold">{mockContest.participants}</p>
                  <p className="text-primary-foreground/60 text-[10px]">{t('contests.participants')}</p>
                </div>
                <div className="bg-card/10 rounded-lg p-2">
                  <ThumbsUp className="h-4 w-4 mx-auto mb-1 text-primary-foreground/70" />
                  <p className="text-primary-foreground font-bold">{mockContest.userVotes}</p>
                  <p className="text-primary-foreground/60 text-[10px]">{t('contests.yourVotes')}</p>
                </div>
                <div className="bg-card/10 rounded-lg p-2">
                  <Star className="h-4 w-4 mx-auto mb-1 text-primary-foreground/70" />
                  <p className="text-primary-foreground font-bold">{mockContest.votesToTop50}</p>
                  <p className="text-primary-foreground/60 text-[10px]">{t('contests.votesNeeded')}</p>
                </div>
              </div>
            </div>

            {/* Countdown & Join */}
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{t('contests.stageEnds')}</span>
              </div>
              <CountdownTimer targetDate={mockContest.endsAt} size="sm" className="mb-4" />
              
              {!mockContest.userJoined ? (
                <div className="space-y-2">
                  <p className="text-sm text-center text-muted-foreground">
                    {t('contests.entry')}: <CurrencyBadge type="nova" amount={10} size="sm" /> {t('contests.or')} <CurrencyBadge type="aura" amount={10} size="sm" />
                  </p>
                  <Button className="w-full bg-gradient-primary">
                    {t('contests.joinNow')}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 p-3 bg-success/10 rounded-lg text-success">
                  <Star className="h-4 w-4" />
                  <span className="font-medium">{t('contests.alreadyJoined')}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="current">{t('contests.top50')}</TabsTrigger>
            <TabsTrigger value="prizes">{t('contests.prizeDistribution')}</TabsTrigger>
            <TabsTrigger value="history">{t('wallet.history')}</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="mt-4 space-y-3">
            <AnimatePresence>
              {topParticipants.map((participant, index) => (
                <motion.div
                  key={participant.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={participant.isUser ? 'border-primary glow-primary' : ''}>
                    <CardContent className="p-3 flex items-center gap-3">
                      {/* Rank */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        participant.rank <= 3 ? 'bg-gradient-nova text-nova-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {participant.rank}
                      </div>

                      {/* Avatar & Name */}
                      <div className="flex-1 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                          {participant.avatar}
                        </div>
                        <div>
                          <p className={`font-medium ${participant.isUser ? 'text-primary' : ''}`}>
                            {participant.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {participant.votes} {t('contests.yourVotes').toLowerCase()}
                          </p>
                        </div>
                      </div>

                      {/* Vote Button */}
                      {!participant.isUser && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleVote(participant)}
                        >
                          {t('contests.vote')}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="prizes" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('contests.prizeDistribution')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {prizeDistribution.map((prize, index) => (
                  <div key={prize.place} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${prize.color} flex items-center justify-center text-sm font-bold text-card`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{t(`contests.${['first', 'second', 'third', 'fourth', 'fifth'][index]}`)}</span>
                        <span className="text-sm text-muted-foreground">{prize.percentage}%</span>
                      </div>
                      <Progress value={prize.percentage} className="h-2" />
                    </div>
                    <CurrencyBadge 
                      type="nova" 
                      amount={Math.round(mockContest.prizePool * prize.percentage / 100)} 
                      size="sm" 
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card className="p-8 text-center">
              <Trophy className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">Previous contests will appear here</p>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Vote Dialog */}
        <Dialog open={voteDialogOpen} onOpenChange={setVoteDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('contests.vote')}</DialogTitle>
              <DialogDescription>
                Vote for {selectedParticipant?.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3">
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => setVoteDialogOpen(false)}
              >
                <span className="me-2">🆓</span>
                {t('contests.freeVote')} (1x daily)
              </Button>
              
              <Button 
                className="w-full bg-gradient-nova text-nova-foreground"
                onClick={() => setVoteDialogOpen(false)}
              >
                <span className="me-2">✦</span>
                {t('contests.novaVote')} (1 Nova)
              </Button>
              
              <Button 
                className="w-full bg-gradient-aura text-aura-foreground"
                onClick={() => setVoteDialogOpen(false)}
              >
                <span className="me-2">◈</span>
                {t('contests.auraVote')} (1 Aura)
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
