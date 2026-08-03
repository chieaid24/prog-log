// Project resolution and creation. Resolution never guesses (PRD 4.1): a
// name resolves only when exactly one candidate matches case-insensitively;
// otherwise the caller gets near-matches to surface, never a silent pick.
import { assignProjectColor } from "./palette";
import type { Db } from "./queries";
import type { Project, ProjectAlias } from "./types";

export type ProjectResolution =
  | { status: "match"; project: Project }
  | { status: "none"; near: Project[] }
  | { status: "ambiguous"; near: Project[] };

/** Exact case-insensitive match against the supplied candidates (pure). */
export function resolveProject(
  candidates: readonly Project[],
  rawName: string,
): ProjectResolution {
  const needle = rawName.trim().toLowerCase();
  const exact = candidates.filter((p) => p.name.trim().toLowerCase() === needle);
  if (exact.length === 1) return { status: "match", project: exact[0] };
  if (exact.length > 1) return { status: "ambiguous", near: exact };
  return { status: "none", near: findNearMatches(candidates, rawName) };
}

/** Substring near-matches for "did you mean" hints (pure). */
export function findNearMatches(
  candidates: readonly Project[],
  rawName: string,
  limit = 5,
): Project[] {
  const needle = rawName.trim().toLowerCase();
  if (needle.length === 0) return [];
  return candidates
    .filter((p) => {
      const name = p.name.toLowerCase();
      return name.includes(needle) || needle.includes(name);
    })
    .slice(0, limit);
}

/**
 * Alias-aware resolution (ADR-0010, pure): an alias exact-match counts as an
 * exact match of its Project. Name and alias hits are unioned by Project —
 * one distinct Project resolves; several stay ambiguous (never guess, PRD
 * 4.1). Aliases pointing outside `candidates` (archived Projects) are inert.
 */
export function resolveProjectWithAliases(
  candidates: readonly Project[],
  aliases: readonly ProjectAlias[],
  rawName: string,
): ProjectResolution {
  const needle = rawName.trim().toLowerCase();
  const byId = new Map(candidates.map((p) => [p.id, p]));

  const exact = new Map<string, Project>();
  for (const p of candidates) {
    if (p.name.trim().toLowerCase() === needle) exact.set(p.id, p);
  }
  for (const a of aliases) {
    const target = byId.get(a.project_id);
    if (target && a.alias.trim().toLowerCase() === needle) exact.set(target.id, target);
  }

  const matches = [...exact.values()];
  if (matches.length === 1) return { status: "match", project: matches[0] };
  if (matches.length > 1) return { status: "ambiguous", near: matches };
  return { status: "none", near: findNearMatchesWithAliases(candidates, aliases, rawName) };
}

/** Near-match hints including alias substring hits, deduped by Project (pure). */
export function findNearMatchesWithAliases(
  candidates: readonly Project[],
  aliases: readonly ProjectAlias[],
  rawName: string,
  limit = 5,
): Project[] {
  const needle = rawName.trim().toLowerCase();
  if (needle.length === 0) return [];
  const byId = new Map(candidates.map((p) => [p.id, p]));
  const near = new Map<string, Project>();
  for (const p of findNearMatches(candidates, rawName, limit)) near.set(p.id, p);
  for (const a of aliases) {
    const target = byId.get(a.project_id);
    if (!target || near.has(target.id)) continue;
    const alias = a.alias.toLowerCase();
    if (alias.includes(needle) || needle.includes(alias)) near.set(target.id, target);
  }
  return [...near.values()].slice(0, limit);
}

export type CreateProjectInput = {
  name: string;
  category?: string | null;
  color?: string | null;
  description?: string | null;
};

/**
 * Create a Project, deduped per user case-insensitively (PRD 3.2): if a
 * project with this name already exists it is selected instead of inserted —
 * un-archiving it if needed, since the user is clearly working on it again.
 * Color is auto-assigned from the palette when not provided (never null).
 */
export async function createProject(db: Db, input: CreateProjectInput): Promise<Project> {
  const name = input.name.trim();
  if (name.length === 0) throw new Error("Project name is required");

  const { data: existing, error: fetchError } = await db.from("projects").select("*");
  if (fetchError) throw fetchError;

  const match = existing.find((p) => p.name.trim().toLowerCase() === name.toLowerCase());
  if (match) {
    if (match.status === "archived") {
      const { data: revived, error } = await db
        .from("projects")
        .update({ status: "active" })
        .eq("id", match.id)
        .select()
        .single();
      if (error) throw error;
      return revived;
    }
    return match;
  }

  const color = input.color ?? assignProjectColor(existing.map((p) => p.color));
  const { data: created, error } = await db
    .from("projects")
    .insert({
      name,
      category: input.category ?? null,
      color,
      description: input.description ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return created;
}

/** Add a capture alias to a Project (ADR-0010). Uniqueness enforced by the DB. */
export async function addAlias(
  db: Db,
  projectId: string,
  alias: string,
): Promise<ProjectAlias> {
  const trimmed = alias.trim();
  if (trimmed.length === 0) throw new Error("Alias cannot be empty");
  const { data, error } = await db
    .from("project_aliases")
    .insert({ project_id: projectId, alias: trimmed })
    .select()
    .single();
  if (error) {
    // 23505: unique_violation on (user_id, lower(alias)).
    if (error.code === "23505") {
      throw new Error(`"${trimmed}" is already an alias for one of your projects`);
    }
    throw error;
  }
  return data;
}

/** Remove an alias by id. */
export async function removeAlias(db: Db, aliasId: string): Promise<void> {
  const { error } = await db.from("project_aliases").delete().eq("id", aliasId);
  if (error) throw error;
}

/** Archive or restore a Project while preserving its Entries. */
export async function setProjectStatus(
  db: Db,
  projectId: string,
  status: "active" | "archived",
): Promise<Project> {
  const { data, error } = await db
    .from("projects")
    .update({ status })
    .eq("id", projectId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Permanently delete an archived Project and its Project-scoped children. */
export async function deleteProject(db: Db, projectId: string): Promise<void> {
  const { error } = await db
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("status", "archived")
    .select("id")
    .single();
  if (error) throw error;
}
