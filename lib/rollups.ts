// Pure rollups over fetched Entry rows (ADR-0007). Deterministic, no I/O.
import { addDays, daysBetween, startOfMonth, weekdayMondayFirst } from "./dates";
import type {
  CalendarDayProject,
  EntryWithProject,
  HeatmapCell,
  MonthlyStat,
  ProjectMonthSplit,
  TimeSize,
} from "./types";
import { TIME_SIZES, TIME_WEIGHT } from "./types";

type EntryLike = Pick<EntryWithProject, "entry_date" | "time_spent">;

/** Sum Entries into one HeatmapCell per logged day. */
export function toHeatmapCells(entries: readonly EntryLike[]): HeatmapCell[] {
  const byDate = new Map<string, HeatmapCell>();
  for (const e of entries) {
    const cell = byDate.get(e.entry_date) ?? { date: e.entry_date, entries: 0, weight: 0 };
    cell.entries += 1;
    cell.weight += TIME_WEIGHT[e.time_spent];
    byDate.set(e.entry_date, cell);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Bucket a day's summed weight onto the DESIGN.md heat ramp (heat-0..3):
 * 0 = nothing logged, 1 = a light day (up to a Medium), 2 = a solid day
 * (a Large, or a few smaller Entries), 3 = a heavy day (6+, e.g. two Larges).
 */
export function intensityLevel(weight: number): 0 | 1 | 2 | 3 {
  if (weight <= 0) return 0;
  if (weight <= 2) return 1;
  if (weight <= 5) return 2;
  return 3;
}

/**
 * One card per (day, Project), ordered within each day by weight descending
 * so the dominant Project sits on top (PRD 3.1.2). Entries are already unique
 * per (project, day) — ADR-0001 — so no re-grouping is needed.
 */
export function toCalendarDayProjects(
  entries: readonly EntryWithProject[],
): CalendarDayProject[] {
  const cards: CalendarDayProject[] = entries.map((e) => ({
    date: e.entry_date,
    projectId: e.project.id,
    projectName: e.project.name,
    color: e.project.color,
    timeSpent: e.time_spent,
    weight: TIME_WEIGHT[e.time_spent],
    hasMilestone: e.milestone !== null,
  }));
  return cards.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      b.weight - a.weight ||
      a.projectName.localeCompare(b.projectName),
  );
}

/** Monthly aggregate stats, most recent month first. */
export function toMonthlyStats(
  entries: readonly Pick<EntryWithProject, "entry_date" | "time_spent" | "milestone">[],
): MonthlyStat[] {
  const byMonth = new Map<string, MonthlyStat & { dates: Set<string> }>();
  for (const e of entries) {
    const month = startOfMonth(e.entry_date);
    const stat =
      byMonth.get(month) ??
      Object.assign(
        { month, daysWorked: 0, entries: 0, largeSessions: 0, milestones: 0 },
        { dates: new Set<string>() },
      );
    stat.entries += 1;
    stat.dates.add(e.entry_date);
    if (e.time_spent === "large") stat.largeSessions += 1;
    if (e.milestone !== null) stat.milestones += 1;
    byMonth.set(month, stat);
  }
  return [...byMonth.values()]
    .map(({ dates, ...stat }) => ({ ...stat, daysWorked: dates.size }))
    .sort((a, b) => b.month.localeCompare(a.month));
}

/** Per-project Time Commitment counts for the given month (stacked bar). */
export function toProjectMonthSplits(
  entries: readonly EntryWithProject[],
  monthStart: string,
): ProjectMonthSplit[] {
  const month = monthStart.slice(0, 7);
  const byProject = new Map<string, ProjectMonthSplit>();
  for (const e of entries) {
    if (e.entry_date.slice(0, 7) !== month) continue;
    const split = byProject.get(e.project.id) ?? {
      projectId: e.project.id,
      projectName: e.project.name,
      color: e.project.color,
      counts: { small: 0, medium: 0, large: 0 },
    };
    split.counts[e.time_spent] += 1;
    byProject.set(e.project.id, split);
  }
  const total = (s: ProjectMonthSplit) =>
    TIME_SIZES.reduce((sum, t) => sum + s.counts[t] * TIME_WEIGHT[t], 0);
  return [...byProject.values()].sort(
    (a, b) => total(b) - total(a) || a.projectName.localeCompare(b.projectName),
  );
}

export type TrendPoint = {
  date: string;
  /** Summed weight that day (0 when unlogged). */
  weight: number;
  /** Trailing 7-day average of daily weight, one decimal. */
  rolling: number;
};

/**
 * Daily weight with a trailing 7-day rolling average across an inclusive
 * range — "is my effort rising or falling?" Includes zero days so gaps pull
 * the average down honestly.
 */
export function toTrend(
  entries: readonly EntryLike[],
  from: string,
  to: string,
): TrendPoint[] {
  const weightByDate = new Map<string, number>();
  for (const e of entries) {
    weightByDate.set(
      e.entry_date,
      (weightByDate.get(e.entry_date) ?? 0) + TIME_WEIGHT[e.time_spent],
    );
  }
  const span = daysBetween(from, to);
  const points: TrendPoint[] = [];
  const window: number[] = [];
  for (let i = 0; i <= span; i++) {
    const date = addDays(from, i);
    const weight = weightByDate.get(date) ?? 0;
    window.push(weight);
    if (window.length > 7) window.shift();
    const rolling = window.reduce((a, b) => a + b, 0) / window.length;
    points.push({ date, weight, rolling: Math.round(rolling * 10) / 10 });
  }
  return points;
}

export type WeekdayPattern = {
  /** 0 = Monday ... 6 = Sunday. */
  weekday: number;
  entries: number;
  weight: number;
};

/** Which weekdays carry the effort? Aggregated across the supplied Entries. */
export function toWeekdayPattern(entries: readonly EntryLike[]): WeekdayPattern[] {
  const pattern: WeekdayPattern[] = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    entries: 0,
    weight: 0,
  }));
  for (const e of entries) {
    const slot = pattern[weekdayMondayFirst(e.entry_date)];
    slot.entries += 1;
    slot.weight += TIME_WEIGHT[e.time_spent];
  }
  return pattern;
}

export type ProjectShare = {
  projectId: string;
  projectName: string;
  color: string | null;
  weight: number;
  /** Share of the total weight, 0..1 (0 when the total is 0). */
  share: number;
};

/**
 * Where did the effort go, by Project? Scoped to one month when `monthStart`
 * is given, all-time otherwise. Heaviest Project first, ties by name.
 */
export function toProjectShares(
  entries: readonly EntryWithProject[],
  monthStart?: string,
): ProjectShare[] {
  const month = monthStart?.slice(0, 7);
  const byProject = new Map<string, ProjectShare>();
  for (const e of entries) {
    if (month !== undefined && e.entry_date.slice(0, 7) !== month) continue;
    const share = byProject.get(e.project.id) ?? {
      projectId: e.project.id,
      projectName: e.project.name,
      color: e.project.color,
      weight: 0,
      share: 0,
    };
    share.weight += TIME_WEIGHT[e.time_spent];
    byProject.set(e.project.id, share);
  }
  const weights = [...byProject.values()].sort(
    (a, b) => b.weight - a.weight || a.projectName.localeCompare(b.projectName),
  );
  const total = weights.reduce((sum, w) => sum + w.weight, 0);
  return weights.map((w) => ({ ...w, share: total === 0 ? 0 : w.weight / total }));
}

export type ProjectTotals = {
  projectId: string;
  projectName: string;
  color: string | null;
  entries: number;
  weight: number;
  /** Share of the total weight, 0..1 (0 when the total is 0). */
  share: number;
  /** ISO date of the earliest Entry, or null with none. */
  firstLogged: string | null;
  /** ISO date of the latest Entry, or null with none. */
  lastLogged: string | null;
  milestones: number;
};

/**
 * All-time per-Project totals (ADR-0020). Seeded from `projects` so a Project
 * with no Entries still gets a zeroed row; an Entry whose Project is not in
 * the seed list still produces one. Dominant Project first (weight, then
 * entries, then name).
 */
export function toProjectTotals(
  entries: readonly EntryWithProject[],
  projects: readonly Pick<EntryWithProject["project"], "id" | "name" | "color">[] = [],
): ProjectTotals[] {
  const byProject = new Map<string, ProjectTotals>();
  const row = (id: string, name: string, color: string | null): ProjectTotals => {
    let t = byProject.get(id);
    if (!t) {
      t = {
        projectId: id,
        projectName: name,
        color,
        entries: 0,
        weight: 0,
        share: 0,
        firstLogged: null,
        lastLogged: null,
        milestones: 0,
      };
      byProject.set(id, t);
    }
    return t;
  };
  for (const p of projects) row(p.id, p.name, p.color);
  for (const e of entries) {
    const t = row(e.project.id, e.project.name, e.project.color);
    t.entries += 1;
    t.weight += TIME_WEIGHT[e.time_spent];
    if (t.firstLogged === null || e.entry_date < t.firstLogged) t.firstLogged = e.entry_date;
    if (t.lastLogged === null || e.entry_date > t.lastLogged) t.lastLogged = e.entry_date;
    if (e.milestone !== null) t.milestones += 1;
  }
  const totals = [...byProject.values()].sort(
    (a, b) =>
      b.weight - a.weight || b.entries - a.entries || a.projectName.localeCompare(b.projectName),
  );
  const total = totals.reduce((sum, t) => sum + t.weight, 0);
  return totals.map((t) => ({ ...t, share: total === 0 ? 0 : t.weight / total }));
}

/** Convenience: per-day weight map for arbitrary custom views. */
export function weightByDay(entries: readonly EntryLike[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of entries) {
    map.set(e.entry_date, (map.get(e.entry_date) ?? 0) + TIME_WEIGHT[e.time_spent]);
  }
  return map;
}

export type { TimeSize };
