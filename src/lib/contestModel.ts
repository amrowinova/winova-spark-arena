/**
 * Contest financial model — defaults used when app_settings has no contest_config.
 * All frontend components must read from useContestConfig() — never hardcode here.
 */

export interface PrizeSlot {
  place: number;
  pct: number;
  emoji: string;
  label: string;
  arLabel: string;
}

export interface ContestConfig {
  entryFee: number;          // Nova per participant (shown to users)
  prizePoolRate: number;     // Nova per participant that goes to prize pool (internal only)
  voteEarningsPct: number;   // Fraction returned to contestant after each stage (e.g. 0.20 = 20%)
  fridayPrize: number;       // Fixed Nova prize for Friday free contest (set by admin)
  distribution: PrizeSlot[];
}

const EMOJIS = ['🥇', '🥈', '🥉', '🏅', '🏅', '🎖️', '🎖️', '🎖️', '🎖️', '🎖️'];
const EN_ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
const AR_ORDINALS = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر'];

export const DEFAULT_CONTEST_CONFIG: ContestConfig = {
  entryFee: 10,
  prizePoolRate: 6,
  voteEarningsPct: 0.20,
  fridayPrize: 100,
  distribution: [
    { place: 1, pct: 50, emoji: '🥇', label: '1st', arLabel: 'الأول' },
    { place: 2, pct: 25, emoji: '🥈', label: '2nd', arLabel: 'الثاني' },
    { place: 3, pct: 15, emoji: '🥉', label: '3rd', arLabel: 'الثالث' },
    { place: 4, pct: 6,  emoji: '🏅', label: '4th', arLabel: 'الرابع' },
    { place: 5, pct: 4,  emoji: '🏅', label: '5th', arLabel: 'الخامس' },
  ],
};

/** Attach display labels to raw distribution data coming from app_settings */
export function enrichDistribution(
  raw: { place: number; pct: number }[]
): PrizeSlot[] {
  return raw.map((r) => ({
    ...r,
    emoji: EMOJIS[r.place - 1] ?? '🎖️',
    label: EN_ORDINALS[r.place - 1] ?? `${r.place}th`,
    arLabel: AR_ORDINALS[r.place - 1] ?? `المركز ${r.place}`,
  }));
}

/** Prize amount in Nova for a given place */
export function calcPrize(prizePool: number, place: number, distribution: PrizeSlot[]): number {
  const slot = distribution.find((d) => d.place === place);
  if (!slot) return 0;
  return prizePool * slot.pct / 100;
}

/** Dynamic prize pool based on participants and rate */
export function calcDynamicPrizePool(participants: number, prizePoolRate: number): number {
  return participants * prizePoolRate;
}
