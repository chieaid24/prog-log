// Admin-scoped fetches for the capture layer. The service-role client
// bypasses RLS, so every query here filters by the owner id explicitly —
// never reuse the RLS-shaped helpers in lib/queries with the admin client.
import { DEFAULT_TIMEZONE, daysBetween } from "@/lib/dates";
import type { Db } from "@/lib/queries";
import type { Project, ProjectAlias, ThrowbackItem } from "@/lib/types";

/** The owner's active Projects, name order — capture resolution candidates. */
export async function getOwnerActiveProjects(db: Db, ownerId: string): Promise<Project[]> {
  const { data, error } = await db
    .from("projects")
    .select("*")
    .eq("user_id", ownerId)
    .eq("status", "active")
    .order("name");
  if (error) throw error;
  return data;
}

/** The owner's Project aliases (ADR-0010) — capture resolution sugar. */
export async function getOwnerAliases(db: Db, ownerId: string): Promise<ProjectAlias[]> {
  const { data, error } = await db
    .from("project_aliases")
    .select("*")
    .eq("user_id", ownerId);
  if (error) throw error;
  return data;
}

/** The owner's stored timezone (ADR-0004), with the documented default. */
export async function getOwnerTimezone(db: Db, ownerId: string): Promise<string> {
  const { data, error } = await db
    .from("app_settings")
    .select("timezone")
    .eq("user_id", ownerId)
    .maybeSingle();
  if (error) throw error;
  return data?.timezone ?? DEFAULT_TIMEZONE;
}

/** The owner's Throwback pool — same shape as the web feed's (PRD 3.4). */
export async function getOwnerThrowbackPool(
  db: Db,
  ownerId: string,
  todayISO: string,
): Promise<ThrowbackItem[]> {
  const { data, error } = await db
    .from("entries")
    .select("id, milestone, entry_date, project:projects(name, color)")
    .eq("user_id", ownerId)
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

/** Shared "never guess" error copy for Discord and the Apple Shortcut. */
export function noMatchMessage(rawName: string, near: readonly Project[]): string {
  const hint = near.length
    ? ` did you mean: ${near.map((p) => p.name).join(", ")}?`
    : "";
  return `no single active project matches "${rawName}".${hint}`;
}
