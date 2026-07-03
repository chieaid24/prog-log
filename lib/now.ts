// The public "now" page's data prep (PRD §8 stretch; ADR-0009). Pure: the
// page fetches only the published field list and this module shapes it —
// recent Milestones and large-Time-Commitment Entries, grouped by Project,
// freshest first. Descriptions never enter this module by design.
import { addDays, daysBetween } from "./dates";
import type { TimeSize } from "./types";

/** How far back "now" looks. Weeks-granularity concept, so 60 days. */
export const NOW_WINDOW_DAYS = 60;

/** Max Milestones shown per Project — the page stays a glance, not a log. */
export const NOW_MILESTONES_PER_PROJECT = 3;

/** One source row: exactly the fields ADR-0009 allows to be published. */
export type NowSourceEntry = {
  entryDate: string;
  timeSpent: TimeSize;
  milestone: string | null;
  projectName: string;
  category: string | null;
  color: string | null;
};

export type NowMilestone = { text: string; date: string };

/** One Project's public "now" card. */
export type NowProject = {
  projectName: string;
  category: string | null;
  color: string | null;
  /** Most recent qualifying Entry date. */
  lastActiveDate: string;
  /** Whole days from lastActiveDate to today. */
  daysSinceActive: number;
  /** Newest first, capped at NOW_MILESTONES_PER_PROJECT. */
  milestones: NowMilestone[];
  /** Large-Time-Commitment days inside the window (deep-work signal). */
  deepWorkDays: number;
};

/**
 * Shape the window's qualifying Entries into per-Project cards. An Entry
 * qualifies if it falls inside the trailing window and carries a Milestone or
 * a large Time Commitment. Projects order by freshest activity, then by
 * Milestone count, then name — stable for a fixed input.
 */
export function prepareNowItems(
  entries: readonly NowSourceEntry[],
  todayISO: string,
  windowDays: number = NOW_WINDOW_DAYS,
): NowProject[] {
  const windowStart = addDays(todayISO, -windowDays);
  const groups = new Map<string, NowProject>();

  for (const entry of entries) {
    if (entry.entryDate < windowStart || entry.entryDate > todayISO) continue;
    const isDeepWork = entry.timeSpent === "large";
    if (!isDeepWork && entry.milestone === null) continue;

    const key = entry.projectName.trim().toLowerCase();
    let group = groups.get(key);
    if (!group) {
      group = {
        projectName: entry.projectName,
        category: entry.category,
        color: entry.color,
        lastActiveDate: entry.entryDate,
        daysSinceActive: 0,
        milestones: [],
        deepWorkDays: 0,
      };
      groups.set(key, group);
    }
    if (entry.entryDate > group.lastActiveDate) group.lastActiveDate = entry.entryDate;
    if (isDeepWork) group.deepWorkDays += 1;
    if (entry.milestone !== null) {
      group.milestones.push({ text: entry.milestone, date: entry.entryDate });
    }
  }

  const projects = [...groups.values()];
  for (const project of projects) {
    project.daysSinceActive = daysBetween(project.lastActiveDate, todayISO);
    project.milestones.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    project.milestones = project.milestones.slice(0, NOW_MILESTONES_PER_PROJECT);
  }

  return projects.sort(
    (a, b) =>
      a.daysSinceActive - b.daysSinceActive ||
      b.milestones.length - a.milestones.length ||
      a.projectName.localeCompare(b.projectName),
  );
}

/** "Jul 1" style label for a Milestone date (UTC-safe, matches lib/dates). */
export function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(new Date(`${iso}T12:00:00Z`));
}
