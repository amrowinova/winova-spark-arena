/**
 * Contest Timing Utilities - Production Ready
 * All times are in KSA timezone (Asia/Riyadh = UTC+3)
 * 
 * Daily Schedule (KSA Time):
 * - 10:00 AM: Contest opens, join window starts
 * - 02:00 PM: Stage 1 starts (qualifying)
 * - 06:00 PM: Join window closes
 * - 08:00 PM: Stage 1 ends, Final stage starts
 * - 10:00 PM: Contest ends, winners announced
 * - 10:00 PM → 10:00 AM next day: Results display (read-only)
 */

const KSA_TIMEZONE = 'Asia/Riyadh';

// Convert current time to KSA
function getKSATime(): Date {
  const now = new Date();
  const ksaString = now.toLocaleString('en-US', { timeZone: KSA_TIMEZONE });
  return new Date(ksaString);
}

// Get today's date in KSA (midnight)
function getTodayKSA(): Date {
  const ksa = getKSATime();
  ksa.setHours(0, 0, 0, 0);
  return ksa;
}

// Get yesterday's date in KSA (midnight)
function getYesterdayKSA(): Date {
  const yesterday = getTodayKSA();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
}

export type ContestPhase = 
  | 'pre_open'      // Before 10 AM - waiting for contest to open
  | 'join_only'     // 10 AM - 2 PM - can join, stage not started yet
  | 'stage1'        // 2 PM - 8 PM - stage 1 active
  | 'final'         // 8 PM - 10 PM - final stage active
  | 'results';      // 10 PM - 10 AM next day - showing winners

export interface ContestTimingInfo {
  currentPhase: ContestPhase;
  
  // Key timestamps (all in KSA)
  joinOpenAt: Date;      // 10:00 AM
  stage1Start: Date;     // 02:00 PM
  joinCloseAt: Date;     // 06:00 PM
  stage1End: Date;       // 08:00 PM
  finalStart: Date;      // 08:00 PM
  finalEnd: Date;        // 10:00 PM
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

export function getContestTiming(): ContestTimingInfo {
  const ksaNow = getKSATime();
  const today = getTodayKSA();
  const yesterday = getYesterdayKSA();
  
  // Today's schedule
  const joinOpenAt = new Date(today);
  joinOpenAt.setHours(10, 0, 0, 0);
  
  const stage1Start = new Date(today);
  stage1Start.setHours(14, 0, 0, 0);
  
  const joinCloseAt = new Date(today);
  joinCloseAt.setHours(18, 0, 0, 0);
  
  const stage1End = new Date(today);
  stage1End.setHours(20, 0, 0, 0);
  
  const finalStart = new Date(today);
  finalStart.setHours(20, 0, 0, 0);
  
  const finalEnd = new Date(today);
  finalEnd.setHours(22, 0, 0, 0);
  
  // Results end at 10 AM next day
  const resultsEnd = new Date(today);
  resultsEnd.setDate(resultsEnd.getDate() + 1);
  resultsEnd.setHours(10, 0, 0, 0);
  
  // Yesterday's final end (for checking if we're showing yesterday's results)
  const yesterdayFinalEnd = new Date(yesterday);
  yesterdayFinalEnd.setHours(22, 0, 0, 0);
  
  const nowMs = ksaNow.getTime();
  
  let currentPhase: ContestPhase;
  let timeRemaining = 0;
  let canJoin = false;
  let canVote = false;
  let isContestActive = false;
  let nextPhaseLabel = '';
  let nextPhaseTime = joinOpenAt;
  let currentStage: 'closed' | 'stage1' | 'final' = 'closed';
  
  // Determine current phase based on time
  if (nowMs < joinOpenAt.getTime()) {
    // Before 10 AM - Pre-open phase
    // Check if we should show yesterday's results
    if (nowMs >= yesterdayFinalEnd.getTime()) {
      currentPhase = 'results';
      timeRemaining = joinOpenAt.getTime() - nowMs;
      nextPhaseLabel = 'opens';
      nextPhaseTime = joinOpenAt;
    } else {
      currentPhase = 'pre_open';
      timeRemaining = joinOpenAt.getTime() - nowMs;
      nextPhaseLabel = 'opens';
      nextPhaseTime = joinOpenAt;
    }
  } else if (nowMs >= joinOpenAt.getTime() && nowMs < stage1Start.getTime()) {
    // 10 AM - 2 PM: Join only phase
    currentPhase = 'join_only';
    timeRemaining = stage1Start.getTime() - nowMs;
    canJoin = true;
    nextPhaseLabel = 'starts';
    nextPhaseTime = stage1Start;
  } else if (nowMs >= stage1Start.getTime() && nowMs < stage1End.getTime()) {
    // 2 PM - 8 PM: Stage 1
    currentPhase = 'stage1';
    currentStage = 'stage1';
    isContestActive = true;
    canVote = true;
    // Can join until 6 PM
    canJoin = nowMs < joinCloseAt.getTime();
    timeRemaining = stage1End.getTime() - nowMs;
    nextPhaseLabel = canJoin ? 'join closes' : 'ends';
    nextPhaseTime = canJoin ? joinCloseAt : stage1End;
  } else if (nowMs >= finalStart.getTime() && nowMs < finalEnd.getTime()) {
    // 8 PM - 10 PM: Final stage
    currentPhase = 'final';
    currentStage = 'final';
    isContestActive = true;
    canVote = true;
    canJoin = false;
    timeRemaining = finalEnd.getTime() - nowMs;
    nextPhaseLabel = 'ends';
    nextPhaseTime = finalEnd;
  } else if (nowMs >= finalEnd.getTime()) {
    // After 10 PM: Results phase
    currentPhase = 'results';
    timeRemaining = resultsEnd.getTime() - nowMs;
    nextPhaseLabel = 'new contest';
    nextPhaseTime = resultsEnd;
  } else {
    // Fallback
    currentPhase = 'pre_open';
    timeRemaining = joinOpenAt.getTime() - nowMs;
  }
  
  // Next contest start for legacy compatibility
  const nextContestStart = new Date(today);
  if (nowMs >= finalEnd.getTime()) {
    nextContestStart.setDate(nextContestStart.getDate() + 1);
  }
  nextContestStart.setHours(10, 0, 0, 0);
  
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
    // Legacy compatibility
    currentStage,
    nextContestStart,
  };
}

export function formatContestTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: KSA_TIMEZONE,
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
    case 'results':
      return { 
        date: timing.joinOpenAt.getTime() > Date.now() ? timing.joinOpenAt : timing.resultsEnd,
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
