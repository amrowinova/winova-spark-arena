import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Wallet, AlertCircle } from 'lucide-react';
import { useP2PSafe } from '@/contexts/P2PContext';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { OnboardingTip } from '@/components/ui/OnboardingTip';
import { Card } from '@/components/ui/card';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNovaPricing } from '@/hooks/useNovaPricing';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthRequired } from '@/contexts/AuthRequiredContext';
import { supabase } from '@/integrations/supabase/client';

// Home Components
import { ActiveUsersCard } from '@/components/home/ActiveUsersCard';
import { PlatformStatsBar } from '@/components/home/PlatformStatsBar';
import { LuckyLeadersCard } from '@/components/home/LuckyLeadersCard';
import { TopWinnersCard } from '@/components/home/TopWinnersCard';
import { ContestJoinCard } from '@/components/home/ContestJoinCard';
import { SocialProofTicker } from '@/components/home/SocialProofTicker';
import { getContestTiming, getSaudiDateStr } from '@/lib/contestTiming';
import { getDeviceFingerprint } from '@/lib/deviceFingerprint';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBanner } from '@/contexts/BannerContext';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

// Format number - remove decimals if whole number
const formatBalance = (value: number): string => {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
};

export default function HomePage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { user } = useUser();
  const { chats: p2pChats } = useP2PSafe();
  const { success: showSuccess, error: showError } = useBanner();
  const { openAuthFlow } = useAuthRequired();
  const [searchParams, setSearchParams] = useSearchParams();

  // On mount: if ?ref=CODE is present and user is not logged in, open signup with pre-filled referral
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode && !authUser) {
      openAuthFlow('signup', refCode.toUpperCase());
      // Remove the ?ref= param from the URL so it doesn't re-trigger on re-renders
      setSearchParams({}, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Check for active P2P orders, disputes, or unread messages
  const hasActiveP2POrder = p2pChats.some(chat => 
    chat.orders.some(order => 
      ['created', 'waiting_payment', 'paid', 'dispute'].includes(order.status)
    )
  );
  const hasP2PDispute = p2pChats.some(chat => 
    chat.orders.some(order => order.status === 'dispute')
  );
  const hasUnreadP2P = p2pChats.some(chat => chat.unreadCount > 0);
  const showP2PAlert = hasActiveP2POrder || hasP2PDispute || hasUnreadP2P;
  
  // Get local currency info
  const { getCurrencyInfo } = useNovaPricing();
  const pricing = getCurrencyInfo(user.country);
  const novaLocalValue = user.novaBalance * pricing.novaRate;

  // Real contest data from DB
  const [activeContestId, setActiveContestId] = useState<string | null>(null);
  const [prizePool, setPrizePool] = useState(0);
  const [participantCount, setParticipantCount] = useState(0);
  const [isFreeContest, setIsFreeContest] = useState(false);
  const [adminPrize, setAdminPrize] = useState<number | undefined>(undefined);
  const [hasJoined, setHasJoined] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const isJoinModalOpen = joinDialogOpen;
  const [isJoining, setIsJoining] = useState(false);

  // Contest timing from KSA
  const [timing, setTiming] = useState(getContestTiming());
  const entryFee = 10;

  // Update timing every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTiming(getContestTiming());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
      const ksaToday = getSaudiDateStr();
      const { data: contestData } = await supabase
        .from('contests')
        .select('id, prize_pool, current_participants, contest_date, is_free, admin_prize')
        .eq('contest_date', ksaToday)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (contestData) {
        setActiveContestId(contestData.id);
        const free = !!(contestData as { is_free?: boolean }).is_free;
        const ap = (contestData as { admin_prize?: number }).admin_prize ?? undefined;
        setIsFreeContest(free);
        setAdminPrize(ap);
        // Free contests: prize is fixed admin_prize; paid: accumulated prize_pool
        setPrizePool(free && ap != null ? ap : (contestData.prize_pool || 0));
        setParticipantCount(contestData.current_participants || 0);

        // Check if user has joined THIS contest
        if (authUser) {
          const { data: entryData } = await supabase
            .from('contest_entries')
            .select('id')
            .eq('contest_id', contestData.id)
            .eq('user_id', authUser.id)
            .maybeSingle();

          setHasJoined(!!entryData);
        } else {
          setHasJoined(false);
        }
      } else {
        // Strict zero-state: never keep stale UI when there is no real active contest.
        setActiveContestId(null);
        setPrizePool(0);
        setParticipantCount(0);
        setHasJoined(false);
        setIsFreeContest(false);
        setAdminPrize(undefined);
      }
    } catch (err) {
      console.error('Error fetching contest:', err);
    }
  }, [authUser]);

  useEffect(() => {
    fetchContestData();
  }, [fetchContestData]);

  // Realtime: update participant count + prize pool when new entries join
  useEffect(() => {
    if (!activeContestId) return;
    const channel = supabase
      .channel(`home_contest_entries_${activeContestId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'contest_entries', filter: `contest_id=eq.${activeContestId}` },
        () => {
          setParticipantCount((prev) => prev + 1);
          // Free contests have a fixed prize pool — do not increment
          if (!isFreeContest) {
            setPrizePool((prev) => prev + 6);
          }
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [activeContestId, isFreeContest]);

  const handleJoinContest = () => {
    if (!authUser) {
      showError(t('home.errors.loginFirst'));
      return;
    }

    // Must have a real contest for today
    if (!activeContestId) {
      showError(t('home.errors.noContest'));
      return;
    }

    // Join eligibility: canJoin is true from midnight to 7 PM KSA
    if (!timing.canJoin) {
      showError(t('home.errors.joiningClosed'));
      return;
    }

    setJoinDialogOpen(true);
  };

  const confirmJoin = async () => {
    if (!authUser || !activeContestId) {
      showError(t('home.errors.noContest'));
      return;
    }

    if (!timing.canJoin) {
      showError(t('home.errors.joiningClosed'));
      setJoinDialogOpen(false);
      return;
    }

    if (user.novaBalance < entryFee) {
      // Don't pay — show insufficient balance inside modal
      return;
    }

    setIsJoining(true);

    try {
      const { data, error } = await supabase.rpc('join_contest', {
        p_user_id:            authUser.id,
        p_contest_id:         activeContestId,
        p_entry_fee:          isFreeContest ? 0 : entryFee,
        p_device_fingerprint: isFreeContest ? getDeviceFingerprint() : null,
      });

      if (error) {
        console.error('Join contest error:', error);
        showError(error.message);
        return;
      }

      const result = data as { success: boolean; error?: string };

      if (!result.success) {
        const errorKey = (() => {
          if (!result.error) return 'home.errors.joinFailed';
          if (result.error === 'Joining is closed') return 'home.errors.joiningClosed';
          if (result.error === 'No contest for today') return 'home.errors.noContest';
          if (result.error === 'Already joined this contest') return 'home.errors.alreadyJoined';
          if (result.error === 'Insufficient Nova balance') return 'home.errors.insufficientNova';
          return null;
        })();

        showError(errorKey ? t(errorKey) : (result.error ?? t('home.errors.joinFailed')));
        return;
      }

      setHasJoined(true);
      setJoinDialogOpen(false);
      showSuccess(t('home.success.joinedContest'));

      // Navigate to contests page
      navigate('/contests');
    } catch (err) {
      console.error('Join error:', err);
      showError(t('home.errors.generic'));
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <AppLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-4 py-3 space-y-4"
      >
        {/* Active Users Badge - Compact inline bar */}
        <motion.div variants={itemVariants} className="flex justify-center">
          <ActiveUsersCard />
        </motion.div>

        {/* Platform Stats Bar */}
        <motion.div variants={itemVariants}>
          <PlatformStatsBar />
        </motion.div>

        {/* 1️⃣ Welcome Message + Streak Badge */}
        <motion.div variants={itemVariants} className="text-center px-2">
          <p className="text-xl font-bold text-foreground mb-1">{t('home.heyUser', { name: user.name })}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{t('home.tagline')}</p>
          {/* Streak Badge — shown when user has ≥1 active week */}
          {user.weeklyStreak > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-gradient-to-r from-orange-500/15 to-nova/15 border border-orange-500/30 rounded-full"
            >
              <motion.span
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
                className="text-base leading-none"
              >
                🔥
              </motion.span>
              <span className="text-xs font-bold text-orange-500">
                {user.weeklyStreak}
              </span>
              <span className="text-xs text-muted-foreground">
                {user.weeklyStreak >= 4 ? t('home.weekStreakBonus') : t('home.weekStreak')}
              </span>
              {user.weeklyStreak >= 4 && (
                <span className="text-[10px] font-semibold text-nova">
                  {t('home.streakBonus')}
                </span>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Wallet Card - Matching Wallet page design */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border border-border bg-card shadow-sm">
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Nova Balance - Gold accent */}
                <div className="space-y-1">
                  <div className="bg-nova/5 border border-nova/20 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-nova text-lg font-bold">И</span>
                      <span className="text-foreground/70 text-xs font-medium">Nova</span>
                    </div>
                    <p className="text-foreground text-2xl font-bold">
                      {formatBalance(user.novaBalance)}
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      ≈ {pricing.symbol} {formatBalance(novaLocalValue)}
                    </p>
                  </div>
                  {/* 3️⃣ Nova Explanation */}
                  <p className="text-[10px] text-muted-foreground leading-snug px-1">
                    <span>💰</span>{' '}
                    {t('home.novaExplanation')}
                  </p>
                </div>

                {/* Aura Balance - Purple accent, no local currency */}
                <div className="space-y-1">
                  <div className="bg-aura/5 border border-aura/20 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-aura text-lg font-bold">✦</span>
                      <span className="text-foreground/70 text-xs font-medium">Aura</span>
                    </div>
                    <p className="text-foreground text-2xl font-bold">
                      {formatBalance(user.auraBalance)}
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      {t('home.auraVotingPoints')}
                    </p>
                  </div>
                  {/* 2️⃣ Aura Explanation */}
                  <p className="text-[10px] text-muted-foreground leading-snug px-1">
                    <span>✨</span>{' '}
                    {t('home.auraExplanation')}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Quick Actions - Wallet & P2P - Directly below balance */}
        <motion.div variants={itemVariants} className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <Button asChild variant="outline" className="h-11 flex items-center justify-center gap-2 bg-card hover:bg-muted/50 border-border/50">
              <Link to="/wallet">
                <Wallet className="h-4 w-4 text-nova" />
                <span className="text-sm font-medium">{t('home.myWallet')}</span>
              </Link>
            </Button>
            <div className="flex flex-col gap-1.5">
              <Button asChild variant="outline" className="h-11 flex items-center justify-center gap-2 bg-card hover:bg-muted/50 border-border/50">
                <Link to="/p2p">
                  <span className="text-base">🤝</span>
                  <span className="text-sm font-medium">{t('home.p2pTransfer')}</span>
                </Link>
              </Button>
              {/* P2P Active Order Status - Informational, teal color */}
              {hasActiveP2POrder && (
                <Link to="/p2p" className="block">
                  <div className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-primary/10 border border-primary/30 rounded-lg text-primary">
                    <span className="text-[11px] font-medium">
                      {t('home.p2pInProgress')}
                    </span>
                  </div>
                </Link>
              )}
            </div>
          </div>
          {/* 4️⃣ Transfer Clarification */}
          <p className="text-[10px] text-muted-foreground text-center leading-snug">
            <span>🔁</span>{' '}
            {t('home.transferExplanation')}
          </p>
        </motion.div>

        {/* Contextual onboarding tips — shown once per phase, never repeated */}
        <motion.div variants={itemVariants} className="space-y-2">
          <OnboardingTip tipType="contest_pre_open" condition={timing.currentPhase === 'pre_open'} />
          <OnboardingTip tipType="contest_join"     condition={timing.currentPhase === 'stage1' && timing.canJoin} />
          <OnboardingTip tipType="contest_voting"   condition={timing.currentPhase === 'stage1'} />
          <OnboardingTip tipType="contest_final"    condition={timing.currentPhase === 'final'} />
        </motion.div>

        {/* Social Proof Ticker */}
        <motion.div variants={itemVariants}>
          <SocialProofTicker />
        </motion.div>

        {/* Daily Contest Card - Most prominent */}
        <motion.div variants={itemVariants}>
          <ContestJoinCard
            prizePool={prizePool}
            participants={participantCount}
            entryFee={entryFee}
            hasJoined={hasJoined}
            onJoin={handleJoinContest}
            contestAvailable={!!activeContestId}
            isFree={isFreeContest}
            adminPrize={adminPrize}
          />
        </motion.div>


        {/* Top Winners - Highest Nova Prize Earners */}
        <motion.div variants={itemVariants}>
          <TopWinnersCard limit={5} />
        </motion.div>

        {/* Lucky Leaders - متصدري المحظوظين */}
        <motion.div variants={itemVariants}>
          <LuckyLeadersCard limit={5} />
        </motion.div>
      </motion.div>

      {/* Join Contest Dialog - Simplified Single Payment */}
      <Dialog open={isJoinModalOpen && !!activeContestId} onOpenChange={setJoinDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center">{t('home.joinContestTitle')}</DialogTitle>
            <DialogDescription className="text-center">{t('home.autoDeduct')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Combined Balance Box */}
            <div className="p-4 bg-gradient-to-r from-aura/10 to-nova/10 rounded-xl border border-border/50">
              <p className="text-xs text-muted-foreground text-center mb-2">
                {t('home.yourCurrentBalance')}
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-aura font-bold text-lg">✦ {formatBalance(user.auraBalance)}</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-nova font-bold text-lg">И {formatBalance(user.novaBalance)}</span>
              </div>
            </div>

            {/* Entry Fee */}
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">{t('home.entryFeeLabel')}</p>
              <p className="text-xl font-bold text-primary">И 10</p>
            </div>

            {user.novaBalance < entryFee ? (
              <div className="space-y-3">
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-center space-y-1">
                  <p className="text-sm font-semibold text-destructive">
                    ⚠️ {t('home.insufficientBalance')}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('home.topUpNeed')}
                  </p>
                </div>
                <Button
                  asChild
                  className="w-full h-12 bg-gradient-to-r from-nova to-amber-500 text-primary-foreground font-bold text-base"
                >
                  <Link to="/p2p">
                    {t('home.topUpNow')}
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <Button
                  className="w-full h-12 bg-gradient-primary text-primary-foreground font-bold text-base"
                  onClick={confirmJoin}
                  disabled={isJoining}
                >
                  {isJoining ? (
                    <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
                  ) : (
                    t('home.payNow')
                  )}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                  {t('home.deductNote')}
                </p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
