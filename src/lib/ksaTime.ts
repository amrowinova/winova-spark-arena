export const KSA_TIMEZONE = 'Asia/Riyadh' as const;

// KSA is fixed at UTC+3 (no DST).
const KSA_OFFSET_MS = 3 * 60 * 60 * 1000;

export type KsaDateTimeParts = {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  second: number; // 0-59
};

const KSA_DTF = new Intl.DateTimeFormat('en-CA', {
  timeZone: KSA_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function readPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  const value = parts.find((p) => p.type === type)?.value;
  return value ? Number(value) : 0;
}

/**
 * Returns the *KSA wall-clock* date-time parts for the provided instant.
 * This avoids parsing locale strings back into Date (which can be inconsistent).
 */
export function getKsaParts(date: Date = new Date()): KsaDateTimeParts {
  const parts = KSA_DTF.formatToParts(date);
  return {
    year: readPart(parts, 'year'),
    month: readPart(parts, 'month'),
    day: readPart(parts, 'day'),
    hour: readPart(parts, 'hour'),
    minute: readPart(parts, 'minute'),
    second: readPart(parts, 'second'),
  };
}

/**
 * Converts the given instant into a synthetic "KSA wall-clock" timestamp in ms.
 *
 * Important: This is NOT an actual UTC instant; it's a stable representation
 * used for comparisons like: now ∈ [10:00, 18:00) KSA.
 */
export function getKsaWallClockMs(date: Date = new Date()): number {
  const p = getKsaParts(date);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, 0);
}

export function getKsaTodayWallClockMs(date: Date = new Date()): number {
  const p = getKsaParts(date);
  return Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0, 0);
}

/**
 * Converts a KSA wall-clock timestamp into a real Date instant.
 *
 * Example: wall-clock 10:00 KSA -> 07:00 UTC instant.
 */
export function ksaWallClockMsToInstantDate(ksaWallClockMs: number): Date {
  return new Date(ksaWallClockMs - KSA_OFFSET_MS);
}

// Registration window: 10:00 AM - 7:00 PM KSA
export function getKsaJoinWindow(date: Date = new Date()): {
  nowWallClockMs: number;
  joinOpenWallClockMs: number;
  joinCloseWallClockMs: number;
  canJoin: boolean;
  msUntilOpen: number;
  msUntilClose: number;
} {
  const HOUR = 60 * 60 * 1000;
  const nowWallClockMs = getKsaWallClockMs(date);
  const todayWallClockMs = getKsaTodayWallClockMs(date);

  const joinOpenWallClockMs = todayWallClockMs + 10 * HOUR;
  // TEMP: Extended to 20:00 KSA for testing (was 18 * HOUR)
  const joinCloseWallClockMs = todayWallClockMs + 20 * HOUR;

  return {
    nowWallClockMs,
    joinOpenWallClockMs,
    joinCloseWallClockMs,
    canJoin: nowWallClockMs >= joinOpenWallClockMs && nowWallClockMs < joinCloseWallClockMs,
    msUntilOpen: joinOpenWallClockMs - nowWallClockMs,
    msUntilClose: joinCloseWallClockMs - nowWallClockMs,
  };
}
