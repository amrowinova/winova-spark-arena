import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Ban, Trophy } from 'lucide-react';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ReceiptDialog } from '@/components/common/ReceiptCard';
import { useUser } from '@/contexts/UserContext';
import { useTransactions, Receipt } from '@/contexts/TransactionContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBanner } from '@/contexts/BannerContext';
import { supabase } from '@/integrations/supabase/client';

// Contest Components
import {
  ContestStageHeader,
  ContestUserStatusCard,
  ContestContestantCard,
  ContestInfoBox,
  FinalStageHeader,
  FinalContestantCard,
  VoteDialog,
} from '@/components/contest';

interface Participant {
  id: string;
  name: string;
  username: string;
  votes: number;
  avatar: string;
  rank: number;
  country: string;
}

const formatBalance = (value: number): string => {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
};

export default function ContestsPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user, spendAura, spendNova } = useUser();
  const { createTransaction } = useTransactions();
  const { success: showSuccess, error: showError } = useBanner();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [userVotes, setUserVotes] = useState(0);
  const [userRank, setUserRank] = useState(0);
  const [hasJoined, setHasJoined] = useState(false);
  const [prizePool, setPrizePool] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Voting state
  const [usedVotesStage1, setUsedVotesStage1] = useState(0);
  const [usedVotesFinal, setUsedVotesFinal] = useState(0);
  const [freeVoteUsed, setFreeVoteUsed] = useState(false);
  const [freeVoteActive, setFreeVoteActive] = useState(true);
  
  // Dialog states
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  
  // Stage - default to stage1
  const [demoStage, setDemoStage] = useState<'stage1' | 'final'>('stage1');
  const isStage1 = demoStage === 'stage1';
  const isFinal = demoStage === 'final';

  // Contest timing
  const stage1EndsAt = new Date();
  stage1EndsAt.setHours(18, 0, 0, 0);
  if (stage1EndsAt < new Date()) stage1EndsAt.setDate(stage1EndsAt.getDate() + 1);
  
  const finalEndsAt = new Date(stage1EndsAt.getTime() + 4 * 60 * 60 * 1000);
  const entryFee = 10;

  // Fetch real contest data
  useEffect(() => {
    async function fetchContestData() {
      try {
        // Fetch active contest
        const { data: contestData, error: contestError } = await supabase
          .from('contests')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (contestData) {
          setPrizePool(contestData.prize_pool || 0);
        }

        // Fetch contest entries with profiles
        const { data: entriesData, error: entriesError } = await supabase
          .from('contest_entries')
          .select(`
            user_id,
            votes_received,
            rank,
            profiles!inner(name, username, country)
          `)
          .eq('contest_id', contestData?.id || '')
          .order('votes_received', { ascending: false });

        if (!entriesError && entriesData) {
          const formattedParticipants: Participant[] = entriesData.map((entry: any, index: number) => ({
            id: entry.user_id,
            name: entry.profiles?.name || 'User',
            username: entry.profiles?.username || '',
            votes: entry.votes_received || 0,
            avatar: '👤',
            rank: index + 1,
            country: entry.profiles?.country || '',
          }));
          setParticipants(formattedParticipants);
        }
      } catch (err) {
        console.error('Error fetching contest data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchContestData();
  }, []);

  // In final stage, only top 50 are shown
  const displayParticipants = isFinal ? participants.slice(0, 50) : participants;
  
  // Check if user qualified for final
  const userQualified = userRank <= 50 && userRank > 0;
  
  // Votes needed for different thresholds
  const top50Threshold = participants[49]?.votes || 0;
  const top5Threshold = participants[4]?.votes || 0;
  const rank1Threshold = participants[0]?.votes || 0;

  const handleJoinContest = () => {
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
        username: user.username,
        country: user.country,
      },
      reason: language === 'ar' 
        ? 'دخول المسابقة اليومية'
        : 'Daily Contest Entry',
    });

    setHasJoined(true);
    setJoinDialogOpen(false);
    setSelectedReceipt(receipt);
    setReceiptDialogOpen(true);
    showSuccess(language === 'ar' ? '🎉 تم الانضمام للمسابقة!' : '🎉 Joined the contest!');
  };

  const handleVote = (participant: Participant) => {
    setSelectedParticipant(participant);
    setVoteDialogOpen(true);
  };

  const handleConfirmVote = (voteCount: number, isFreeVote: boolean) => {
    if (!selectedParticipant) return;

    if (!isFreeVote) {
      let remainingVotes = voteCount;
      
      if (user.auraBalance >= remainingVotes) {
        spendAura(remainingVotes);
      } else {
        const auraToUse = user.auraBalance;
        spendAura(auraToUse);
        remainingVotes -= auraToUse;
        const novaCost = remainingVotes / 2;
        spendNova(novaCost);
      }

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

    const newParticipantData = updatedParticipants.find(p => p.id === selectedParticipant.id);
    const newRank = newParticipantData?.rank || selectedParticipant.rank;

    setVoteDialogOpen(false);

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

  // Empty state
  if (!isLoading && participants.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <InnerPageHeader title={language === 'ar' ? 'المسابقة اليومية' : 'Daily Contest'} />
        <main className="flex-1 px-4 py-4 pb-20 flex items-center justify-center">
          <div className="text-center">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-lg font-bold mb-2">
              {language === 'ar' ? 'لا توجد مسابقة نشطة' : 'No Active Contest'}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {language === 'ar' 
                ? 'المسابقة اليومية ستبدأ قريباً!'
                : 'The daily contest will start soon!'}
            </p>
            <Button onClick={() => setJoinDialogOpen(true)}>
              {language === 'ar' ? 'كن أول المشاركين' : 'Be the First to Join'}
            </Button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

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
          key={demoStage}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {isStage1 ? (
            <ContestStageHeader
              stage="stage1"
              participants={participants.length}
              endsAt={stage1EndsAt}
            />
          ) : (
            <FinalStageHeader
              participants={Math.min(50, participants.length)}
              prizePool={prizePool}
              endsAt={finalEndsAt}
              country={user.country}
            />
          )}
        </motion.div>

        {/* User Status Card - Unified for both stages */}
        <ContestUserStatusCard
          userRank={userRank}
          userVotes={userVotes}
          stage={isStage1 ? 'qualifying' : 'final'}
          prizePool={prizePool}
          votesNeededForTop50={top50Threshold}
          votesNeededForTop5={top5Threshold}
          votesNeededForRank1={rank1Threshold}
          hasJoined={hasJoined}
        />

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
                <p className="text-xl font-bold text-primary">И {entryFee}</p>
              </div>
              <Button 
                className="w-full"
                onClick={() => setJoinDialogOpen(true)}
                disabled={(user.novaBalance + (user.auraBalance / 2)) < entryFee}
              >
                {language === 'ar' ? 'انضم الآن' : 'Join Now'}
              </Button>
            </Card>
          </motion.div>
        )}

        {/* Contestants Section - No tabs */}
        <div className="space-y-3">
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
              {displayParticipants.map((participant, index) => {
                const maxVotesPerStage = 100;
                const usedVotes = isStage1 ? usedVotesStage1 : usedVotesFinal;
                const remainingVotes = maxVotesPerStage - usedVotes;
                const votesExhausted = remainingVotes <= 0;
                
                return (
                  <div key={participant.id}>
                    {isStage1 ? (
                      <ContestContestantCard
                        contestant={participant}
                        index={index}
                        onVote={handleVote}
                        canVote={hasJoined}
                        votesExhausted={votesExhausted}
                      />
                    ) : (
                      <FinalContestantCard
                        contestant={participant}
                        index={index}
                        onVote={handleVote}
                        canVote={userQualified && hasJoined}
                        votesExhausted={votesExhausted}
                      />
                    )}
                  
                    {/* Fixed notice after 5th contestant */}
                    {participant.rank === 5 && (
                      <motion.div
                        key="prize-notice"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-2 px-3 bg-warning/10 border border-warning/30 rounded-lg mt-2"
                      >
                        <p className="text-xs text-warning font-medium text-center">
                          ⚠️ {language === 'ar' 
                            ? 'الجوائز تعتمد على ترتيبك النهائي عند انتهاء وقت المسابقة'
                            : 'Prizes depend on your final rank when the contest ends'}
                        </p>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
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
              <p className="text-xl font-bold text-primary">И {entryFee}</p>
            </div>
            
            <Button 
              className="w-full h-12 bg-gradient-primary text-primary-foreground font-bold text-base"
              onClick={handleJoinContest}
              disabled={(user.novaBalance + (user.auraBalance / 2)) < entryFee}
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
      {selectedParticipant && (
        <VoteDialog
          open={voteDialogOpen}
          onClose={() => setVoteDialogOpen(false)}
          contestant={selectedParticipant}
          stage={demoStage}
          auraBalance={user.auraBalance}
          novaBalance={user.novaBalance}
          usedVotesStage1={usedVotesStage1}
          usedVotesFinal={usedVotesFinal}
          freeVoteUsed={freeVoteUsed}
          freeVoteActive={freeVoteActive}
          onVote={handleConfirmVote}
          onUseFreeVote={handleUseFreeVote}
        />
      )}

      {/* Receipt Dialog */}
      {selectedReceipt && (
        <ReceiptDialog
          receipt={selectedReceipt}
          open={receiptDialogOpen}
          onClose={() => setReceiptDialogOpen(false)}
        />
      )}

      <BottomNav />
    </div>
  );
}
