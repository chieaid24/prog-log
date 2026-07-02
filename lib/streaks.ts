// Streak and momentum math over logged days (PRD stretch: streaks +
// per-project momentum). Pure; date arithmetic via lib/dates.
import { addDays, daysBetween } from "./dates";

export type StreakSummary = {
  /**
   * Consecutive logged days ending today or yesterday (a streak "survives"
   * until a full day is missed; logging later today can extend it).
   */
  current: number;
  /** Longest run of consecutive logged days ever. */
  longest: number;
  /** Total distinct logged days. */
  totalDays: number;
  /** ISO date of the most recent logged day, or null. */
  lastLogged: string | null;
};

/** Compute streaks from Entry dates (duplicates fine) relative to `todayISO`. */
export function computeStreaks(
  entryDates: readonly string[],
  todayISO: string,
): StreakSummary {
  const days = [...new Set(entryDates)].sort();
  if (days.length === 0) {
    return { current: 0, longest: 0, totalDays: 0, lastLogged: null };
  }

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = daysBetween(days[i - 1], days[i]) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  const last = days[days.length - 1];
  const gapToToday = daysBetween(last, todayISO);
  let current = 0;
  if (gapToToday <= 1 && gapToToday >= 0) {
    current = 1;
    let cursor = last;
    while (days.includes(addDays(cursor, -1))) {
      cursor = addDays(cursor, -1);
      current += 1;
    }
  }

  return { current, longest, totalDays: days.length, lastLogged: last };
}

export type Momentum = {
  /** Days logged in the trailing 14 days (including today). */
  daysLast14: number;
  /** Days logged in the 14 days before that. */
  daysPrev14: number;
  /** rising | steady | cooling, from the two windows. */
  direction: "rising" | "steady" | "cooling";
};

/** Simple two-window momentum: is this (project's) cadence rising or cooling? */
export function computeMomentum(
  entryDates: readonly string[],
  todayISO: string,
): Momentum {
  const days = new Set(entryDates);
  let daysLast14 = 0;
  let daysPrev14 = 0;
  for (let i = 0; i < 14; i++) {
    if (days.has(addDays(todayISO, -i))) daysLast14 += 1;
    if (days.has(addDays(todayISO, -(i + 14)))) daysPrev14 += 1;
  }
  const direction =
    daysLast14 > daysPrev14 ? "rising" : daysLast14 < daysPrev14 ? "cooling" : "steady";
  return { daysLast14, daysPrev14, direction };
}
