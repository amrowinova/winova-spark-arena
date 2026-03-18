/**
 * Contest Timing Utilities - Saudi Arabia Time (UTC+3) Based
 * 
 * Daily Schedule (KSA Time):
 * - 00:00 AM: Pre-registration opens (early join allowed)
 * - 10:00 AM: Phase 1 starts
 * - 07:00 PM: Registration closes
 * - 08:00 PM: Phase 1 ends, Phase 2 (Final) starts
 * - 10:00 PM: Contest ends, winners announced
 * - 10:00 PM → 00:00 AM next day: Results display (read-only)
 */

export type ContestPhase = 
  | 'pre_open'      // Before 10 AM KSA - waiting for contest to open (pre-registration allowed)
  | 'join_only'     // (legacy, kept for compat) - not used with current schedule
  | 'stage1'        // 10 AM - 8 PM KSA - stage 1 active (registration open until 7 PM)
  | 'final'         // 8 PM - 10 PM KSA - final stage active
  | 'results';      // 10 PM - midnight KSA - showing winners

export interface ContestTimingInfo {
  currentPhase: ContestPhase;
  
  // Key timestamps (all as real Date objects in UTC)
  joinOpenAt: Date;      // 10:00 AM KSA today
  stage1Start: Date;     // 10:00 AM KSA today
  joinCloseAt: Date;     // 07:00 PM KSA today
  stage1End: Date;       // 08:00 PM KSA today
  finalStart: Date;      // 08:00 PM KSA today
  finalEnd: Date;        // 10:00 PM KSA today
  resultsEnd: Date;      // 00:00 AM KSA next day
  
  // Time remaining
  timeRemaining: number; // ms until current phase ends
  
  // Permission flags
  canJoin: boolean;      // Can user join the contest
  canVote: boolean;      // Can user vote
  isContestActive: boolean; // Is any stage running
  
  // For UI display
  nextPhaseLabel: string;
  nextPhaseTime: Date;
  
  // Legacy compatibility
  currentStage: 'closed' | 'stage1' | 'final';
  nextContestStart: Date;

  // Saudi date info
  saudiDateStr: string;  // YYYY-MM-DD in KSA
  saudiDayName: string;  // Arabic day name
}

/**
 * Get current time as if we're in Saudi Arabia.
 * Returns a Date whose getHours/getMinutes/etc reflect KSA wall-clock.
 */
export function getSaudiTime(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
}

/** Get KSA date string YYYY-MM-DD */
export function getSaudiDateStr(d?: Date): string {
  const ksa = d ?? getSaudiTime();
  const y = ksa.getFullYear();
  const m = String(ksa.getMonth() + 1).padStart(2, '0');
  const day = String(ksa.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Get Arabic day name for KSA date */
function getSaudiDayNameAr(d?: Date): string {
  const ksa = d ?? getSaudiTime();
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return days[ksa.getDay()];
}

/**
 * Build a real UTC Date for today's KSA date at a given KSA hour.
 * e.g. ksaTodayAt(10) → the UTC instant when it's 10:00 AM in Riyadh.
 */
function ksaTodayAt(hour: number, min = 0, sec = 0): Date {
  const ksa = getSaudiTime();
  const y = ksa.getFullYear();
  const m = ksa.getMonth(); // 0-indexed
  const d = ksa.getDate();
  // Build as UTC, then subtract 3h offset to get actual UTC instant
  const ksaMs = Date.UTC(y, m, d, hour, min, sec, 0);
  return new Date(ksaMs - 3 * 60 * 60 * 1000);
}

function ksaTomorrowAt(hour: number, min = 0, sec = 0): Date {
  const ksa = getSaudiTime();
  const y = ksa.getFullYear();
  const m = ksa.getMonth();
  const d = ksa.getDate() + 1;
  const ksaMs = Date.UTC(y, m, d, hour, min, sec, 0);
  return new Date(ksaMs - 3 * 60 * 60 * 1000);
}

export function getContestTiming(): ContestTimingInfo {
  const now = new Date(); // real UTC instant
  const nowMs = now.getTime();

  const ksa = getSaudiTime();
  const currentMinutes = ksa.getHours() * 60 + ksa.getMinutes();

  // Schedule boundaries in KSA minutes from midnight
  const REGISTRATION_START = 10 * 60;  // 10:00 AM KSA
  const REGISTRATION_END = 19 * 60;    // 7:00 PM KSA
  const FINAL_START = 20 * 60;         // 8:00 PM KSA
  const FINAL_END = 22 * 60;           // 10:00 PM KSA

  // Build real UTC timestamps for today's KSA schedule
  const joinOpenAt = ksaTodayAt(10, 0, 0);
  const stage1Start = ksaTodayAt(10, 0, 0);
  const joinCloseAt = ksaTodayAt(19, 0, 0);
  const stage1End = ksaTodayAt(20, 0, 0);
  const finalStart = ksaTodayAt(20, 0, 0);
  const finalEnd = ksaTodayAt(22, 0, 0);
  const resultsEnd = ksaTomorrowAt(0, 0, 0); // midnight KSA next day

  let currentPhase: ContestPhase;
  let timeRemaining = 0;
  let canJoin = false;
  let canVote = false;
  let isContestActive = false;
  let nextPhaseLabel = '';
  let nextPhaseTime = joinOpenAt;
  let currentStage: 'closed' | 'stage1' | 'final' = 'closed';

  if (currentMinutes < REGISTRATION_START) {
    // State A — Before 10:00 AM KSA (pre-registration allowed)
    currentPhase = 'pre_open';
    canJoin = true; // pre-registration is allowed
    timeRemaining = joinOpenAt.getTime() - nowMs;
    nextPhaseLabel = 'opens';
    nextPhaseTime = joinOpenAt;
  } else if (currentMinutes >= REGISTRATION_START && currentMinutes < FINAL_START) {
    // 10:00 AM – 8:00 PM KSA — Phase 1 active
    currentPhase = 'stage1';
    currentStage = 'stage1';
    isContestActive = true;
    canVote = true;
    canJoin = currentMinutes < REGISTRATION_END; // can join until 7 PM KSA
    timeRemaining = stage1End.getTime() - nowMs;

    if (canJoin) {
      nextPhaseLabel = 'join closes';
      nextPhaseTime = joinCloseAt;
    } else {
      nextPhaseLabel = 'ends';
      nextPhaseTime = stage1End;
    }
  } else if (currentMinutes >= FINAL_START && currentMinutes < FINAL_END) {
    // 8:00 PM – 10:00 PM KSA — Final stage
    currentPhase = 'final';
    currentStage = 'final';
    isContestActive = true;
    canVote = true;
    canJoin = false;
    timeRemaining = finalEnd.getTime() - nowMs;
    nextPhaseLabel = 'ends';
    nextPhaseTime = finalEnd;
  } else {
    // >= 10:00 PM KSA — Contest ended
    currentPhase = 'results';
    timeRemaining = resultsEnd.getTime() - nowMs;
    nextPhaseLabel = 'new contest';
    nextPhaseTime = resultsEnd;
  }

  // Next contest start
  const nextContestStart = currentMinutes >= FINAL_END
    ? ksaTomorrowAt(10, 0, 0)
    : joinOpenAt;

  const saudiDateStr = getSaudiDateStr(ksa);
  const saudiDayName = getSaudiDayNameAr(ksa);


  return {
    currentPhase,
    joinOpenAt,
    stage1Start,
    joinCloseAt,
    stage1End,
    finalStart,
    finalEnd,
    resultsEnd,
    timeRemaining,
    canJoin,
    canVote,
    isContestActive,
    nextPhaseLabel,
    nextPhaseTime,
    currentStage,
    nextContestStart,
    saudiDateStr,
    saudiDayName,
  };
}

export function formatContestTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatTimeRemaining(ms: number): { hours: number; minutes: number; seconds: number } {
  if (ms <= 0) return { hours: 0, minutes: 0, seconds: 0 };
  
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return { hours, minutes, seconds };
}

export function isWithinContestHours(): boolean {
  const timing = getContestTiming();
  return timing.isContestActive;
}

export function getCurrentStage(): 'closed' | 'stage1' | 'final' {
  return getContestTiming().currentStage;
}

export function getCurrentPhase(): ContestPhase {
  return getContestTiming().currentPhase;
}

// Get phase-specific labels in both languages
export function getPhaseLabel(phase: ContestPhase, language: 'ar' | 'en'): string {
  const labels: Record<ContestPhase, { ar: string; en: string }> = {
    pre_open: { ar: 'قريباً', en: 'Coming Soon' },
    join_only: { ar: 'التسجيل مفتوح', en: 'Registration Open' },
    stage1: { ar: 'المرحلة الأولى', en: 'Stage 1' },
    final: { ar: 'المرحلة النهائية', en: 'Final Stage' },
    results: { ar: 'النتائج', en: 'Results' },
  };
  return labels[phase][language];
}

// Get countdown target date based on current phase
export function getCountdownTarget(timing: ContestTimingInfo): { date: Date; label: { ar: string; en: string } } {
  switch (timing.currentPhase) {
    case 'pre_open':
      return { 
        date: timing.joinOpenAt,
        label: { ar: 'المسابقة القادمة', en: 'Next Contest' }
      };
    case 'results':
      return { 
        date: timing.resultsEnd,
        label: { ar: 'المسابقة القادمة', en: 'Next Contest' }
      };
    case 'join_only':
      return { date: timing.stage1Start, label: { ar: 'بداية المرحلة الأولى', en: 'Stage 1 Starts' } };
    case 'stage1':
      if (timing.canJoin) {
        return { date: timing.joinCloseAt, label: { ar: 'إغلاق التسجيل', en: 'Registration Closes' } };
      }
      return { date: timing.stage1End, label: { ar: 'نهاية المرحلة الأولى', en: 'Stage 1 Ends' } };
    case 'final':
      return { date: timing.finalEnd, label: { ar: 'نهاية المسابقة', en: 'Contest Ends' } };
    default:
      return { date: timing.joinOpenAt, label: { ar: 'المسابقة القادمة', en: 'Next Contest' } };
  }
}
