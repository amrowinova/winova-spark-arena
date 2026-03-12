import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Clock, Users, ArrowRight, Gift, Award, Lock, CheckCircle, Vote, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useNovaPricing } from '@/hooks/useNovaPricing';
import { Link } from 'react-router-dom';
import { getContestTiming, getSaudiDateStr, type ContestTimingInfo } from '@/lib/contestTiming';

interface ContestJoinCardProps {
  prizePool: number;
  participants: number;
  stage: 'stage1' | 'final';
  closesAt: Date;
  endsAt: Date;
  entryFee: number;
  hasJoined: boolean;
  userRank?: number;
  onJoin: () => void;
  contestAvailable?: boolean;
  userQualified?: boolean;
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
}: ContestJoinCardProps) {
  const { language } = useLanguage();
  const { user } = useUser();
  const { getCurrencyInfo } = useNovaPricing();
  const pricing = getCurrencyInfo(user.country);
  const isRTL = language === 'ar';

  const totalNovaEquivalent = user.novaBalance + user.auraBalance / 2;

  // Live timing (Saudi-based)
  const [timing, setTiming] = useState<ContestTimingInfo>(getContestTiming());
  useEffect(() => {
    const id = setInterval(() => setTiming(getContestTiming()), 1000);
    return () => clearInterval(id);
  }, []);

  const phase = timing.currentPhase;

  // Countdown targets for each state
  const countdownToOpen = useCountdown(timing.joinOpenAt.getTime());
  const countdownToRegClose = useCountdown(timing.joinCloseAt.getTime());
  const countdownToFinal = useCountdown(timing.finalStart.getTime());
  const countdownToPhase1End = useCountdown(timing.stage1End.getTime());
  const countdownToFinalEnd = useCountdown(timing.finalEnd.getTime());
  const countdownToNextOpen = useCountdown(
    phase === 'results' ? timing.resultsEnd.getTime() : timing.joinOpenAt.getTime()
  );

  // Prize distribution
  const prizes = [
    { label: isRTL ? 'المركز الأول' : '1st Place', emoji: '🥇', pct: 50 },
    { label: isRTL ? 'المركز الثاني' : '2nd Place', emoji: '🥈', pct: 20 },
    { label: isRTL ? 'المركز الثالث' : '3rd Place', emoji: '🥉', pct: 15 },
    { label: isRTL ? 'المركز الرابع' : '4th Place', emoji: '🏅', pct: 10 },
    { label: isRTL ? 'المركز الخامس' : '5th Place', emoji: '🏅', pct: 5 },
  ];

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

  // ─── No contest available ───
  if (!contestAvailable) {
    return (
      <Card className="overflow-hidden border border-border shadow-sm">
        <div className="bg-card p-4 text-center">
          <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-foreground font-semibold">
            {isRTL ? 'لا توجد مسابقة اليوم' : 'No contest today'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isRTL ? 'ترقب المسابقة القادمة' : 'Stay tuned for the next contest'}
          </p>
        </div>
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
              {isRTL ? `المسابقة تبدأ بعد ${countdownToOpen.display}` : `Contest starts in ${countdownToOpen.display}`}
            </p>
          </div>
        );
      }

      // noBalance check removed — modal handles insufficient balance

      return (
        <div className="space-y-2">
          <Button className="w-full h-12 text-base font-bold" onClick={onJoin}>
            🏆 {isRTL ? `انضم للمسابقة — تبدأ بعد ${countdownToOpen.display}` : `Join Contest — Starts in ${countdownToOpen.display}`}
          </Button>
        </div>
      );
    }

    // State E — After 10:00 PM KSA (results)
    if (phase === 'results') {
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

      if (noBalance) {
        return (
          <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-xs font-medium text-warning">
                {isRTL
                  ? 'لا يوجد رصيد كافٍ — قم بتعبئة Nova للانضمام'
                  : 'Insufficient balance — Top up Nova to join'}
              </span>
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-2">
          <Button
            className={`w-full h-12 text-base font-bold ${regCloseUrgent ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : ''}`}
            onClick={onJoin}
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
        return (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-center">
            <span className="text-sm font-semibold text-destructive">
              ❌ {isRTL ? 'لم تتأهل للمرحلة النهائية' : 'Did not qualify for Final Stage'}
            </span>
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
      <div className="bg-card p-4 border-b border-border">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Trophy className="h-5 w-5 text-primary" />
          <span className="text-foreground font-bold text-lg">
            {isRTL
              ? `المسابقة اليومية – ${timing.saudiDayName} ${saudiDateForDisplay}`
              : `Daily Contest – ${saudiDateForDisplay}`}
          </span>
        </div>

        <div className="text-center p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-muted-foreground text-xs mb-1">
            {isRTL ? '💰 مجموع الجوائز' : '💰 Prize Pool'}
          </p>
          <p className="text-3xl font-bold text-primary">И {prizePool} Nova</p>
          <p className="text-muted-foreground text-xs mt-1">
            ≈ {pricing.symbol} {(prizePool * pricing.novaRate).toFixed(0)}
          </p>
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
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-muted-foreground text-xs mb-1">
              {isRTL ? 'رسوم الاشتراك' : 'Entry Fee'}
            </p>
            <p className="text-foreground font-bold">И {entryFee} Nova</p>
          </div>
        </div>
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
          isRTL ? 'تبدأ الساعة 10:00 صباحاً' : 'Starts at 10:00 AM'
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
