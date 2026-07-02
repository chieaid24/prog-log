// The single shared write path (ADR-0001). Every capture surface — web quick
// add, Discord /log, Apple Shortcut — goes through upsertEntry, which calls
// the log_entry SQL function: one Entry per (project, day), peak Time
// Commitment wins, Milestone/Description never nulled by a bare re-log,
// entry_date frozen in the user's stored timezone (ADR-0004).
import type { Db } from "./queries";
import type { Entry, TimeSize } from "./types";

export type UpsertEntryInput = {
  projectId: string;
  timeSpent: TimeSize;
  milestone?: string | null;
  description?: string | null;
  /**
   * Owner id — required for service-role callers (Discord, Shortcut, which
   * have no session). Browser/session callers omit it; log_entry defaults to
   * auth.uid() and RLS rejects any spoofed value.
   */
  userId?: string;
  /**
   * Explicit Entry day (ISO date) — used when logging from a clicked calendar
   * day. Omitted = today in the user's stored timezone (ADR-0004).
   */
  entryDate?: string;
};

export async function upsertEntry(db: Db, input: UpsertEntryInput): Promise<Entry> {
  const { data, error } = await db.rpc("log_entry", {
    p_project: input.projectId,
    p_time: input.timeSpent,
    p_milestone: input.milestone ?? null,
    p_description: input.description ?? null,
    ...(input.userId ? { p_user: input.userId } : {}),
    ...(input.entryDate ? { p_date: input.entryDate } : {}),
  });
  if (error) throw error;
  return data as Entry;
}
