// Thin RLS fetches (ADR-0007): filters and joins only, no aggregation.
// Rollups happen in lib/rollups.ts / lib/throwbacks.ts on the returned rows.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { DEFAULT_TIMEZONE, daysBetween } from "./dates";
import type { EntryWithProject, Project, ProjectAlias, ThrowbackItem } from "./types";

export type Db = SupabaseClient<Database>;

const ENTRY_WITH_PROJECT = "*, project:projects(id, name, color, category, status)";

/** Active Projects for pickers, name order (PRD 3.2). */
export async function getActiveProjects(db: Db): Promise<Project[]> {
  const { data, error } = await db
    .from("projects")
    .select("*")
    .eq("status", "active")
    .order("name");
  if (error) throw error;
  return data;
}

/** Every Project regardless of status, active first then name. */
export async function getAllProjects(db: Db): Promise<Project[]> {
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
  const { data, error } = await db
    .from("entries")
    .select(ENTRY_WITH_PROJECT)
    .order("entry_date");
  if (error) throw error;
  return data as EntryWithProject[];
}

/** One day's Entries with Projects (day detail panel). */
export async function getEntriesForDay(db: Db, date: string): Promise<EntryWithProject[]> {
  const { data, error } = await db
    .from("entries")
    .select(ENTRY_WITH_PROJECT)
    .eq("entry_date", date)
    .order("created_at");
  if (error) throw error;
  return data as EntryWithProject[];
}

/**
 * The Throwback candidate pool: every past Milestone (strictly before today
 * in the user's timezone), with its age precomputed (PRD 3.4).
 */
export async function getThrowbackPool(db: Db, todayISO: string): Promise<ThrowbackItem[]> {
  const { data, error } = await db
    .from("entries")
    .select("id, milestone, entry_date, project:projects(name, color)")
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

/** The stored user timezone (ADR-0004), defaulting when no row exists yet. */
export async function getUserTimezone(db: Db): Promise<string> {
  const { data, error } = await db.from("app_settings").select("timezone").maybeSingle();
  if (error) throw error;
  return data?.timezone ?? DEFAULT_TIMEZONE;
}
