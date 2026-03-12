/**
 * Contest Timing Utilities - Local Time Based
 * 
 * Daily Schedule (User's Local Time):
 * - 10:00 AM: Contest opens, join window starts, Phase 1 starts
 * - 07:00 PM: Join window (registration) closes
 * - 08:00 PM: Phase 1 ends, Phase 2 (Final) starts
 * - 10:00 PM: Contest ends, winners announced
 * - 10:00 PM → 10:00 AM next day: Results display (read-only)
 */

export type ContestPhase = 
  | 'pre_open'      // Before 10 AM - waiting for contest to open
  | 'join_only'     // (legacy, kept for compat) - not used with current schedule
  | 'stage1'        // 10 AM - 8 PM - stage 1 active (registration open until 7 PM)
  | 'final'         // 8 PM - 10 PM - final stage active
  | 'results';      // 10 PM - 10 AM next day - showing winners

export interface ContestTimingInfo {
  currentPhase: ContestPhase;
  
  // Key timestamps (all as real Date objects)
  joinOpenAt: Date;      // 10:00 AM today
  stage1Start: Date;     // 10:00 AM today
  joinCloseAt: Date;     // 07:00 PM today
  stage1End: Date;       // 08:00 PM today
  finalStart: Date;      // 08:00 PM today
  finalEnd: Date;        // 10:00 PM today
  resultsEnd: Date;      // 10:00 AM next day
  
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
}

/** Build a local Date for today (or tomorrow) at a given hour */
function localToday(hour: number, min = 0, sec = 0): Date {
  const d = new Date();
  d.setHours(hour, min, sec, 0);
  return d;
}

function localTomorrow(hour: number, min = 0, sec = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, min, sec, 0);
  return d;
}

export function getContestTiming(): ContestTimingInfo {
  const now = new Date();
  const nowMs = now.getTime();

  // Current local time in minutes from midnight
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Schedule boundaries in minutes from midnight
  const REGISTRATION_START = 10 * 60;  // 10:00 AM
  const REGISTRATION_END = 19 * 60;    // 7:00 PM
  const FINAL_START = 20 * 60;         // 8:00 PM
  const FINAL_END = 22 * 60;           // 10:00 PM

  // Build today's key timestamps
  const joinOpenAt = localToday(10, 0, 0);
  const stage1Start = localToday(10, 0, 0);
  const joinCloseAt = localToday(19, 0, 0);
  const stage1End = localToday(20, 0, 0);
  const finalStart = localToday(20, 0, 0);
  const finalEnd = localToday(22, 0, 0);
  const resultsEnd = localTomorrow(10, 0, 0);

  let currentPhase: ContestPhase;
  let timeRemaining = 0;
  let canJoin = false;
  let canVote = false;
  let isContestActive = false;
  let nextPhaseLabel = '';
  let nextPhaseTime = joinOpenAt;
  let currentStage: 'closed' | 'stage1' | 'final' = 'closed';

  if (currentMinutes < REGISTRATION_START) {
    // State A — Before 10:00 AM
    currentPhase = 'pre_open';
    timeRemaining = joinOpenAt.getTime() - nowMs;
    nextPhaseLabel = 'opens';
    nextPhaseTime = joinOpenAt;
  } else if (currentMinutes >= REGISTRATION_START && currentMinutes < FINAL_START) {
    // 10:00 AM – 8:00 PM — Phase 1 active
    currentPhase = 'stage1';
    currentStage = 'stage1';
    isContestActive = true;
    canVote = true;
    canJoin = currentMinutes < REGISTRATION_END; // can join until 7 PM
    timeRemaining = stage1End.getTime() - nowMs;

    if (canJoin) {
      nextPhaseLabel = 'join closes';
      nextPhaseTime = joinCloseAt;
    } else {
      nextPhaseLabel = 'ends';
      nextPhaseTime = stage1End;
    }
  } else if (currentMinutes >= FINAL_START && currentMinutes < FINAL_END) {
    // 8:00 PM – 10:00 PM — Final stage
    currentPhase = 'final';
    currentStage = 'final';
    isContestActive = true;
    canVote = true;
    canJoin = false;
    timeRemaining = finalEnd.getTime() - nowMs;
    nextPhaseLabel = 'ends';
    nextPhaseTime = finalEnd;
  } else {
    // >= 10:00 PM — Contest ended
    currentPhase = 'results';
    timeRemaining = resultsEnd.getTime() - nowMs;
    nextPhaseLabel = 'new contest';
    nextPhaseTime = resultsEnd;
  }

  // Next contest start
  const nextContestStart = currentMinutes >= FINAL_END
    ? localTomorrow(10, 0, 0)
    : joinOpenAt;

  // Debug logging
  console.log('Contest Debug:', {
    currentLocalTime: now.toLocaleTimeString(),
    currentMinutes,
    computedPhase: currentPhase,
    canJoin,
    joinOpenAt: joinOpenAt.toLocaleTimeString(),
    joinCloseAt: joinCloseAt.toLocaleTimeString(),
    finalStart: finalStart.toLocaleTimeString(),
    finalEnd: finalEnd.toLocaleTimeString(),
    timeRemainingMs: timeRemaining,
  });

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
