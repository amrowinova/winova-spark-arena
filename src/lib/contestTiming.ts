/**
 * Contest Timing Utilities - Saudi Arabia Time (UTC+3) Based
 *
 * Daily Schedule (KSA Time):
 * - 00:00  Contest opens — registration starts
 * - 14:00  Stage 1 starts — voting opens
 * - 19:00  Registration closes (join window ends)
 * - 20:00  Stage 1 ends → Final stage begins
 * - 22:00  Final ends → Results announced + Spotlight draw
 * - 00:00  New contest begins
 */

// ─── Phase Type ───────────────────────────────────────────────────────────────
export type ContestPhase =
  | 'pre_open'   // 00:00–14:00  registration open, no voting yet
  | 'stage1'     // 14:00–20:00  registration + voting
  | 'final'      // 20:00–22:00  voting only (no new joins)
  | 'results'    // 22:00–00:00  read-only, show winners
  | 'active'     // legacy alias (never returned)
  | 'join_only'; // legacy alias (never returned)

// ─── Timing Info ──────────────────────────────────────────────────────────────
export interface ContestTimingInfo {
  /** Current phase */
  currentPhase: ContestPhase;

  // ── Primary timestamps ──────────────────────────────────────────────────────
  /** 00:00 KSA today — contest opens, join window starts */
  contestOpenAt: Date;
  /** 14:00 KSA today — Stage 1 / voting starts */
  stage1Start: Date;
  /** 19:00 KSA today — join window closes */
  joinCloseAt: Date;
  /** 20:00 KSA today — Stage 1 ends, Final begins */
  stage1End: Date;
  /** 20:00 KSA today — Final stage starts */
  finalStart: Date;
  /** 22:00 KSA today — Final ends, results begin */
  finalEnd: Date;
  /** 00:00 KSA tomorrow — results end / next contest opens */
  resultsEnd: Date;

  // ── Legacy aliases ──────────────────────────────────────────────────────────
  /** @alias contestOpenAt */
  joinOpenAt: Date;
  /** @alias finalEnd */
  contestCloseAt: Date;

  // ── Time remaining (ms until current phase ends) ───────────────────────────
  timeRemaining: number;

  // ── Permission flags ────────────────────────────────────────────────────────
  canJoin: boolean;
  canVote: boolean;
  isContestActive: boolean;

  // ── UI helpers ──────────────────────────────────────────────────────────────
  nextPhaseLabel: string;
  nextPhaseTime: Date;

  // ── Legacy compat ───────────────────────────────────────────────────────────
  /** @deprecated use currentPhase */
  currentStage: 'closed' | 'stage1' | 'final';
  nextContestStart: Date;

  // ── Saudi date ──────────────────────────────────────────────────────────────
  saudiDateStr: string;
  saudiDayName: string;
}

// ─── KSA Helpers ─────────────────────────────────────────────────────────────

/** Returns a Date whose wall-clock values (getHours etc.) reflect KSA time */
export function getSaudiTime(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
}

/** KSA date as YYYY-MM-DD */
export function getSaudiDateStr(d?: Date): string {
  const ksa = d ?? getSaudiTime();
  const y = ksa.getFullYear();
  const mo = String(ksa.getMonth() + 1).padStart(2, '0');
  const day = String(ksa.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

function getSaudiDayNameAr(d?: Date): string {
  const ksa = d ?? getSaudiTime();
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return days[ksa.getDay()];
}

/**
 * Returns the UTC instant corresponding to KSA midnight + offset on today's KSA date.
 * e.g. ksaTodayAt(20) → the UTC instant when it's 20:00 in Riyadh today.
 */
function ksaTodayAt(hour: number, min = 0, sec = 0): Date {
  const ksa = getSaudiTime();
  return new Date(Date.UTC(ksa.getFullYear(), ksa.getMonth(), ksa.getDate(), hour, min, sec) - 3 * 3_600_000);
}

function ksaTomorrowAt(hour: number, min = 0, sec = 0): Date {
  const ksa = getSaudiTime();
  return new Date(Date.UTC(ksa.getFullYear(), ksa.getMonth(), ksa.getDate() + 1, hour, min, sec) - 3 * 3_600_000);
}

// ─── Core Function ────────────────────────────────────────────────────────────

export function getContestTiming(): ContestTimingInfo {
  const now = new Date();
  const nowMs = now.getTime();

  const ksa = getSaudiTime();
  const ksaMinutes = ksa.getHours() * 60 + ksa.getMinutes();

  // Schedule boundaries (KSA minutes from midnight)
  const STAGE1_START  = 14 * 60; // 14:00
  const JOIN_CLOSE    = 19 * 60; // 19:00
  const FINAL_START   = 20 * 60; // 20:00
  const RESULTS_START = 22 * 60; // 22:00

  // ── Timestamps ──────────────────────────────────────────────────────────────
  const contestOpenAt = ksaTodayAt(0,  0, 0);
  const stage1StartAt = ksaTodayAt(14, 0, 0);
  const joinCloseAt   = ksaTodayAt(19, 0, 0);
  const stage1EndAt   = ksaTodayAt(20, 0, 0);
  const finalStartAt  = ksaTodayAt(20, 0, 0);
  const finalEndAt    = ksaTodayAt(22, 0, 0);
  const resultsEnd    = ksaTomorrowAt(0, 0, 0);

  // ── Phase logic ─────────────────────────────────────────────────────────────
  let currentPhase: ContestPhase;
  let timeRemaining: number;
  let canJoin: boolean;
  let canVote: boolean;
  let isContestActive: boolean;
  let nextPhaseLabel: string;
  let nextPhaseTime: Date;
  let currentStage: 'closed' | 'stage1' | 'final';

  if (ksaMinutes < STAGE1_START) {
    // 00:00 – 14:00 — pre_open: registration open, voting not yet
    currentPhase    = 'pre_open';
    currentStage    = 'stage1'; // legacy
    canJoin         = true;
    canVote         = false;
    isContestActive = true;
    timeRemaining   = stage1StartAt.getTime() - nowMs;
    nextPhaseLabel  = 'voting starts';
    nextPhaseTime   = stage1StartAt;
  } else if (ksaMinutes < FINAL_START) {
    // 14:00 – 20:00 — stage1: voting + registration (until 19:00)
    currentPhase    = 'stage1';
    currentStage    = 'stage1';
    canJoin         = ksaMinutes < JOIN_CLOSE;
    canVote         = true;
    isContestActive = true;
    timeRemaining   = stage1EndAt.getTime() - nowMs;
    nextPhaseLabel  = 'final starts';
    nextPhaseTime   = finalStartAt;
  } else if (ksaMinutes < RESULTS_START) {
    // 20:00 – 22:00 — final: voting only, no joins
    currentPhase    = 'final';
    currentStage    = 'final';
    canJoin         = false;
    canVote         = true;
    isContestActive = true;
    timeRemaining   = finalEndAt.getTime() - nowMs;
    nextPhaseLabel  = 'results';
    nextPhaseTime   = finalEndAt;
  } else {
    // 22:00 – 00:00 — results
    currentPhase    = 'results';
    currentStage    = 'closed';
    canJoin         = false;
    canVote         = false;
    isContestActive = false;
    timeRemaining   = resultsEnd.getTime() - nowMs;
    nextPhaseLabel  = 'new contest';
    nextPhaseTime   = resultsEnd;
  }

  const nextContestStart = currentPhase === 'results' ? resultsEnd : contestOpenAt;

  return {
    currentPhase,
    contestOpenAt,
    stage1Start:  stage1StartAt,
    joinCloseAt,
    stage1End:    stage1EndAt,
    finalStart:   finalStartAt,
    finalEnd:     finalEndAt,
    resultsEnd,
    // Legacy aliases
    joinOpenAt:     contestOpenAt,
    contestCloseAt: finalEndAt,
    timeRemaining,
    canJoin,
    canVote,
    isContestActive,
    nextPhaseLabel,
    nextPhaseTime,
    currentStage,
    nextContestStart,
    saudiDateStr: getSaudiDateStr(ksa),
    saudiDayName: getSaudiDayNameAr(ksa),
  };
}

// ─── Formatting ───────────────────────────────────────────────────────────────

export function formatContestTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour:   '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatTimeRemaining(ms: number): { hours: number; minutes: number; seconds: number } {
  if (ms <= 0) return { hours: 0, minutes: 0, seconds: 0 };
  const totalSeconds = Math.floor(ms / 1000);
  return {
    hours:   Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

// ─── Legacy Helpers (unchanged API) ──────────────────────────────────────────

export function isWithinContestHours(): boolean {
  return getContestTiming().isContestActive;
}

export function getCurrentStage(): 'closed' | 'stage1' | 'final' {
  return getContestTiming().currentStage;
}

export function getCurrentPhase(): ContestPhase {
  return getContestTiming().currentPhase;
}

export function getPhaseLabel(phase: ContestPhase, language: 'ar' | 'en'): string {
  const labels: Record<ContestPhase, { ar: string; en: string }> = {
    pre_open:  { ar: 'التسجيل مفتوح',    en: 'Registration Open' },
    stage1:    { ar: 'المرحلة الأولى',   en: 'Stage 1' },
    final:     { ar: 'المرحلة النهائية', en: 'Final Stage' },
    results:   { ar: 'النتائج',           en: 'Results' },
    active:    { ar: 'المسابقة جارية',   en: 'Contest Live' },
    join_only: { ar: 'التسجيل مفتوح',   en: 'Registration Open' },
  };
  return labels[phase][language];
}

export function getCountdownTarget(
  timing: ContestTimingInfo
): { date: Date; label: { ar: string; en: string } } {
  switch (timing.currentPhase) {
    case 'pre_open':
      return {
        date:  timing.stage1Start,
        label: { ar: 'يبدأ التصويت', en: 'Voting starts' },
      };
    case 'stage1':
      return {
        date:  timing.stage1End,
        label: { ar: 'تنتهي المرحلة الأولى', en: 'Stage 1 ends' },
      };
    case 'final':
      return {
        date:  timing.finalEnd,
        label: { ar: 'تنتهي المرحلة النهائية', en: 'Final ends' },
      };
    default:
      return {
        date:  timing.resultsEnd,
        label: { ar: 'المسابقة القادمة', en: 'Next contest' },
      };
  }
}
