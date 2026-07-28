"use server";

import { revalidatePath } from "next/cache";
import { demoWriteResult, isDemoMode, type DemoWriteResult } from "@/lib/demo/mode";
import { upsertEntry } from "@/lib/entries";
import { createClient } from "@/lib/supabase/server";
import { TIME_SIZES, type Entry, type TimeSize } from "@/lib/types";

export type LogEntryInput = {
  projectId: string;
  timeSpent: TimeSize;
  milestone?: string;
  description?: string;
  /** ISO date when logging a specific (clicked) day; omitted = today. */
  entryDate?: string;
};

export type LogEntryResult =
  | { ok: true; entry: Entry }
  | { ok: false; error: string }
  | DemoWriteResult;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Web quick add — session caller, RLS enforced, shared write path (ADR-0001). */
export async function logEntryAction(input: LogEntryInput): Promise<LogEntryResult> {
  if (isDemoMode()) return demoWriteResult();
  if (!input.projectId) return { ok: false, error: "Pick a project." };
  if (!TIME_SIZES.includes(input.timeSpent)) {
    return { ok: false, error: "Pick a time commitment." };
  }
  if (input.entryDate !== undefined && !ISO_DATE.test(input.entryDate)) {
    return { ok: false, error: "Invalid date." };
  }

  const milestone = input.milestone?.trim() || undefined;
  const description = input.description?.trim() || undefined;

  try {
    const supabase = await createClient();
    const entry = await upsertEntry(supabase, {
      projectId: input.projectId,
      timeSpent: input.timeSpent,
      milestone,
      description,
      entryDate: input.entryDate,
    });
    revalidatePath("/", "layout");
    return { ok: true, entry };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not log the entry." };
  }
}

export type DeleteEntryResult = { ok: true } | { ok: false; error: string } | DemoWriteResult;

/** Remove a single Entry (day detail view). */
export async function deleteEntryAction(entryId: string): Promise<DeleteEntryResult> {
  if (isDemoMode()) return demoWriteResult();
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("entries").delete().eq("id", entryId);
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete the entry." };
  }
}
