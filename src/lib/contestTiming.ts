/**
 * Contest Timing Utilities - Saudi Arabia Time (UTC+3) Based
 *
 * Daily Schedule (KSA Time):
 * - 00:00  Contest opens — registration + voting start
 * - 20:00  Contest closes — results announced + Spotlight draw
 * - 20:00 → 00:00  Results window (read-only)
 * - 00:00  New contest begins
 */

// ─── Phase Type ───────────────────────────────────────────────────────────────
// 'active'  → 00:00–20:00 KSA  (canJoin + canVote)
// 'results' → 20:00–00:00 KSA  (read-only, show winners)
//
// Legacy values kept in the union so old component checks (phase === 'pre_open',
// phase === 'stage1', etc.) compile without TypeScript errors — they never match.
export type ContestPhase =
  | 'active'
  | 'results'
  | 'pre_open'   // legacy — never returned
  | 'join_only'  // legacy — never returned
  | 'stage1'     // legacy — never returned
  | 'final';     // legacy — never returned

// ─── Timing Info ──────────────────────────────────────────────────────────────
export interface ContestTimingInfo {
  /** Current phase */
  currentPhase: ContestPhase;

  // ── Primary timestamps ──────────────────────────────────────────────────────
  /** 00:00 KSA today — contest opens */
  contestOpenAt: Date;
  /** 20:00 KSA today — contest closes */
  contestCloseAt: Date;
  /** 00:00 KSA tomorrow — results end / next contest opens */
  resultsEnd: Date;

  // ── Legacy timestamp aliases (backward compat) ──────────────────────────────
  /** @alias contestOpenAt */
  joinOpenAt: Date;
  /** @alias contestCloseAt */
  joinCloseAt: Date;
  /** @alias contestOpenAt */
  stage1Start: Date;
  /** @alias contestCloseAt */
  stage1End: Date;
  /** @alias contestCloseAt */
  finalStart: Date;
  /** @alias contestCloseAt */
  finalEnd: Date;

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
  /** @deprecated use currentPhase === 'active' */
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
  const CONTEST_CLOSE = 20 * 60; // 20:00

  // ── Timestamps ──────────────────────────────────────────────────────────────
  const contestOpenAt  = ksaTodayAt(0, 0, 0);
  const contestCloseAt = ksaTodayAt(20, 0, 0);
  const resultsEnd     = ksaTomorrowAt(0, 0, 0);

  // ── Phase logic ─────────────────────────────────────────────────────────────
  let currentPhase: ContestPhase;
  let timeRemaining: number;
  let canJoin: boolean;
  let canVote: boolean;
  let isContestActive: boolean;
  let nextPhaseLabel: string;
  let nextPhaseTime: Date;
  let currentStage: 'closed' | 'stage1' | 'final';

  if (ksaMinutes < CONTEST_CLOSE) {
    // 00:00 – 20:00 — contest active
    currentPhase    = 'active';
    currentStage    = 'stage1'; // legacy alias
    canJoin         = true;
    canVote         = true;
    isContestActive = true;
    timeRemaining   = contestCloseAt.getTime() - nowMs;
    nextPhaseLabel  = 'ends';
    nextPhaseTime   = contestCloseAt;
  } else {
    // 20:00 – 00:00 — results
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
    contestCloseAt,
    resultsEnd,
    // Legacy aliases — same values, different names
    joinOpenAt:  contestOpenAt,
    joinCloseAt: contestCloseAt,
    stage1Start: contestOpenAt,
    stage1End:   contestCloseAt,
    finalStart:  contestCloseAt,
    finalEnd:    contestCloseAt,
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
    active:    { ar: 'المسابقة جارية',   en: 'Contest Live' },
    results:   { ar: 'النتائج',           en: 'Results' },
    pre_open:  { ar: 'قريباً',            en: 'Coming Soon' },
    join_only: { ar: 'التسجيل مفتوح',    en: 'Registration Open' },
    stage1:    { ar: 'المرحلة الأولى',   en: 'Stage 1' },
    final:     { ar: 'المرحلة النهائية', en: 'Final Stage' },
  };
  return labels[phase][language];
}

export function getCountdownTarget(
  timing: ContestTimingInfo
): { date: Date; label: { ar: string; en: string } } {
  if (timing.currentPhase === 'active') {
    return {
      date:  timing.contestCloseAt,
      label: { ar: 'تنتهي المسابقة', en: 'Contest ends' },
    };
  }
  return {
    date:  timing.resultsEnd,
    label: { ar: 'المسابقة القادمة', en: 'Next contest' },
  };
}
