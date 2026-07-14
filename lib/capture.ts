// Shared capture pipeline for the zero-friction surfaces (PRD 4, ADR-0002).
// Discord /log and the Apple Shortcut make the same decisions — owner-scoped
// project resolution that never guesses (PRD 4.1) and the single shared write
// path upsertEntry (ADR-0001) — so captureLog owns them once and the routes
// keep only transport concerns (auth, payload parsing, reply formatting).
// Also home to the bearer-secret check the Shortcut and cron routes share.
import { timingSafeEqual } from "node:crypto";
import { getOwnerActiveProjects, getOwnerAliases, noMatchMessage } from "@/lib/discord/owner";
import { upsertEntry } from "@/lib/entries";
import { resolveProjectWithAliases } from "@/lib/projects";
import type { Db } from "@/lib/queries";
import type { Entry, Project, TimeSize } from "@/lib/types";

/**
 * True only when the Authorization header is exactly `Bearer <secret>`.
 * Fails closed on a missing header, wrong scheme, or unset secret; the
 * length check leaks only the secret's length, never its content.
 */
export function bearerMatches(
  authorization: string | null,
  secret: string | undefined,
): boolean {
  if (!authorization || !secret || !authorization.startsWith("Bearer ")) return false;
  const presented = Buffer.from(authorization.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return presented.length === expected.length && timingSafeEqual(presented, expected);
}

export type CaptureResult =
  | { status: "logged"; project: Project; entry: Entry }
  /** No-match and ambiguous alike (never guess): `message` is the did-you-mean copy. */
  | { status: "unresolved"; message: string }
  | { status: "write-failed" };

export type CaptureInput = {
  /** Owner id — capture surfaces are service-role, so every step scopes to it. */
  ownerId: string;
  /** Project name or alias exactly as the user typed it (already normalized by the route). */
  rawProject: string;
  timeSpent: TimeSize;
  milestone: string | null;
  description: string | null;
};

/**
 * Resolve the typed project against the owner's active Projects and aliases
 * (ADR-0010) and write the Entry through upsertEntry. Anything short of one
 * distinct match comes back `unresolved` with the shared hint copy — never a
 * silent pick (PRD 4.1) — and a failed write comes back `write-failed` so the
 * route can phrase the retry in its own transport's voice.
 */
export async function captureLog(db: Db, input: CaptureInput): Promise<CaptureResult> {
  const [projects, aliases] = await Promise.all([
    getOwnerActiveProjects(db, input.ownerId),
    getOwnerAliases(db, input.ownerId),
  ]);
  const resolution = resolveProjectWithAliases(projects, aliases, input.rawProject);
  if (resolution.status !== "match") {
    return { status: "unresolved", message: noMatchMessage(input.rawProject, resolution.near) };
  }

  try {
    const entry = await upsertEntry(db, {
      projectId: resolution.project.id,
      timeSpent: input.timeSpent,
      milestone: input.milestone,
      description: input.description,
      userId: input.ownerId,
    });
    return { status: "logged", project: resolution.project, entry };
  } catch {
    return { status: "write-failed" };
  }
}
