// Pure data-prep for the Progress view (ADR-0023). The timeline, the
// cumulative-effort curve and the load-more pagination are plain functions
// over fetched rows, so behavior is unit-tested without SVG or client state.
import {
  addDays,
  daysBetween,
  monthTitle,
  parseISODate,
  startOfMonth,
  weekdayMondayFirst,
} from "@/lib/dates";
import { weightByDay } from "@/lib/rollups";
import type { EntryWithProject, TimeSize } from "@/lib/types";
import { TIME_WEIGHT } from "@/lib/types";
import { shortMonthLabel } from "@/components/monthly/prepare";

export type TimelineMilestone = {
  entryId: string;
  milestone: string;
  projectName: string;
  color: string | null;
};

/** A day's non-Milestone Entry, reduced to quiet metadata. */
export type TimelineEntryMeta = {
  projectName: string;
  timeSpent: TimeSize;
};

/**
 * One timeline moment: a day that carries a Reflection or at least one
 * Milestone. Plain Time-Commitment-only days never become moments — the
 * heatmap already answers "did I show up".
 */
export type TimelineMoment = {
  date: string;
  /** Time-bucket header this moment falls under ("This week", "June 2026"). */
  header: string;
  reflection: string | null;
  milestones: TimelineMilestone[];
  /** The day's non-Milestone Entries, heaviest first. */
  others: TimelineEntryMeta[];
};

/**
 * Header bucket for a date: relative near today ("This week" is the Monday
 * week containing today, "This month" the rest of today's month), then
 * month + year going back. Pure ISO-string math — todayISO is already the
 * user-timezone date, so bucketing never touches a clock zone.
 */
export function headerLabel(dateISO: string, todayISO: string): string {
  const weekStart = addDays(todayISO, -weekdayMondayFirst(todayISO));
  if (dateISO >= weekStart) return "This week";
  if (dateISO.slice(0, 7) === todayISO.slice(0, 7)) return "This month";
  return monthTitle(startOfMonth(dateISO));
}

/** "Mon, Aug 3" — a moment's date line (its header carries the year). */
export function momentDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(parseISODate(iso));
}

/**
 * The all-time Progress timeline, newest first: one moment per day that has
 * a Reflection or >=1 Milestone. Milestones keep their Project identity;
 * the day's remaining Entries fold into quiet metadata.
 */
export function buildTimeline(
  entries: readonly EntryWithProject[],
  reflections: ReadonlyArray<{ entryDate: string; reflection: string }>,
  todayISO: string,
): TimelineMoment[] {
  const reflectionByDate = new Map<string, string>();
  for (const r of reflections) reflectionByDate.set(r.entryDate, r.reflection);

  const entriesByDate = new Map<string, EntryWithProject[]>();
  for (const e of entries) {
    const list = entriesByDate.get(e.entry_date);
    if (list) list.push(e);
    else entriesByDate.set(e.entry_date, [e]);
  }

  const dates = new Set<string>(reflectionByDate.keys());
  for (const [date, list] of entriesByDate) {
    if (list.some((e) => e.milestone !== null)) dates.add(date);
  }

  return [...dates]
    .sort((a, b) => b.localeCompare(a))
    .map((date) => {
      const day = entriesByDate.get(date) ?? [];
      const milestones = day
        .filter((e): e is EntryWithProject & { milestone: string } => e.milestone !== null)
        .map((e) => ({
          entryId: e.id,
          milestone: e.milestone,
          projectName: e.project.name,
          color: e.project.color,
        }))
        .sort((a, b) => a.projectName.localeCompare(b.projectName));
      const others = day
        .filter((e) => e.milestone === null)
        .map((e) => ({ projectName: e.project.name, timeSpent: e.time_spent }))
        .sort(
          (a, b) =>
            TIME_WEIGHT[b.timeSpent] - TIME_WEIGHT[a.timeSpent] ||
            a.projectName.localeCompare(b.projectName),
        );
      return {
        date,
        header: headerLabel(date, todayISO),
        reflection: reflectionByDate.get(date) ?? null,
        milestones,
        others,
      };
    });
}

export type CumulativePoint = {
  date: string;
  /** Running sum of Time Commitment weight up to and including this day. */
  total: number;
};

/**
 * The "how far I've come" series: per-day running sum of TIME_WEIGHT from the
 * first logged day through today. Monotonic by construction — unlogged days
 * carry the total flat instead of dropping it.
 */
export function buildCumulativeEffort(
  entries: readonly Pick<EntryWithProject, "entry_date" | "time_spent">[],
  todayISO: string,
): CumulativePoint[] {
  if (entries.length === 0) return [];
  const byDay = weightByDay(entries);
  const first = [...byDay.keys()].sort()[0];
  const span = Math.max(daysBetween(first, todayISO), 0);
  const points: CumulativePoint[] = [];
  let total = 0;
  for (let i = 0; i <= span; i++) {
    const date = addDays(first, i);
    total += byDay.get(date) ?? 0;
    points.push({ date, total });
  }
  return points;
}

export type ChartTick = { date: string; label: string };

/** X-axis ticks: month starts, folding to year starts on multi-year spans. */
export function cumulativeTicks(points: readonly CumulativePoint[]): ChartTick[] {
  const months = points.filter((p) => p.date.endsWith("-01"));
  if (months.length <= 15) {
    return months.map((p) => ({ date: p.date, label: shortMonthLabel(p.date) }));
  }
  return months
    .filter((p) => p.date.endsWith("-01-01"))
    .map((p) => ({ date: p.date, label: p.date.slice(0, 4) }));
}

/** Moments in the initial window and revealed per "Load more". */
export const TIMELINE_PAGE = 10;

export function visibleMoments(
  moments: readonly TimelineMoment[],
  pages: number,
): TimelineMoment[] {
  return moments.slice(0, Math.max(1, pages) * TIMELINE_PAGE);
}

export function hasMoreMoments(moments: readonly TimelineMoment[], pages: number): boolean {
  return moments.length > Math.max(1, pages) * TIMELINE_PAGE;
}
