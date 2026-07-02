// Throwback selection and age labels (PRD 3.4). Selection is date-seeded and
// stable per day: the on-page feed and the morning Discord digest derive from
// the same ordering, and refreshing never reshuffles.
import type { ThrowbackItem } from "./types";

/** Page shows up to 3 Throwbacks; the digest sends the top 1. */
export const FEED_SIZE = 3;

/**
 * Render a day count as its nicest human unit ("4 months ago", "1 year ago").
 * No bias toward round marks — plain rounding at each unit.
 */
export function humanizeAge(daysAgo: number): string {
  if (daysAgo <= 0) return "today";
  if (daysAgo === 1) return "yesterday";
  if (daysAgo < 7) return `${daysAgo} days ago`;
  if (daysAgo < 28) {
    const weeks = Math.round(daysAgo / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  if (daysAgo < 335) {
    const months = Math.max(1, Math.min(11, Math.round(daysAgo / 30.437)));
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }
  const years = Math.max(1, Math.round(daysAgo / 365.25));
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

/** 32-bit string hash (FNV-1a) — seeds the shuffle from an ISO date. */
function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG — small, fast, deterministic for a given seed. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic Fisher-Yates shuffle seeded by an arbitrary string. */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const rand = mulberry32(hashSeed(seed));
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The day's Throwbacks: a deterministic shuffle of the whole candidate pool
 * seeded by today's date (user timezone), truncated to `count`. Page and
 * digest call this with the same date, so the digest's single item is always
 * the page's first item.
 */
export function pickThrowbacks(
  pool: readonly ThrowbackItem[],
  todayISO: string,
  count: number = FEED_SIZE,
): ThrowbackItem[] {
  if (pool.length === 0) return [];
  return seededShuffle(pool, todayISO).slice(0, count);
}
