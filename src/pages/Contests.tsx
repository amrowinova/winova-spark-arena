import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Info, Ban } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ReceiptDialog } from '@/components/common/ReceiptCard';
import { useUser } from '@/contexts/UserContext';
import { useTransactions, Receipt, getPricing } from '@/contexts/TransactionContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

// Contest Components
import {
  ContestStageHeader,
  ContestUserStatusCard,
  ContestContestantCard,
  ContestInfoBox,
  FinalStageHeader,
  FinalStageUserCard,
  FinalContestantCard,
  PrizeDistributionCard,
  ContestHistoryCard,
  ContestDetailsDialog,
  ContestHistoryItem,
} from '@/components/contest';

// Mock contest data
const mockContest = {
  id: 'C-1247',
  participants: 156,
  prizePool: 936,
  stage: 'stage1' as 'stage1' | 'final',
  stage1EndsAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
  finalEndsAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
  entryFee: 10,
};

// Generate participants
const generateParticipants = () => {
  const names = [
    'خالد محمد', 'فاطمة سعيد', 'عمر أحمد', 'ليلى حسن', 'أحمد كريم',
    'نورا بكر', 'سارة علي', 'محمد سالم', 'مريم حسن', 'يوسف عادل',
    'هدى أحمد', 'علي سعيد', 'رنا محمد', 'كريم فؤاد', 'دينا حسام',
    'طارق أمين', 'نادية رشيد', 'سامي جابر', 'لينا خالد', 'وائل سمير',
  ];
  const avatars = ['👨', '👩', '👨', '👩', '👨', '👩', '👨', '👩', '👨', '👩'];
  const countries = ['Saudi Arabia', 'Egypt', 'Palestine', 'Syria', 'Jordan'];
  
  const participants = [];
  for (let i = 0; i < 80; i++) {
    const votes = Math.max(1, 95 - i * 1.2 + Math.floor(Math.random() * 5));
    participants.push({
      id: `${100 + i}`,
      name: names[i % names.length],
      username: `user_${100 + i}`,
      votes: Math.round(votes),
      avatar: avatars[i % avatars.length],
      rank: i + 1,
      country: countries[i % countries.length],
    });
  }
  return participants;
};

// Mock contest history
const mockContestHistory: ContestHistoryItem[] = [
  {
    id: 'C-1246',
    date: '25 يناير 2026',
    prizePool: 936,
    participants: 156,
    userRank: 12,
    participated: true,
    winners: [
      { name: 'خالد محمد', prize: 468, rank: 1, votes: 124 },
      { name: 'فاطمة سعيد', prize: 187, rank: 2, votes: 98 },
      { name: 'عمر أحمد', prize: 140, rank: 3, votes: 87 },
      { name: 'ليلى حسن', prize: 94, rank: 4, votes: 76 },
      { name: 'أحمد كريم', prize: 47, rank: 5, votes: 71 },
    ],
  },
  {
    id: 'C-1245',
    date: '24 يناير 2026',
    prizePool: 840,
    participants: 140,
    userRank: 35,
    participated: true,
    winners: [
      { name: 'سارة علي', prize: 420, rank: 1, votes: 112 },
      { name: 'أحمد كريم', prize: 168, rank: 2, votes: 89 },
      { name: 'ليلى حسن', prize: 126, rank: 3, votes: 78 },
      { name: 'محمد سالم', prize: 84, rank: 4, votes: 65 },
      { name: 'نورا بكر', prize: 42, rank: 5, votes: 61 },
    ],
  },
  {
    id: 'C-1244',
    date: '23 يناير 2026',
    prizePool: 780,
    participants: 130,
    userRank: null,
    participated: false,
    winners: [
      { name: 'محمد سالم', prize: 390, rank: 1, votes: 105 },
      { name: 'نورا بكر', prize: 156, rank: 2, votes: 82 },
      { name: 'يوسف عادل', prize: 117, rank: 3, votes: 74 },
      { name: 'هدى أحمد', prize: 78, rank: 4, votes: 68 },
      { name: 'علي سعيد', prize: 39, rank: 5, votes: 62 },
    ],
  },
  {
    id: 'C-1243',
    date: '22 يناير 2026',
    prizePool: 900,
    participants: 150,
    userRank: 3,
    participated: true,
    winners: [
      { name: 'فاطمة أحمد', prize: 450, rank: 1, votes: 118 },
      { name: 'خالد سعيد', prize: 180, rank: 2, votes: 95 },
      { name: 'أنت', prize: 135, rank: 3, votes: 88 },
      { name: 'رنا محمد', prize: 90, rank: 4, votes: 72 },
      { name: 'كريم فؤاد', prize: 45, rank: 5, votes: 67 },
    ],
  },
];

const formatBalance = (value: number): string => {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
};

export default function ContestsPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user, spendAura, spendNova } = useUser();
  const { createTransaction } = useTransactions();

  const [selectedTab, setSelectedTab] = useState('contestants');
  const [contest, setContest] = useState(mockContest);
  const [participants, setParticipants] = useState(generateParticipants);
  const [userVotes, setUserVotes] = useState(24);
  const [userRank, setUserRank] = useState(47);
  const [hasJoined, setHasJoined] = useState(true);
  
  // Dialog states
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<typeof participants[0] | null>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  
  // History dialog
  const [historyDetailsOpen, setHistoryDetailsOpen] = useState(false);
  const [selectedHistoryContest, setSelectedHistoryContest] = useState<ContestHistoryItem | null>(null);

  // Simulate stage transition (for demo - can toggle)
  const [demoStage, setDemoStage] = useState<'stage1' | 'final'>('stage1');
  
  useEffect(() => {
    setContest(prev => ({ ...prev, stage: demoStage }));
  }, [demoStage]);

  const isStage1 = contest.stage === 'stage1';
  const isFinal = contest.stage === 'final';
  
  // In final stage, only top 50 are shown
  const displayParticipants = isFinal ? participants.slice(0, 50) : participants;
  
  // Check if user qualified for final
  const userQualified = userRank <= 50;
  
  // Votes needed for top 50
  const top50Threshold = participants[49]?.votes || 45;

  const handleJoinContest = () => {
    const entryFee = contest.entryFee;
    const auraEquivalent = entryFee * 2;
    
    if (user.auraBalance >= auraEquivalent) {
      spendAura(auraEquivalent);
    } else if (user.novaBalance >= entryFee) {
      spendNova(entryFee);
    } else if (user.auraBalance > 0 && user.novaBalance > 0) {
      const auraToUse = user.auraBalance;
      const novaEquivalentFromAura = auraToUse / 2;
      const remainingNovaNeeded = entryFee - novaEquivalentFromAura;
      
      if (user.novaBalance >= remainingNovaNeeded) {
        spendAura(auraToUse);
        spendNova(remainingNovaNeeded);
      } else {
        toast.error(language === 'ar' ? 'رصيد غير كافي' : 'Insufficient balance');
        return;
      }
    } else {
      toast.error(language === 'ar' ? 'رصيد غير كافي' : 'Insufficient balance');
      return;
    }

    const receipt = createTransaction({
      type: 'contest_entry',
      status: 'completed',
      amount: entryFee,
      currency: 'nova',
      sender: {
        id: user.id,
        name: user.name,
        username: `${user.name.toLowerCase()}_user`,
        country: user.country,
      },
      reason: language === 'ar' 
        ? `دخول المسابقة اليومية #${contest.id}`
        : `Daily Contest Entry #${contest.id}`,
      contestId: contest.id,
    });

    setHasJoined(true);
    setJoinDialogOpen(false);
    setSelectedReceipt(receipt);
    setReceiptDialogOpen(true);
    toast.success(language === 'ar' ? '🎉 تم الانضمام للمسابقة!' : '🎉 Joined the contest!');
  };

  const handleVote = (participant: typeof participants[0]) => {
    setSelectedParticipant(participant);
    setVoteDialogOpen(true);
  };

  const handleConfirmVote = (voteType: 'free' | 'nova' | 'aura', voteCount: number = 1) => {
    if (!selectedParticipant) return;

    // No free votes in final stage
    if (isFinal && voteType === 'free') {
      toast.error(language === 'ar' ? 'لا يوجد صوت مجاني في المرحلة النهائية' : 'No free votes in Final Stage');
      return;
    }

    if (voteType === 'nova' && user.novaBalance < voteCount) {
      toast.error(language === 'ar' ? 'رصيد غير كافي' : 'Insufficient balance');
      return;
    }

    if (voteType === 'aura' && user.auraBalance < voteCount) {
      toast.error(language === 'ar' ? 'رصيد غير كافي' : 'Insufficient balance');
      return;
    }

    if (voteType === 'nova') {
      spendNova(voteCount);
    } else if (voteType === 'aura') {
      spendAura(voteCount);
    }

    if (voteType !== 'free') {
      const receipt = createTransaction({
        type: 'vote_sent',
        status: 'completed',
        amount: voteCount,
        currency: voteType as 'nova' | 'aura',
        sender: {
          id: user.id,
          name: user.name,
          username: `${user.name.toLowerCase()}_user`,
          country: user.country,
        },
        receiver: {
          id: selectedParticipant.id,
          name: selectedParticipant.name,
          username: selectedParticipant.username,
          country: selectedParticipant.country,
        },
        reason: language === 'ar' 
          ? `تصويت ${voteCount} صوت لـ ${selectedParticipant.name}`
          : `Voted ${voteCount} for ${selectedParticipant.name}`,
        contestId: contest.id,
      });
      setSelectedReceipt(receipt);
    }

    setParticipants(prev => 
      prev.map(p => 
        p.id === selectedParticipant.id 
          ? { ...p, votes: p.votes + voteCount }
          : p
      ).sort((a, b) => b.votes - a.votes).map((p, i) => ({ ...p, rank: i + 1 }))
    );

    setVoteDialogOpen(false);
    
    if (voteType !== 'free') {
      setReceiptDialogOpen(true);
    }

    toast.success(language === 'ar' 
      ? `تم التصويت ${voteCount} صوت لـ ${selectedParticipant.name}!`
      : `Voted ${voteCount} for ${selectedParticipant.name}!`
    );
  };

  const handleViewHistoryDetails = (historyItem: ContestHistoryItem) => {
    setSelectedHistoryContest(historyItem);
    setHistoryDetailsOpen(true);
  };

  return (
    <AppLayout title={language === 'ar' ? 'المسابقة اليومية' : 'Daily Contest'}>
      <div className="px-4 py-4 space-y-4">
        
        {/* Demo Stage Toggle (for testing - remove in production) */}
        <div className="flex gap-2 justify-center">
          <Button 
            size="sm" 
            variant={isStage1 ? "default" : "outline"}
            onClick={() => setDemoStage('stage1')}
          >
            {language === 'ar' ? 'المرحلة الأولى' : 'Stage 1'}
          </Button>
          <Button 
            size="sm" 
            variant={isFinal ? "default" : "outline"}
            onClick={() => setDemoStage('final')}
          >
            {language === 'ar' ? 'المرحلة النهائية' : 'Final Stage'}
          </Button>
        </div>

        {/* Stage Header - Conditional */}
        <motion.div
          key={contest.stage}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {isStage1 ? (
            <ContestStageHeader
              stage="stage1"
              participants={contest.participants}
              endsAt={contest.stage1EndsAt}
            />
          ) : (
            <FinalStageHeader
              participants={50}
              prizePool={contest.prizePool}
              endsAt={contest.finalEndsAt}
              country={user.country}
            />
          )}
        </motion.div>

        {/* User Status Card - Conditional */}
        {isStage1 ? (
          <ContestUserStatusCard
            userRank={userRank}
            userVotes={userVotes}
            votesNeededForTop50={top50Threshold}
            hasJoined={hasJoined}
          />
        ) : (
          <FinalStageUserCard
            userRank={userQualified ? userRank : null}
            userVotes={userVotes}
            isQualified={userQualified && hasJoined}
          />
        )}

        {/* Stage-specific Info Boxes */}
        {isStage1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <ContestInfoBox variant="free-vote" stage="stage1" />
          </motion.div>
        )}
        
        {isFinal && (
          <Alert className="bg-destructive/5 border-destructive/20">
            <Ban className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-xs text-destructive font-medium">
              {language === 'ar' 
                ? '❌ لا يوجد صوت مجاني في المرحلة النهائية'
                : '❌ No free votes in the Final Stage'}
            </AlertDescription>
          </Alert>
        )}

        {/* Join Button (Stage 1 only, if not joined) */}
        {isStage1 && !hasJoined && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="p-4">
              <div className="text-center mb-3">
                <p className="text-sm text-muted-foreground mb-1">
                  {language === 'ar' ? 'رسوم الدخول' : 'Entry Fee'}
                </p>
                <p className="text-xl font-bold text-nova">И {contest.entryFee}</p>
              </div>
              <Button 
                className="w-full bg-gradient-primary"
                onClick={() => setJoinDialogOpen(true)}
                disabled={(user.novaBalance + (user.auraBalance / 2)) < contest.entryFee}
              >
                {language === 'ar' ? 'انضم الآن' : 'Join Now'}
              </Button>
            </Card>
          </motion.div>
        )}

        {/* Main Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="contestants">
              {language === 'ar' ? 'المتسابقون' : 'Contestants'}
            </TabsTrigger>
            <TabsTrigger value="prizes">
              {language === 'ar' ? 'الجوائز' : 'Prizes'}
            </TabsTrigger>
            <TabsTrigger value="history">
              {language === 'ar' ? 'السجل' : 'History'}
            </TabsTrigger>
          </TabsList>

          {/* Contestants Tab */}
          <TabsContent value="contestants" className="mt-4 space-y-3">
            {/* Stage-specific info */}
            {isStage1 && <ContestInfoBox variant="qualification-rules" />}
            
            {isFinal && (
              <Alert className="bg-amber-500/5 border-amber-500/20">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-xs text-amber-700">
                  {language === 'ar' 
                    ? 'أفضل 5 متسابقين (👑 فائز مؤقت) يفوزون بالجوائز عند انتهاء الوقت'
                    : 'Top 5 contestants (👑 Winning) win the prizes when time ends'}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Contestants List */}
            <div className="space-y-2">
              <AnimatePresence>
                {displayParticipants.map((participant, index) => (
                  isStage1 ? (
                    <ContestContestantCard
                      key={participant.id}
                      contestant={participant}
                      index={index}
                      onVote={handleVote}
                      canVote={hasJoined}
                    />
                  ) : (
                    <FinalContestantCard
                      key={participant.id}
                      contestant={participant}
                      index={index}
                      onVote={handleVote}
                      canVote={userQualified && hasJoined}
                    />
                  )
                ))}
              </AnimatePresence>
            </div>
          </TabsContent>

          {/* Prizes Tab */}
          <TabsContent value="prizes" className="mt-4 space-y-4">
            <PrizeDistributionCard 
              prizePool={contest.prizePool} 
              country={user.country} 
            />
            
            {isStage1 && (
              <Alert className="bg-warning/5 border-warning/20">
                <Info className="h-4 w-4 text-warning" />
                <AlertDescription className="text-xs text-warning">
                  {language === 'ar' 
                    ? '⚠️ الجوائز توزع فقط في المرحلة النهائية على أفضل 5 متسابقين'
                    : '⚠️ Prizes are only distributed in the Final Stage to the top 5'}
                </AlertDescription>
              </Alert>
            )}
            
            <ContestInfoBox variant="stage-info" stage={contest.stage} />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {language === 'ar' 
                ? 'هنا تجد جميع المسابقات التي شاركت بها سابقًا'
                : 'Here you can find all past contests'}
            </p>
            
            <div className="space-y-3">
              {mockContestHistory.map((historyItem) => (
                <ContestHistoryCard
                  key={historyItem.id}
                  contest={historyItem}
                  onViewDetails={handleViewHistoryDetails}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Join Contest Dialog */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center">
              {language === 'ar' ? 'انضم للمسابقة' : 'Join Contest'}
            </DialogTitle>
            <DialogDescription className="text-center">
              {language === 'ar' 
                ? 'سيتم الخصم تلقائياً من رصيدك'
                : 'Will be automatically deducted from your balance'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-aura/10 to-nova/10 rounded-xl border border-border/50">
              <p className="text-xs text-muted-foreground text-center mb-2">
                {language === 'ar' ? 'رصيدك الحالي' : 'Your Balance'}
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-aura font-bold text-lg">✦ {formatBalance(user.auraBalance)}</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-nova font-bold text-lg">И {formatBalance(user.novaBalance)}</span>
              </div>
            </div>

            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">
                {language === 'ar' ? 'رسوم الدخول' : 'Entry Fee'}
              </p>
              <p className="text-xl font-bold text-primary">И {contest.entryFee}</p>
            </div>
            
            <Button 
              className="w-full h-12 bg-gradient-primary text-primary-foreground font-bold text-base"
              onClick={handleJoinContest}
              disabled={(user.novaBalance + (user.auraBalance / 2)) < contest.entryFee}
            >
              {language === 'ar' ? 'ادفع الآن' : 'Pay Now'}
            </Button>

            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              {language === 'ar' 
                ? 'يتم الخصم تلقائياً من Aura أولاً ثم Nova'
                : 'Auto-deducts from Aura first, then Nova'}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vote Dialog */}
      <Dialog open={voteDialogOpen} onOpenChange={setVoteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              {language === 'ar' ? 'صوّت لـ' : 'Vote for'} {selectedParticipant?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            {/* Free vote only in Stage 1 */}
            {isStage1 && (
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => handleConfirmVote('free')}
              >
                <span className="me-2">🆓</span>
                {language === 'ar' ? 'تصويت مجاني (مرة يومياً)' : 'Free Vote (1x daily)'}
              </Button>
            )}
            
            <Button 
              className="w-full bg-gradient-nova text-nova-foreground"
              onClick={() => handleConfirmVote('nova', 1)}
              disabled={user.novaBalance < 1}
            >
              <span className="me-2">И</span>
              {language === 'ar' ? 'صوت بـ 1 Nova' : 'Vote with 1 Nova'}
            </Button>
            
            <Button 
              className="w-full bg-gradient-aura text-aura-foreground"
              onClick={() => handleConfirmVote('aura', 1)}
              disabled={user.auraBalance < 1}
            >
              <span className="me-2">✦</span>
              {language === 'ar' ? 'صوت بـ 1 Aura' : 'Vote with 1 Aura'}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              {language === 'ar' 
                ? 'كل تصويت مدفوع يولّد إيصال'
                : 'Each paid vote generates a receipt'}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Details Dialog */}
      <ContestDetailsDialog
        contest={selectedHistoryContest}
        open={historyDetailsOpen}
        onClose={() => setHistoryDetailsOpen(false)}
        country={user.country}
      />

      {/* Receipt Dialog */}
      <ReceiptDialog
        receipt={selectedReceipt}
        open={receiptDialogOpen}
        onClose={() => setReceiptDialogOpen(false)}
      />
    </AppLayout>
  );
}
