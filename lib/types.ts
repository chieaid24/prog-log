// Domain vocabulary (see /CONTEXT.md). These names are the contract between
// the data layer and every view; use them in code, UI copy and tests.
import type { Tables, Enums } from "./database.types";

/** Time Commitment: t-shirt-sized effort on an Entry. Small <1h, Medium 1-3h, Large 3h+. */
export type TimeSize = Enums<"time_size">;

/** Heatmap/intensity weight per Time Commitment (PRD section 2). */
export const TIME_WEIGHT: Record<TimeSize, number> = {
  small: 1,
  medium: 2,
  large: 3,
};

export const TIME_SIZES: readonly TimeSize[] = ["small", "medium", "large"];

/** UI labels for a Time Commitment. */
export const TIME_LABEL: Record<TimeSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

export type Project = Tables<"projects">;
export type Entry = Tables<"entries">;
export type AppSettings = Tables<"app_settings">;

/** An Entry joined with the Project it belongs to (feed and day views). */
export type EntryWithProject = Entry & {
  project: Pick<Project, "id" | "name" | "color" | "category" | "status">;
};

/** One day cell of the year heatmap: summed weight across all Entries. */
export type HeatmapCell = {
  /** ISO date (YYYY-MM-DD) in the user's timezone. */
  date: string;
  entries: number;
  weight: number;
};

/** One Project's presence on one calendar day (a calendar card). */
export type CalendarDayProject = {
  date: string;
  projectId: string;
  projectName: string;
  color: string | null;
  timeSpent: TimeSize;
  weight: number;
  hasMilestone: boolean;
};

/** A past Milestone eligible to resurface, with its precomputed age. */
export type ThrowbackItem = {
  entryId: string;
  milestone: string;
  entryDate: string;
  projectName: string;
  color: string | null;
  daysAgo: number;
};

/** One month's aggregate stats (monthly breakdown header). */
export type MonthlyStat = {
  /** First of the month, ISO date. */
  month: string;
  daysWorked: number;
  entries: number;
  largeSessions: number;
  milestones: number;
};

/** Per-project, per-Time-Commitment counts within one month (stacked bar). */
export type ProjectMonthSplit = {
  projectId: string;
  projectName: string;
  color: string | null;
  counts: Record<TimeSize, number>;
};
