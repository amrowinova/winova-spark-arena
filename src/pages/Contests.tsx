import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Info, Ban } from 'lucide-react';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
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
import { useBanner } from '@/contexts/BannerContext';
import { PLATFORM_USERS, getPlatformUserById } from '@/lib/platformUsers';

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
  VoteDialog,
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

// Generate participants using PLATFORM_USERS for stable IDs
const generateParticipants = () => {
  // First add all platform users with stable IDs
  const platformParticipants = PLATFORM_USERS.map((user, i) => ({
    id: user.id,
    name: user.nameAr,
    username: user.username,
    votes: Math.max(1, 95 - i * 8 + Math.floor(Math.random() * 5)),
    avatar: user.avatar,
    rank: i + 1,
    country: user.countryAr,
  }));
  
  // Add more generic participants
  const additionalNames = [
    'نورا بكر', 'رنا محمد', 'كريم فؤاد', 'دينا حسام',
    'طارق أمين', 'نادية رشيد', 'سامي جابر', 'لينا خالد', 'وائل سمير',
  ];
  const avatars = ['👨', '👩', '👨', '👩', '👨', '👩', '👨', '👩', '👨'];
  
  const additionalParticipants = [];
  for (let i = 0; i < 69; i++) {
    const votes = Math.max(1, 50 - i * 0.7 + Math.floor(Math.random() * 3));
    additionalParticipants.push({
      id: `${100 + i}`,
      name: additionalNames[i % additionalNames.length],
      username: `user_${100 + i}`,
      votes: Math.round(votes),
      avatar: avatars[i % avatars.length],
      rank: platformParticipants.length + i + 1,
      country: 'السعودية',
    });
  }
  
  // Combine and sort by votes
  const allParticipants = [...platformParticipants, ...additionalParticipants]
    .sort((a, b) => b.votes - a.votes)
    .map((p, i) => ({ ...p, rank: i + 1 }));
  
  return allParticipants;
};

const formatBalance = (value: number): string => {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
};

export default function ContestsPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user, spendAura, spendNova } = useUser();
  const { createTransaction } = useTransactions();
  const { success: showSuccess, error: showError } = useBanner();

  const [selectedTab, setSelectedTab] = useState('contestants');
  const [contest, setContest] = useState(mockContest);
  const [participants, setParticipants] = useState(generateParticipants);
  const [userVotes, setUserVotes] = useState(24);
  const [userRank, setUserRank] = useState(47);
  const [hasJoined, setHasJoined] = useState(true);
  
  // Voting state
  const [usedVotesStage1, setUsedVotesStage1] = useState(0);
  const [usedVotesFinal, setUsedVotesFinal] = useState(0);
  const [freeVoteUsed, setFreeVoteUsed] = useState(false);
  const [freeVoteActive, setFreeVoteActive] = useState(true); // Simulating free vote is active
  
  // Dialog states
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<typeof participants[0] | null>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  

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
        showError(language === 'ar' ? 'رصيد غير كافي' : 'Insufficient balance');
        return;
      }
    } else {
      showError(language === 'ar' ? 'رصيد غير كافي' : 'Insufficient balance');
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
    showSuccess(language === 'ar' ? '🎉 تم الانضمام للمسابقة!' : '🎉 Joined the contest!');
  };

  const handleVote = (participant: typeof participants[0]) => {
    setSelectedParticipant(participant);
    setVoteDialogOpen(true);
  };

  const handleConfirmVote = (voteCount: number, isFreeVote: boolean) => {
    if (!selectedParticipant) return;

    if (!isFreeVote) {
      // Calculate cost: each vote = 1 Aura = 0.5 Nova
      // Deduct from Aura first, then Nova
      let remainingVotes = voteCount;
      
      if (user.auraBalance >= remainingVotes) {
        spendAura(remainingVotes);
      } else {
        const auraToUse = user.auraBalance;
        spendAura(auraToUse);
        remainingVotes -= auraToUse;
        // Each remaining vote costs 0.5 Nova
        const novaCost = remainingVotes / 2;
        spendNova(novaCost);
      }

      // Update used votes for current stage
      if (isStage1) {
        setUsedVotesStage1(prev => prev + voteCount);
      } else {
        setUsedVotesFinal(prev => prev + voteCount);
      }
    }

    // Update participant votes and re-sort
    const updatedParticipants = participants.map(p => 
      p.id === selectedParticipant.id 
        ? { ...p, votes: p.votes + (isFreeVote ? 1 : voteCount) }
        : p
    ).sort((a, b) => b.votes - a.votes).map((p, i) => ({ ...p, rank: i + 1 }));

    setParticipants(updatedParticipants);

    // Find new rank of the voted participant
    const newParticipantData = updatedParticipants.find(p => p.id === selectedParticipant.id);
    const newRank = newParticipantData?.rank || selectedParticipant.rank;

    setVoteDialogOpen(false);

    // Show success notification
    const votesText = isFreeVote ? 1 : voteCount;
    showSuccess(
      language === 'ar' 
        ? `رائع! نجحت بالتصويت لـ ${selectedParticipant.name} بـ ${votesText} صوت وأصبح الآن #${newRank}`
        : `Great! You voted for ${selectedParticipant.name} with ${votesText} vote${votesText > 1 ? 's' : ''} and is now #${newRank}`
    );
  };

  const handleUseFreeVote = () => {
    if (!selectedParticipant || freeVoteUsed || !freeVoteActive) return;

    setFreeVoteUsed(true);
    
    // Update participant votes
    const updatedParticipants = participants.map(p => 
      p.id === selectedParticipant.id 
        ? { ...p, votes: p.votes + 1 }
        : p
    ).sort((a, b) => b.votes - a.votes).map((p, i) => ({ ...p, rank: i + 1 }));

    setParticipants(updatedParticipants);

    const newParticipantData = updatedParticipants.find(p => p.id === selectedParticipant.id);
    const newRank = newParticipantData?.rank || selectedParticipant.rank;

    setVoteDialogOpen(false);

    showSuccess(
      language === 'ar' 
        ? `🎁 رائع! استخدمت صوتك المجاني لـ ${selectedParticipant.name} وأصبح الآن #${newRank}`
        : `🎁 Great! You used your free vote for ${selectedParticipant.name} and is now #${newRank}`
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InnerPageHeader title={language === 'ar' ? 'المسابقة اليومية' : 'Daily Contest'} />
      <main className="flex-1 px-4 py-4 pb-20 space-y-4">

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
                <p className="text-xl font-bold text-primary">И {contest.entryFee}</p>
              </div>
              <Button 
                className="w-full"
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="contestants">
              {language === 'ar' ? 'المتسابقون' : 'Contestants'}
            </TabsTrigger>
            <TabsTrigger value="prizes">
              {language === 'ar' ? 'الجوائز' : 'Prizes'}
            </TabsTrigger>
          </TabsList>

          {/* Contestants Tab */}
          <TabsContent value="contestants" className="mt-4 space-y-3">
            {/* Stage-specific info */}
            {isStage1 && <ContestInfoBox variant="qualification-rules" />}
            
            {isFinal && (
              <Alert className="bg-warning/5 border-warning/20">
                <Info className="h-4 w-4 text-warning" />
                <AlertDescription className="text-xs text-warning">
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
        </Tabs>
      </main>

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
      <VoteDialog
        open={voteDialogOpen}
        onClose={() => setVoteDialogOpen(false)}
        contestant={selectedParticipant}
        stage={contest.stage}
        auraBalance={user.auraBalance}
        novaBalance={user.novaBalance}
        usedVotesStage1={usedVotesStage1}
        usedVotesFinal={usedVotesFinal}
        freeVoteUsed={freeVoteUsed}
        freeVoteActive={freeVoteActive && isStage1}
        onVote={handleConfirmVote}
        onUseFreeVote={handleUseFreeVote}
      />

      {/* Receipt Dialog */}
      <ReceiptDialog
        receipt={selectedReceipt}
        open={receiptDialogOpen}
        onClose={() => setReceiptDialogOpen(false)}
      />
      <BottomNav />
    </div>
  );
}
