"use server";

// Import action (PRD §8, ADR-0008): the transport shell around lib/import —
// guard the upload, gate on auth, parse the file (lib/export), then hand the
// rows to runImport, which creates missing Projects and writes through the
// shared upsert-accumulate path so a re-import is always safe to retry.
import { revalidatePath } from "next/cache";
import { demoWriteResult, isDemoMode, type DemoWriteResult } from "@/lib/demo/mode";
import { parseImport } from "@/lib/export";
import { runImport } from "@/lib/import";
import { createClient } from "@/lib/supabase/server";

export type ImportResult =
  | {
      ok: true;
      imported: number;
      projectsCreated: number;
      failed: Array<{ line: number; message: string }>;
    }
  | { ok: false; error: string }
  | DemoWriteResult;

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export async function importEntriesAction(formData: FormData): Promise<ImportResult> {
  if (isDemoMode()) return demoWriteResult();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a CSV or JSON export file first." };
  }
  if (file.size > MAX_IMPORT_BYTES) {
    return { ok: false, error: "File is larger than 5 MB; that is not a prog-log export." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const parsed = parseImport(await file.text());
  if (parsed.rows.length === 0) {
    return {
      ok: false,
      error: parsed.errors[0]
        ? `Nothing importable: line ${parsed.errors[0].line}: ${parsed.errors[0].message}`
        : "The file contains no Entries.",
    };
  }

  try {
    const { imported, projectsCreated, failed } = await runImport(supabase, parsed);
    revalidatePath("/", "layout");
    return { ok: true, imported, projectsCreated, failed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Import failed." };
  }
}
