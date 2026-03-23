import { useState, useEffect, useCallback } from 'react';
import { logActivity, logMoneyFlow, logFailure } from '@/lib/ai/logger';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Ban, Trophy, Clock, Users, Gift, Timer } from 'lucide-react';
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
  type ContestPhase,
} from '@/lib/contestTiming';
import { useContestConfig } from '@/hooks/useContestConfig';
import { useNovaPricing } from '@/hooks/useNovaPricing';
import { ContestShareCard, type ContestShareCardData } from '@/components/contest/ContestShareCard';

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
import { ContestCountdownBadge } from '@/components/common/ContestCountdownBadge';
import { WinCelebrationOverlay } from '@/components/contest/WinCelebrationOverlay';

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

interface LastContest {
  date: string;
  prizePool: number;
  participants: number;
  winners: Array<{ rank: number; name: string; username: string; prize: number }>;
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
  const { config: contestConfig } = useContestConfig();
  const { getCurrencyInfo } = useNovaPricing();
  const pricing = getCurrencyInfo(user.country);

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

  // Friday Free Contest state
  const [isContestFree, setIsContestFree] = useState(false);
  const [contestAdminPrize, setContestAdminPrize] = useState<number | null>(null);

  // Last completed contest — shown in pre_open phase
  const [lastContest, setLastContest] = useState<LastContest | null>(null);

  // Win celebration overlay — shown once per session when user wins
  const [celebrationOpen, setCelebrationOpen] = useState(false);

  // Device fingerprint — collects browser signals and hashes them into a short string.
  // Used as a 3rd-layer fraud prevention for free contests (no external library needed).
  const getDeviceFingerprint = (): string => {
    const nav = navigator as Navigator & { hardwareConcurrency?: number; deviceMemory?: number };
    const raw = [
      nav.userAgent,
      nav.language,
      `${screen.width}x${screen.height}`,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      nav.hardwareConcurrency ?? '',
      nav.deviceMemory ?? '',
    ].join('|');
    let h = 0;
    for (let i = 0; i < raw.length; i++) {
      h = Math.imul(31, h) + raw.charCodeAt(i) | 0;
    }
    return Math.abs(h).toString(36);
  };

  // KSA date string for share cards
  const ksaDateStr = (() => {
    const ksa = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
    return ksa.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' });
  })();

  // Build share card data based on user's contest status (results phase only)
  const shareCardData: ContestShareCardData | null = (() => {
    if (!isResults) return null;
    const myWin = winners.find((w) => w.id === authUser?.id);
    if (myWin) {
      return {
        type: 'winner',
        name: user.name || myWin.name,
        city: user.city || '',
        country: user.country || myWin.country,
        rank: myWin.rank,
        prizeNova: myWin.prize,
        prizeLocal: myWin.prize * pricing.novaRate,
        currencySymbolAr: pricing.symbolAr ?? pricing.symbol,
        currencySymbolEn: pricing.symbol,
        contestDate: ksaDateStr,
      };
    }
    if (hasJoined && userRank > 0) {
      return {
        type: 'participant',
        name: user.name,
        city: user.city || '',
        country: user.country,
        rank: userRank,
        totalParticipants: participants.length,
        contestDate: ksaDateStr,
      };
    }
    // Not joined — spectator card shown in ContestJoinCard, skip here
    return null;
  })();

  // Trigger win celebration overlay — once per session per contest win
  useEffect(() => {
    if (!isResults || !authUser) return;
    const myWin = winners.find((w) => w.id === authUser.id);
    if (!myWin) return;

    const sessionKey = `win_celebrated_${activeContestId}`;
    if (sessionStorage.getItem(sessionKey)) return; // already shown this session

    sessionStorage.setItem(sessionKey, '1');
    setCelebrationOpen(true);
  }, [isResults, winners, authUser, activeContestId]);

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
        const isFree = (contestData as Record<string, unknown>).is_free === true;
        const adminPrize = (contestData as Record<string, unknown>).admin_prize as number | null ?? null;
        setIsContestFree(isFree);
        setContestAdminPrize(adminPrize);
        setPrizePool(isFree && adminPrize ? adminPrize : (contestData.prize_pool || 0));

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

  // Fetch last completed contest for pre_open display
  const fetchLastCompletedContest = useCallback(async () => {
    try {
      const { data: contest } = await supabase
        .from('contests')
        .select('id, prize_pool, contest_date, current_participants')
        .eq('status', 'completed')
        .order('contest_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!contest) return;

      const { data: entries } = await supabase
        .from('contest_entries')
        .select('user_id, rank, prize_won')
        .eq('contest_id', contest.id)
        .order('rank', { ascending: true })
        .lte('rank', 3);

      if (!entries?.length) {
        setLastContest({ date: contest.contest_date, prizePool: contest.prize_pool || 0, participants: contest.current_participants || 0, winners: [] });
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, username')
        .in('user_id', entries.map(e => e.user_id));

      setLastContest({
        date: contest.contest_date,
        prizePool: contest.prize_pool || 0,
        participants: contest.current_participants || 0,
        winners: entries.map(e => {
          const p = profiles?.find(pr => pr.user_id === e.user_id);
          return { rank: e.rank, name: p?.name || '—', username: p?.username || '', prize: e.prize_won || 0 };
        }),
      });
    } catch (err) {
      console.error('fetchLastCompletedContest error:', err);
    }
  }, []);

  useEffect(() => {
    if (isPreOpen) fetchLastCompletedContest();
  }, [isPreOpen, fetchLastCompletedContest]);

  // In final stage, only top 50 are shown
  const displayParticipants = isFinal ? participants.slice(0, 50) : participants;
  
  // Check if user qualified for final (all qualify if ≤50 participants)
  const userQualified = participants.length <= 50 ? (userRank > 0) : (userRank <= 50 && userRank > 0);
  
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

    // Balance check only for paid contests
    if (!isContestFree && user.novaBalance < entryFee) {
      showError(language === 'ar' ? 'رصيد غير كافي' : 'Insufficient balance');
      return;
    }

    setIsJoining(true);

    try {
      const t0 = Date.now();
      const fingerprint = isContestFree ? getDeviceFingerprint() : undefined;

      const { data, error } = await supabase.rpc('join_contest', {
        p_user_id: authUser.id,
        p_contest_id: activeContestId,
        p_entry_fee: isContestFree ? 0 : entryFee,
        ...(fingerprint ? { p_device_fingerprint: fingerprint } : {}),
      });

      if (error) {
        console.error('Join contest error:', error);
        logFailure({ rpc_name: 'join_contest', user_id: authUser.id, error_message: error.message, parameters: { contest_id: activeContestId } as any });
        logActivity({ user_id: authUser.id, action_type: 'contest_join', entity_type: 'contest', entity_id: activeContestId, success: false, error_code: error.message, duration_ms: Date.now() - t0 });
        showError(error.message);
        return;
      }

      const result = data as { success: boolean; error?: string; error_code?: string; new_participants?: number; new_prize_pool?: number };

      if (!result.success) {
        logActivity({ user_id: authUser.id, action_type: 'contest_join', entity_type: 'contest', entity_id: activeContestId, success: false, error_code: result.error_code ?? result.error, duration_ms: Date.now() - t0 });
        const normalizedError = (() => {
          const code = result.error_code;
          if (language !== 'ar') {
            if (code === 'KYC_REQUIRED') return 'KYC verification required — please verify your identity first';
            if (code === 'ACCOUNT_TOO_NEW') return 'Your account must be at least 7 days old to join free contests';
            if (code === 'DEVICE_ALREADY_USED') return 'This device was already used to join this contest';
            return result.error;
          }
          if (code === 'KYC_REQUIRED') return 'يجب التحقق من هويتك أولاً — اذهب لصفحة التحقق (KYC)';
          if (code === 'ACCOUNT_TOO_NEW') return 'يجب أن يكون عمر حسابك 7 أيام على الأقل';
          if (code === 'DEVICE_ALREADY_USED') return 'تم الانضمام من هذا الجهاز مسبقاً';
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
      logActivity({ user_id: authUser.id, action_type: 'contest_join', entity_type: 'contest', entity_id: activeContestId, success: true, duration_ms: Date.now() - t0, after_state: { participants: result.new_participants, prize_pool: result.new_prize_pool, is_free: isContestFree } as any });
      if (!isContestFree) {
        logMoneyFlow({ operation: 'contest_entry_fee', from_user: authUser.id, amount: entryFee, currency: 'nova', reference_type: 'contest', reference_id: activeContestId });
      }

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
        amount: isContestFree ? 0 : entryFee,
        currency: 'nova',
        sender: {
          id: user.id,
          name: user.name,
          username: user.username,
          country: user.country,
        },
        reason: language === 'ar'
          ? (isContestFree ? 'دخول مسابقة الجمعة المجانية' : 'دخول المسابقة اليومية')
          : (isContestFree ? 'Friday Free Contest Entry' : 'Daily Contest Entry'),
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
        p_aura_amount: voteCount,
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

  // PRE-OPEN: Before 10 AM — full pre-registration experience
  if (isPreOpen && !isResults) {
    const medals = ['🥇', '🥈', '🥉'];
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <InnerPageHeader title={language === 'ar' ? 'المسابقة اليومية' : 'Daily Contest'} />
        <main className="flex-1 px-4 py-4 pb-20 space-y-4">

          {/* ── Hero Section ── */}
          <Card className="overflow-hidden border border-border">
            <div className="bg-gradient-to-br from-primary/15 via-nova/10 to-aura/10 p-5 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Trophy className="h-14 w-14 mx-auto mb-3 text-nova" />
              </motion.div>
              <h2 className="text-xl font-bold mb-1">
                {language === 'ar' ? 'مسابقة اليوم قادمة! 🏆' : "Today's Contest is Coming! 🏆"}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {language === 'ar'
                  ? `تبدأ الساعة ${formatContestTime(timing.joinOpenAt)} — باب الانضمام مفتوح الآن`
                  : `Starts at ${formatContestTime(timing.joinOpenAt)} — Join now, open all day`}
              </p>

              {/* Countdown */}
              <div className="bg-background/60 backdrop-blur-sm rounded-xl p-3 mb-4">
                <p className="text-xs text-muted-foreground mb-1">
                  {language === 'ar' ? '⏳ المرحلة الأولى تبدأ بعد' : '⏳ Stage 1 starts in'}
                </p>
                <p className="text-4xl font-bold font-mono text-primary tracking-widest">
                  {String(timeRemaining.hours).padStart(2, '0')}:{String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')}
                </p>
              </div>

              {/* Today's stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background/60 rounded-lg p-2.5">
                  <p className="text-xs text-muted-foreground mb-0.5">
                    {language === 'ar' ? 'رسوم الدخول' : 'Entry Fee'}
                  </p>
                  <p className="font-bold text-foreground">
                    {isContestFree
                      ? (language === 'ar' ? '🎉 مجاني' : '🎉 Free')
                      : `И ${entryFee} Nova`}
                  </p>
                </div>
                <div className="bg-background/60 rounded-lg p-2.5">
                  <p className="text-xs text-muted-foreground mb-0.5">
                    {language === 'ar' ? 'مسجّلون الآن' : 'Pre-registered'}
                  </p>
                  <p className="font-bold text-foreground">{participants.length}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* ── Join / Already Joined ── */}
          {activeContestId ? (
            !hasJoined ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Button className="w-full h-12 text-base font-bold" onClick={openJoinDialog}>
                  🏆 {language === 'ar' ? 'سجّل الآن — الباب مفتوح' : 'Pre-register Now — Join Open'}
                </Button>
              </motion.div>
            ) : (
              <Card className="p-4 bg-success/10 border-success/20">
                <div className="flex items-center justify-center gap-2 text-success">
                  <Trophy className="h-5 w-5" />
                  <span className="font-bold">
                    {language === 'ar' ? '✅ أنت مسجّل! المسابقة تبدأ قريباً' : '✅ Registered! Contest starts soon'}
                  </span>
                </div>
                <p className="text-xs text-center text-muted-foreground mt-1">
                  {language === 'ar'
                    ? `المرحلة الأولى بعد ${String(timeRemaining.hours).padStart(2,'0')}:${String(timeRemaining.minutes).padStart(2,'0')}:${String(timeRemaining.seconds).padStart(2,'0')}`
                    : `Stage 1 in ${String(timeRemaining.hours).padStart(2,'0')}:${String(timeRemaining.minutes).padStart(2,'0')}:${String(timeRemaining.seconds).padStart(2,'0')}`}
                </p>
              </Card>
            )
          ) : (
            <Card className="p-3 bg-muted/40 text-center border-dashed">
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? '⏳ جارٍ تجهيز مسابقة اليوم...' : "⏳ Preparing today's contest..."}
              </p>
            </Card>
          )}

          {/* ── Last Contest Results ── */}
          {lastContest && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="overflow-hidden">
                <div className="px-4 pt-4 pb-2 border-b border-border flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-nova" />
                  <p className="text-sm font-semibold flex-1">
                    {language === 'ar' ? 'فائزو آخر مسابقة' : 'Last Contest Winners'}
                  </p>
                  <span className="text-xs text-muted-foreground">{lastContest.date}</span>
                </div>
                <div className="p-3 space-y-2">
                  {lastContest.winners.length > 0 ? lastContest.winners.map((w, i) => (
                    <motion.div
                      key={w.rank}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.08 }}
                      className={`flex items-center gap-3 p-2.5 rounded-lg ${
                        i === 0 ? 'bg-nova/10' : i === 1 ? 'bg-muted/40' : 'bg-muted/20'
                      }`}
                    >
                      <span className="text-xl w-8 text-center">{medals[i] ?? `#${w.rank}`}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{w.name}</p>
                        <p className="text-xs text-muted-foreground">@{w.username}</p>
                      </div>
                      <p className="font-bold text-nova text-sm">И {w.prize}</p>
                    </motion.div>
                  )) : (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
                    </p>
                  )}
                </div>
                <div className="px-4 pb-3 flex justify-between text-xs text-muted-foreground">
                  <span>
                    {language === 'ar' ? `${lastContest.participants} مشارك` : `${lastContest.participants} participants`}
                  </span>
                  <span>
                    {language === 'ar' ? `الجائزة: И ${lastContest.prizePool}` : `Prize pool: И ${lastContest.prizePool}`}
                  </span>
                </div>
              </Card>
            </motion.div>
          )}
        </main>
        <BottomNav />

        {/* Join Dialog — reused from join_only phase */}
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
              {isContestFree ? (
                <div className="p-3 bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 rounded-lg text-center">
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    🎉 {language === 'ar' ? 'دخول مجاني' : 'Free Entry'}
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">
                    {language === 'ar' ? 'رسوم الدخول' : 'Entry Fee'}
                  </p>
                  <p className="text-xl font-bold text-primary">И {entryFee}</p>
                </div>
              )}
              <Button
                className="w-full h-12 font-bold text-base"
                onClick={handleJoinContest}
                disabled={isJoining || (!isContestFree && user.novaBalance < entryFee)}
              >
                {isJoining ? (
                  <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  language === 'ar'
                    ? (isContestFree ? 'انضم مجاناً' : 'ادفع الآن')
                    : (isContestFree ? 'Join Free' : 'Pay Now')
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // RESULTS: 10 PM - 10 AM (showing winners)
  if (isResults) {
    const top3 = winners.slice(0, 3);
    const rest = winners.slice(3);
    const MEDALS = ['🥇', '🥈', '🥉'];
    const PODIUM_HEIGHT = ['h-24', 'h-20', 'h-16'];
    const PODIUM_BG = [
      'bg-gradient-to-b from-yellow-400/20 to-yellow-600/10 border-yellow-400/40',
      'bg-gradient-to-b from-slate-300/20 to-slate-400/10 border-slate-400/40',
      'bg-gradient-to-b from-amber-600/20 to-amber-700/10 border-amber-600/40',
    ];
    const myWin = winners.find((w) => w.id === authUser?.id);

    return (
      <div className="flex min-h-screen flex-col bg-background">
        <InnerPageHeader title={language === 'ar' ? 'نتائج المسابقة' : 'Contest Results'} />
        <main className="flex-1 px-4 py-4 pb-20 space-y-4">

          {/* ── Hero Banner ── */}
          <Card className="overflow-hidden border-nova/20">
            <div className="relative bg-gradient-to-br from-nova/20 via-aura/10 to-primary/10 p-5 text-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-nova/20 to-transparent opacity-40 pointer-events-none" />
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 280, damping: 18 }}
              >
                <Trophy className="h-14 w-14 mx-auto mb-3 text-nova" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-2xl font-bold mb-1"
              >
                {language === 'ar' ? '🏆 الفائزون' : '🏆 Winners'}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
                className="text-sm text-muted-foreground mb-3"
              >
                {language === 'ar' ? 'مسابقة اليوم انتهت' : "Today's contest has ended"}
              </motion.p>
              {/* Stats row */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-4"
              >
                <div className="text-center">
                  <p className="text-2xl font-bold text-nova">И {prizePool.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{language === 'ar' ? 'مجموع الجوائز' : 'Prize Pool'}</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{participants.length}</p>
                  <p className="text-xs text-muted-foreground">{language === 'ar' ? 'مشارك' : 'Participants'}</p>
                </div>
              </motion.div>
            </div>
          </Card>

          {/* ── Podium (top 3) ── */}
          {top3.length > 0 && (
            <Card className="p-4 overflow-hidden">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4 text-center">
                {language === 'ar' ? '🏅 المنصة' : '🏅 Podium'}
              </p>
              {/* Podium columns: 2nd | 1st | 3rd */}
              <div className="flex items-end justify-center gap-3 mb-3">
                {[top3[1], top3[0], top3[2]].map((w, colIdx) => {
                  if (!w) return <div key={colIdx} className="flex-1" />;
                  const origIdx = colIdx === 0 ? 1 : colIdx === 1 ? 0 : 2;
                  const slot = contestConfig.distribution[origIdx];
                  const prize = slot ? Math.round(prizePool * slot.pct / 100) : w.prize;
                  return (
                    <motion.div
                      key={w.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + origIdx * 0.1 }}
                      className="flex-1 flex flex-col items-center"
                    >
                      <span className="text-3xl mb-1">{MEDALS[origIdx]}</span>
                      <p className="text-xs font-bold text-foreground truncate max-w-full text-center px-1">{w.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-full text-center">@{w.username}</p>
                      <p className="text-xs font-bold text-nova mt-1">И {prize.toLocaleString()}</p>
                      <div className={`w-full mt-2 rounded-t-lg border ${PODIUM_BG[origIdx]} ${PODIUM_HEIGHT[origIdx]}`} />
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ── 4th & 5th place ── */}
          {rest.length > 0 && (
            <div className="space-y-2">
              {rest.map((winner, i) => {
                const origIdx = i + 3;
                const slot = contestConfig.distribution[origIdx];
                const prize = slot ? Math.round(prizePool * slot.pct / 100) : winner.prize;
                return (
                  <motion.div
                    key={winner.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                  >
                    <Card className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center font-bold text-sm text-muted-foreground shrink-0">
                          #{winner.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{winner.name}</p>
                          <p className="text-xs text-muted-foreground">@{winner.username}</p>
                        </div>
                        <div className="text-end shrink-0">
                          <p className="font-bold text-sm text-nova">И {prize.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">{slot?.pct ?? 0}%</p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          {winners.length === 0 && (
            <Card className="p-8 text-center">
              <Trophy className="h-12 w-12 mx-auto mb-3 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'جارٍ تحميل النتائج...' : 'Loading results...'}
              </p>
            </Card>
          )}

          {/* ── Share Card ── */}
          {shareCardData && (
            <Card className="p-4 bg-gradient-to-br from-primary/5 to-nova/5 border-primary/20 text-center">
              <p className="text-sm font-bold mb-3 flex items-center justify-center gap-1.5">
                <Gift className="h-4 w-4 text-nova" />
                {language === 'ar' ? 'شارك نتيجتك 🎉' : 'Share your result 🎉'}
              </p>
              <ContestShareCard data={shareCardData} className="flex flex-col items-center" />
            </Card>
          )}

          {/* ── Next Contest Countdown ── */}
          <Card className="p-4 bg-primary/5 border-primary/20 text-center">
            <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" />
              {language === 'ar' ? 'المسابقة القادمة تبدأ بعد' : 'Next contest starts in'}
            </p>
            <p className="text-3xl font-bold font-mono text-primary tracking-widest">
              {String(timeRemaining.hours).padStart(2, '0')}:{String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')}
            </p>
          </Card>
        </main>
        <BottomNav />

        {/* Win Celebration Overlay */}
        {myWin && (
          <WinCelebrationOverlay
            open={celebrationOpen}
            name={user.name || myWin.name}
            rank={myWin.rank}
            prizeNova={myWin.prize}
            onClose={() => setCelebrationOpen(false)}
            onShare={() => {
              const text = language === 'ar'
                ? `🏆 فزت بـ ${myWin.prize} Nova في مسابقة WeNova اليوم! (المركز #${myWin.rank})\nانضم معي: ${window.location.origin}/?ref=${user.referralCode}`
                : `🏆 I just won ${myWin.prize} Nova in WeNova's daily contest! (#${myWin.rank} Place)\nJoin me: ${window.location.origin}/?ref=${user.referralCode}`;
              if (navigator.share) {
                navigator.share({ text }).catch(() => {});
              } else {
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
              }
            }}
          />
        )}
      </div>
    );
  }

  // JOIN ONLY: 10 AM - 2 PM
  if (isJoinOnly) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <InnerPageHeader title={language === 'ar' ? 'المسابقة اليومية' : 'Daily Contest'} />
        <main className="flex-1 px-4 py-4 pb-20 space-y-4">

          {/* ── Hero Prize Banner ── */}
          <Card className="overflow-hidden border-primary/20">
            <div className="relative bg-gradient-to-br from-primary/20 via-nova/10 to-aura/10 p-5 text-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 to-transparent opacity-50 pointer-events-none" />
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              >
                <Gift className="h-12 w-12 mx-auto mb-2 text-nova" />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                <p className="text-xs text-muted-foreground mb-0.5">
                  {language === 'ar' ? '💰 مجموع الجوائز' : '💰 Prize Pool'}
                </p>
                <p className="text-4xl font-bold text-nova tracking-tight">
                  И {prizePool.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  ≈ {pricing.symbol} {(prizePool * pricing.novaRate).toFixed(0)}
                </p>
              </motion.div>

              {/* 3-stat row */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
                className="mt-4 grid grid-cols-3 gap-2"
              >
                <div className="bg-background/60 backdrop-blur-sm rounded-lg p-2">
                  <p className="text-lg font-bold text-foreground">{participants.length}</p>
                  <p className="text-[10px] text-muted-foreground">{language === 'ar' ? 'مسجّل' : 'Joined'}</p>
                </div>
                <div className="bg-background/60 backdrop-blur-sm rounded-lg p-2">
                  <p className="text-lg font-bold text-foreground">
                    {isContestFree ? (language === 'ar' ? 'مجاني' : 'Free') : `И ${entryFee}`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{language === 'ar' ? 'رسوم الدخول' : 'Entry Fee'}</p>
                </div>
                <div className="bg-background/60 backdrop-blur-sm rounded-lg p-2">
                  <p className="text-lg font-bold font-mono text-primary">
                    {String(timeRemaining.hours).padStart(2, '0')}:{String(timeRemaining.minutes).padStart(2, '0')}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{language === 'ar' ? 'حتى المرحلة 1' : 'To Stage 1'}</p>
                </div>
              </motion.div>
            </div>
          </Card>

          {/* ── Stage 1 Countdown bar ── */}
          <Card className="p-3 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {language === 'ar' ? 'التصويت يبدأ بعد' : 'Voting starts in'}
                </span>
              </div>
              <span className="font-mono font-bold text-lg text-primary">
                {String(timeRemaining.hours).padStart(2, '0')}:{String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')}
              </span>
            </div>
          </Card>

          {/* ── Join / Registered Card ── */}
          {!hasJoined ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="p-4 space-y-3">
                {isContestFree ? (
                  <div className="text-center p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <p className="text-green-600 dark:text-green-400 font-bold text-lg">🎉 {language === 'ar' ? 'دخول مجاني' : 'Free Entry'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {language === 'ar' ? `الجائزة: ${contestAdminPrize ?? 100} Nova` : `Prize: ${contestAdminPrize ?? 100} Nova`}
                    </p>
                  </div>
                ) : (
                  <div className="text-center p-3 bg-primary/5 border border-primary/20 rounded-xl">
                    <p className="text-xs text-muted-foreground mb-0.5">{language === 'ar' ? 'رسوم الدخول' : 'Entry Fee'}</p>
                    <p className="text-2xl font-bold text-primary">И {entryFee}</p>
                  </div>
                )}
                <Button
                  className="w-full h-12 text-base font-bold"
                  onClick={openJoinDialog}
                  disabled={!isContestFree && user.novaBalance < entryFee}
                >
                  🏆 {language === 'ar' ? 'انضم الآن' : 'Join Now'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {language === 'ar'
                    ? `التسجيل يغلق الساعة ${formatContestTime(timing.joinCloseAt)}`
                    : `Registration closes at ${formatContestTime(timing.joinCloseAt)}`}
                </p>
              </Card>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="p-4 bg-success/10 border-success/30">
                <div className="flex items-center justify-center gap-2 text-success mb-1">
                  <Trophy className="h-5 w-5" />
                  <span className="font-bold text-base">
                    {language === 'ar' ? '✅ أنت مسجّل!' : '✅ You are registered!'}
                  </span>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  {language === 'ar'
                    ? `التصويت يبدأ بعد ${String(timeRemaining.hours).padStart(2,'0')}:${String(timeRemaining.minutes).padStart(2,'0')}:${String(timeRemaining.seconds).padStart(2,'0')}`
                    : `Voting starts in ${String(timeRemaining.hours).padStart(2,'0')}:${String(timeRemaining.minutes).padStart(2,'0')}:${String(timeRemaining.seconds).padStart(2,'0')}`}
                </p>
              </Card>
            </motion.div>
          )}

          {/* ── Registered Participants Preview ── */}
          {participants.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-4 pt-3 pb-2 border-b border-border flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold flex-1">
                  {language === 'ar' ? 'المسجّلون' : 'Registered Contestants'}
                </p>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {participants.length}
                </span>
              </div>
              <div className="p-3 space-y-1.5">
                {participants.slice(0, 6).map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-center gap-2.5 py-1"
                  >
                    <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium truncate">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.country}</span>
                  </motion.div>
                ))}
                {participants.length > 6 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{participants.length - 6} {language === 'ar' ? 'آخرين' : 'more'}
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
              {isContestFree ? (
                <div className="p-3 bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 rounded-lg text-center">
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    🎉 {language === 'ar' ? 'دخول مجاني' : 'Free Entry'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'ar' ? `الجائزة: ${contestAdminPrize ?? 100} Nova` : `Prize: ${contestAdminPrize ?? 100} Nova`}
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">
                    {language === 'ar' ? 'رسوم الدخول' : 'Entry Fee'}
                  </p>
                  <p className="text-xl font-bold text-primary">И {entryFee}</p>
                </div>
              )}
              <Button
                className="w-full h-12 font-bold text-base"
                onClick={handleJoinContest}
                disabled={isJoining || (!isContestFree && user.novaBalance < entryFee)}
              >
                {isJoining ? (
                  <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  language === 'ar'
                    ? (isContestFree ? 'انضم مجاناً' : 'ادفع الآن')
                    : (isContestFree ? 'Join Free' : 'Pay Now')
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
        <main className="flex-1 px-4 py-4 pb-20 space-y-4">
          <Card className="overflow-hidden border-primary/20">
            <div className="relative bg-gradient-to-br from-primary/15 via-nova/10 to-background p-8 text-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 to-transparent pointer-events-none" />
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
              >
                <Trophy className="h-16 w-16 mx-auto mb-4 text-primary/50" />
              </motion.div>
              <h2 className="text-xl font-bold mb-2">
                {language === 'ar' ? '🏆 ابدأ المسابقة!' : '🏆 Start the Contest!'}
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                {language === 'ar'
                  ? 'كن أول من ينضم ويبدأ المنافسة!'
                  : 'Be the first to join and start the competition!'}
              </p>
              {prizePool > 0 && (
                <div className="inline-block px-4 py-2 bg-nova/10 border border-nova/30 rounded-full mb-5">
                  <span className="text-nova font-bold">И {prizePool.toLocaleString()} Nova</span>
                  <span className="text-muted-foreground text-xs ms-1">{language === 'ar' ? 'للفائزين' : 'for winners'}</span>
                </div>
              )}
              {timing.canJoin && activeContestId && (
                <Button className="w-full max-w-xs h-12 font-bold text-base" onClick={openJoinDialog}>
                  🏆 {language === 'ar' ? 'انضم الآن' : 'Join Now'}
                </Button>
              )}
            </div>
          </Card>
        </main>
        <BottomNav />

        {/* Join Dialog */}
        <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle className="text-center">{language === 'ar' ? 'انضم للمسابقة' : 'Join Contest'}</DialogTitle>
              <DialogDescription className="text-center">
                {language === 'ar' ? 'سيتم الخصم تلقائياً من رصيدك' : 'Will be automatically deducted from your balance'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-aura/10 to-nova/10 rounded-xl border border-border/50">
                <p className="text-xs text-muted-foreground text-center mb-2">{language === 'ar' ? 'رصيدك الحالي' : 'Your Balance'}</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-aura font-bold text-lg">✦ {formatBalance(user.auraBalance)}</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-nova font-bold text-lg">И {formatBalance(user.novaBalance)}</span>
                </div>
              </div>
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">{language === 'ar' ? 'رسوم الدخول' : 'Entry Fee'}</p>
                <p className="text-xl font-bold text-primary">{isContestFree ? (language === 'ar' ? '🎉 مجاني' : '🎉 Free') : `И ${entryFee}`}</p>
              </div>
              <Button className="w-full h-12 font-bold" onClick={handleJoinContest} disabled={isJoining || (!isContestFree && user.novaBalance < entryFee)}>
                {isJoining ? <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" /> : (language === 'ar' ? (isContestFree ? 'انضم مجاناً' : 'ادفع الآن') : (isContestFree ? 'Join Free' : 'Pay Now'))}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
        <Card className={`p-3 border ${isFinal ? 'bg-destructive/5 border-destructive/30' : 'bg-primary/5 border-primary/20'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
              >
                <Clock className={`h-4 w-4 ${isFinal ? 'text-destructive' : 'text-primary'}`} />
              </motion.div>
              <span className={`text-sm font-medium ${isFinal ? 'text-destructive' : ''}`}>
                {language === 'ar'
                  ? (isStage1 ? '🟢 المرحلة الأولى جارية' : '🔴 المرحلة النهائية جارية')
                  : (isStage1 ? '🟢 Stage 1 Live' : '🔴 Final Stage Live')}
              </span>
            </div>
            <span className={`font-mono font-bold text-lg tabular-nums ${isFinal ? 'text-destructive' : 'text-primary'}`}>
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
          totalParticipants={participants.length}
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
                {isContestFree ? (
                  <>
                    <span className="inline-block bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 text-xs font-bold px-3 py-1 rounded-full mb-1">
                      {language === 'ar' ? '🎉 دخول مجاني' : '🎉 Free Entry'}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {language === 'ar' ? `الجائزة: ${contestAdminPrize ?? 100} Nova` : `Prize: ${contestAdminPrize ?? 100} Nova`}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-1">
                      {language === 'ar' ? 'رسوم الدخول' : 'Entry Fee'}
                    </p>
                    <p className="text-xl font-bold text-primary">И {entryFee}</p>
                  </>
                )}
              </div>
              <Button
                className="w-full"
                onClick={openJoinDialog}
                disabled={!isContestFree && user.novaBalance < entryFee}
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

            {isContestFree ? (
              <div className="p-3 bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  {language === 'ar' ? 'رسوم الدخول' : 'Entry Fee'}
                </p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {language === 'ar' ? '🎉 مجاني' : '🎉 Free'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'ar' ? `الجائزة: ${contestAdminPrize ?? 100} Nova` : `Prize: ${contestAdminPrize ?? 100} Nova`}
                </p>
              </div>
            ) : (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  {language === 'ar' ? 'رسوم الدخول' : 'Entry Fee'}
                </p>
                <p className="text-xl font-bold text-primary">И {entryFee}</p>
              </div>
            )}

            <Button
              className="w-full h-12 bg-gradient-primary text-primary-foreground font-bold text-base"
              onClick={handleJoinContest}
              disabled={isJoining || (!isContestFree && user.novaBalance < entryFee)}
            >
              {isJoining ? (
                <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                language === 'ar'
                  ? (isContestFree ? 'انضم مجاناً' : 'ادفع الآن')
                  : (isContestFree ? 'Join Free' : 'Pay Now')
              )}
            </Button>

            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              {isContestFree
                ? (language === 'ar' ? 'يشترط التحقق من الهوية (KYC) وعمر الحساب 7 أيام' : 'KYC verification and 7-day account age required')
                : (language === 'ar' ? 'يتم الخصم تلقائياً من Aura أولاً ثم Nova' : 'Auto-deducts from Aura first, then Nova')
              }
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
