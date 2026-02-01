import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Ban, Trophy, Clock } from 'lucide-react';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ReceiptDialog } from '@/components/common/ReceiptCard';
import { useUser } from '@/contexts/UserContext';
import { useTransactions, Receipt } from '@/contexts/TransactionContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBanner } from '@/contexts/BannerContext';
import { supabase } from '@/integrations/supabase/client';
import { getContestTiming, formatTimeRemaining, formatContestTime } from '@/lib/contestTiming';

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
  const { user: authUser } = useAuth();
  const { user, spendAura, spendNova } = useUser();
  const { createTransaction } = useTransactions();
  const { success: showSuccess, error: showError } = useBanner();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeContestId, setActiveContestId] = useState<string | null>(null);
  const [userVotes, setUserVotes] = useState(0);
  const [userRank, setUserRank] = useState(0);
  const [hasJoined, setHasJoined] = useState(false);
  const [prizePool, setPrizePool] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Contest timing - KSA based
  const [timing, setTiming] = useState(getContestTiming());
  const [timeRemaining, setTimeRemaining] = useState(formatTimeRemaining(timing.timeRemaining));
  
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

  // Stage derived from KSA timing
  const isStage1 = timing.currentStage === 'stage1';
  const isFinal = timing.currentStage === 'final';
  const isClosed = timing.currentStage === 'closed';
  const entryFee = 10;

  // Update timing every second
  useEffect(() => {
    const interval = setInterval(() => {
      const newTiming = getContestTiming();
      setTiming(newTiming);
      setTimeRemaining(formatTimeRemaining(newTiming.timeRemaining));
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Fetch real contest data
  const fetchContestData = useCallback(async () => {
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
        setActiveContestId(contestData.id);
        setPrizePool(contestData.prize_pool || 0);

        // Fetch contest entries (separate query to avoid FK issues)
        const { data: entriesData, error: entriesError } = await supabase
          .from('contest_entries')
          .select('user_id, votes_received, rank')
          .eq('contest_id', contestData.id)
          .order('votes_received', { ascending: false });

        if (!entriesError && entriesData && entriesData.length > 0) {
          // Get user IDs
          const userIds = entriesData.map(e => e.user_id);
          
          // Fetch profiles separately
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('user_id, name, username, country')
            .in('user_id', userIds);

          const profileMap: Record<string, { name: string; username: string; country: string }> = {};
          for (const p of profilesData || []) {
            profileMap[p.user_id] = { name: p.name, username: p.username, country: p.country };
          }

          const formattedParticipants: Participant[] = entriesData.map((entry, index) => ({
            id: entry.user_id,
            name: profileMap[entry.user_id]?.name || 'User',
            username: profileMap[entry.user_id]?.username || '',
            votes: entry.votes_received || 0,
            avatar: '👤',
            rank: index + 1,
            country: profileMap[entry.user_id]?.country || '',
          }));
          
          setParticipants(formattedParticipants);

          // Check if current user has joined
          if (authUser) {
            const userEntry = formattedParticipants.find(p => p.id === authUser.id);
            if (userEntry) {
              setHasJoined(true);
              setUserRank(userEntry.rank);
              setUserVotes(userEntry.votes);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching contest data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    fetchContestData();
  }, [fetchContestData]);

  // Realtime subscription for contest updates
  useEffect(() => {
    if (!activeContestId) return;

    const contestChannel = supabase
      .channel(`contest-realtime-${activeContestId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contest_entries',
          filter: `contest_id=eq.${activeContestId}`,
        },
        () => {
          // Refetch data on any contest entry change
          fetchContestData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contests',
          filter: `id=eq.${activeContestId}`,
        },
        (payload) => {
          // Update prize pool in realtime
          const updated = payload.new as { prize_pool?: number; current_participants?: number };
          if (updated.prize_pool !== undefined) {
            setPrizePool(updated.prize_pool);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(contestChannel);
    };
  }, [activeContestId, fetchContestData]);

  // In final stage, only top 50 are shown
  const displayParticipants = isFinal ? participants.slice(0, 50) : participants;
  
  // Check if user qualified for final
  const userQualified = userRank <= 50 && userRank > 0;
  
  // Votes needed for different thresholds
  const top50Threshold = participants[49]?.votes || 0;
  const top5Threshold = participants[4]?.votes || 0;
  const rank1Threshold = participants[0]?.votes || 0;

  const [isJoining, setIsJoining] = useState(false);

  const handleJoinContest = async () => {
    // Check if contest is open for joining
    if (!timing.canJoin) {
      showError(language === 'ar' ? 'التسجيل مغلق حالياً' : 'Registration is currently closed');
      return;
    }

    if (!authUser || !activeContestId) {
      showError(language === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please login first');
      return;
    }

    // Check balance before calling RPC
    if (user.novaBalance < entryFee) {
      showError(language === 'ar' ? 'رصيد غير كافي' : 'Insufficient balance');
      return;
    }

    setIsJoining(true);

    try {
      // Call atomic RPC function
      const { data, error } = await supabase.rpc('join_contest', {
        p_user_id: authUser.id,
        p_contest_id: activeContestId,
        p_entry_fee: entryFee,
      });

      if (error) {
        console.error('Join contest error:', error);
        showError(error.message);
        return;
      }

      const result = data as { success: boolean; error?: string; new_participants?: number; new_prize_pool?: number };

      if (!result.success) {
        showError(result.error || (language === 'ar' ? 'فشل الانضمام' : 'Failed to join'));
        return;
      }

      // Update local state
      setHasJoined(true);
      setPrizePool(result.new_prize_pool || prizePool);
      
      // Add user to participants list
      setParticipants(prev => {
        const newParticipant: Participant = {
          id: authUser.id,
          name: user.name,
          username: user.username,
          votes: 0,
          avatar: '👤',
          rank: prev.length + 1,
          country: user.country,
        };
        return [...prev, newParticipant];
      });

      setUserRank(participants.length + 1);

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

      setJoinDialogOpen(false);
      setSelectedReceipt(receipt);
      setReceiptDialogOpen(true);
      showSuccess(language === 'ar' ? '🎉 تم الانضمام للمسابقة!' : '🎉 Joined the contest!');
      
      // Refresh data
      fetchContestData();
    } catch (err) {
      console.error('Join error:', err);
      showError(language === 'ar' ? 'حدث خطأ' : 'An error occurred');
    } finally {
      setIsJoining(false);
    }
  };

  const handleVote = (participant: Participant) => {
    if (!timing.canVote) {
      showError(language === 'ar' ? 'التصويت مغلق حالياً' : 'Voting is currently closed');
      return;
    }
    setSelectedParticipant(participant);
    setVoteDialogOpen(true);
  };

  const [isVoting, setIsVoting] = useState(false);

  const handleConfirmVote = async (voteCount: number, isFreeVote: boolean) => {
    if (!selectedParticipant || !authUser || !activeContestId) return;
    if (!timing.canVote) {
      showError(language === 'ar' ? 'التصويت مغلق حالياً' : 'Voting is currently closed');
      return;
    }

    // Free vote handled separately
    if (isFreeVote) {
      handleUseFreeVote();
      return;
    }

    setIsVoting(true);

    try {
      // Call atomic RPC function
      const { data, error } = await supabase.rpc('cast_vote', {
        p_voter_id: authUser.id,
        p_contestant_id: selectedParticipant.id,
        p_contest_id: activeContestId,
        p_vote_count: voteCount,
      });

      if (error) {
        console.error('Vote error:', error);
        showError(error.message);
        return;
      }

      const result = data as { success: boolean; error?: string; votes_cast?: number };

      if (!result.success) {
        showError(result.error || (language === 'ar' ? 'فشل التصويت' : 'Vote failed'));
        return;
      }

      // Update local state
      if (isStage1) {
        setUsedVotesStage1(prev => prev + voteCount);
      } else {
        setUsedVotesFinal(prev => prev + voteCount);
      }

      // Update participant votes and re-sort
      const updatedParticipants = participants.map(p => 
        p.id === selectedParticipant.id 
          ? { ...p, votes: p.votes + voteCount }
          : p
      ).sort((a, b) => b.votes - a.votes).map((p, i) => ({ ...p, rank: i + 1 }));

      setParticipants(updatedParticipants);

      const newParticipantData = updatedParticipants.find(p => p.id === selectedParticipant.id);
      const newRank = newParticipantData?.rank || selectedParticipant.rank;

      setVoteDialogOpen(false);

      showSuccess(
        language === 'ar' 
          ? `رائع! نجحت بالتصويت لـ ${selectedParticipant.name} بـ ${voteCount} صوت وأصبح الآن #${newRank}`
          : `Great! You voted for ${selectedParticipant.name} with ${voteCount} vote${voteCount > 1 ? 's' : ''} and is now #${newRank}`
      );

      // Refresh data
      fetchContestData();
    } catch (err) {
      console.error('Vote error:', err);
      showError(language === 'ar' ? 'حدث خطأ' : 'An error occurred');
    } finally {
      setIsVoting(false);
    }
  };

  const handleUseFreeVote = () => {
    if (!selectedParticipant || freeVoteUsed || !freeVoteActive || isFinal) return;
    if (!timing.canVote) {
      showError(language === 'ar' ? 'التصويت مغلق حالياً' : 'Voting is currently closed');
      return;
    }

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

  // Closed state - contest not active
  if (isClosed) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <InnerPageHeader title={language === 'ar' ? 'المسابقة اليومية' : 'Daily Contest'} />
        <main className="flex-1 px-4 py-4 pb-20 flex items-center justify-center">
          <div className="text-center">
            <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-lg font-bold mb-2">
              {language === 'ar' ? 'المسابقة مغلقة' : 'Contest Closed'}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {language === 'ar' 
                ? `المسابقة القادمة تبدأ الساعة ${formatContestTime(timing.stage1Start)}`
                : `Next contest starts at ${formatContestTime(timing.stage1Start)}`}
            </p>
            <Card className="p-4 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">
                {language === 'ar' ? 'الوقت المتبقي' : 'Time until next contest'}
              </p>
              <p className="text-2xl font-bold font-mono">
                {String(timeRemaining.hours).padStart(2, '0')}:{String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')}
              </p>
            </Card>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  // Empty state - no participants yet
  if (!isLoading && participants.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <InnerPageHeader title={language === 'ar' ? 'المسابقة اليومية' : 'Daily Contest'} />
        <main className="flex-1 px-4 py-4 pb-20 flex items-center justify-center">
          <div className="text-center">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-lg font-bold mb-2">
              {language === 'ar' ? 'لا يوجد مشاركين بعد' : 'No Participants Yet'}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {language === 'ar' 
                ? 'كن أول من ينضم للمسابقة!'
                : 'Be the first to join the contest!'}
            </p>
            {timing.canJoin && (
              <Button onClick={() => setJoinDialogOpen(true)}>
                {language === 'ar' ? 'انضم الآن' : 'Join Now'}
              </Button>
            )}
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

        {/* Stage Header - Based on KSA time */}
        <motion.div
          key={timing.currentStage}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {isStage1 ? (
            <ContestStageHeader
              stage="stage1"
              participants={participants.length}
              endsAt={timing.stage1End}
            />
          ) : (
            <FinalStageHeader
              participants={Math.min(50, participants.length)}
              prizePool={prizePool}
              endsAt={timing.finalEnd}
              country={user.country}
            />
          )}
        </motion.div>

        {/* Live Timer */}
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {language === 'ar' 
                  ? (isStage1 ? 'المرحلة الأولى' : 'المرحلة النهائية')
                  : (isStage1 ? 'Stage 1' : 'Final Stage')}
              </span>
            </div>
            <span className="font-mono font-bold text-lg">
              {String(timeRemaining.hours).padStart(2, '0')}:{String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')}
            </span>
          </div>
        </Card>

        {/* User Status Card */}
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
        {isStage1 && !hasJoined && timing.canJoin && (
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
                disabled={user.novaBalance < entryFee}
              >
                {language === 'ar' ? 'انضم الآن' : 'Join Now'}
              </Button>
            </Card>
          </motion.div>
        )}

        {/* Contestants Section */}
        <div className="space-y-3">
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
                        canVote={hasJoined && timing.canVote}
                        votesExhausted={votesExhausted}
                      />
                    ) : (
                      <FinalContestantCard
                        contestant={participant}
                        index={index}
                        onVote={handleVote}
                        canVote={userQualified && hasJoined && timing.canVote}
                        votesExhausted={votesExhausted}
                      />
                    )}
                  
                    {/* Prize notice after 5th contestant */}
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
              disabled={isJoining || user.novaBalance < entryFee}
            >
              {isJoining ? (
                <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                language === 'ar' ? 'ادفع الآن' : 'Pay Now'
              )}
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
          stage={isStage1 ? 'stage1' : 'final'}
          auraBalance={user.auraBalance}
          novaBalance={user.novaBalance}
          usedVotesStage1={usedVotesStage1}
          usedVotesFinal={usedVotesFinal}
          freeVoteUsed={freeVoteUsed}
          freeVoteActive={freeVoteActive && isStage1}
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
