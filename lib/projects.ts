// Project resolution and creation. Resolution never guesses (PRD 4.1): a
// name resolves only when exactly one candidate matches case-insensitively;
// otherwise the caller gets near-matches to surface, never a silent pick.
import { assignProjectColor } from "./palette";
import type { Db } from "./queries";
import type { Project } from "./types";

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

/** Archive (never delete) — drops from pickers, keeps every Entry (PRD 3.5). */
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
