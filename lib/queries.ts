// Thin fetches (ADR-0007): filters and joins only, no aggregation.
// Rollups happen in lib/rollups.ts / lib/throwbacks.ts on the returned rows.
//
// The get* helpers are RLS-scoped (session client — the policy scopes rows).
// Three shapes are shared with the service-role capture layer (ADR-0009):
// their fetch* cores take an optional ownerId and add an explicit
// `.eq("user_id", ownerId)` filter when it is present. The owner-scoped
// wrappers that always supply it live in lib/discord/owner.ts.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { DEFAULT_TIMEZONE, daysBetween, todayInTimeZone } from "./dates";
import { isDemoMode } from "./demo/mode";
import type { EntryWithProject, Project, ProjectAlias, ThrowbackItem } from "./types";

export type Db = SupabaseClient<Database>;

const ENTRY_WITH_PROJECT = "*, project:projects(id, name, color, category, status)";

// DEMO_MODE (ADR-0016): the read wrappers below source from the server-side CSV
// fixture provider instead of Supabase. Imported lazily so its fs/server-only
// graph never loads in the normal app; only the get* wrappers branch, the
// fetch* cores (service-role capture, ADR-0009) always hit the database.
function demoReads() {
  return import("./demo/fixtures");
}

/**
 * Core shape: active Projects, name order. RLS callers omit `ownerId`;
 * service-role callers (ADR-0009) must pass it since RLS is bypassed.
 */
export async function fetchActiveProjects(db: Db, ownerId?: string): Promise<Project[]> {
  const query = db.from("projects").select("*");
  const scoped = ownerId === undefined ? query : query.eq("user_id", ownerId);
  const { data, error } = await scoped.eq("status", "active").order("name");
  if (error) throw error;
  return data;
}

/** Active Projects for pickers, name order (PRD 3.2). */
export async function getActiveProjects(db: Db): Promise<Project[]> {
  if (isDemoMode()) return (await demoReads()).getActiveProjects();
  return fetchActiveProjects(db);
}

/** Every Project regardless of status, active first then name. */
export async function getAllProjects(db: Db): Promise<Project[]> {
  if (isDemoMode()) return (await demoReads()).getAllProjects();
  const { data, error } = await db
    .from("projects")
    .select("*")
    .order("status") // 'active' < 'archived'
    .order("name");
  if (error) throw error;
  return data;
}

/** Every capture alias, alias order (ADR-0010). */
export async function getProjectAliases(db: Db): Promise<ProjectAlias[]> {
  if (isDemoMode()) return (await demoReads()).getProjectAliases();
  const { data, error } = await db.from("project_aliases").select("*").order("alias");
  if (error) throw error;
  return data;
}

/** Entries in an inclusive date range, joined with their Project. */
export async function getEntriesInRange(
  db: Db,
  from: string,
  to: string,
): Promise<EntryWithProject[]> {
  if (isDemoMode()) return (await demoReads()).getEntriesInRange(from, to);
  const { data, error } = await db
    .from("entries")
    .select(ENTRY_WITH_PROJECT)
    .gte("entry_date", from)
    .lte("entry_date", to)
    .order("entry_date");
  if (error) throw error;
  return data as EntryWithProject[];
}

/** All Entries ever, joined with their Project (monthly stats, exports). */
export async function getAllEntries(db: Db): Promise<EntryWithProject[]> {
  if (isDemoMode()) return (await demoReads()).getAllEntries();
  const { data, error } = await db
    .from("entries")
    .select(ENTRY_WITH_PROJECT)
    .order("entry_date");
  if (error) throw error;
  return data as EntryWithProject[];
}

/** One day's Entries with Projects (day detail panel). */
export async function getEntriesForDay(db: Db, date: string): Promise<EntryWithProject[]> {
  if (isDemoMode()) return (await demoReads()).getEntriesForDay(date);
  const { data, error } = await db
    .from("entries")
    .select(ENTRY_WITH_PROJECT)
    .eq("entry_date", date)
    .order("created_at");
  if (error) throw error;
  return data as EntryWithProject[];
}

/**
 * Core shape: the Throwback candidate pool — every past Milestone (strictly
 * before today in the user's timezone), with its age precomputed (PRD 3.4).
 * RLS callers omit `ownerId`; service-role callers (ADR-0009) must pass it.
 */
export async function fetchThrowbackPool(
  db: Db,
  todayISO: string,
  ownerId?: string,
): Promise<ThrowbackItem[]> {
  const query = db
    .from("entries")
    .select("id, milestone, entry_date, project:projects(name, color)");
  const scoped = ownerId === undefined ? query : query.eq("user_id", ownerId);
  const { data, error } = await scoped
    .not("milestone", "is", null)
    .lt("entry_date", todayISO)
    .order("entry_date");
  if (error) throw error;
  return (data as unknown as Array<{
    id: string;
    milestone: string;
    entry_date: string;
    project: { name: string; color: string | null };
  }>).map((row) => ({
    entryId: row.id,
    milestone: row.milestone,
    entryDate: row.entry_date,
    projectName: row.project.name,
    color: row.project.color,
    daysAgo: daysBetween(row.entry_date, todayISO),
  }));
}

/**
 * The Throwback candidate pool for the signed-in user's web feed (PRD 3.4).
 */
export async function getThrowbackPool(db: Db, todayISO: string): Promise<ThrowbackItem[]> {
  if (isDemoMode()) return (await demoReads()).getThrowbackPool(todayISO);
  return fetchThrowbackPool(db, todayISO);
}

/**
 * Every Entry's (date, project) pair, all time — the lean feed for streak and
 * momentum math (ADR-0011: streaks reach past the heatmap's year window).
 */
export async function getEntryDatesWithProject(
  db: Db,
): Promise<Array<{ entry_date: string; project_id: string }>> {
  if (isDemoMode()) return (await demoReads()).getEntryDatesWithProject();
  const { data, error } = await db
    .from("entries")
    .select("entry_date, project_id")
    .order("entry_date");
  if (error) throw error;
  return data;
}

/**
 * Core shape: the stored timezone (ADR-0004), defaulting when no row exists
 * yet. RLS callers omit `ownerId`; service-role callers (ADR-0009) must pass it.
 */
export async function fetchTimezone(db: Db, ownerId?: string): Promise<string> {
  const query = db.from("app_settings").select("timezone");
  const scoped = ownerId === undefined ? query : query.eq("user_id", ownerId);
  const { data, error } = await scoped.maybeSingle();
  if (error) throw error;
  return data?.timezone ?? DEFAULT_TIMEZONE;
}

/** The stored user timezone (ADR-0004), defaulting when no row exists yet. */
export async function getUserTimezone(db: Db): Promise<string> {
  if (isDemoMode()) return (await demoReads()).getTimezone();
  return fetchTimezone(db);
}

/**
 * Today's calendar date in the stored timezone (ADR-0004). Concentrates the
 * fetch-then-compute pairing every read boundary needs, so no caller can drift
 * from the stored zone. RLS-scoped; owner-scoped callers use getOwnerToday.
 */
export async function getToday(db: Db): Promise<string> {
  if (isDemoMode()) return todayInTimeZone((await demoReads()).getTimezone());
  return todayInTimeZone(await fetchTimezone(db));
}
