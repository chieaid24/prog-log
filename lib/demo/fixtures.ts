import "server-only";

// The DEMO_MODE read layer (ADR-0016). Parses the checked-in CSV fixtures once
// and answers each lib/queries read shape from them, reproducing the filter and
// order semantics of the Supabase queries it stands in for. Read server-side
// only; the CSV never enters the browser bundle.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { daysBetween } from "../dates";
import type { EntryWithProject, Project, ProjectAlias, Reflection, ThrowbackItem } from "../types";
import { DEMO_TIMEZONE } from "./mode";
import { parseEntriesCsv, parseProjectsCsv, parseReflectionsCsv } from "./parse";

const FIXTURE_DIR = join(process.cwd(), "lib", "demo", "fixtures");

type Dataset = { projects: Project[]; entries: EntryWithProject[]; reflections: Reflection[] };

let cache: Dataset | null = null;

/** Locale-independent ascending compare, matching Postgres text/date order. */
function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

const byName = (a: Project, b: Project) => cmp(a.name, b.name);
const byEntryDate = (a: EntryWithProject, b: EntryWithProject) => cmp(a.entry_date, b.entry_date);

/** Parse the fixtures once, joining each entry to its project (memoized). */
function load(): Dataset {
  if (cache) return cache;
  const projects = parseProjectsCsv(readFileSync(join(FIXTURE_DIR, "projects.csv"), "utf8"));
  const byId = new Map(projects.map((p) => [p.id, p]));
  const entries: EntryWithProject[] = parseEntriesCsv(
    readFileSync(join(FIXTURE_DIR, "entries.csv"), "utf8"),
  ).map((e) => {
    const p = byId.get(e.project_id);
    if (!p) {
      throw new Error(`demo fixture: entry ${e.id} references unknown project ${e.project_id}`);
    }
    return {
      ...e,
      project: { id: p.id, name: p.name, color: p.color, category: p.category, status: p.status },
    };
  });
  const reflections = parseReflectionsCsv(
    readFileSync(join(FIXTURE_DIR, "reflections.csv"), "utf8"),
  );
  cache = { projects, entries, reflections };
  return cache;
}

/** Active projects, name order (mirrors getActiveProjects). */
export function getActiveProjects(): Project[] {
  return load().projects.filter((p) => p.status === "active").sort(byName);
}

/** Every project, active first then name (mirrors getAllProjects). */
export function getAllProjects(): Project[] {
  return [...load().projects].sort((a, b) => cmp(a.status, b.status) || byName(a, b));
}

/** No capture aliases in the demo (mirrors getProjectAliases). */
export function getProjectAliases(): ProjectAlias[] {
  return [];
}

/** Entries in an inclusive date range, date order (mirrors getEntriesInRange). */
export function getEntriesInRange(from: string, to: string): EntryWithProject[] {
  return load()
    .entries.filter((e) => e.entry_date >= from && e.entry_date <= to)
    .sort(byEntryDate);
}

/** All entries, date order (mirrors getAllEntries). */
export function getAllEntries(): EntryWithProject[] {
  return [...load().entries].sort(byEntryDate);
}

/** One day's entries, creation order (mirrors getEntriesForDay). */
export function getEntriesForDay(date: string): EntryWithProject[] {
  return load()
    .entries.filter((e) => e.entry_date === date)
    .sort((a, b) => cmp(a.created_at, b.created_at));
}

/**
 * Past milestones and reflections before todayISO with age precomputed,
 * blended and ordered like fetchThrowbackPool (mirrors getThrowbackPool).
 */
export function getThrowbackPool(todayISO: string): ThrowbackItem[] {
  const { entries, reflections } = load();
  const milestoneItems: ThrowbackItem[] = entries
    .filter((e) => e.milestone !== null && e.entry_date < todayISO)
    .map((e) => ({
      kind: "milestone",
      entryId: e.id,
      milestone: e.milestone as string,
      entryDate: e.entry_date,
      projectName: e.project.name,
      color: e.project.color,
      daysAgo: daysBetween(e.entry_date, todayISO),
    }));
  const reflectionItems: ThrowbackItem[] = reflections
    .filter((r) => r.entry_date < todayISO)
    .map((r) => ({
      kind: "reflection",
      reflection: r.reflection,
      entryDate: r.entry_date,
      daysAgo: daysBetween(r.entry_date, todayISO),
    }));
  return [...milestoneItems, ...reflectionItems].sort(
    (a, b) =>
      cmp(a.entryDate, b.entryDate) ||
      cmp(a.kind, b.kind) ||
      cmp(
        a.kind === "milestone" ? a.entryId : a.reflection,
        b.kind === "milestone" ? b.entryId : b.reflection,
      ),
  );
}

/** Every entry's (date, project) pair, date order (mirrors getEntryDatesWithProject). */
export function getEntryDatesWithProject(): Array<{ entry_date: string; project_id: string }> {
  return [...load().entries]
    .sort(byEntryDate)
    .map((e) => ({ entry_date: e.entry_date, project_id: e.project_id }));
}

/** The demo timezone (mirrors getUserTimezone). */
export function getTimezone(): string {
  return DEMO_TIMEZONE;
}
