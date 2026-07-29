"use server";

import { revalidatePath } from "next/cache";
import { demoWriteResult, isDemoMode, type DemoWriteResult } from "@/lib/demo/mode";
import { createClient } from "@/lib/supabase/server";
import type { Reflection } from "@/lib/types";

export type SetReflectionInput = {
  reflection: string;
  /** ISO date when editing a specific (clicked) day; omitted = today. */
  entryDate?: string;
};

export type SetReflectionResult =
  | { ok: true; reflection: Reflection }
  | { ok: false; error: string }
  | DemoWriteResult;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Web capture — session caller, RLS enforced, set_reflection is the only writer (ADR-0017). */
export async function setReflectionAction(input: SetReflectionInput): Promise<SetReflectionResult> {
  if (isDemoMode()) return demoWriteResult();
  const reflection = input.reflection.trim();
  if (!reflection) return { ok: false, error: "Write a line first." };
  if (input.entryDate !== undefined && !ISO_DATE.test(input.entryDate)) {
    return { ok: false, error: "Invalid date." };
  }

  try {
    const supabase = await createClient();
    // p_date undefined is dropped from the RPC body, so the function falls
    // back to today in the user's stored timezone (ADR-0004).
    const { data, error } = await supabase.rpc("set_reflection", {
      p_reflection: reflection,
      p_date: input.entryDate,
    });
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true, reflection: data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not save the reflection.",
    };
  }
}
