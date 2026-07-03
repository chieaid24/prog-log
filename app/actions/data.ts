"use server";

// Import action (PRD §8, ADR-0008): parse an uploaded CSV/JSON export, create
// missing Projects, then write every row through the shared upsert-accumulate
// path — a re-import can never downgrade a Time Commitment or erase a
// Milestone, so importing is safe to retry.
import { revalidatePath } from "next/cache";
import { upsertEntry } from "@/lib/entries";
import { parseImport } from "@/lib/export";
import { createProject } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";

export type ImportResult =
  | {
      ok: true;
      imported: number;
      projectsCreated: number;
      failed: Array<{ line: number; message: string }>;
    }
  | { ok: false; error: string };

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export async function importEntriesAction(formData: FormData): Promise<ImportResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a CSV or JSON export file first." };
  }
  if (file.size > MAX_IMPORT_BYTES) {
    return { ok: false, error: "File is larger than 5 MB — that is not a prog-log export." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { rows, errors, projects: importedProjects } = parseImport(await file.text());
  if (rows.length === 0) {
    return {
      ok: false,
      error: errors[0]
        ? `Nothing importable: line ${errors[0].line}: ${errors[0].message}`
        : "The file contains no Entries.",
    };
  }

  try {
    // Resolve every referenced Project name once, creating the missing ones.
    // createProject dedups case-insensitively and revives archived matches;
    // JSON envelopes carry category/color metadata worth passing along.
    const metaByName = new Map(
      importedProjects.map((p) => [p.name.trim().toLowerCase(), p] as const),
    );
    const idByName = new Map<string, string>();
    let projectsCreated = 0;
    const { data: existing, error: fetchError } = await supabase.from("projects").select("*");
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
      const created = await createProject(supabase, {
        name: row.projectName,
        category: meta?.category ?? null,
        color: meta?.color ?? null,
        description: meta?.description ?? null,
      });
      idByName.set(key, created.id);
      projectsCreated += 1;
    }

    const failed = [...errors];
    let imported = 0;
    for (const [i, row] of rows.entries()) {
      try {
        await upsertEntry(supabase, {
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

    revalidatePath("/", "layout");
    return { ok: true, imported, projectsCreated, failed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Import failed." };
  }
}
