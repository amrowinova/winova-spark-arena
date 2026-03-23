import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Clock, Users, ArrowRight, Gift, Award, Lock, CheckCircle, Vote, AlertTriangle, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useNovaPricing } from '@/hooks/useNovaPricing';
import { Link } from 'react-router-dom';
import { getContestTiming, getSaudiDateStr, type ContestTimingInfo } from '@/lib/contestTiming';
import { useContestConfig } from '@/hooks/useContestConfig';
import { ContestShareCard } from '@/components/contest/ContestShareCard';
import { supabase } from '@/integrations/supabase/client';

interface LastWinner {
  rank: number;
  name: string;
  username: string;
  prizeNova: number;
}

interface ContestJoinCardProps {
  prizePool: number;
  participants: number;
  entryFee: number;
  hasJoined: boolean;
  userRank?: number;
  onJoin: () => void;
  contestAvailable?: boolean;
  userQualified?: boolean;
  /** True when today is Friday and contest is free */
  isFree?: boolean;
  /** Fixed prize set by admin for free contests */
  adminPrize?: number;
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Live HH:MM:SS countdown hook — uses real UTC target */
function useCountdown(targetMs: number): { display: string; remainingMs: number } {
  const [remaining, setRemaining] = useState(Math.max(0, targetMs - Date.now()));

  useEffect(() => {
    const tick = () => {
      setRemaining(Math.max(0, targetMs - Date.now()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1000);
  const display = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return { display, remainingMs: remaining };
}

export function ContestJoinCard({
  prizePool,
  participants,
  entryFee,
  hasJoined,
  userRank,
  onJoin,
  contestAvailable = true,
  userQualified = false,
  isFree = false,
  adminPrize,
}: ContestJoinCardProps) {
  const { language } = useLanguage();
  const { user } = useUser();
  const { getCurrencyInfo } = useNovaPricing();
  const { config } = useContestConfig();
  const pricing = getCurrencyInfo(user.country);
  const isRTL = language === 'ar';

  const totalNovaEquivalent = user.novaBalance + user.auraBalance / 2;

  // Last contest winners — shown when no active contest
  const [lastWinners, setLastWinners] = useState<LastWinner[]>([]);
  const [lastPrizePool, setLastPrizePool] = useState(0);
  const [lastDate, setLastDate] = useState('');

  const fetchLastWinners = useCallback(async () => {
    const { data: contest } = await supabase
      .from('contests')
      .select('id, prize_pool, contest_date')
      .eq('status', 'completed')
      .order('contest_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!contest) return;
    setLastPrizePool(contest.prize_pool ?? 0);
    setLastDate(contest.contest_date ?? '');

    const { data: entries } = await supabase
      .from('contest_entries')
      .select('user_id, final_rank, prize_won')
      .eq('contest_id', contest.id)
      .not('final_rank', 'is', null)
      .order('final_rank', { ascending: true })
      .limit(3);
    if (!entries?.length) return;

    const ids = entries.map((e) => e.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', ids);

    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
    setLastWinners(entries.map((e) => ({
      rank: e.final_rank ?? 0,
      name: profileMap[e.user_id]?.full_name ?? '—',
      username: profileMap[e.user_id]?.username ?? '',
      prizeNova: e.prize_won ?? 0,
    })));
  }, []);

  useEffect(() => {
    if (!contestAvailable) fetchLastWinners();
  }, [contestAvailable, fetchLastWinners]);

  // Live timing (Saudi-based)
  const [timing, setTiming] = useState<ContestTimingInfo>(getContestTiming());
  useEffect(() => {
    const id = setInterval(() => setTiming(getContestTiming()), 1000);
    return () => clearInterval(id);
  }, []);

  const phase = timing.currentPhase;

  // Countdown targets for each state
  const countdownToStage1 = useCountdown(timing.stage1Start.getTime());
  const countdownToRegClose = useCountdown(timing.joinCloseAt.getTime());
  const countdownToFinal = useCountdown(timing.finalStart.getTime());
  const countdownToPhase1End = useCountdown(timing.stage1End.getTime());
  const countdownToFinalEnd = useCountdown(timing.finalEnd.getTime());
  const countdownToNextOpen = useCountdown(
    phase === 'results' ? timing.resultsEnd.getTime() : timing.joinOpenAt.getTime()
  );

  // Prize distribution — from admin-controlled config
  const prizes = config.distribution.map((d) => ({
    label: isRTL ? `المركز ${d.arLabel}` : `${d.label} Place`,
    emoji: d.emoji,
    pct: d.pct,
  }));

  const noBalance = totalNovaEquivalent < entryFee;

  // Urgency: less than 60 min until registration closes
  const regCloseUrgent = countdownToRegClose.remainingMs > 0 && countdownToRegClose.remainingMs < 60 * 60 * 1000;

  // Saudi date for display
  const saudiDateForDisplay = (() => {
    const ksa = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
    const day = String(ksa.getDate()).padStart(2, '0');
    const month = String(ksa.getMonth() + 1).padStart(2, '0');
    const year = ksa.getFullYear();
    return `${day}/${month}/${year}`;
  })();

  // ─── No contest available — show last winners + countdown ───
  if (!contestAvailable) {
    const MEDALS = ['🥇', '🥈', '🥉'];

    return (
      <Card className="overflow-hidden border border-border shadow-sm">
        {/* Header — gradient hero */}
        <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-background p-4 border-b border-border text-center overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary to-transparent pointer-events-none" />
          <motion.div
            animate={{ rotate: [0, -8, 8, -4, 0] }}
            transition={{ repeat: Infinity, duration: 4, repeatDelay: 3 }}
            className="inline-block mb-2"
          >
            <Trophy className="h-10 w-10 text-primary mx-auto" />
          </motion.div>
          <p className="font-bold text-foreground text-lg">
            {isRTL ? '🏆 نتائج آخر مسابقة' : '🏆 Last Contest Results'}
          </p>
          {lastDate && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {lastDate}
            </p>
          )}
          {lastPrizePool > 0 && (
            <div className="mt-2 inline-block px-3 py-1 bg-nova/10 border border-nova/30 rounded-full">
              <span className="text-nova font-bold text-sm">
                И {lastPrizePool.toLocaleString()} Nova
              </span>
              <span className="text-muted-foreground text-xs ms-1">
                ≈ {pricing.symbol} {(lastPrizePool * pricing.novaRate).toFixed(0)}
              </span>
            </div>
          )}
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Winners podium */}
          {lastWinners.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {isRTL ? 'الفائزون' : 'Winners'}
              </p>
              {lastWinners.map((w, i) => (
                <motion.div
                  key={w.rank}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border ${
                    w.rank === 1
                      ? 'bg-yellow-500/10 border-yellow-500/30'
                      : w.rank === 2
                      ? 'bg-slate-400/10 border-slate-400/30'
                      : 'bg-amber-600/10 border-amber-600/30'
                  }`}
                >
                  <span className="text-2xl leading-none">{MEDALS[i]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{w.name}</p>
                    {w.username && (
                      <p className="text-xs text-muted-foreground truncate">@{w.username}</p>
                    )}
                  </div>
                  <div className="text-end shrink-0">
                    <p className="font-bold text-sm text-nova">И {w.prizeNova.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Nova</p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-muted-foreground text-sm">
              <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-40" />
              {isRTL ? 'لا توجد نتائج سابقة' : 'No previous results yet'}
            </div>
          )}

          {/* Countdown to next contest */}
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-center">
            <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" />
              {isRTL ? 'المسابقة القادمة تبدأ بعد' : 'Next contest starts in'}
            </p>
            <p className="font-mono font-bold text-2xl text-primary tracking-widest">
              {countdownToNextOpen.display}
            </p>
          </div>

          {/* CTA */}
          <Button asChild variant="outline" className="w-full">
            <Link to="/contests">
              {isRTL ? '📊 عرض كامل النتائج' : '📊 View Full Results'}
              <ArrowRight className="h-4 w-4 ms-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ─── Determine Join/Status Zone ───
  const renderJoinStatusZone = () => {
    // State A — Before 10:00 AM KSA (pre-registration allowed)
    if (phase === 'pre_open') {
      if (hasJoined) {
        return (
          <div className="p-3 bg-success/10 border border-success/30 rounded-lg text-center space-y-1">
            <div className="flex items-center justify-center gap-2 text-success">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-semibold">
                {isRTL ? 'أنت مسجّل' : 'You are registered'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isRTL ? `التصويت يبدأ بعد ${countdownToStage1.display}` : `Voting starts in ${countdownToStage1.display}`}
            </p>
          </div>
        );
      }

      // noBalance check removed — modal handles insufficient balance

      return (
        <div className="space-y-2">
          {/* FOMO pulse — show when real participants already joined */}
          {participants > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-2 p-2 bg-nova/10 border border-nova/30 rounded-lg"
            >
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-base leading-none"
              >
                🔥
              </motion.span>
              <span className="text-xs font-semibold text-nova">
                {isRTL
                  ? `${participants} لاعب انضم بالفعل — المجموع ${prizePool} Nova`
                  : `${participants} players joined — Prize pool: ${prizePool} Nova`}
              </span>
            </motion.div>
          )}
          <Button
            className="w-full h-12 text-base font-bold"
            disabled={!contestAvailable}
            onClick={contestAvailable ? onJoin : undefined}
          >
            🏆 {isRTL ? `انضم للمسابقة — التصويت يبدأ بعد ${countdownToStage1.display}` : `Join Contest — Voting starts in ${countdownToStage1.display}`}
          </Button>
        </div>
      );
    }

    // State E — After 10:00 PM KSA (results)
    if (phase === 'results') {
      // Joined user: simple "ended" pill (full share card is in /contests)
      if (hasJoined) {
        return (
          <div className="p-3 bg-muted/50 border border-border rounded-lg text-center space-y-1">
            <div className="flex items-center justify-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-muted-foreground">
                {isRTL ? 'انتهت المسابقة' : 'Contest Ended'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isRTL ? `التسجيل يفتح بعد ${countdownToNextOpen.display}` : `Registration opens in ${countdownToNextOpen.display}`}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-1">
              <Link to="/contests">
                {isRTL ? 'شاهد نتيجتك' : 'View your result'}
                <ArrowRight className="h-3 w-3 ms-1" />
              </Link>
            </Button>
          </div>
        );
      }

      // Non-participant: FOMO spectator card
      const ksaDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
      const spectatorData = {
        type: 'spectator' as const,
        totalParticipants: participants,
        prizeNova: prizePool,
        prizeLocal: prizePool * pricing.novaRate,
        currencySymbolAr: pricing.symbolAr ?? pricing.symbol,
        currencySymbolEn: pricing.symbol,
        contestDate: ksaDate.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }),
      };
      return (
        <div className="flex flex-col items-center gap-2 py-1">
          <ContestShareCard data={spectatorData} className="flex flex-col items-center" />
          <p className="text-xs text-muted-foreground">
            {isRTL ? `التسجيل يفتح بعد ${countdownToNextOpen.display}` : `Registration opens in ${countdownToNextOpen.display}`}
          </p>
        </div>
      );
    }

    // State B — 10 AM to 7 PM KSA (Phase 1 active, registration open)
    if ((phase === 'stage1' || phase === 'join_only') && timing.canJoin) {
      if (hasJoined) {
        return (
          <div className="p-3 bg-success/10 border border-success/30 rounded-lg text-center space-y-1">
            <div className="flex items-center justify-center gap-2 text-success">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-semibold">
                {isRTL ? 'أنت مسجّل' : 'You are registered'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              ⚠️ {isRTL ? `ينتهي التسجيل بعد ${countdownToRegClose.display}` : `Registration closes in ${countdownToRegClose.display}`}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link to="/contests">
                {isRTL ? 'شاهد المسابقة' : 'View Contest'}
                <ArrowRight className="h-3 w-3 ms-1" />
              </Link>
            </Button>
          </div>
        );
      }

      // noBalance check removed — modal handles insufficient balance

      return (
        <div className="space-y-2">
          <Button
            className={`w-full h-12 text-base font-bold ${regCloseUrgent ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : ''}`}
            disabled={!contestAvailable}
            onClick={contestAvailable ? onJoin : undefined}
          >
            🏆 {isRTL
              ? `انضم — يغلق باب الانضمام خلال ${countdownToRegClose.display}`
              : `Join — Registration closes in ${countdownToRegClose.display}`}
          </Button>
        </div>
      );
    }

    // State C — 7 PM to 8 PM KSA (registration closed, waiting for final)
    if (phase === 'stage1' && !timing.canJoin) {
      if (hasJoined) {
        return (
          <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg text-center space-y-1">
            <div className="flex items-center justify-center gap-2 text-primary">
              <Trophy className="h-4 w-4" />
              <span className="text-sm font-semibold">
                {isRTL ? 'انتظر المرحلة النهائية' : 'Wait for Final Stage'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isRTL ? `تبدأ بعد ${countdownToFinal.display}` : `Starts in ${countdownToFinal.display}`}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link to="/contests">
                {isRTL ? 'شاهد المسابقة' : 'View Contest'}
                <ArrowRight className="h-3 w-3 ms-1" />
              </Link>
            </Button>
          </div>
        );
      }

      return (
        <div className="p-3 bg-muted/50 border border-border rounded-lg text-center">
          <div className="flex items-center justify-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground">
              {isRTL ? 'انتهى التسجيل' : 'Registration Closed'}
            </span>
          </div>
        </div>
      );
    }

    // State D — 8 PM to 10 PM KSA (Final active)
    if (phase === 'final') {
      if (hasJoined && userQualified) {
        return (
          <div className="space-y-2">
            <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 text-primary">
                <Trophy className="h-4 w-4" />
                <span className="text-sm font-semibold">
                  {isRTL ? 'تأهلت — صوّت الآن' : 'Qualified — Vote Now'}
                </span>
              </div>
            </div>
            <Button asChild className="w-full h-11">
              <Link to="/contests">
                <Vote className="h-4 w-4 me-2" />
                {isRTL ? 'ادخل المسابقة' : 'Enter Contest'}
              </Link>
            </Button>
          </div>
        );
      }

      if (hasJoined && !userQualified) {
        const referralLink = `${window.location.origin}/?ref=${user.referralCode}`;
        const shareText = isRTL
          ? `🏆 انضم معي في WeNova وشارك في المسابقات اليومية واربح Nova!\n${referralLink}`
          : `🏆 Join me in WeNova — daily contests with real prizes!\n${referralLink}`;
        const handleLoserShare = () => {
          if (navigator.share) {
            navigator.share({ text: shareText }).catch(() => {});
          } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
          }
        };
        return (
          <div className="space-y-2">
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-center">
              <span className="text-sm font-semibold text-destructive">
                ❌ {isRTL ? 'لم تتأهل للمرحلة النهائية' : 'Did not qualify for Final Stage'}
              </span>
            </div>
            {/* Loser Motivation — turn frustration into referral action */}
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-center space-y-2">
              <p className="text-xs font-semibold text-foreground">
                {isRTL
                  ? '🚀 شارك رابطك وأصدقاؤك يصوتون لك غداً!'
                  : '🚀 Share your link so friends vote for you tomorrow!'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isRTL
                  ? 'كل صوت من صديق = نقطة إضافية في المحظوظين'
                  : 'Every vote from a friend = extra Spotlight point'}
              </p>
              <Button
                size="sm"
                className="w-full gap-2 bg-gradient-to-r from-primary to-nova text-white font-bold"
                onClick={handleLoserShare}
              >
                <span>📤</span>
                {isRTL ? 'شارك الرابط عبر واتساب' : 'Share via WhatsApp'}
              </Button>
            </div>
          </div>
        );
      }

      return (
        <div className="p-3 bg-muted/50 border border-border rounded-lg text-center">
          <div className="flex items-center justify-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground">
              {isRTL ? 'انتهى التسجيل' : 'Registration Closed'}
            </span>
          </div>
        </div>
      );
    }

    // Fallback
    return null;
  };

  // ─── Phase Card ───
  const renderPhaseCard = (
    phaseNum: 1 | 2,
    label: string,
    isActive: boolean,
    isFinished: boolean,
    countdownStr: string,
    startLabel: string
  ) => {
    return (
      <div
        className={`p-3 rounded-lg border ${
          isActive
            ? 'bg-primary/10 border-primary/30'
            : isFinished
            ? 'bg-success/5 border-success/20'
            : 'bg-muted/30 border-border'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-foreground">
            {label}
          </span>
          {isActive && (
            <span className="text-[10px] px-2 py-0.5 bg-success text-success-foreground rounded-full font-medium">
              {isRTL ? '🟢 الآن' : '🟢 Live'}
            </span>
          )}
          {isFinished && (
            <span className="text-[10px] px-2 py-0.5 bg-success/20 text-success rounded-full font-medium">
              {isRTL ? '✅ انتهت' : '✅ Done'}
            </span>
          )}
        </div>

        {isActive && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-muted-foreground">
              {isRTL ? 'تنتهي بعد:' : 'Ends in:'}
            </span>
            <span className="font-mono font-bold text-sm text-primary">{countdownStr}</span>
          </div>
        )}

        {!isActive && !isFinished && (
          <p className="text-[11px] text-muted-foreground mt-1">{startLabel}</p>
        )}

        {isFinished && phaseNum === 1 && (
          <p className="text-[11px] text-muted-foreground mt-1">
            {isRTL ? 'تم تأهيل 50 متسابقاً' : '50 contestants qualified'}
          </p>
        )}
      </div>
    );
  };

  // Phase state detection
  const phase1Active = phase === 'stage1' || phase === 'join_only';
  const phase1Finished = phase === 'final' || phase === 'results';
  const phase2Active = phase === 'final';
  const phase2Finished = phase === 'results';

  return (
    <Card className="overflow-hidden border border-border shadow-sm">
      {/* ① Contest Title + Prize Pool */}
      <div className={`bg-card p-4 border-b border-border ${isFree ? 'bg-gradient-to-br from-emerald-500/5 to-background' : ''}`}>
        {/* Title row — Friday badge injected when free */}
        <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
          <Trophy className={`h-5 w-5 ${isFree ? 'text-emerald-500' : 'text-primary'}`} />
          <span className="text-foreground font-bold text-lg text-center">
            {isFree
              ? (isRTL
                  ? `مسابقة الجمعة المجانية – ${saudiDateForDisplay}`
                  : `Friday Free Contest – ${saudiDateForDisplay}`)
              : (isRTL
                  ? `المسابقة اليومية – ${timing.saudiDayName} ${saudiDateForDisplay}`
                  : `Daily Contest – ${saudiDateForDisplay}`)}
          </span>
          {isFree && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 text-[11px] font-bold">
              🎁 {isRTL ? 'مجاني' : 'Free'}
            </span>
          )}
        </div>

        {/* Prize Pool — fixed for free, dynamic for paid */}
        <div className={`text-center p-3 rounded-lg border ${isFree ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-primary/5 border-primary/20'}`}>
          <p className="text-muted-foreground text-xs mb-1">
            {isRTL ? '💰 مجموع الجوائز' : '💰 Prize Pool'}
          </p>
          <p className={`text-3xl font-bold ${isFree ? 'text-emerald-600' : 'text-primary'}`}>
            И {isFree && adminPrize != null ? adminPrize : prizePool} Nova
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            ≈ {pricing.symbol} {((isFree && adminPrize != null ? adminPrize : prizePool) * pricing.novaRate).toFixed(0)}
          </p>
          {isFree && (
            <p className="text-emerald-600 text-[11px] font-medium mt-1">
              {isRTL ? '🎁 جائزة ثابتة من الإدارة' : '🎁 Fixed prize from admin'}
            </p>
          )}
        </div>

        {/* Participants & Entry Fee */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
              <Users className="h-3 w-3" />
              <span>{isRTL ? 'المشتركين' : 'Participants'}</span>
            </div>
            <p className="text-foreground font-bold">{participants}</p>
          </div>
          <div className={`text-center p-2 rounded-lg ${isFree ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-muted/50'}`}>
            <p className="text-muted-foreground text-xs mb-1">
              {isRTL ? 'رسوم الاشتراك' : 'Entry Fee'}
            </p>
            {isFree
              ? <p className="text-emerald-600 font-bold text-sm">🎁 {isRTL ? 'مجاني' : 'Free'}</p>
              : <p className="text-foreground font-bold">И {entryFee} Nova</p>
            }
          </div>
        </div>

        {/* ④ Free contest requirements card */}
        {isFree && (
          <div className="mt-3 p-3 bg-amber-500/8 border border-amber-500/25 rounded-lg space-y-1.5">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
              ⚠️ {isRTL ? 'شروط مسابقة الجمعة' : 'Friday Contest Requirements'}
            </p>
            <div className="space-y-1 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="text-amber-500">✓</span>
                <span>{isRTL ? 'التحقق من الهوية (KYC) مكتمل' : 'Identity verification (KYC) completed'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-amber-500">✓</span>
                <span>{isRTL ? 'عمر الحساب 7 أيام على الأقل' : 'Account at least 7 days old'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-amber-500">✓</span>
                <span>{isRTL ? 'جهاز واحد لكل مستخدم' : 'One device per user'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        {/* ② Join/Status Button Zone */}
        {renderJoinStatusZone()}

        {/* ③ Phase 1 Card */}
        {renderPhaseCard(
          1,
          isRTL ? 'المرحلة الأولى — التصفية' : 'Phase 1 — Qualifying',
          phase1Active,
          phase1Finished,
          countdownToPhase1End.display,
          isRTL ? 'تبدأ الساعة 2:00 ظهراً' : 'Starts at 2:00 PM'
        )}

        {/* ④ Phase 2 Card */}
        {renderPhaseCard(
          2,
          isRTL ? 'المرحلة النهائية — ساعتين' : 'Final Stage — 2 Hours',
          phase2Active,
          phase2Finished,
          countdownToFinalEnd.display,
          phase1Active
            ? isRTL
              ? `تبدأ بعد ${countdownToFinal.display}`
              : `Starts in ${countdownToFinal.display}`
            : isRTL
            ? 'تبدأ الساعة 8:00 مساءً'
            : 'Starts at 8:00 PM'
        )}

        {/* ⑤ Prize Distribution */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
            <Award className="h-4 w-4 text-primary" />
            {isRTL ? '🏅 توزيع الجوائز' : '🏅 Prize Distribution'}
          </p>
          <div className="space-y-1.5 text-xs">
            {prizes.map((p) => (
              <div key={p.pct} className="flex justify-between items-center">
                <span>
                  {p.emoji} {p.label} ({p.pct}%)
                </span>
                <span className="font-bold text-primary">
                  И {Math.floor(prizePool * p.pct / 100)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard Link */}
        {(phase1Active || phase2Active) && participants > 0 && (
          <Button asChild variant="outline" className="w-full">
            <Link to="/contests">
              {isRTL ? '📊 عرض الترتيب والتصويت' : '📊 View Leaderboard & Vote'}
              <ArrowRight className="h-4 w-4 ms-2" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
