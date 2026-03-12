/**
 * Contest Timing Utilities - Production Ready
 * All times are in KSA timezone (Asia/Riyadh = UTC+3)
 * 
 * Daily Schedule (KSA Time):
 * - 10:00 AM: Contest opens, join window starts, Phase 1 starts
 * - 07:00 PM: Join window (registration) closes
 * - 08:00 PM: Phase 1 ends, Phase 2 (Final) starts
 * - 10:00 PM: Contest ends, winners announced
 * - 10:00 PM → 10:00 AM next day: Results display (read-only)
 */

import {
  KSA_TIMEZONE,
  getKsaTodayWallClockMs,
  getKsaWallClockMs,
  ksaWallClockMsToInstantDate,
} from '@/lib/ksaTime';

export type ContestPhase = 
  | 'pre_open'      // Before 10 AM - waiting for contest to open
  | 'join_only'     // (legacy, kept for compat) - not used with current schedule
  | 'stage1'        // 10 AM - 8 PM - stage 1 active (registration open until 7 PM)
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
  // IMPORTANT: We avoid Date parsing of locale strings.
  // We compare using a stable "KSA wall-clock" ms representation.
  const now = new Date();
  const nowWallMs = getKsaWallClockMs(now);
  const todayWallMs = getKsaTodayWallClockMs(now);
  const yesterdayWallMs = todayWallMs - 24 * 60 * 60 * 1000;

  const HOUR = 60 * 60 * 1000;

  const joinOpenWallMs = todayWallMs + 10 * HOUR;
  const stage1StartWallMs = todayWallMs + 10 * HOUR; // Phase 1 starts at 10 AM (same as open)
  const joinCloseWallMs = todayWallMs + 19 * HOUR;   // Registration closes at 7 PM
  const stage1EndWallMs = todayWallMs + 20 * HOUR;    // Phase 1 ends at 8 PM
  const finalStartWallMs = todayWallMs + 20 * HOUR;   // Phase 2 starts at 8 PM
  const finalEndWallMs = todayWallMs + 22 * HOUR;
  const resultsEndWallMs = todayWallMs + 24 * HOUR + 10 * HOUR; // +1 day 10:00
  const yesterdayFinalEndWallMs = yesterdayWallMs + 22 * HOUR;

  const joinOpenAt = ksaWallClockMsToInstantDate(joinOpenWallMs);
  const stage1Start = ksaWallClockMsToInstantDate(stage1StartWallMs);
  const joinCloseAt = ksaWallClockMsToInstantDate(joinCloseWallMs);
  const stage1End = ksaWallClockMsToInstantDate(stage1EndWallMs);
  const finalStart = ksaWallClockMsToInstantDate(finalStartWallMs);
  const finalEnd = ksaWallClockMsToInstantDate(finalEndWallMs);
  const resultsEnd = ksaWallClockMsToInstantDate(resultsEndWallMs);
  
  let currentPhase: ContestPhase;
  let timeRemaining = 0;
  let canJoin = false;
  let canVote = false;
  let isContestActive = false;
  let nextPhaseLabel = '';
  let nextPhaseTime = joinOpenAt;
  let currentStage: 'closed' | 'stage1' | 'final' = 'closed';
  
  // Determine current phase based on KSA wall-clock time
  if (nowWallMs < joinOpenWallMs) {
    // Before 10 AM - Pre-open phase
    // Check if we should show yesterday's results
    if (nowWallMs >= yesterdayFinalEndWallMs) {
      currentPhase = 'results';
      timeRemaining = joinOpenWallMs - nowWallMs;
      nextPhaseLabel = 'opens';
      nextPhaseTime = joinOpenAt;
    } else {
      currentPhase = 'pre_open';
      timeRemaining = joinOpenWallMs - nowWallMs;
      nextPhaseLabel = 'opens';
      nextPhaseTime = joinOpenAt;
    }
  } else if (nowWallMs >= joinOpenWallMs && nowWallMs < stage1StartWallMs) {
    // 10 AM - 2 PM: Join only phase
    currentPhase = 'join_only';
    timeRemaining = stage1StartWallMs - nowWallMs;
    canJoin = true; // join window includes this phase
    nextPhaseLabel = 'starts';
    nextPhaseTime = stage1Start;
  } else if (nowWallMs >= stage1StartWallMs && nowWallMs < stage1EndWallMs) {
    // 2 PM - 8 PM: Stage 1
    currentPhase = 'stage1';
    currentStage = 'stage1';
    isContestActive = true;
    canVote = true;
    // Can join until 6 PM (18:00) strictly
    canJoin = nowWallMs < joinCloseWallMs;
    timeRemaining = stage1EndWallMs - nowWallMs;
    nextPhaseLabel = canJoin ? 'join closes' : 'ends';
    nextPhaseTime = canJoin ? joinCloseAt : stage1End;
  } else if (nowWallMs >= finalStartWallMs && nowWallMs < finalEndWallMs) {
    // 8 PM - 10 PM: Final stage
    currentPhase = 'final';
    currentStage = 'final';
    isContestActive = true;
    canVote = true;
    canJoin = false;
    timeRemaining = finalEndWallMs - nowWallMs;
    nextPhaseLabel = 'ends';
    nextPhaseTime = finalEnd;
  } else if (nowWallMs >= finalEndWallMs) {
    // After 10 PM: Results phase
    currentPhase = 'results';
    timeRemaining = resultsEndWallMs - nowWallMs;
    nextPhaseLabel = 'new contest';
    nextPhaseTime = resultsEnd;
  } else {
    // Fallback
    currentPhase = 'pre_open';
    timeRemaining = joinOpenWallMs - nowWallMs;
  }
  
  // Next contest start for legacy compatibility
  const nextContestStartWallMs = (nowWallMs >= finalEndWallMs ? todayWallMs + 24 * HOUR : todayWallMs) + 10 * HOUR;
  const nextContestStart = ksaWallClockMsToInstantDate(nextContestStartWallMs);
  
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
