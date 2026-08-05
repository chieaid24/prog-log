// Pure data-prep for the Projects overview charts (same pattern as
// components/monthly/prepare.ts): components stay thin, behavior unit-tests
// without touching SVG internals.
import { OTHER_COLOR } from "@/components/monthly/prepare";
import type { ProjectShare, ProjectTotals } from "@/lib/rollups";
import { computeMomentum, computeStreaks, type Momentum } from "@/lib/streaks";
import type { EntryWithProject } from "@/lib/types";

export type DonutSegment = {
  name: string;
  color: string;
  /** Integer percent, >= 1 for any nonzero share so a sliver stays visible. */
  pct: number;
  weight: number;
};

/**
 * Donut slices: one per Project with logged effort, heaviest first. Projects
 * with no Entries are omitted (a zero-weight slice has no area to draw).
 */
export function buildDonutSegments(shares: readonly ProjectShare[]): DonutSegment[] {
  return shares
    .filter((s) => s.weight > 0)
    .map((s) => ({
      name: s.projectName,
      color: s.color ?? OTHER_COLOR,
      pct: Math.max(1, Math.round(s.share * 100)),
      weight: s.weight,
    }));
}

export type ComparisonRow = {
  name: string;
  color: string;
  entries: number;
  weight: number;
};

/**
 * Rows for the all-time comparison bar, in the totals' dominant-first order.
 * Zero-Entry Projects stay in (a bar chart draws them as an empty row, unlike
 * a donut) so every active Project is covered.
 */
export function buildComparisonRows(totals: readonly ProjectTotals[]): ComparisonRow[] {
  return totals.map((t) => ({
    name: t.projectName,
    color: t.color ?? OTHER_COLOR,
    entries: t.entries,
    weight: t.weight,
  }));
}

export type StreakRow = {
  projectId: string;
  name: string;
  color: string | null;
  /** All-time consecutive-day run ending today or yesterday. */
  streak: number;
  momentum: Momentum;
  hasEntries: boolean;
};

/**
 * One streak/momentum row per Project in `totals` order (dominant first),
 * computed all-time from that Project's own Entry dates with the shared
 * ADR-0011 math.
 */
export function buildStreakRows(
  totals: readonly ProjectTotals[],
  entries: readonly EntryWithProject[],
  todayISO: string,
): StreakRow[] {
  const datesByProject = new Map<string, string[]>();
  for (const e of entries) {
    const list = datesByProject.get(e.project.id);
    if (list) list.push(e.entry_date);
    else datesByProject.set(e.project.id, [e.entry_date]);
  }
  return totals.map((t) => {
    const dates = datesByProject.get(t.projectId) ?? [];
    return {
      projectId: t.projectId,
      name: t.projectName,
      color: t.color,
      streak: computeStreaks(dates, todayISO).current,
      momentum: computeMomentum(dates, todayISO),
      hasEntries: dates.length > 0,
    };
  });
}
