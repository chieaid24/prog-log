"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidTimeZone } from "@/lib/timezones";

export type SettingsResult = { ok: true } | { ok: false; error: string };

/**
 * Change the stored timezone (ADR-0004: manual, in settings). Affects only
 * future "today" resolution — historical Entries stay frozen.
 */
export async function updateTimezoneAction(timezone: string): Promise<SettingsResult> {
  if (!isValidTimeZone(timezone)) {
    return { ok: false, error: "Unknown timezone." };
  }
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not signed in." };

    const { error } = await supabase
      .from("app_settings")
      .upsert({ user_id: user.id, timezone });
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save the timezone." };
  }
}
