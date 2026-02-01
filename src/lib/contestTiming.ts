/**
 * Contest Timing Utilities
 * All times are in KSA timezone (Asia/Riyadh = UTC+3)
 * 
 * Daily Schedule:
 * - Stage 1: 02:00 PM - 08:00 PM (6 hours)
 * - Final Stage: 08:00 PM - 10:00 PM (2 hours)
 * - Closed: 10:00 PM - 02:00 PM next day
 */

const KSA_TIMEZONE = 'Asia/Riyadh';

// Convert current time to KSA
function getKSATime(): Date {
  const now = new Date();
  // Get the time in KSA timezone
  const ksaString = now.toLocaleString('en-US', { timeZone: KSA_TIMEZONE });
  return new Date(ksaString);
}

// Get today's contest date in KSA
function getTodayKSA(): Date {
  const ksa = getKSATime();
  ksa.setHours(0, 0, 0, 0);
  return ksa;
}

export interface ContestTimingInfo {
  currentStage: 'closed' | 'stage1' | 'final';
  stage1Start: Date;
  stage1End: Date;
  finalStart: Date;
  finalEnd: Date;
  timeRemaining: number; // milliseconds until current stage ends
  isContestActive: boolean;
  canJoin: boolean;
  canVote: boolean;
  nextContestStart: Date;
}

export function getContestTiming(): ContestTimingInfo {
  const ksaNow = getKSATime();
  const today = getTodayKSA();
  
  // Stage 1: 14:00 - 20:00 KSA
  const stage1Start = new Date(today);
  stage1Start.setHours(14, 0, 0, 0);
  
  const stage1End = new Date(today);
  stage1End.setHours(20, 0, 0, 0);
  
  // Final: 20:00 - 22:00 KSA
  const finalStart = new Date(today);
  finalStart.setHours(20, 0, 0, 0);
  
  const finalEnd = new Date(today);
  finalEnd.setHours(22, 0, 0, 0);
  
  const nowMs = ksaNow.getTime();
  const stage1StartMs = stage1Start.getTime();
  const stage1EndMs = stage1End.getTime();
  const finalStartMs = finalStart.getTime();
  const finalEndMs = finalEnd.getTime();
  
  let currentStage: 'closed' | 'stage1' | 'final' = 'closed';
  let timeRemaining = 0;
  let isContestActive = false;
  let canJoin = false;
  let canVote = false;
  let nextContestStart = new Date(stage1Start);
  
  if (nowMs >= stage1StartMs && nowMs < stage1EndMs) {
    // Stage 1 active
    currentStage = 'stage1';
    timeRemaining = stage1EndMs - nowMs;
    isContestActive = true;
    canJoin = true;
    canVote = true;
  } else if (nowMs >= finalStartMs && nowMs < finalEndMs) {
    // Final stage active
    currentStage = 'final';
    timeRemaining = finalEndMs - nowMs;
    isContestActive = true;
    canJoin = false; // Cannot join in final
    canVote = true;
  } else if (nowMs >= finalEndMs) {
    // Contest ended today, next is tomorrow
    currentStage = 'closed';
    nextContestStart.setDate(nextContestStart.getDate() + 1);
    timeRemaining = nextContestStart.getTime() - nowMs;
    isContestActive = false;
    canJoin = false;
    canVote = false;
  } else {
    // Before today's contest
    currentStage = 'closed';
    timeRemaining = stage1StartMs - nowMs;
    nextContestStart = stage1Start;
    isContestActive = false;
    canJoin = false;
    canVote = false;
  }
  
  return {
    currentStage,
    stage1Start,
    stage1End,
    finalStart,
    finalEnd,
    timeRemaining,
    isContestActive,
    canJoin,
    canVote,
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
