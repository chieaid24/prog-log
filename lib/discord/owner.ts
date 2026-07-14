// Owner-scoped fetches for the capture layer. The service-role client
// bypasses RLS, so every query here filters by the owner id explicitly —
// the shared shapes delegate to the fetch* cores in lib/queries (ADR-0009)
// with `ownerId` always supplied. Never call the RLS-scoped get* helpers in
// lib/queries with the admin client.
import { fetchActiveProjects, fetchThrowbackPool, fetchTimezone } from "@/lib/queries";
import type { Db } from "@/lib/queries";
import type { Project, ProjectAlias, ThrowbackItem } from "@/lib/types";

/** The owner's active Projects, name order — capture resolution candidates. */
export async function getOwnerActiveProjects(db: Db, ownerId: string): Promise<Project[]> {
  return fetchActiveProjects(db, ownerId);
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
  return fetchTimezone(db, ownerId);
}

/** The owner's Throwback pool — same shape as the web feed's (PRD 3.4). */
export async function getOwnerThrowbackPool(
  db: Db,
  ownerId: string,
  todayISO: string,
): Promise<ThrowbackItem[]> {
  return fetchThrowbackPool(db, todayISO, ownerId);
}

/** Shared "never guess" error copy for Discord and the Apple Shortcut. */
export function noMatchMessage(rawName: string, near: readonly Project[]): string {
  const hint = near.length
    ? ` did you mean: ${near.map((p) => p.name).join(", ")}?`
    : "";
  return `no single active project matches "${rawName}".${hint}`;
}
