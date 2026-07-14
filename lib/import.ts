// Import orchestration (PRD §8, ADR-0008). The write side of import: resolve
// every referenced Project name once (creating the missing ones), then feed
// each parsed row through the shared upsert-accumulate path — a re-import can
// never downgrade a Time Commitment or erase a Milestone, so importing is
// safe to retry. Parsing lives in ./export; transport (file guards, auth,
// revalidation) stays in the server action.
import { upsertEntry } from "./entries";
import type { ParsedImport } from "./export";
import { createProject } from "./projects";
import type { Db } from "./queries";
import type { Project } from "./types";

export type ImportFailure = { line: number; message: string };

export type ImportOutcome = {
  imported: number;
  projectsCreated: number;
  failed: ImportFailure[];
};

/**
 * Run the import loop over already-parsed rows. Per-row write failures are
 * accumulated (seeded with the parser's row errors), never fatal; only an
 * unrecoverable Projects fetch/create failure throws, for the caller to
 * surface.
 */
export async function runImport(db: Db, parsed: ParsedImport): Promise<ImportOutcome> {
  const { rows, errors, projects: importedProjects } = parsed;

  // Resolve every referenced Project name once, creating the missing ones.
  // createProject dedups case-insensitively and revives archived matches;
  // JSON envelopes carry category/color metadata worth passing along.
  const metaByName = new Map(
    importedProjects.map((p) => [p.name.trim().toLowerCase(), p] as const),
  );
  const idByName = new Map<string, string>();
  let projectsCreated = 0;
  const { data: existing, error: fetchError } = await db.from("projects").select("*");
  if (fetchError) throw fetchError;
  const known = new Map<string, Project>(
    (existing ?? []).map((p) => [p.name.trim().toLowerCase(), p] as const),
  );

  for (const row of rows) {
    const key = row.projectName.trim().toLowerCase();
    if (idByName.has(key)) continue;
    const already = known.get(key);
    if (already) {
      idByName.set(key, already.id);
      continue;
    }
    const meta = metaByName.get(key);
    const created = await createProject(db, {
      name: row.projectName,
      category: meta?.category ?? null,
      color: meta?.color ?? null,
      description: meta?.description ?? null,
    });
    idByName.set(key, created.id);
    projectsCreated += 1;
  }

  const failed: ImportFailure[] = [...errors];
  let imported = 0;
  for (const [i, row] of rows.entries()) {
    try {
      await upsertEntry(db, {
        projectId: idByName.get(row.projectName.trim().toLowerCase())!,
        timeSpent: row.timeSpent,
        milestone: row.milestone,
        description: row.description,
        entryDate: row.entryDate,
      });
      imported += 1;
    } catch (e) {
      failed.push({
        line: i + 2, // best-effort: header + 1-indexed data rows
        message: e instanceof Error ? e.message : "write failed",
      });
    }
  }

  return { imported, projectsCreated, failed };
}
