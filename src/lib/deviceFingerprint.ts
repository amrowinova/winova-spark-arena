/**
 * Device Fingerprint Utility
 * ──────────────────────────
 * Generates a stable, privacy-safe fingerprint from browser signals.
 * Used exclusively for free-contest abuse prevention (one device per contest).
 *
 * Signals used (no PII):
 *   - userAgent, screen dimensions, color depth
 *   - timezone, language, hardware concurrency
 *   - canvas-free — no tracking supercookies
 *
 * Cached in localStorage so the value is stable across page reloads.
 */

const STORAGE_KEY = 'wnv_dfp';

/** Simple djb2 hash → 8-char hex string */
function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  return hash.toString(16).padStart(8, '0');
}

function buildRaw(): string {
  const nav = navigator;
  const scr = screen;
  const signals = [
    nav.userAgent,
    `${scr.width}x${scr.height}x${scr.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    nav.language,
    String(nav.hardwareConcurrency ?? 0),
    String(nav.maxTouchPoints ?? 0),
  ];
  return signals.join('|');
}

/** Returns a stable fingerprint string (cached in localStorage). */
export function getDeviceFingerprint(): string {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached && /^[0-9a-f]{8,}$/.test(cached)) return cached;

    const fp = djb2(buildRaw());
    localStorage.setItem(STORAGE_KEY, fp);
    return fp;
  } catch {
    // Private browsing or storage blocked — generate ephemeral value
    return djb2(buildRaw());
  }
}
