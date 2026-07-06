// Pure data-prep for the monthly views. Chart components stay thin: these
// helpers produce exactly the series they render, so behavior is unit-tested
// without touching SVG internals.
import { addDays, addMonths, endOfMonth, monthTitle, parseISODate } from "@/lib/dates";
import type { EntryWithProject, MonthlyStat, ProjectMonthSplit, TimeSize } from "@/lib/types";
import type { ProjectShare, TrendPoint, WeekdayPattern } from "@/lib/rollups";
import { toMonthlyStats } from "@/lib/rollups";

/**
 * Ordinal ramp for the Time Commitment scale (S < M < L): the DESIGN.md heat
 * ramp, one green hue climbing in lightness (larger = deeper) so charts and
 * the heatmap speak the same visual language on warm paper.
 */
export const TIME_RAMP: Record<TimeSize, string> = {
  small: "var(--heat-1)",
  medium: "var(--heat-2)",
  large: "var(--heat-3)",
};

/** Chart surface + shared chrome colors (match app/globals.css tokens). */
export const CHART_SURFACE = "var(--surface)";
export const CHART_GRID = "var(--border)";
export const CHART_TEXT = "var(--ink-muted)";
export const OTHER_COLOR = "var(--ink-faint)";

const MONTH_PARAM = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Resolve the ?month= param to a month start, defaulting to today's month. */
export function parseMonthParam(param: string | undefined, todayISO: string): string {
  if (param && MONTH_PARAM.test(param)) return `${param}-01`;
  return `${todayISO.slice(0, 7)}-01`;
}

/** Days covered by the effort trend, ending today (inclusive). */
export const TREND_DAYS = 90;

export type MonthWindow = {
  monthStart: string;
  monthEnd: string;
  /** First day of the effort trend (TREND_DAYS ending today). */
  trendFrom: string;
  /** Single fetch range covering both the displayed month and the trend. */
  from: string;
  to: string;
};

/** One fetch serves the whole page: the union of month and trend ranges. */
export function monthWindow(monthStart: string, todayISO: string): MonthWindow {
  const monthEnd = endOfMonth(monthStart);
  const trendFrom = addDays(todayISO, -(TREND_DAYS - 1));
  return {
    monthStart,
    monthEnd,
    trendFrom,
    from: monthStart < trendFrom ? monthStart : trendFrom,
    to: monthEnd > todayISO ? monthEnd : todayISO,
  };
}

/** Entries falling inside the displayed month. */
export function monthEntries<T extends { entry_date: string }>(
  entries: readonly T[],
  monthStart: string,
): T[] {
  const month = monthStart.slice(0, 7);
  return entries.filter((e) => e.entry_date.slice(0, 7) === month);
}

/** The displayed month's aggregate stats, all-zero when nothing was logged. */
export function monthStat(
  entries: readonly Pick<EntryWithProject, "entry_date" | "time_spent" | "milestone">[],
  monthStart: string,
): MonthlyStat {
  return (
    toMonthlyStats(monthEntries(entries, monthStart))[0] ?? {
      month: monthStart,
      daysWorked: 0,
      entries: 0,
      largeSessions: 0,
      milestones: 0,
    }
  );
}

/** Entry counts per Time Commitment (the split meter). */
export function timeSplit(
  entries: readonly Pick<EntryWithProject, "time_spent">[],
): Record<TimeSize, number> {
  const split: Record<TimeSize, number> = { small: 0, medium: 0, large: 0 };
  for (const e of entries) split[e.time_spent] += 1;
  return split;
}

export type MilestoneRow = {
  entryId: string;
  date: string;
  projectName: string;
  color: string | null;
  milestone: string;
};

/** The month's Milestones in chronological order (date, then Project name). */
export function buildMilestoneRows(entries: readonly EntryWithProject[]): MilestoneRow[] {
  return entries
    .filter((e): e is EntryWithProject & { milestone: string } => e.milestone !== null)
    .map((e) => ({
      entryId: e.id,
      date: e.entry_date,
      projectName: e.project.name,
      color: e.project.color,
      milestone: e.milestone,
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.projectName.localeCompare(b.projectName));
}

export type MonthNav = {
  title: string;
  /** ?month= values for the nav links. */
  prev: string;
  next: string;
  isCurrentMonth: boolean;
};

export function buildMonthNav(monthStart: string, todayISO: string): MonthNav {
  return {
    title: monthTitle(monthStart),
    prev: addMonths(monthStart, -1).slice(0, 7),
    next: addMonths(monthStart, 1).slice(0, 7),
    isCurrentMonth: monthStart.slice(0, 7) === todayISO.slice(0, 7),
  };
}

export type StackRow = {
  name: string;
  /** Entity color for the row's project dot (identity is the label, not the fill). */
  color: string | null;
  small: number;
  medium: number;
  large: number;
};

const MAX_STACK_ROWS = 10;

/** Rows for the per-project stacked bar; long tails fold into "Other". */
export function buildStackRows(splits: readonly ProjectMonthSplit[]): StackRow[] {
  const rows = splits.map((s) => ({
    name: s.projectName,
    color: s.color,
    small: s.counts.small,
    medium: s.counts.medium,
    large: s.counts.large,
  }));
  if (rows.length <= MAX_STACK_ROWS) return rows;
  const head = rows.slice(0, MAX_STACK_ROWS - 1);
  const tail = rows.slice(MAX_STACK_ROWS - 1);
  head.push({
    name: `Other (${tail.length})`,
    color: OTHER_COLOR,
    small: tail.reduce((n, r) => n + r.small, 0),
    medium: tail.reduce((n, r) => n + r.medium, 0),
    large: tail.reduce((n, r) => n + r.large, 0),
  });
  return head;
}

/** First-of-month tick positions for a daily-date x axis. */
export function monthTicks(points: readonly TrendPoint[]): string[] {
  return points.filter((p) => p.date.endsWith("-01")).map((p) => p.date);
}

/** "Jun", "Jul" tick labels. */
export function shortMonthLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short" }).format(
    parseISODate(iso),
  );
}

/** "Jun 3" — compact date for in-month lists. */
export function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(parseISODate(iso));
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type WeekdayRow = {
  label: (typeof WEEKDAY_LABELS)[number];
  entries: number;
  weight: number;
  /** Exactly one true (first max by weight) — the selectively-labeled peak. */
  isPeak: boolean;
};

export function buildWeekdayRows(pattern: readonly WeekdayPattern[]): WeekdayRow[] {
  const max = Math.max(...pattern.map((p) => p.weight));
  let peakMarked = false;
  return pattern.map((p) => {
    const isPeak = !peakMarked && max > 0 && p.weight === max;
    if (isPeak) peakMarked = true;
    return { label: WEEKDAY_LABELS[p.weekday], entries: p.entries, weight: p.weight, isPeak };
  });
}

export type ShareSegment = {
  name: string;
  color: string;
  /** Integer percent, >= 1 for any nonzero share so a sliver stays visible. */
  pct: number;
  weight: number;
};

const MAX_SHARE_SEGMENTS = 6;

/** Share-bar segments: top projects by weight, tail folded into "Other". */
export function buildShareSegments(shares: readonly ProjectShare[]): ShareSegment[] {
  const nonzero = shares.filter((s) => s.weight > 0);
  if (nonzero.length === 0) return [];
  const head = nonzero.slice(0, MAX_SHARE_SEGMENTS);
  const tail = nonzero.slice(MAX_SHARE_SEGMENTS);
  const segments = head.map((s) => ({
    name: s.projectName,
    color: s.color ?? OTHER_COLOR,
    pct: Math.max(1, Math.round(s.share * 100)),
    weight: s.weight,
  }));
  if (tail.length > 0) {
    segments.push({
      name: `Other (${tail.length})`,
      color: OTHER_COLOR,
      pct: Math.max(1, Math.round(tail.reduce((n, s) => n + s.share, 0) * 100)),
      weight: tail.reduce((n, s) => n + s.weight, 0),
    });
  }
  return segments;
}
