import { useState, useEffect, useCallback } from 'react';
import { logActivity, logMoneyFlow, logFailure } from '@/lib/ai/logger';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Ban, Trophy, Clock, Users, Gift, Timer, CalendarClock } from 'lucide-react';
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
import { 
  getContestTiming, 
  formatTimeRemaining, 
  formatContestTime,
  getPhaseLabel,
  getCountdownTarget,
  type ContestPhase 
} from '@/lib/contestTiming';

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

interface Winner {
  id: string;
  name: string;
  username: string;
  rank: number;
  prize: number;
  votes: number;
  country: string;
}

const formatBalance = (value: number): string => {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
};

// Prize distribution percentages
const PRIZE_DISTRIBUTION = [50, 20, 15, 10, 5]; // Top 5

export default function ContestsPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user: authUser } = useAuth();
  const { user, spendAura, spendNova } = useUser();
  const { createTransaction } = useTransactions();
  const { success: showSuccess, error: showError } = useBanner();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
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
  // freeVoteActive removed — freeVoteUsed is the authoritative guard (fetched from DB)
  
  // Dialog states
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  // Phase checks
  const currentPhase = timing.currentPhase;
  const isPreOpen = currentPhase === 'pre_open';
  const isJoinOnly = currentPhase === 'join_only';
  const isStage1 = currentPhase === 'stage1';
  const isFinal = currentPhase === 'final';
  const isResults = currentPhase === 'results';
  const entryFee = 10;

  // Update timing every second — stop when results are live (no countdown needed)
  useEffect(() => {
    if (isResults) return;
    const interval = setInterval(() => {
      const newTiming = getContestTiming();
      setTiming(newTiming);
      setTimeRemaining(formatTimeRemaining(newTiming.timeRemaining));
      // Clear once we enter results phase so interval stops naturally
      if (newTiming.phase === 'results') clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [isResults]);

  // Safety: if join dialog is open and join window closes (19:00 KSA), close it immediately.
  useEffect(() => {
    if (joinDialogOpen && !timing.canJoin) {
      setJoinDialogOpen(false);
    }
  }, [joinDialogOpen, timing.canJoin]);

  // Fetch real contest data
  const fetchContestData = useCallback(async () => {
    try {
      // Use Saudi date for "today"
      const { getSaudiDateStr } = await import('@/lib/contestTiming');
      const ksaToday = getSaudiDateStr();

      const { data: contestData, error: contestError } = await supabase
        .from('contests')
        .select('*')
        .eq('contest_date', ksaToday)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (contestError) {
        showError(language === 'ar' ? 'فشل تحميل المسابقة' : 'Failed to load contest');
        return;
      }

      if (contestData) {
        setActiveContestId(contestData.id);
        setPrizePool(contestData.prize_pool || 0);

        // Fetch contest entries
        const { data: entriesData, error: entriesError } = await supabase
          .from('contest_entries')
          .select('user_id, votes_received, rank, prize_won, free_vote_used')
          .eq('contest_id', contestData.id)
          .order('votes_received', { ascending: false });

        if (entriesError) {
          showError(language === 'ar' ? 'فشل تحميل بيانات المسابقة' : 'Failed to load contest data');
          setParticipants([]);
          setWinners([]);
          setHasJoined(false);
          setUserRank(0);
          setUserVotes(0);
          setFreeVoteUsed(false);
          return;
        }

        if (!entriesData || entriesData.length === 0) {
          setParticipants([]);
          setWinners([]);
          setHasJoined(false);
          setUserRank(0);
          setUserVotes(0);
          setFreeVoteUsed(false);
          return;
        }

        if (entriesData && entriesData.length > 0) {
          const userIds = entriesData.map(e => e.user_id);
          
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, name, username, country')
            .in('user_id', userIds);

          if (profilesError) {
            console.error('Failed to fetch contestant profiles:', profilesError);
          }

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

          // Set winners for results phase
          if (isResults && contestData.status === 'completed') {
            const topWinners: Winner[] = entriesData
              .slice(0, 5)
              .map((entry, index) => ({
                id: entry.user_id,
                name: profileMap[entry.user_id]?.name || 'User',
                username: profileMap[entry.user_id]?.username || '',
                rank: index + 1,
                prize: entry.prize_won || 0,
                votes: entry.votes_received || 0,
                country: profileMap[entry.user_id]?.country || '',
              }));
            setWinners(topWinners);
          }

          // Check if current user has joined TODAY's contest
          if (authUser) {
            const userEntryData = entriesData.find(e => e.user_id === authUser.id);
            const userEntry = formattedParticipants.find(p => p.id === authUser.id);
            if (userEntry) {
              setHasJoined(true);
              setUserRank(userEntry.rank);
              setUserVotes(userEntry.votes);
              // Check if user has used their free vote
              if (userEntryData?.free_vote_used) {
                setFreeVoteUsed(true);
              }
            } else {
              setHasJoined(false);
              setUserRank(0);
              setUserVotes(0);
              setFreeVoteUsed(false);
            }

            // Restore votes-cast counts from DB so they survive page refresh
            const { data: voteRows } = await supabase
              .from('votes')
              .select('aura_spent, created_at')
              .eq('voter_id', authUser.id)
              .eq('contest_id', contestData.id);

            if (voteRows && voteRows.length > 0) {
              const { stage1Start, stage1End, finalStart } = getContestTiming();
              const s1StartMs = stage1Start.getTime();
              const s1EndMs = stage1End.getTime();
              const finalStartMs = finalStart.getTime();
              let s1 = 0;
              let fin = 0;
              for (const v of voteRows) {
                const ms = new Date(v.created_at).getTime();
                if (ms >= s1StartMs && ms < s1EndMs) s1 += v.aura_spent || 0;
                else if (ms >= finalStartMs) fin += v.aura_spent || 0;
              }
              setUsedVotesStage1(s1);
              setUsedVotesFinal(fin);
            } else {
              setUsedVotesStage1(0);
              setUsedVotesFinal(0);
            }
          } else {
            setHasJoined(false);
            setUserRank(0);
            setUserVotes(0);
            setFreeVoteUsed(false);
          }
        }
      } else {
        // Strict zero-state: never keep stale UI when there is no real contest record.
        setActiveContestId(null);
        setPrizePool(0);
        setParticipants([]);
        setWinners([]);
        setHasJoined(false);
        setUserRank(0);
        setUserVotes(0);
        setFreeVoteUsed(false);
      }
    } catch (err) {
      showError(language === 'ar' ? 'فشل تحميل المسابقة' : 'Failed to load contest');
    } finally {
      setIsLoading(false);
    }
  }, [authUser, isResults, language, showError]);

  useEffect(() => {
    fetchContestData();
  }, [fetchContestData]);

  // Realtime subscription
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
        () => fetchContestData()
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
          const updated = payload.new as { prize_pool?: number };
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

  // Unified handler: opens dialog only after full pre-check
  const openJoinDialog = () => {
    // Pre-check 1: user logged in
    if (!authUser) {
      showError(language === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please login first');
      return;
    }
    // Pre-check 2: real active contest exists
    if (!activeContestId) {
      showError(language === 'ar' ? 'لا توجد مسابقة لليوم' : 'No contest for today');
      return;
    }
    // Pre-check 3: within join window (KSA timing)
    if (!timing.canJoin) {
      showError(language === 'ar' ? 'تم إغلاق باب الانضمام' : 'Registration is closed');
      return;
    }
    // All good → open payment dialog
    setJoinDialogOpen(true);
  };

  const handleJoinContest = async () => {
    // Double-check before server call (user could have stale dialog)
    if (!timing.canJoin) {
      showError(language === 'ar' ? 'تم إغلاق باب الانضمام' : 'Registration is closed');
      setJoinDialogOpen(false);
      return;
    }

    if (!authUser || !activeContestId) {
      showError(language === 'ar' ? 'لا توجد مسابقة لليوم' : 'No contest for today');
      setJoinDialogOpen(false);
      return;
    }

    if (user.novaBalance < entryFee) {
      showError(language === 'ar' ? 'رصيد غير كافي' : 'Insufficient balance');
      return;
    }

    setIsJoining(true);

    try {
      const t0 = Date.now();
      const { data, error } = await supabase.rpc('join_contest', {
        p_user_id: authUser.id,
        p_contest_id: activeContestId,
        p_entry_fee: entryFee,
      });

      if (error) {
        console.error('Join contest error:', error);
        logFailure({ rpc_name: 'join_contest', user_id: authUser.id, error_message: error.message, parameters: { contest_id: activeContestId } as any });
        logActivity({ user_id: authUser.id, action_type: 'contest_join', entity_type: 'contest', entity_id: activeContestId, success: false, error_code: error.message, duration_ms: Date.now() - t0 });
        showError(error.message);
        return;
      }

      const result = data as { success: boolean; error?: string; new_participants?: number; new_prize_pool?: number };

      if (!result.success) {
        logActivity({ user_id: authUser.id, action_type: 'contest_join', entity_type: 'contest', entity_id: activeContestId, success: false, error_code: result.error, duration_ms: Date.now() - t0 });
        const normalizedError = (() => {
          if (!result.error) return undefined;
          if (language !== 'ar') return result.error;
          if (result.error === 'Joining is closed') return 'تم إغلاق باب الانضمام';
          if (result.error === 'No contest for today') return 'لا توجد مسابقة لليوم';
          if (result.error === 'Already joined this contest') return 'أنت منضم بالفعل لهذه المسابقة';
          if (result.error === 'Insufficient Nova balance') return 'رصيد Nova غير كافي';
          return result.error;
        })();

        showError(normalizedError || (language === 'ar' ? 'فشل الانضمام' : 'Failed to join'));
        return;
      }

      // Log successful join with balance impact
      logActivity({ user_id: authUser.id, action_type: 'contest_join', entity_type: 'contest', entity_id: activeContestId, success: true, duration_ms: Date.now() - t0, after_state: { participants: result.new_participants, prize_pool: result.new_prize_pool } as any });
      logMoneyFlow({ operation: 'contest_entry_fee', from_user: authUser.id, amount: entryFee, currency: 'nova', reference_type: 'contest', reference_id: activeContestId });

      setHasJoined(true);
      setPrizePool(result.new_prize_pool || prizePool);
      
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

    if (isFreeVote) {
      handleUseFreeVote();
      return;
    }

    setIsVoting(true);

    try {
      const t0 = Date.now();
      const { data, error } = await supabase.rpc('cast_vote', {
        p_voter_id: authUser.id,
        p_contestant_id: selectedParticipant.id,
        p_contest_id: activeContestId,
        p_vote_count: voteCount,
      });

      if (error) {
        console.error('Vote error:', error);
        logFailure({ rpc_name: 'cast_vote', user_id: authUser.id, error_message: error.message, parameters: { contest_id: activeContestId, vote_count: voteCount } as any });
        logActivity({ user_id: authUser.id, action_type: 'contest_vote', entity_type: 'contest', entity_id: activeContestId, success: false, error_code: error.message, duration_ms: Date.now() - t0 });
        showError(error.message);
        return;
      }

      const result = data as { success: boolean; error?: string; votes_cast?: number };

      if (!result.success) {
        logActivity({ user_id: authUser.id, action_type: 'contest_vote', entity_type: 'contest', entity_id: activeContestId, success: false, error_code: result.error, duration_ms: Date.now() - t0 });
        if (result.error === 'rate_limited') {
          showError(language === 'ar' ? '⏱️ لقد تجاوزت الحد المسموح به. الحد الأقصى 10 أصوات في الدقيقة.' : '⏱️ Too many votes. Maximum 10 votes per minute allowed.');
        } else {
          showError(result.error || (language === 'ar' ? 'فشل التصويت' : 'Vote failed'));
        }
        return;
      }

      // Log successful vote
      logActivity({ user_id: authUser.id, action_type: 'contest_vote', entity_type: 'contest', entity_id: activeContestId, success: true, duration_ms: Date.now() - t0, after_state: { contestant: selectedParticipant.id, votes_cast: voteCount } as any });
      logMoneyFlow({ operation: 'contest_vote', from_user: authUser.id, amount: voteCount, currency: 'aura', reference_type: 'contest', reference_id: activeContestId });

      if (isStage1) {
        setUsedVotesStage1(prev => prev + voteCount);
      } else {
        setUsedVotesFinal(prev => prev + voteCount);
      }

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

      fetchContestData();
    } catch (err) {
      console.error('Vote error:', err);
      showError(language === 'ar' ? 'حدث خطأ' : 'An error occurred');
    } finally {
      setIsVoting(false);
    }
  };

  const handleUseFreeVote = async () => {
    if (!selectedParticipant || freeVoteUsed || isFinal) return;
    if (!timing.canVote) {
      showError(language === 'ar' ? 'التصويت مغلق حالياً' : 'Voting is currently closed');
      return;
    }
    if (!authUser || !activeContestId) return;

    setIsVoting(true);

    try {
      const { data, error } = await supabase.rpc('cast_free_vote', {
        p_voter_id: authUser.id,
        p_contestant_id: selectedParticipant.id,
        p_contest_id: activeContestId,
      });

      if (error) {
        console.error('Free vote error:', error);
        showError(error.message);
        return;
      }

      const result = data as { success: boolean; error?: string };

      if (!result.success) {
        showError(result.error || (language === 'ar' ? 'فشل التصويت المجاني' : 'Free vote failed'));
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

      fetchContestData();
    } catch (err) {
      console.error('Free vote error:', err);
      showError(language === 'ar' ? 'حدث خطأ' : 'An error occurred');
    } finally {
      setIsVoting(false);
    }
  };

  // Get countdown info
  const countdownInfo = getCountdownTarget(timing);

  // ==================== RENDER PHASES ====================

  // PRE-OPEN: Before 10 AM
  if (isPreOpen && !isResults) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <InnerPageHeader title={language === 'ar' ? 'المسابقة اليومية' : 'Daily Contest'} />
        <main className="flex-1 px-4 py-4 pb-20 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <CalendarClock className="h-16 w-16 mx-auto mb-4 text-primary/30" />
            <h2 className="text-xl font-bold mb-2">
              {language === 'ar' ? 'المسابقة قريباً' : 'Contest Coming Soon'}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {language === 'ar' 
                ? `سيتم فتح مسابقة اليوم الساعة ${formatContestTime(timing.joinOpenAt)}`
                : `Today's contest opens at ${formatContestTime(timing.joinOpenAt)}`}
            </p>
            <Card className="p-4 bg-primary/5 border-primary/20">
              <p className="text-xs text-muted-foreground mb-2">
                {language === 'ar' ? 'الوقت المتبقي للفتح' : 'Time until opening'}
              </p>
              <p className="text-3xl font-bold font-mono text-primary">
                {String(timeRemaining.hours).padStart(2, '0')}:{String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')}
              </p>
            </Card>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  // RESULTS: 10 PM - 10 AM (showing winners)
  if (isResults) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <InnerPageHeader title={language === 'ar' ? 'نتائج المسابقة' : 'Contest Results'} />
        <main className="flex-1 px-4 py-4 pb-20 space-y-4">
          {/* Results Header */}
          <Card className="p-5 bg-gradient-to-br from-nova/10 via-aura/5 to-primary/10 border-nova/20">
            <div className="text-center">
              <Trophy className="h-12 w-12 mx-auto mb-3 text-nova" />
              <h2 className="text-xl font-bold mb-1">
                {language === 'ar' ? '🏆 الفائزون' : '🏆 Winners'}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {language === 'ar' ? 'مسابقة اليوم انتهت' : "Today's contest has ended"}
              </p>
              <div className="flex items-center justify-center gap-2 text-lg font-bold text-nova">
                <Gift className="h-5 w-5" />
                <span>И {prizePool.toLocaleString()}</span>
              </div>
            </div>
          </Card>

          {/* Winners List */}
          <div className="space-y-3">
            {winners.length > 0 ? (
              winners.map((winner, index) => {
                const prizePercent = PRIZE_DISTRIBUTION[index] || 0;
                const prizeAmount = (prizePool * prizePercent) / 100;
                
                return (
                  <motion.div
                    key={winner.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className={`p-4 ${index === 0 ? 'bg-nova/10 border-nova/30' : 'bg-card'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                          index === 0 ? 'bg-nova/20 text-nova' : 
                          index === 1 ? 'bg-muted text-foreground' :
                          index === 2 ? 'bg-amber-500/20 text-amber-500' :
                          'bg-muted/50 text-muted-foreground'
                        }`}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${winner.rank}`}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold">{winner.name}</p>
                          <p className="text-xs text-muted-foreground">@{winner.username}</p>
                        </div>
                        <div className="text-end">
                          <p className="font-bold text-nova">И {prizeAmount.toFixed(0)}</p>
                          <p className="text-xs text-muted-foreground">{prizePercent}%</p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })
            ) : (
              <Card className="p-6 text-center">
                <Trophy className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'لا توجد نتائج بعد' : 'No results yet'}
                </p>
              </Card>
            )}
          </div>

          {/* Next Contest Countdown */}
          <Card className="p-4 bg-muted/30">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">
                {language === 'ar' ? 'المسابقة القادمة' : 'Next Contest'}
              </p>
              <p className="text-2xl font-bold font-mono">
                {String(timeRemaining.hours).padStart(2, '0')}:{String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')}
              </p>
            </div>
          </Card>
        </main>
        <BottomNav />
      </div>
    );
  }

  // JOIN ONLY: 10 AM - 2 PM
  if (isJoinOnly) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <InnerPageHeader title={language === 'ar' ? 'المسابقة اليومية' : 'Daily Contest'} />
        <main className="flex-1 px-4 py-4 pb-20 space-y-4">
          {/* Join Phase Header */}
          <Card className="p-5 bg-gradient-to-br from-primary/10 to-aura/5 border-primary/20">
            <div className="text-center">
              <Users className="h-10 w-10 mx-auto mb-3 text-primary" />
              <h2 className="text-xl font-bold mb-1">
                {language === 'ar' ? '📝 التسجيل مفتوح' : '📝 Registration Open'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' 
                  ? 'سجّل الآن وانتظر بداية المرحلة الأولى'
                  : 'Register now and wait for Stage 1 to start'}
              </p>
            </div>
          </Card>

          {/* Live Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 text-center">
              <Users className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{participants.length}</p>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'مشترك' : 'Participants'}
              </p>
            </Card>
            <Card className="p-4 text-center">
              <Gift className="h-5 w-5 mx-auto mb-2 text-nova" />
              <p className="text-2xl font-bold text-nova">И {prizePool}</p>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'مجموع الجوائز' : 'Prize Pool'}
              </p>
            </Card>
          </div>

          {/* Countdown to Stage 1 */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {language === 'ar' ? 'المرحلة الأولى تبدأ بعد' : 'Stage 1 starts in'}
                </span>
              </div>
              <span className="font-mono font-bold text-lg text-primary">
                {String(timeRemaining.hours).padStart(2, '0')}:{String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')}
              </span>
            </div>
          </Card>

          {/* Join Card */}
          {!hasJoined ? (
            <Card className="p-4">
              <div className="text-center mb-3">
                <p className="text-sm text-muted-foreground mb-1">
                  {language === 'ar' ? 'رسوم الدخول' : 'Entry Fee'}
                </p>
                <p className="text-xl font-bold text-primary">И {entryFee}</p>
              </div>
              <Button 
                className="w-full"
                onClick={openJoinDialog}
                disabled={user.novaBalance < entryFee}
              >
                {language === 'ar' ? 'انضم الآن' : 'Join Now'}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                {language === 'ar' 
                  ? `التسجيل يغلق الساعة ${formatContestTime(timing.joinCloseAt)}`
                  : `Registration closes at ${formatContestTime(timing.joinCloseAt)}`}
              </p>
            </Card>
          ) : (
            <Card className="p-4 bg-success/10 border-success/20">
              <div className="flex items-center justify-center gap-2 text-success">
                <Trophy className="h-5 w-5" />
                <span className="font-bold">
                  {language === 'ar' ? '✅ أنت مسجّل!' : '✅ You are registered!'}
                </span>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">
                {language === 'ar' 
                  ? 'انتظر بداية المرحلة الأولى للتصويت'
                  : 'Wait for Stage 1 to start voting'}
              </p>
            </Card>
          )}

          {/* Registered Participants Preview */}
          {participants.length > 0 && (
            <Card className="p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                {language === 'ar' ? 'المسجّلين' : 'Registered'}
              </h3>
              <div className="space-y-2">
                {participants.slice(0, 5).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-muted-foreground text-xs">{p.country}</span>
                  </div>
                ))}
                {participants.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{participants.length - 5} {language === 'ar' ? 'آخرين' : 'more'}
                  </p>
                )}
              </div>
            </Card>
          )}
        </main>
        <BottomNav />
        
        {/* Join Dialog */}
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
            </div>
          </DialogContent>
        </Dialog>

        {/* Receipt Dialog */}
        {selectedReceipt && (
          <ReceiptDialog
            receipt={selectedReceipt}
            open={receiptDialogOpen}
            onClose={() => setReceiptDialogOpen(false)}
          />
        )}
      </div>
    );
  }

  // Loading guard — never render vote buttons until DB data is confirmed.
  // hasJoined starts as false; showing cards before fetchContestData finishes
  // means a logged-in user sees disabled buttons with no explanation.
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <InnerPageHeader title={language === 'ar' ? 'المسابقة اليومية' : 'Daily Contest'} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="h-12 w-12 mx-auto rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <p className="text-sm text-muted-foreground">
              {language === 'ar' ? 'جارٍ تحميل المسابقة...' : 'Loading contest...'}
            </p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  // Empty state - no participants yet (for Stage 1 / Final)
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
            {timing.canJoin && activeContestId && (
              <Button onClick={openJoinDialog}>
                {language === 'ar' ? 'انضم الآن' : 'Join Now'}
              </Button>
            )}
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  // STAGE 1 & FINAL: Active competition phases
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InnerPageHeader title={language === 'ar' ? 'المسابقة اليومية' : 'Daily Contest'} />
      <main className="flex-1 px-4 py-4 pb-20 space-y-4">

        {/* Stage Header - Based on KSA time */}
        <motion.div
          key={currentPhase}
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

        {/* Join Close Warning (Stage 1 only, before 6 PM) */}
        {isStage1 && timing.canJoin && (
          <Alert className="bg-warning/5 border-warning/20">
            <Timer className="h-4 w-4 text-warning" />
            <AlertDescription className="text-xs text-warning font-medium">
              {language === 'ar' 
                ? `⏰ التسجيل يغلق الساعة ${formatContestTime(timing.joinCloseAt)}`
                : `⏰ Registration closes at ${formatContestTime(timing.joinCloseAt)}`}
            </AlertDescription>
          </Alert>
        )}

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

        {/* Join Button (Stage 1 only, if not joined, before 6 PM) */}
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
                onClick={openJoinDialog}
                disabled={user.novaBalance < entryFee}
              >
                {language === 'ar' ? 'انضم الآن' : 'Join Now'}
              </Button>
            </Card>
          </motion.div>
        )}

        {/* Registration Closed Notice (Stage 1, after 6 PM, not joined) */}
        {isStage1 && !hasJoined && !timing.canJoin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="p-4 bg-muted/30 border-muted">
              <div className="text-center">
                <Ban className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="font-bold text-muted-foreground mb-1">
                  {language === 'ar' ? 'تم إغلاق باب الانضمام' : 'Registration Closed'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' 
                    ? 'يمكنك المشاركة في مسابقة الغد'
                    : "You can join tomorrow's contest"}
                </p>
              </div>
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
          freeVoteActive={isStage1}
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
